from rest_framework import serializers
from .models import EmailTemplate, EmailTemplateTranslation, EmailLog


class EmailTemplateTranslationSerializer(serializers.ModelSerializer):
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    
    class Meta:
        model = EmailTemplateTranslation
        fields = [
            'id', 'language', 'language_display', 
            'subject', 'body_html', 'body_text', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    translation_count = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'type', 'type_display', 'name', 'description',
            'is_active', 'translation_count', 'updated_at'
        ]
    
    def get_translation_count(self, obj):
        return obj.translations.count()


class EmailTemplateDetailSerializer(serializers.ModelSerializer):
    """Full serializer with translations."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    translations = EmailTemplateTranslationSerializer(many=True, read_only=True)
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'type', 'type_display', 'name', 'description',
            'available_variables', 'is_active', 'translations',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['type', 'created_at', 'updated_at']


class EmailTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating template settings (not translations)."""
    
    class Meta:
        model = EmailTemplate
        fields = ['name', 'description', 'is_active']


class EmailLogSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = EmailLog
        fields = [
            'id', 'recipient_email', 'recipient_name', 'template_type',
            'subject', 'body_preview', 'language', 'status', 'status_display',
            'error_message', 'sent_at', 'created_at'
        ]
    
    def get_recipient_name(self, obj):
        if obj.recipient:
            return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.email
        return None


class SendTestEmailSerializer(serializers.Serializer):
    """Serializer for sending test emails."""
    template_type = serializers.ChoiceField(choices=EmailTemplate.Type.choices)
    language = serializers.ChoiceField(choices=EmailTemplateTranslation.SUPPORTED_LANGUAGES)
    to_email = serializers.EmailField()


class PreviewEmailSerializer(serializers.Serializer):
    """Serializer for previewing emails."""
    template_type = serializers.ChoiceField(choices=EmailTemplate.Type.choices)
    language = serializers.ChoiceField(choices=EmailTemplateTranslation.SUPPORTED_LANGUAGES)

