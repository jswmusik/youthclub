"""
GDPR Account Deletion Models.

Implements Right to Erasure (GDPR Article 17).
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import timedelta


class AccountDeletionRequest(models.Model):
    """
    Records a user's request to delete their account.
    
    GDPR Article 17: Right to erasure ('right to be forgotten')
    
    Provides a grace period before permanent deletion to allow users to
    change their mind and recover their account.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PROCESSING = 'processing', _('Processing')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        FAILED = 'failed', _('Failed')
    
    class DeletionType(models.TextChoices):
        FULL = 'full', _('Full Deletion')
        ANONYMIZE = 'anonymize', _('Anonymize')
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='deletion_request',
        help_text=_("User who requested account deletion")
    )
    
    requested_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When deletion was requested")
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text=_("Current status of the deletion request")
    )
    
    deletion_type = models.CharField(
        max_length=20,
        choices=DeletionType.choices,
        default=DeletionType.ANONYMIZE,
        help_text=_("Type of deletion to perform")
    )
    
    reason = models.TextField(
        blank=True,
        help_text=_("User's reason for deletion (optional)")
    )
    
    # Grace period
    grace_period_days = models.IntegerField(
        default=30,
        help_text=_("Days until permanent deletion (grace period)")
    )
    
    scheduled_deletion_date = models.DateTimeField(
        db_index=True,
        help_text=_("When the account will be permanently deleted")
    )
    
    # Processing
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When the deletion was processed")
    )
    
    processing_time_seconds = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Time taken to process deletion")
    )
    
    # Cancellation
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When the deletion was cancelled")
    )
    
    cancellation_reason = models.TextField(
        blank=True,
        help_text=_("Reason for cancellation")
    )
    
    # Technical details
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text=_("IP address when request was made")
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text=_("Browser/device user agent")
    )
    
    # Error handling
    error_message = models.TextField(
        blank=True,
        help_text=_("Error details if deletion failed")
    )
    
    # Metadata
    data_exported = models.BooleanField(
        default=False,
        help_text=_("Whether user exported their data before deletion")
    )
    
    reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When reminder email was sent")
    )
    
    final_warning_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When final warning email was sent")
    )
    
    class Meta:
        ordering = ['-requested_at']
        verbose_name = _("Account Deletion Request")
        verbose_name_plural = _("Account Deletion Requests")
        indexes = [
            models.Index(fields=['status', 'scheduled_deletion_date'], name='gdpr_del_status_date_idx'),
            models.Index(fields=['scheduled_deletion_date'], name='gdpr_del_sched_date_idx'),
        ]
    
    def __str__(self):
        return f"Deletion request for {self.user.email} - {self.status}"
    
    def save(self, *args, **kwargs):
        """Set scheduled deletion date if not already set"""
        if not self.scheduled_deletion_date:
            self.scheduled_deletion_date = timezone.now() + timedelta(days=self.grace_period_days)
        super().save(*args, **kwargs)
    
    @property
    def days_until_deletion(self):
        """Calculate days remaining until deletion"""
        if self.status != self.Status.PENDING:
            return 0
        
        delta = self.scheduled_deletion_date - timezone.now()
        return max(0, delta.days)
    
    @property
    def can_be_cancelled(self):
        """Check if deletion can still be cancelled"""
        return self.status == self.Status.PENDING and timezone.now() < self.scheduled_deletion_date
    
    @property
    def is_due(self):
        """Check if deletion is due for processing"""
        return (
            self.status == self.Status.PENDING and
            timezone.now() >= self.scheduled_deletion_date
        )
    
    def mark_as_processing(self):
        """Mark deletion as being processed"""
        self.status = self.Status.PROCESSING
        self.save(update_fields=['status'])
    
    def mark_as_completed(self, processing_time_seconds):
        """Mark deletion as completed"""
        self.status = self.Status.COMPLETED
        self.processed_at = timezone.now()
        self.processing_time_seconds = processing_time_seconds
        self.save(update_fields=['status', 'processed_at', 'processing_time_seconds'])
    
    def mark_as_failed(self, error_message):
        """Mark deletion as failed"""
        self.status = self.Status.FAILED
        self.error_message = error_message
        self.processed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'processed_at'])
    
    def cancel(self, reason=''):
        """Cancel the deletion request"""
        if not self.can_be_cancelled:
            raise ValueError("Cannot cancel this deletion request")
        
        self.status = self.Status.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save(update_fields=['status', 'cancelled_at', 'cancellation_reason'])


class DeletionLog(models.Model):
    """
    Detailed log of deletion process steps.
    
    Tracks what data was deleted/anonymized and when.
    """
    
    class LogLevel(models.TextChoices):
        INFO = 'info', _('Info')
        WARNING = 'warning', _('Warning')
        ERROR = 'error', _('Error')
        SUCCESS = 'success', _('Success')
    
    deletion_request = models.ForeignKey(
        AccountDeletionRequest,
        on_delete=models.CASCADE,
        related_name='logs',
        help_text=_("Related deletion request")
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When this log entry was created")
    )
    
    level = models.CharField(
        max_length=20,
        choices=LogLevel.choices,
        default=LogLevel.INFO,
        help_text=_("Log level")
    )
    
    action = models.CharField(
        max_length=100,
        help_text=_("Action performed (e.g., 'Deleted user posts')")
    )
    
    model_name = models.CharField(
        max_length=100,
        blank=True,
        help_text=_("Name of model affected")
    )
    
    count = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Number of records affected")
    )
    
    details = models.JSONField(
        null=True,
        blank=True,
        help_text=_("Additional details in JSON format")
    )
    
    class Meta:
        ordering = ['timestamp']
        verbose_name = _("Deletion Log Entry")
        verbose_name_plural = _("Deletion Log Entries")
    
    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.action}"


class DeletedUserRecord(models.Model):
    """
    Minimal record of deleted users for compliance and audit purposes.
    
    Stores only essential information required for legal/audit purposes
    after user account has been deleted.
    """
    
    original_user_id = models.IntegerField(
        unique=True,
        db_index=True,
        help_text=_("Original user ID (for foreign key integrity)")
    )
    
    email_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text=_("SHA-256 hash of email (to prevent re-registration)")
    )
    
    deletion_date = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When the user was deleted")
    )
    
    deletion_reason = models.TextField(
        blank=True,
        help_text=_("Reason for deletion")
    )
    
    deletion_type = models.CharField(
        max_length=20,
        choices=AccountDeletionRequest.DeletionType.choices,
        help_text=_("Type of deletion performed")
    )
    
    # Minimal audit trail
    registration_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When user originally registered")
    )
    
    last_login_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("User's last login before deletion")
    )
    
    # Retention period
    retention_until = models.DateTimeField(
        db_index=True,
        help_text=_("When this record can be permanently removed")
    )
    
    class Meta:
        ordering = ['-deletion_date']
        verbose_name = _("Deleted User Record")
        verbose_name_plural = _("Deleted User Records")
        indexes = [
            models.Index(fields=['retention_until'], name='gdpr_deleted_retention_idx'),
        ]
    
    def __str__(self):
        return f"Deleted User {self.original_user_id} on {self.deletion_date.strftime('%Y-%m-%d')}"
    
    def save(self, *args, **kwargs):
        """Set retention period if not already set"""
        if not self.retention_until:
            # Keep deleted user records for 7 years (legal requirement in some jurisdictions)
            self.retention_until = timezone.now() + timedelta(days=7*365)
        super().save(*args, **kwargs)
    
    @property
    def can_be_removed(self):
        """Check if this record can be permanently removed"""
        return timezone.now() >= self.retention_until


