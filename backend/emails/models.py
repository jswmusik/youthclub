from django.db import models
from django.conf import settings


class EmailTemplate(models.Model):
    """
    Master email template definition.
    Each template type can have translations for all supported languages.
    """
    class Type(models.TextChoices):
        # Data Retention
        DELETION_WARNING_FIRST = 'deletion_warning_first', 'Deletion Warning (First - 30 days)'
        DELETION_WARNING_FINAL = 'deletion_warning_final', 'Deletion Warning (Final - 7 days)'
        ACCOUNT_DELETED = 'account_deleted', 'Account Deleted Confirmation'
        
        # Notifications
        NEW_MESSAGE = 'new_message', 'New Message Received'
        NEW_POST = 'new_post', 'New Post Published'
        NEW_EVENT = 'new_event', 'New Event Published'
        EVENT_REMINDER = 'event_reminder', 'Event Reminder'
        EVENT_CANCELLED = 'event_cancelled', 'Event Cancelled'
        EVENT_REGISTRATION_CONFIRMED = 'event_registration_confirmed', 'Event Registration Confirmed'
        
        # Membership
        WELCOME = 'welcome', 'Welcome Email'
        GUARDIAN_CREATED = 'guardian_created', 'Guardian Account Created'
        GUARDIAN_LINK_REQUEST = 'guardian_link_request', 'Guardian Link Request'
        GUARDIAN_LINK_APPROVED = 'guardian_link_approved', 'Guardian Link Approved'
        BIRTHDAY = 'birthday', 'Birthday Greeting'
        TRIAL_EXPIRING = 'trial_expiring', 'Trial Period Expiring'
        
        # Rewards
        REWARD_EARNED = 'reward_earned', 'Reward Earned'
        
        # Questionnaires
        NEW_QUESTIONNAIRE = 'new_questionnaire', 'New Questionnaire Available'
        
        # Two-Factor Authentication
        TWO_FACTOR_OTP = 'two_factor_otp', 'Two-Factor Authentication OTP'
        
        # Password Reset
        PASSWORD_RESET = 'password_reset', 'Password Reset Request'
        
        # GDPR Data Export
        DATA_EXPORT_READY = 'data_export_ready', 'Data Export Ready'
        DATA_EXPORT_FAILED = 'data_export_failed', 'Data Export Failed'
        
        # GDPR Account Deletion
        ACCOUNT_DELETION_REQUESTED = 'account_deletion_requested', 'Account Deletion Requested'
        ACCOUNT_DELETION_REMINDER = 'account_deletion_reminder', 'Account Deletion Reminder (7 days)'
        ACCOUNT_DELETION_FINAL_WARNING = 'account_deletion_final_warning', 'Account Deletion Final Warning (24h)'
        ACCOUNT_DELETION_PROCESSING = 'account_deletion_processing', 'Account Deletion Processing'
        ACCOUNT_DELETION_CANCELLED = 'account_deletion_cancelled', 'Account Deletion Cancelled'
        ACCOUNT_DELETION_FAILED = 'account_deletion_failed', 'Account Deletion Failed'

    type = models.CharField(
        max_length=60, 
        choices=Type.choices, 
        unique=True,
        help_text="The type of email this template is for"
    )
    name = models.CharField(
        max_length=100,
        help_text="Human-readable name for this template"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of when this email is sent"
    )
    available_variables = models.JSONField(
        default=list,
        help_text="List of available template variables with descriptions"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If disabled, emails of this type will not be sent"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'

    def __str__(self):
        return f"{self.name} ({self.type})"

    def get_translation(self, language_code):
        """
        Get the translation for a specific language.
        Falls back to Swedish ('sv') if not found, then English ('en').
        """
        try:
            return self.translations.get(language=language_code)
        except EmailTemplateTranslation.DoesNotExist:
            # Fallback to Swedish
            try:
                return self.translations.get(language='sv')
            except EmailTemplateTranslation.DoesNotExist:
                # Fallback to English
                try:
                    return self.translations.get(language='en')
                except EmailTemplateTranslation.DoesNotExist:
                    return None


class EmailTemplateTranslation(models.Model):
    """
    Translation for an email template in a specific language.
    Supports HTML and plain text versions.
    """
    SUPPORTED_LANGUAGES = [
        ('sv', 'Swedish'),
        ('en', 'English'),
        ('ar', 'Arabic'),
        ('da', 'Danish'),
        ('fi', 'Finnish'),
        ('nb', 'Norwegian'),
        ('prs', 'Dari/Persian'),
        ('so', 'Somali'),
    ]

    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.CASCADE,
        related_name='translations'
    )
    language = models.CharField(
        max_length=10,
        choices=SUPPORTED_LANGUAGES,
        help_text="Language code for this translation"
    )
    subject = models.CharField(
        max_length=200,
        help_text="Email subject line (can include variables like {{user.first_name}})"
    )
    body_html = models.TextField(
        help_text="HTML version of the email body"
    )
    body_text = models.TextField(
        blank=True,
        help_text="Plain text version of the email body (auto-generated if empty)"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('template', 'language')
        ordering = ['template', 'language']
        verbose_name = 'Email Template Translation'
        verbose_name_plural = 'Email Template Translations'

    def __str__(self):
        return f"{self.template.name} - {self.get_language_display()}"


class EmailLog(models.Model):
    """
    Log of all sent emails for tracking and debugging.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'
        BOUNCED = 'bounced', 'Bounced'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs',
        help_text="The user who received this email (null if user was deleted)"
    )
    recipient_email = models.EmailField(
        help_text="Email address the email was sent to"
    )
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs',
        help_text="The template used for this email"
    )
    template_type = models.CharField(
        max_length=60,
        blank=True,
        help_text="Template type (preserved even if template is deleted)"
    )
    subject = models.CharField(
        max_length=200,
        help_text="Subject line of the sent email"
    )
    body_preview = models.TextField(
        blank=True,
        help_text="First 500 characters of the email body"
    )
    language = models.CharField(
        max_length=10,
        help_text="Language the email was sent in"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if sending failed"
    )
    context_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Variable data used for rendering (for debugging)"
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the email was actually sent"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Email Log'
        verbose_name_plural = 'Email Logs'

    def __str__(self):
        return f"{self.template_type} to {self.recipient_email} ({self.status})"
