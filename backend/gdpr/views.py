"""
API views for GDPR data export and consent documents.
"""

import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone
from django.core.cache import cache
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DataExportRequest, DataExportLog
from .consent_models import ConsentType
from .serializers import DataExportRequestSerializer, DataExportLogSerializer
from .consent_serializers import ConsentTypeSerializer
from .tasks import process_data_export
from audit.services import log_audit_event, get_client_ip
from audit.models import AuditLog


class ConsentTypePublicViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API endpoint for fetching consent documents.
    
    Used by the registration form and public terms pages.
    Returns only active consent types with translations.
    """
    
    queryset = ConsentType.objects.filter(is_active=True).prefetch_related('translations')
    serializer_class = ConsentTypeSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Return only active consent types, ordered by display_order"""
        queryset = super().get_queryset().order_by('display_order', 'name')
        
        # Filter by code if provided
        code = self.request.query_params.get('code', None)
        if code:
            queryset = queryset.filter(code=code)
        
        # Filter by required status if provided
        is_required = self.request.query_params.get('is_required', None)
        if is_required is not None:
            queryset = queryset.filter(is_required=is_required.lower() == 'true')
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single consent document by ID or code.
        
        GET /api/gdpr/consent-types/{id}/
        GET /api/gdpr/consent-types/{code}/
        """
        # Try to get by ID first
        try:
            instance = self.get_object()
        except (ValueError, Http404):
            # If not a valid ID, try by code
            code = kwargs.get('pk')
            try:
                instance = self.get_queryset().get(code=code)
            except ConsentType.DoesNotExist:
                raise Http404
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class DataExportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for GDPR data export.
    
    Allows users to:
    - Request a data export
    - View their export requests
    - Download completed exports
    - Cancel pending exports
    """
    
    serializer_class = DataExportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own export requests"""
        return DataExportRequest.objects.filter(
            user=self.request.user
        ).prefetch_related('logs')
    
    @action(detail=False, methods=['post'], url_path='request-export')
    def request_export(self, request):
        """
        Request a new data export.
        
        Rate limited to 1 export per 24 hours per user.
        """
        # Check if feature is enabled
        if not getattr(settings, 'ENABLE_DATA_EXPORT', False):
            return Response(
                {'error': 'Data export feature is currently disabled.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        user = request.user
        
        # Rate limiting check
        cooldown_hours = getattr(settings, 'DATA_EXPORT_COOLDOWN_HOURS', 24)
        cache_key = f'data_export_request_{user.id}'
        
        if cache.get(cache_key):
            return Response(
                {
                    'error': f'You can only request one data export every {cooldown_hours} hours.',
                    'detail': 'Please wait before requesting another export.'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Check for pending exports
        pending_export = DataExportRequest.objects.filter(
            user=user,
            status__in=[DataExportRequest.Status.PENDING, DataExportRequest.Status.PROCESSING]
        ).first()
        
        if pending_export:
            return Response(
                {
                    'error': 'You already have a pending export request.',
                    'export_id': pending_export.id,
                    'status': pending_export.status,
                    'requested_at': pending_export.requested_at
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create export request
        from audit.services import get_client_ip
        
        export_request = DataExportRequest.objects.create(
            user=user,
            ip_address=get_client_ip(request)
        )
        
        # Queue background task
        try:
            task = process_data_export.delay(export_request.id)
            export_request.task_id = task.id
            export_request.save(update_fields=['task_id'])
            
            # Set rate limit cache
            cache.set(cache_key, True, cooldown_hours * 3600)
            
            # Log audit event
            log_audit_event(
                action=AuditLog.Action.DATA_EXPORT_REQUESTED,
                user=user,
                model_name='DataExportRequest',
                object_id=export_request.id,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                endpoint=request.path,
                method='POST'
            )
            
            serializer = self.get_serializer(export_request)
            return Response(
                {
                    'message': 'Data export request submitted successfully.',
                    'detail': 'You will receive an email when your data is ready to download.',
                    'export': serializer.data
                },
                status=status.HTTP_202_ACCEPTED
            )
            
        except Exception as e:
            export_request.delete()
            return Response(
                {'error': 'Failed to process export request. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """
        Download a completed data export.
        
        The export file is only available for 7 days after completion.
        """
        export_request = self.get_object()
        
        # Check if export is available
        if not export_request.is_available:
            if export_request.is_expired:
                return Response(
                    {'error': 'This export has expired. Please request a new export.'},
                    status=status.HTTP_410_GONE
                )
            elif export_request.status == DataExportRequest.Status.FAILED:
                return Response(
                    {'error': 'This export failed. Please try requesting a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {
                        'error': 'Export is not ready yet.',
                        'status': export_request.status,
                        'message': 'Please check back later or wait for the email notification.'
                    },
                    status=status.HTTP_425_TOO_EARLY
                )
        
        # Get file path
        file_path = os.path.join(settings.MEDIA_ROOT, export_request.file_path)
        
        if not os.path.exists(file_path):
            return Response(
                {'error': 'Export file not found. Please contact support.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log download
        log_audit_event(
            action=AuditLog.Action.EXPORT,
            user=request.user,
            model_name='DataExportRequest',
            object_id=export_request.id,
            reason='Downloaded data export',
            ip_address=get_client_ip(request) if hasattr(request, 'META') else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if hasattr(request, 'META') else '',
            endpoint=request.path,
            method='GET'
        )
        
        # Serve file
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="my_data_{export_request.user.id}.json"'
        response['Content-Length'] = export_request.file_size
        
        return response
    
    @action(detail=True, methods=['get'], url_path='logs')
    def logs(self, request, pk=None):
        """
        Get detailed logs for an export request.
        
        Shows what data sections were collected and any errors.
        """
        export_request = self.get_object()
        logs = export_request.logs.all()
        
        serializer = DataExportLogSerializer(logs, many=True)
        return Response({
            'export_id': export_request.id,
            'status': export_request.status,
            'logs': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """
        Cancel a pending export request.
        
        Only works for PENDING exports. PROCESSING exports cannot be cancelled.
        """
        export_request = self.get_object()
        
        if export_request.status == DataExportRequest.Status.PENDING:
            # Revoke Celery task if possible
            if export_request.task_id:
                try:
                    from celery.task.control import revoke
                    revoke(export_request.task_id, terminate=True)
                except:
                    pass
            
            export_request.status = DataExportRequest.Status.FAILED
            export_request.error_message = 'Cancelled by user'
            export_request.save()
            
            # Clear rate limit cache
            cache_key = f'data_export_request_{request.user.id}'
            cache.delete(cache_key)
            
            return Response({
                'message': 'Export request cancelled successfully.'
            })
        
        return Response(
            {'error': f'Cannot cancel export in {export_request.status} status.'},
            status=status.HTTP_400_BAD_REQUEST
        )

