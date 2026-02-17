"""
API views for account deletion.
"""

import logging
from django.conf import settings
from django.http import Http404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from audit.services import log_audit_event, get_client_ip
from .deletion_models import AccountDeletionRequest, DeletedUserRecord
from .deletion_serializers import (
    AccountDeletionRequestSerializer,
    RequestAccountDeletionSerializer,
    CancelDeletionSerializer,
    DeletedUserRecordSerializer
)
from .deletion_service import AccountDeletionService

logger = logging.getLogger(__name__)


class AccountDeletionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for managing account deletion requests.
    
    Users can:
    - Request account deletion
    - View their deletion request status
    - Cancel pending deletion request
    """
    
    serializer_class = AccountDeletionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own deletion requests"""
        if not getattr(settings, 'ENABLE_ACCOUNT_DELETION', False):
            return AccountDeletionRequest.objects.none()
        
        user = self.request.user
        if user.is_superuser:
            return AccountDeletionRequest.objects.all()
        
        return AccountDeletionRequest.objects.filter(user=user)
    
    def check_feature_enabled(self):
        """Check if account deletion feature is enabled"""
        if not getattr(settings, 'ENABLE_ACCOUNT_DELETION', False):
            return Response(
                {"detail": "Account deletion feature is currently disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        return None
    
    @action(detail=False, methods=['post'], url_path='request-deletion')
    def request_deletion(self, request):
        """
        Request account deletion.
        
        Request body:
        {
            "reason": "No longer need the service",
            "deletion_type": "anonymize",
            "confirm": true
        }
        """
        feature_check = self.check_feature_enabled()
        if feature_check:
            return feature_check
        
        user = request.user
        
        # Check if user already has pending deletion
        existing = AccountDeletionRequest.objects.filter(
            user=user,
            status=AccountDeletionRequest.Status.PENDING
        ).first()
        
        if existing:
            return Response(
                {
                    "detail": "You already have a pending deletion request.",
                    "deletion_request": AccountDeletionRequestSerializer(existing).data
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Validate request
        serializer = RequestAccountDeletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data.get('reason', '')
        deletion_type = serializer.validated_data.get('deletion_type', 'anonymize')
        
        try:
            # Create deletion request
            deletion_request = AccountDeletionService.request_deletion(
                user=user,
                reason=reason,
                deletion_type=deletion_type,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Log audit event
            log_audit_event(
                action="ACCOUNT_DELETION_REQUESTED",
                user=user,
                model_name="AccountDeletionRequest",
                object_id=deletion_request.id,
                object_repr=f"Deletion request for {user.email}",
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                changes={
                    'scheduled_deletion_date': deletion_request.scheduled_deletion_date.isoformat(),
                    'deletion_type': deletion_type
                }
            )
            
            response_serializer = AccountDeletionRequestSerializer(deletion_request)
            
            return Response({
                "message": "Account deletion request submitted successfully. "
                          f"Your account will be deleted on {deletion_request.scheduled_deletion_date.strftime('%Y-%m-%d')}. "
                          "You can cancel this request before that date.",
                "deletion_request": response_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error requesting account deletion for user {user.id}: {e}")
            return Response(
                {"detail": "An error occurred while processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='cancel-deletion')
    def cancel_deletion(self, request):
        """
        Cancel pending account deletion.
        
        Request body:
        {
            "reason": "Changed my mind"
        }
        """
        feature_check = self.check_feature_enabled()
        if feature_check:
            return feature_check
        
        user = request.user
        
        # Get pending deletion request
        deletion_request = AccountDeletionRequest.objects.filter(
            user=user,
            status=AccountDeletionRequest.Status.PENDING
        ).first()
        
        if not deletion_request:
            return Response(
                {"detail": "No pending deletion request found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not deletion_request.can_be_cancelled:
            return Response(
                {"detail": "Deletion request can no longer be cancelled."},
                status=status.HTTP_409_CONFLICT
            )
        
        # Validate request
        serializer = CancelDeletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data.get('reason', '')
        
        # Cancel deletion
        success = AccountDeletionService.cancel_deletion(deletion_request, reason)
        
        if success:
            # Log audit event
            log_audit_event(
                action="ACCOUNT_DELETION_CANCELLED",
                user=user,
                model_name="AccountDeletionRequest",
                object_id=deletion_request.id,
                object_repr=f"Deletion request for {user.email}",
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                changes={'cancellation_reason': reason}
            )
            
            return Response({
                "message": "Account deletion request cancelled successfully. Your account is safe.",
                "deletion_request": AccountDeletionRequestSerializer(deletion_request).data
            })
        else:
            return Response(
                {"detail": "Failed to cancel deletion request."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='my-request')
    def my_request(self, request):
        """
        Get current user's deletion request (if any).
        """
        feature_check = self.check_feature_enabled()
        if feature_check:
            return feature_check
        
        deletion_request = AccountDeletionRequest.objects.filter(
            user=request.user,
            status=AccountDeletionRequest.Status.PENDING
        ).first()
        
        if not deletion_request:
            return Response({
                "has_request": False,
                "message": "No pending deletion request"
            })
        
        serializer = self.get_serializer(deletion_request)
        return Response({
            "has_request": True,
            "deletion_request": serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """
        Get deletion logs for a specific request.
        
        Shows the detailed process of what was deleted/anonymized.
        """
        feature_check = self.check_feature_enabled()
        if feature_check:
            return feature_check
        
        try:
            deletion_request = self.get_queryset().get(pk=pk)
        except AccountDeletionRequest.DoesNotExist:
            raise Http404("Deletion request not found.")
        
        # Only allow access to own deletion request (unless admin)
        if deletion_request.user != request.user and not request.user.is_superuser:
            return Response(
                {"detail": "You do not have permission to view these logs."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .deletion_serializers import DeletionLogSerializer
        logs = deletion_request.logs.all()
        serializer = DeletionLogSerializer(logs, many=True)
        
        return Response({
            'deletion_request_id': deletion_request.id,
            'status': deletion_request.status,
            'logs': serializer.data
        })


class DeletedUserRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing deleted user records (admin only).
    
    Provides audit trail of deleted accounts.
    """
    
    queryset = DeletedUserRecord.objects.all()
    serializer_class = DeletedUserRecordSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        """Only accessible to admins"""
        if not getattr(settings, 'ENABLE_ACCOUNT_DELETION', False):
            return DeletedUserRecord.objects.none()
        
        return super().get_queryset()

