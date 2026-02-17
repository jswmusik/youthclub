"""
Audit logging models for GDPR compliance.

These models track all access and modifications to personal data,
providing a complete audit trail as required by GDPR Article 30.
"""

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """
    Comprehensive audit trail for all data access and modifications.
    
    This model records who did what, when, and why for compliance
    with GDPR transparency and accountability requirements.
    """
    
    class Action(models.TextChoices):
        # Data operations
        CREATE = 'CREATE', _('Created')
        READ = 'READ', _('Accessed')
        UPDATE = 'UPDATE', _('Modified')
        DELETE = 'DELETE', _('Deleted')
        EXPORT = 'EXPORT', _('Exported')
        
        # Authentication
        LOGIN = 'LOGIN', _('Logged in')
        LOGOUT = 'LOGOUT', _('Logged out')
        LOGIN_FAILED = 'LOGIN_FAILED', _('Login failed')
        PASSWORD_RESET = 'PASSWORD_RESET', _('Password reset')
        PASSWORD_CHANGE = 'PASSWORD_CHANGE', _('Password changed')
        
        # GDPR specific
        CONSENT_GIVEN = 'CONSENT_GIVEN', _('Consent given')
        CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN', _('Consent withdrawn')
        DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED', _('Data export requested')
        DELETION_REQUESTED = 'DELETION_REQUESTED', _('Account deletion requested')
        DELETION_CANCELLED = 'DELETION_CANCELLED', _('Deletion cancelled')
        
        # Admin actions
        ADMIN_VIEW = 'ADMIN_VIEW', _('Admin viewed data')
        ADMIN_UPDATE = 'ADMIN_UPDATE', _('Admin modified data')
        ADMIN_DELETE = 'ADMIN_DELETE', _('Admin deleted data')
    
    # Who performed the action
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs_performed',
        help_text=_("User who performed the action")
    )
    
    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_audit_logs',
        help_text=_("Admin who performed action on behalf of or affecting another user")
    )
    
    # What happened
    action = models.CharField(
        max_length=50,
        choices=Action.choices,
        db_index=True,
        help_text=_("Type of action performed")
    )
    
    # To what
    model_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text=_("Model/table name affected")
    )
    object_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("ID of the object affected")
    )
    object_repr = models.CharField(
        max_length=200,
        blank=True,
        help_text=_("String representation of the object")
    )
    
    # Details
    changes = models.JSONField(
        null=True,
        blank=True,
        help_text=_("Before/after values for updates")
    )
    reason = models.TextField(
        blank=True,
        help_text=_("Reason for the action (optional)")
    )
    
    # Context
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("IP address of the request")
    )
    user_agent = models.TextField(
        blank=True,
        help_text=_("Browser/client user agent")
    )
    endpoint = models.CharField(
        max_length=200,
        blank=True,
        db_index=True,
        help_text=_("API endpoint accessed")
    )
    method = models.CharField(
        max_length=10,
        blank=True,
        help_text=_("HTTP method (GET, POST, etc.)")
    )
    
    # When
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When the action occurred")
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp'], name='audit_user_time_idx'),
            models.Index(fields=['model_name', 'object_id'], name='audit_object_idx'),
            models.Index(fields=['action', '-timestamp'], name='audit_action_time_idx'),
            models.Index(fields=['-timestamp'], name='audit_timestamp_idx'),
            models.Index(fields=['ip_address', '-timestamp'], name='audit_ip_time_idx'),
        ]
        verbose_name = _("Audit Log Entry")
        verbose_name_plural = _("Audit Log Entries")
    
    def __str__(self):
        user_str = str(self.user) if self.user else 'Anonymous'
        return f"{user_str} - {self.get_action_display()} - {self.model_name} - {self.timestamp}"
    
    @property
    def affected_user(self):
        """Return the user affected by this action (for display purposes)"""
        if self.admin_user and self.user and self.user != self.admin_user:
            return self.user  # Admin performed action on this user
        return self.user  # User performed action on themselves


class AuditLogArchive(models.Model):
    """
    Archived audit logs for long-term retention.
    
    After a certain period (e.g., 1 year), active audit logs can be
    archived to this table to keep the main table performant.
    """
    
    # Same fields as AuditLog but compressed/archived
    original_id = models.IntegerField(help_text=_("Original AuditLog ID"))
    user_id = models.IntegerField(null=True, blank=True)
    user_email = models.EmailField(blank=True)
    admin_user_id = models.IntegerField(null=True, blank=True)
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    changes = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(db_index=True)
    archived_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user_id', '-timestamp'], name='audit_arch_user_time_idx'),
            models.Index(fields=['-timestamp'], name='audit_arch_time_idx'),
        ]
        verbose_name = _("Archived Audit Log")
        verbose_name_plural = _("Archived Audit Logs")
    
    def __str__(self):
        return f"Archived: {self.user_email} - {self.action} - {self.timestamp}"


