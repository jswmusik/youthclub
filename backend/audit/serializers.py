"""
Serializers for audit log API endpoints.
"""

from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries"""
    
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    user_name = serializers.SerializerMethodField()
    admin_user_email = serializers.EmailField(source='admin_user.email', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'timestamp',
            'user_email',
            'user_name',
            'admin_user_email',
            'action',
            'action_display',
            'model_name',
            'object_id',
            'object_repr',
            'changes',
            'reason',
            'ip_address',
            'endpoint',
            'method',
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj):
        """Get full name of user"""
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return None


class AuditLogSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for audit log list views"""
    
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'timestamp',
            'user_email',
            'action',
            'action_display',
            'model_name',
            'object_repr',
            'ip_address',
        ]
        read_only_fields = fields


