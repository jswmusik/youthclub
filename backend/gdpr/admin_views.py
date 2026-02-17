"""
Admin API views for GDPR consent document management.
Allows super admins to create, edit, version, and translate consent documents.
"""

import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .consent_models import ConsentType, ConsentTypeTranslation, ConsentTypeVersion
from .consent_serializers import (
    ConsentTypeAdminSerializer,
    ConsentTypeCreateSerializer,
    ConsentTypeTranslationSerializer,
    ConsentTypeVersionSerializer,
)
from core.permissions import IsSuperUser

logger = logging.getLogger(__name__)


class ConsentTypeAdminViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing consent types (GDPR documents).
    
    Provides full CRUD operations plus:
    - Translation management
    - Version history
    - Publishing new versions
    """
    
    queryset = ConsentType.objects.all().prefetch_related('translations', 'versions')
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsentTypeCreateSerializer
        return ConsentTypeAdminSerializer
    
    def get_queryset(self):
        """Order by display_order, then name"""
        return super().get_queryset().order_by('display_order', 'name')
    
    def perform_create(self, serializer):
        """Set created_by when creating"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'], url_path='translations/(?P<language>[a-z]{2,3})')
    def set_translation(self, request, pk=None, language=None):
        """
        Create or update a translation for a consent type.
        
        POST /api/gdpr/admin/consent-types/{id}/translations/{language}/
        """
        consent_type = self.get_object()
        
        # Validate language
        valid_languages = [code for code, _ in ConsentTypeTranslation.SUPPORTED_LANGUAGES]
        if language not in valid_languages:
            return Response(
                {'detail': f'Invalid language code. Valid codes: {", ".join(valid_languages)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create translation
        translation, created = ConsentTypeTranslation.objects.update_or_create(
            consent_type=consent_type,
            language=language,
            defaults={
                'name': request.data.get('name', consent_type.name),
                'description': request.data.get('description', consent_type.description),
                'consent_text': request.data.get('consent_text', consent_type.consent_text),
            }
        )
        
        serializer = ConsentTypeTranslationSerializer(translation)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['delete'], url_path='translations/(?P<language>[a-z]{2,3})/delete')
    def delete_translation(self, request, pk=None, language=None):
        """
        Delete a translation for a consent type.
        
        DELETE /api/gdpr/admin/consent-types/{id}/translations/{language}/delete/
        """
        consent_type = self.get_object()
        
        try:
            translation = ConsentTypeTranslation.objects.get(
                consent_type=consent_type,
                language=language
            )
            translation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ConsentTypeTranslation.DoesNotExist:
            return Response(
                {'detail': 'Translation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], url_path='publish-version')
    def publish_version(self, request, pk=None):
        """
        Publish a new version of the consent type.
        
        This creates a version snapshot for audit purposes and increments the version.
        Users who previously consented will be flagged as needing to re-consent.
        
        POST /api/gdpr/admin/consent-types/{id}/publish-version/
        {
            "new_version": "2.0",
            "change_summary": "Updated privacy policy section 3"
        }
        """
        consent_type = self.get_object()
        new_version = request.data.get('new_version')
        change_summary = request.data.get('change_summary', '')
        
        if not new_version:
            return Response(
                {'detail': 'new_version is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if version already exists
        if ConsentTypeVersion.objects.filter(consent_type=consent_type, version=new_version).exists():
            return Response(
                {'detail': f'Version {new_version} already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create snapshot of current translations
            translations_snapshot = {}
            for trans in consent_type.translations.all():
                translations_snapshot[trans.language] = {
                    'name': trans.name,
                    'description': trans.description,
                    'consent_text': trans.consent_text,
                }
            
            # Create version record
            version = ConsentTypeVersion.objects.create(
                consent_type=consent_type,
                version=new_version,
                consent_text_snapshot=consent_type.consent_text,
                translations_snapshot=translations_snapshot,
                created_by=request.user,
                change_summary=change_summary,
            )
            
            # Update consent type version
            consent_type.version = new_version
            consent_type.save(update_fields=['version', 'updated_at'])
            
            logger.info(f"Published new version {new_version} for consent type {consent_type.code}")
        
        serializer = ConsentTypeVersionSerializer(version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """
        Get version history for a consent type.
        
        GET /api/gdpr/admin/consent-types/{id}/versions/
        """
        consent_type = self.get_object()
        versions = consent_type.versions.all().order_by('-created_at')
        serializer = ConsentTypeVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle the active status of a consent type.
        
        POST /api/gdpr/admin/consent-types/{id}/toggle-active/
        """
        consent_type = self.get_object()
        consent_type.is_active = not consent_type.is_active
        consent_type.save(update_fields=['is_active', 'updated_at'])
        
        serializer = self.get_serializer(consent_type)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_required(self, request, pk=None):
        """
        Toggle the required status of a consent type.
        
        POST /api/gdpr/admin/consent-types/{id}/toggle-required/
        """
        consent_type = self.get_object()
        consent_type.is_required = not consent_type.is_required
        consent_type.save(update_fields=['is_required', 'updated_at'])
        
        serializer = self.get_serializer(consent_type)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get statistics about consent types and user consents.
        
        GET /api/gdpr/admin/consent-types/stats/
        """
        from .consent_models import UserConsent
        
        total_types = ConsentType.objects.count()
        active_types = ConsentType.objects.filter(is_active=True).count()
        required_types = ConsentType.objects.filter(is_required=True, is_active=True).count()
        
        total_consents = UserConsent.objects.count()
        active_consents = UserConsent.objects.filter(is_active=True).count()
        withdrawn_consents = UserConsent.objects.filter(is_active=False).count()
        
        return Response({
            'consent_types': {
                'total': total_types,
                'active': active_types,
                'required': required_types,
            },
            'user_consents': {
                'total': total_consents,
                'active': active_consents,
                'withdrawn': withdrawn_consents,
            }
        })
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a consent type (useful for creating variants).
        
        POST /api/gdpr/admin/consent-types/{id}/duplicate/
        {
            "new_code": "new_consent_code"
        }
        """
        original = self.get_object()
        new_code = request.data.get('new_code')
        
        if not new_code:
            return Response(
                {'detail': 'new_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if code already exists
        if ConsentType.objects.filter(code=new_code).exists():
            return Response(
                {'detail': f'Consent type with code {new_code} already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create new consent type
            new_consent = ConsentType.objects.create(
                code=new_code,
                name=f"{original.name} (Copy)",
                description=original.description,
                version='1.0',
                is_required=False,
                is_active=False,
                legal_basis=original.legal_basis,
                consent_text=original.consent_text,
                document_url=original.document_url,
                display_order=original.display_order + 1,
                created_by=request.user,
            )
            
            # Copy translations
            for trans in original.translations.all():
                ConsentTypeTranslation.objects.create(
                    consent_type=new_consent,
                    language=trans.language,
                    name=f"{trans.name} (Copy)",
                    description=trans.description,
                    consent_text=trans.consent_text,
                )
        
        serializer = self.get_serializer(new_consent)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

