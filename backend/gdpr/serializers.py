"""
Serializers for GDPR data export API.
"""

from rest_framework import serializers
from .models import DataExportRequest, DataExportLog


class DataExportRequestSerializer(serializers.ModelSerializer):
    """Serializer for data export requests"""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    processing_time = serializers.FloatField(read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = DataExportRequest
        fields = [
            'id',
            'user_email',
            'status',
            'status_display',
            'requested_at',
            'started_at',
            'completed_at',
            'file_size',
            'file_size_mb',
            'expires_at',
            'is_available',
            'is_expired',
            'processing_time',
            'error_message',
            'retry_count',
        ]
        read_only_fields = fields
    
    def get_file_size_mb(self, obj):
        """Get file size in MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None


class DataExportLogSerializer(serializers.ModelSerializer):
    """Serializer for data export logs"""
    
    class Meta:
        model = DataExportLog
        fields = [
            'id',
            'section',
            'record_count',
            'status',
            'error_message',
            'created_at',
        ]
        read_only_fields = fields


