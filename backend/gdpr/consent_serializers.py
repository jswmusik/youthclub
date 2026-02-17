"""
Serializers for consent management API.
"""

from rest_framework import serializers
from .consent_models import ConsentType, UserConsent, ConsentLog, ConsentTypeTranslation, ConsentTypeVersion


class ConsentTypeTranslationSerializer(serializers.ModelSerializer):
    """Serializer for consent type translations"""
    
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    
    class Meta:
        model = ConsentTypeTranslation
        fields = [
            'id',
            'language',
            'language_display',
            'name',
            'description',
            'consent_text',
            'updated_at',
        ]


class ConsentTypeVersionSerializer(serializers.ModelSerializer):
    """Serializer for consent type versions (history)"""
    
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsentTypeVersion
        fields = [
            'id',
            'version',
            'consent_text_snapshot',
            'translations_snapshot',
            'created_at',
            'created_by_name',
            'change_summary',
        ]
        read_only_fields = fields
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None


class ConsentTypeSerializer(serializers.ModelSerializer):
    """Serializer for consent types (read-only, public)"""
    
    is_current_version = serializers.BooleanField(read_only=True)
    translations = ConsentTypeTranslationSerializer(many=True, read_only=True)
    
    class Meta:
        model = ConsentType
        fields = [
            'id',
            'code',
            'name',
            'description',
            'version',
            'is_required',
            'is_active',
            'legal_basis',
            'consent_text',
            'document_url',
            'display_order',
            'is_current_version',
            'translations',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ConsentTypeAdminSerializer(serializers.ModelSerializer):
    """Serializer for consent types (admin - full CRUD)"""
    
    translations = ConsentTypeTranslationSerializer(many=True, read_only=True)
    versions = ConsentTypeVersionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsentType
        fields = [
            'id',
            'code',
            'name',
            'description',
            'version',
            'is_required',
            'is_active',
            'legal_basis',
            'consent_text',
            'document_url',
            'display_order',
            'translations',
            'versions',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'version', 'created_at', 'updated_at', 'translations', 'versions', 'created_by_name']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None


class ConsentTypeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new consent types"""
    
    class Meta:
        model = ConsentType
        fields = [
            'code',
            'name',
            'description',
            'version',
            'is_required',
            'is_active',
            'legal_basis',
            'consent_text',
            'document_url',
            'display_order',
        ]
    
    def validate_code(self, value):
        """Ensure code is lowercase and uses underscores"""
        return value.lower().replace('-', '_').replace(' ', '_')
    
    def create(self, validated_data):
        # Set created_by from request context
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class UserConsentSerializer(serializers.ModelSerializer):
    """Serializer for user consents"""
    
    consent_type_name = serializers.CharField(source='consent_type.name', read_only=True)
    consent_type_code = serializers.CharField(source='consent_type.code', read_only=True)
    consent_type_version = serializers.CharField(source='consent_type.version', read_only=True)
    is_current_version = serializers.BooleanField(read_only=True)
    needs_update = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserConsent
        fields = [
            'id',
            'consent_type_name',
            'consent_type_code',
            'consent_type_version',
            'consented_at',
            'consent_method',
            'version_snapshot',
            'is_active',
            'withdrawn_at',
            'withdrawal_reason',
            'is_current_version',
            'needs_update',
        ]
        read_only_fields = fields


class ConsentLogSerializer(serializers.ModelSerializer):
    """Serializer for consent logs"""
    
    class Meta:
        model = ConsentLog
        fields = [
            'id',
            'event_type',
            'timestamp',
            'details',
        ]
        read_only_fields = fields


class GiveConsentSerializer(serializers.Serializer):
    """Serializer for giving consent"""
    
    consent_code = serializers.CharField(
        max_length=50,
        help_text="Code of the consent type"
    )
    
    def validate_consent_code(self, value):
        """Validate that consent type exists and is active"""
        from .consent_models import ConsentType
        
        if not ConsentType.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError(f"Consent type '{value}' not found or inactive")
        
        return value


class WithdrawConsentSerializer(serializers.Serializer):
    """Serializer for withdrawing consent"""
    
    consent_code = serializers.CharField(
        max_length=50,
        help_text="Code of the consent type"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional reason for withdrawal"
    )
    
    def validate_consent_code(self, value):
        """Validate that consent type exists"""
        from .consent_models import ConsentType
        
        if not ConsentType.objects.filter(code=value).exists():
            raise serializers.ValidationError(f"Consent type '{value}' not found")
        
        return value


class BulkConsentSerializer(serializers.Serializer):
    """Serializer for giving multiple consents at once"""
    
    consent_codes = serializers.ListField(
        child=serializers.CharField(max_length=50),
        help_text="List of consent type codes"
    )
    
    def validate_consent_codes(self, value):
        """Validate all consent codes"""
        from .consent_models import ConsentType
        from .consent_service import ConsentService
        
        if not value:
            raise serializers.ValidationError("At least one consent code is required")
        
        # Check if all required consents are included
        validation = ConsentService.check_registration_consents(value)
        
        if not validation['valid']:
            errors = []
            if validation['missing_required']:
                errors.append(f"Missing required consents: {', '.join(validation['missing_required'])}")
            if validation['invalid_codes']:
                errors.append(f"Invalid consent codes: {', '.join(validation['invalid_codes'])}")
            
            raise serializers.ValidationError('. '.join(errors))
        
        return value

