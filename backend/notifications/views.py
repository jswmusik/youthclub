# backend/notifications/views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count

from core.permissions import IsSuperUser
from .models import Notification, NotificationTemplate, NotificationTemplateTranslation
from .serializers import (
    NotificationSerializer,
    NotificationTemplateListSerializer,
    NotificationTemplateDetailSerializer,
    NotificationTemplateUpdateSerializer,
    NotificationTemplateTranslationSerializer,
    PreviewNotificationSerializer,
)
from .services import render_notification_template


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # Enable filtering by category (e.g. ?category=REWARD)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category']

    def get_queryset(self):
        # 1. Security: Only return notifications for the current user
        # 2. Sorting: The Model's Meta class handles 'is_read' then '-created_at'
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Returns the number of unread notifications.
        Used for the red badge on the NavBar.
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Marks a single notification as read.
        """
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        Optional: Mark all as read button
        """
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked read'})


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification templates.
    Super Admin only.
    """
    queryset = NotificationTemplate.objects.annotate(
        translation_count=Count('translations')
    ).order_by('name')
    permission_classes = [IsSuperUser]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationTemplateListSerializer
        elif self.action in ['update', 'partial_update']:
            return NotificationTemplateUpdateSerializer
        return NotificationTemplateDetailSerializer
    
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
                serializer = NotificationTemplateTranslationSerializer(translation)
                return Response(serializer.data)
            except NotificationTemplateTranslation.DoesNotExist:
                return Response(
                    {'error': f'Translation not found for language: {language}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # POST or PUT - create or update translation
        try:
            translation = template.translations.get(language=language)
            serializer = NotificationTemplateTranslationSerializer(translation, data=request.data, partial=True)
        except NotificationTemplateTranslation.DoesNotExist:
            serializer = NotificationTemplateTranslationSerializer(data={
                **request.data,
                'language': language,
            })
        
        if serializer.is_valid():
            serializer.save(template=template, language=language)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='preview')
    def preview(self, request, pk=None):
        """Preview a notification with sample data."""
        template = self.get_object()
        serializer = PreviewNotificationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        language = serializer.validated_data['language']
        translation = template.get_translation(language)
        
        if not translation:
            return Response(
                {'error': f'No translation found for language: {language}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create sample context from available_variables
        sample_context = {}
        for variable in template.available_variables:
            var_name = variable.get('name', '')
            # Generate sample values based on common variable names
            if 'name' in var_name.lower() or 'title' in var_name.lower():
                sample_context[var_name] = 'Sample Name'
            elif 'date' in var_name.lower():
                sample_context[var_name] = '2025-01-15 18:00'
            elif 'time' in var_name.lower():
                sample_context[var_name] = '18:00'
            elif 'reason' in var_name.lower():
                sample_context[var_name] = 'Sample reason text'
            else:
                sample_context[var_name] = f'[{var_name}]'
        
        # Render with sample data
        rendered = render_notification_template(
            translation.title,
            translation.body,
            sample_context
        )
        
        return Response({
            'title': rendered['title'],
            'body': rendered['body'],
            'language': language,
            'language_display': translation.get_language_display(),
        })
    
    @action(detail=False, methods=['get'], url_path='types')
    def types(self, request):
        """Get all available template types."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTemplate.Type.choices
        ])
    
    @action(detail=False, methods=['get'], url_path='languages')
    def languages(self, request):
        """Get all supported languages."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTemplateTranslation.SUPPORTED_LANGUAGES
        ])
    
    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """Get all notification categories."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in Notification.Category.choices
        ])
