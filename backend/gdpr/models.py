"""
GDPR compliance models for data export and user rights.
"""

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

# Import consent models
from .consent_models import ConsentType, UserConsent, ConsentLog

# Import deletion models
from .deletion_models import AccountDeletionRequest, DeletionLog, DeletedUserRecord


class DataExportRequest(models.Model):
    """
    Tracks user data export requests (GDPR Article 15 & 20).
    
    Users can request a complete export of their personal data.
    The export is processed asynchronously and sent via email.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        PROCESSING = 'PROCESSING', _('Processing')
        COMPLETED = 'COMPLETED', _('Completed')
        FAILED = 'FAILED', _('Failed')
        EXPIRED = 'EXPIRED', _('Expired')
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='data_export_requests',
        help_text=_("User who requested the export")
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text=_("Current status of the export")
    )
    
    # Request details
    requested_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When the export was requested")
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text=_("IP address of the request")
    )
    
    # Processing details
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When processing started")
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When processing completed")
    )
    
    # Export file details
    file_path = models.CharField(
        max_length=500,
        blank=True,
        help_text=_("Path to the export file (S3 or local)")
    )
    file_size = models.BigIntegerField(
        null=True,
        blank=True,
        help_text=_("Size of export file in bytes")
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When the download link expires (7 days)")
    )
    
    # Error handling
    error_message = models.TextField(
        blank=True,
        help_text=_("Error message if export failed")
    )
    retry_count = models.IntegerField(
        default=0,
        help_text=_("Number of retry attempts")
    )
    
    # Celery task tracking
    task_id = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Celery task ID for tracking")
    )
    
    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['user', '-requested_at'], name='gdpr_export_user_time_idx'),
            models.Index(fields=['status', '-requested_at'], name='gdpr_export_status_time_idx'),
        ]
        verbose_name = _("Data Export Request")
        verbose_name_plural = _("Data Export Requests")
    
    def __str__(self):
        return f"Export for {self.user.email} - {self.status} - {self.requested_at}"
    
    @property
    def is_expired(self):
        """Check if the export download link has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    @property
    def is_available(self):
        """Check if the export is available for download"""
        return (
            self.status == self.Status.COMPLETED and
            self.file_path and
            not self.is_expired
        )
    
    @property
    def processing_time(self):
        """Calculate processing time in seconds"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def mark_as_processing(self, task_id=None):
        """Mark export as processing"""
        self.status = self.Status.PROCESSING
        self.started_at = timezone.now()
        if task_id:
            self.task_id = task_id
        self.save(update_fields=['status', 'started_at', 'task_id'])
    
    def mark_as_completed(self, file_path, file_size, expires_in_days=7):
        """Mark export as completed"""
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.file_path = file_path
        self.file_size = file_size
        self.expires_at = timezone.now() + timezone.timedelta(days=expires_in_days)
        self.save(update_fields=['status', 'completed_at', 'file_path', 'file_size', 'expires_at'])
    
    def mark_as_failed(self, error_message):
        """Mark export as failed"""
        self.status = self.Status.FAILED
        self.error_message = error_message
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count'])
    
    def mark_as_expired(self):
        """Mark export as expired"""
        self.status = self.Status.EXPIRED
        self.save(update_fields=['status'])


class DataExportLog(models.Model):
    """
    Logs what data was included in each export.
    
    Provides transparency and audit trail for data exports.
    """
    
    export_request = models.ForeignKey(
        DataExportRequest,
        on_delete=models.CASCADE,
        related_name='logs',
        help_text=_("Associated export request")
    )
    
    section = models.CharField(
        max_length=100,
        help_text=_("Section of data (e.g., 'profile', 'posts', 'messages')")
    )
    record_count = models.IntegerField(
        default=0,
        help_text=_("Number of records exported in this section")
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('SUCCESS', _('Success')),
            ('SKIPPED', _('Skipped')),
            ('ERROR', _('Error')),
        ],
        default='SUCCESS',
        help_text=_("Status of this section export")
    )
    error_message = models.TextField(
        blank=True,
        help_text=_("Error message if section failed")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = _("Data Export Log Entry")
        verbose_name_plural = _("Data Export Log Entries")
    
    def __str__(self):
        return f"{self.section} - {self.record_count} records - {self.status}"

