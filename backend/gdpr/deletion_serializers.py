"""
Serializers for account deletion API.
"""

from rest_framework import serializers
from .deletion_models import AccountDeletionRequest, DeletionLog, DeletedUserRecord


class DeletionLogSerializer(serializers.ModelSerializer):
    """Serializer for deletion logs"""
    
    class Meta:
        model = DeletionLog
        fields = ['id', 'timestamp', 'level', 'action', 'model_name', 'count', 'details']
        read_only_fields = fields


class AccountDeletionRequestSerializer(serializers.ModelSerializer):
    """Serializer for account deletion requests"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    days_until_deletion = serializers.IntegerField(read_only=True)
    can_be_cancelled = serializers.BooleanField(read_only=True)
    is_due = serializers.BooleanField(read_only=True)
    logs = DeletionLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = AccountDeletionRequest
        fields = [
            'id',
            'user',
            'user_email',
            'requested_at',
            'status',
            'deletion_type',
            'reason',
            'grace_period_days',
            'scheduled_deletion_date',
            'processed_at',
            'processing_time_seconds',
            'cancelled_at',
            'cancellation_reason',
            'days_until_deletion',
            'can_be_cancelled',
            'is_due',
            'data_exported',
            'reminder_sent_at',
            'final_warning_sent_at',
            'logs',
        ]
        read_only_fields = [
            'id', 'user', 'user_email', 'requested_at', 'status',
            'grace_period_days', 'scheduled_deletion_date',
            'processed_at', 'processing_time_seconds',
            'cancelled_at', 'cancellation_reason',
            'days_until_deletion', 'can_be_cancelled', 'is_due',
            'data_exported', 'reminder_sent_at', 'final_warning_sent_at', 'logs'
        ]


class RequestAccountDeletionSerializer(serializers.Serializer):
    """Serializer for requesting account deletion"""
    
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text="Optional reason for deletion"
    )
    
    deletion_type = serializers.ChoiceField(
        choices=[
            ('full', 'Full Deletion'),
            ('anonymize', 'Anonymize (Recommended)')
        ],
        default='anonymize',
        help_text="Type of deletion to perform"
    )
    
    confirm = serializers.BooleanField(
        required=True,
        help_text="Confirmation that user wants to delete account"
    )
    
    def validate_confirm(self, value):
        """Validate that user confirmed deletion"""
        if not value:
            raise serializers.ValidationError(
                "You must confirm that you want to delete your account"
            )
        return value


class CancelDeletionSerializer(serializers.Serializer):
    """Serializer for cancelling account deletion"""
    
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional reason for cancellation"
    )


class DeletedUserRecordSerializer(serializers.ModelSerializer):
    """Serializer for deleted user records (admin only)"""
    
    can_be_removed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DeletedUserRecord
        fields = [
            'id',
            'original_user_id',
            'email_hash',
            'deletion_date',
            'deletion_reason',
            'deletion_type',
            'registration_date',
            'last_login_date',
            'retention_until',
            'can_be_removed',
        ]
        read_only_fields = fields


