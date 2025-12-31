from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count

from core.permissions import IsSuperUser
from .models import EmailTemplate, EmailTemplateTranslation, EmailLog
from .serializers import (
    EmailTemplateListSerializer,
    EmailTemplateDetailSerializer,
    EmailTemplateUpdateSerializer,
    EmailTemplateTranslationSerializer,
    EmailLogSerializer,
    SendTestEmailSerializer,
    PreviewEmailSerializer,
)
from .services import EmailService


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing email templates.
    Super Admin only.
    """
    queryset = EmailTemplate.objects.annotate(
        translation_count=Count('translations')
    ).order_by('name')
    permission_classes = [IsSuperUser]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmailTemplateListSerializer
        elif self.action in ['update', 'partial_update']:
            return EmailTemplateUpdateSerializer
        return EmailTemplateDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Disable creation - templates are created via data migration."""
        return Response(
            {'error': 'Templates cannot be created via API. Use data migration.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Disable deletion - templates should not be deleted."""
        return Response(
            {'error': 'Templates cannot be deleted.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=True, methods=['get', 'post', 'put'], url_path='translations/(?P<language>[a-z]+)')
    def translation(self, request, pk=None, language=None):
        """Get or update a specific translation."""
        template = self.get_object()
        
        if request.method == 'GET':
            try:
                translation = template.translations.get(language=language)
                serializer = EmailTemplateTranslationSerializer(translation)
                return Response(serializer.data)
            except EmailTemplateTranslation.DoesNotExist:
                return Response(
                    {'error': f'Translation not found for language: {language}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # POST or PUT - create or update translation
        try:
            translation = template.translations.get(language=language)
            serializer = EmailTemplateTranslationSerializer(translation, data=request.data, partial=True)
        except EmailTemplateTranslation.DoesNotExist:
            serializer = EmailTemplateTranslationSerializer(data={
                **request.data,
                'language': language,
            })
        
        if serializer.is_valid():
            serializer.save(template=template, language=language)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='send-test')
    def send_test(self, request, pk=None):
        """Send a test email."""
        template = self.get_object()
        serializer = SendTestEmailSerializer(data={
            'template_type': template.type,
            **request.data,
        })
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        result = EmailService.send_test(
            template_type=template.type,
            language=serializer.validated_data['language'],
            to_email=serializer.validated_data['to_email'],
        )
        
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='preview')
    def preview(self, request, pk=None):
        """Preview an email without sending."""
        template = self.get_object()
        serializer = PreviewEmailSerializer(data={
            'template_type': template.type,
            **request.data,
        })
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        result = EmailService.preview(
            template_type=template.type,
            language=serializer.validated_data['language'],
        )
        
        if result.get('error'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)
    
    @action(detail=False, methods=['get'], url_path='types')
    def types(self, request):
        """Get all available template types."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in EmailTemplate.Type.choices
        ])
    
    @action(detail=False, methods=['get'], url_path='languages')
    def languages(self, request):
        """Get all supported languages."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in EmailTemplateTranslation.SUPPORTED_LANGUAGES
        ])


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing email logs.
    Super Admin only.
    """
    queryset = EmailLog.objects.select_related('recipient', 'template').order_by('-created_at')
    serializer_class = EmailLogSerializer
    permission_classes = [IsSuperUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by template type
        template_type = self.request.query_params.get('template_type')
        if template_type:
            queryset = queryset.filter(template_type=template_type)
        
        # Filter by email
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(recipient_email__icontains=email)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Get email sending statistics."""
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        total = EmailLog.objects.count()
        last_24h_count = EmailLog.objects.filter(created_at__gte=last_24h).count()
        last_7d_count = EmailLog.objects.filter(created_at__gte=last_7d).count()
        last_30d_count = EmailLog.objects.filter(created_at__gte=last_30d).count()
        
        by_status = EmailLog.objects.values('status').annotate(count=Count('id'))
        by_type = EmailLog.objects.values('template_type').annotate(count=Count('id')).order_by('-count')[:10]
        
        return Response({
            'total': total,
            'last_24h': last_24h_count,
            'last_7d': last_7d_count,
            'last_30d': last_30d_count,
            'by_status': {item['status']: item['count'] for item in by_status},
            'by_type': list(by_type),
        })
