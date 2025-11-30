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