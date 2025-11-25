from rest_framework import serializers
from .models import SystemMessage

class SystemMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemMessage
        fields = [
            'id', 'title', 'message', 'message_type', 
            'target_roles', 'is_sticky', 'external_link', 
            'created_at', 'expires_at'
        ]