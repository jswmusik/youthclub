from django.db import models
from django.conf import settings
from django.utils import timezone
from events.models import Event  # Assuming you have an events app

class Conversation(models.Model):
    class Type(models.TextChoices):
        DM = 'DM', 'Direct Message'
        BROADCAST = 'BROADCAST', 'Broadcast' # One-way or broadcast source
        EVENT = 'EVENT', 'Event Channel'     # Event-specific thread
        SYSTEM = 'SYSTEM', 'System/HQ'       # Global announcements

    type = models.CharField(max_length=20, choices=Type.choices, default=Type.DM)
    
    # Participants: Users who can see this conversation context.
    # For Broadcasts, this might be empty or just the sender, as recipients get individual copies.
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='conversations',
        blank=True
    )
    
    subject = models.CharField(max_length=255, blank=True)
    
    # Optional link to an event context
    related_event = models.ForeignKey(
        Event, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='conversations'
    )
    
    # Identifies if this is the "master" record for a broadcast sent by an admin
    is_broadcast_source = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.type}] {self.subject or 'No Subject'}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    content = models.TextField(blank=True)
    
    # V1: Images only. 
    attachment = models.ImageField(
        upload_to='messenger/attachments/', 
        blank=True, 
        null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message {self.id} from {self.sender} in {self.conversation}"


class MessageRecipient(models.Model):
    """
    The 'Join Table' that handles read status and soft deletion per user.
    Every recipient of a message gets one row here.
    """
    message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        related_name='recipient_statuses'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='received_messages'
    )
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Soft Delete: User hides it, but we keep it for 90 days
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        # optimize for fetching inbox
        indexes = [
            models.Index(fields=['recipient', 'is_deleted', 'is_read']),
        ]
        unique_together = ('message', 'recipient')

    def __str__(self):
        return f"{self.recipient} - {self.message} (Read: {self.is_read})"


class ConversationUserStatus(models.Model):
    """
    Tracks per-user status for conversations (hidden, archived, etc.)
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='user_statuses'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversation_statuses'
    )
    
    # Hide: Removes from inbox but reappears when new message arrives
    is_hidden = models.BooleanField(default=False)
    hidden_at = models.DateTimeField(null=True, blank=True)
    
    # Deleted: Permanently removed (only for DMs, requires admin permission for broadcasts)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('conversation', 'user')
        indexes = [
            models.Index(fields=['user', 'is_hidden', 'is_deleted']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.conversation} (Hidden: {self.is_hidden}, Deleted: {self.is_deleted})"


class MessageTemplate(models.Model):
    """
    Templates for admins (e.g., 'Class Cancelled', 'Welcome').
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='message_templates'
    )
    name = models.CharField(max_length=100)
    content = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.owner})"


class MessageReaction(models.Model):
    """
    Stores user reactions to messages (similar to PostReaction).
    """
    class ReactionType(models.TextChoices):
        LIKE = 'LIKE', 'Like'
        LOVE = 'LOVE', 'Love'
        LAUGH = 'LAUGH', 'Laugh'
        WOW = 'WOW', 'Wow'
        SAD = 'SAD', 'Sad'
        ANGRY = 'ANGRY', 'Angry'
    
    message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        related_name='reactions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='message_reactions'
    )
    reaction_type = models.CharField(
        max_length=10, 
        choices=ReactionType.choices, 
        default=ReactionType.LIKE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'reaction_type')  # One reaction type per user per message

    def __str__(self):
        return f"{self.user} {self.get_reaction_type_display()} {self.message}"