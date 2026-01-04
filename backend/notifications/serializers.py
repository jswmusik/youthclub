from rest_framework import serializers
from .models import Notification, NotificationTemplate, NotificationTemplateTranslation


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'category', 'title', 'body', 'action_url', 'is_read', 'created_at']
        read_only_fields = ['id', 'category', 'title', 'body', 'action_url', 'created_at']


# ===== Notification Template Serializers =====

class NotificationTemplateTranslationSerializer(serializers.ModelSerializer):
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    
    class Meta:
        model = NotificationTemplateTranslation
        fields = [
            'id', 'language', 'language_display', 
            'title', 'body', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class NotificationTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    translation_count = serializers.SerializerMethodField()
    translations = NotificationTemplateTranslationSerializer(many=True, read_only=True)
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'type', 'type_display', 'name', 'description',
            'category', 'category_display', 'is_active', 
            'translation_count', 'translations', 'updated_at'
        ]
    
    def get_translation_count(self, obj):
        return obj.translations.count()


class NotificationTemplateDetailSerializer(serializers.ModelSerializer):
    """Full serializer with translations."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    translations = NotificationTemplateTranslationSerializer(many=True, read_only=True)
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'type', 'type_display', 'name', 'description',
            'category', 'category_display', 'available_variables', 
            'is_active', 'translations', 'created_at', 'updated_at'
        ]
        read_only_fields = ['type', 'created_at', 'updated_at']


class NotificationTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating template settings (not translations)."""
    
    class Meta:
        model = NotificationTemplate
        fields = ['name', 'description', 'is_active']


class PreviewNotificationSerializer(serializers.Serializer):
    """Serializer for previewing notifications."""
    language = serializers.ChoiceField(choices=NotificationTemplateTranslation.SUPPORTED_LANGUAGES)
