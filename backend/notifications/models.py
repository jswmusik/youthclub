# backend/notifications/models.py
from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Category(models.TextChoices):
        SYSTEM = 'SYSTEM', 'System Message'
        REWARD = 'REWARD', 'Reward'
        EVENT = 'EVENT', 'Event'
        NEWS = 'NEWS', 'News'
        POST = 'POST', 'Post'
        BOOKING = 'BOOKING', 'Booking'
        GROUP = 'GROUP', 'Group'
        INVENTORY = 'INVENTORY', 'Inventory'
        QUESTIONNAIRE = 'QUESTIONNAIRE', 'Questionnaire'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    
    title = models.CharField(max_length=255)
    body = models.TextField()
    action_url = models.CharField(max_length=500, blank=True, null=True, help_text="Frontend route, e.g. /dashboard/rewards")
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True) # Indexed for fast 7-day cleanup

    class Meta:
        # Sort by: Unread first (False < True), then Newest first
        ordering = ['is_read', '-created_at']

    def __str__(self):
        return f"{self.category} for {self.recipient}: {self.title}"


class NotificationTemplate(models.Model):
    """
    Master notification template definition.
    Each template type can have translations for all supported languages.
    Similar to EmailTemplate but for in-app notifications.
    """
    class Type(models.TextChoices):
        # Events
        EVENT_REGISTRATION_CONFIRMED = 'event_registration_confirmed', 'Event Registration Confirmed'
        EVENT_WAITLIST_ADDED = 'event_waitlist_added', 'Added to Event Waitlist'
        EVENT_GUARDIAN_APPROVAL_NEEDED = 'event_guardian_approval_needed', 'Guardian Approval Needed (Event)'
        
        # Bookings
        BOOKING_CONFIRMED = 'booking_confirmed', 'Booking Confirmed'
        BOOKING_PENDING = 'booking_pending', 'Booking Pending Approval'
        BOOKING_APPROVED = 'booking_approved', 'Booking Approved'
        BOOKING_DECLINED = 'booking_declined', 'Booking Declined'
        BOOKING_CANCELLED = 'booking_cancelled', 'Booking Cancelled'
        
        # Groups
        GROUP_APPLICATION_APPROVED = 'group_application_approved', 'Group Application Approved'
        GROUP_APPLICATION_REJECTED = 'group_application_rejected', 'Group Application Rejected'
        GROUP_JOINED = 'group_joined', 'Joined Group'
        
        # Rewards
        REWARD_EARNED = 'reward_earned', 'Reward Earned'
        
        # News & System
        SYSTEM_MESSAGE = 'system_message', 'System Message'
        NEWS_PUBLISHED = 'news_published', 'News Published'
        
        # Questionnaires
        QUESTIONNAIRE_AVAILABLE = 'questionnaire_available', 'Questionnaire Available'
        SURVEY_REMINDER = 'survey_reminder', 'Survey Reminder'
        QUESTIONNAIRE_REWARD_EARNED = 'questionnaire_reward_earned', 'Questionnaire Reward Earned'
        
        # Inventory
        INVENTORY_OVERDUE = 'inventory_overdue', 'Inventory Overdue'
        INVENTORY_AVAILABLE = 'inventory_available', 'Inventory Available'

    type = models.CharField(
        max_length=50, 
        choices=Type.choices, 
        unique=True,
        help_text="The type of notification this template is for"
    )
    name = models.CharField(
        max_length=100,
        help_text="Human-readable name for this template"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of when this notification is sent"
    )
    available_variables = models.JSONField(
        default=list,
        help_text="List of available template variables with descriptions"
    )
    category = models.CharField(
        max_length=20,
        choices=Notification.Category.choices,
        default=Notification.Category.SYSTEM,
        help_text="Default category for notifications using this template"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If disabled, notifications of this type will not be sent"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Notification Template'
        verbose_name_plural = 'Notification Templates'

    def __str__(self):
        return f"{self.name} ({self.type})"

    def get_translation(self, language_code):
        """
        Get the translation for a specific language.
        Falls back to Swedish ('sv') if not found, then English ('en').
        """
        try:
            return self.translations.get(language=language_code)
        except NotificationTemplateTranslation.DoesNotExist:
            # Fallback to Swedish
            try:
                return self.translations.get(language='sv')
            except NotificationTemplateTranslation.DoesNotExist:
                # Fallback to English
                try:
                    return self.translations.get(language='en')
                except NotificationTemplateTranslation.DoesNotExist:
                    return None


class NotificationTemplateTranslation(models.Model):
    """
    Translation for a notification template in a specific language.
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
        NotificationTemplate,
        on_delete=models.CASCADE,
        related_name='translations'
    )
    language = models.CharField(
        max_length=10,
        choices=SUPPORTED_LANGUAGES,
        help_text="Language code for this translation"
    )
    title = models.CharField(
        max_length=255,
        help_text="Notification title (can include variables like {{event_title}})"
    )
    body = models.TextField(
        help_text="Notification body text (can include variables like {{event_title}})"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('template', 'language')
        ordering = ['template', 'language']
        verbose_name = 'Notification Template Translation'
        verbose_name_plural = 'Notification Template Translations'

    def __str__(self):
        return f"{self.template.name} - {self.get_language_display()}"
