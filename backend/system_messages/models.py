from django.db import models
from django.utils import timezone
from users.models import User

class SystemMessage(models.Model):
    class MessageType(models.TextChoices):
        INFO = 'INFO', 'Information'       # Blue
        IMPORTANT = 'IMPORTANT', 'Important' # Orange
        WARNING = 'WARNING', 'Warning'     # Red

    title = models.CharField(max_length=200)
    message = models.TextField()
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.INFO)
    
    # Configuration
    target_roles = models.JSONField(default=list, help_text='List of roles or ["ALL"]')
    is_sticky = models.BooleanField(default=False, help_text="If true, reappears on refresh even if closed")
    external_link = models.URLField(blank=True, null=True, help_text="Optional link to read more")
    
    # Lifespan
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_message_type_display()})"