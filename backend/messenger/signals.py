# backend/messenger/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import MessageRecipient, MessageReaction, Message
from notifications.models import Notification


def send_websocket_notification(recipient_id, notification_type, data):
    """
    Send a WebSocket notification to a specific user's notification channel.
    """
    try:
        channel_layer = get_channel_layer()
        print(f"[SIGNAL] Sending WebSocket notification to user {recipient_id}, type={notification_type}, channel_layer={channel_layer is not None}")
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{recipient_id}',
                {
                    'type': notification_type,
                    **data
                }
            )
            print(f"[SIGNAL] WebSocket notification sent successfully to notifications_{recipient_id}")
        else:
            print(f"[SIGNAL] ERROR: No channel layer available!")
    except Exception as e:
        # Don't let WebSocket errors break the main flow
        print(f"[SIGNAL] WebSocket notification error: {e}")


def get_unread_count(user):
    """Get the total unread message count for a user."""
    return MessageRecipient.objects.filter(
        recipient=user,
        is_read=False
    ).exclude(message__sender=user).count()


@receiver(post_save, sender=MessageRecipient)
def notify_new_message(sender, instance, created, **kwargs):
    """
    Create a notification when a new message is received.
    Only creates notification for recipients (not the sender).
    Also sends real-time WebSocket notification for instant badge updates.
    """
    print(f"[SIGNAL] notify_new_message triggered: created={created}, is_read={instance.is_read}")
    
    if not created:
        return
    
    # Don't notify if already read (sender's own copy)
    if instance.is_read:
        return
    
    message = instance.message
    recipient = instance.recipient
    conversation = message.conversation
    
    print(f"[SIGNAL] Message from {message.sender.id} to recipient {recipient.id}")
    
    # Don't notify if the recipient is the sender
    if message.sender == recipient:
        print(f"[SIGNAL] Skipping - recipient is sender")
        return
    
    # Build notification content
    sender_name = message.sender.get_full_name() or message.sender.email
    
    # Truncate message content for notification body
    content_preview = message.content[:100] + '...' if len(message.content) > 100 else message.content
    if not content_preview and message.attachment:
        content_preview = "📷 Image attachment"
    
    # Send Email Notification (outside transaction for safety)
    # Async in production, sync in development
    def send_message_email():
        try:
            from emails.tasks import send_email_async
            from emails.models import EmailTemplate
            
            send_email_async(
                template_type=EmailTemplate.Type.NEW_MESSAGE,
                recipient=recipient,
                context={
                    'sender_name': sender_name,
                    'message_preview': content_preview[:200] if content_preview else "You have a new message",
                    'conversation_id': conversation.id,
                }
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue new message email to {recipient.email}: {e}")
    
    # Create the notification and send WebSocket update
    def create_notification_and_broadcast():
        # Create database notification
        Notification.objects.create(
            recipient=recipient,
            category=Notification.Category.MESSAGE,
            title=f"New message from {sender_name}",
            body=content_preview or "You have a new message",
            action_url=f"/messages?conversation={conversation.id}"
        )
        
        # Send WebSocket notification for real-time badge update
        unread_count = get_unread_count(recipient)
        send_websocket_notification(
            recipient.id,
            'new_message_notification',
            {
                'conversation_id': conversation.id,
                'message_preview': content_preview[:50] if content_preview else None,
                'sender_name': sender_name,
                'unread_count': unread_count
            }
        )
        
        # Also send to the conversation's chat room for real-time message display
        try:
            from .serializers import MessageSerializer
            channel_layer = get_channel_layer()
            if channel_layer:
                # Serialize the message for the chat consumer
                message_data = {
                    'id': message.id,
                    'content': message.content,
                    'attachment': message.attachment.url if message.attachment else None,
                    'created_at': message.created_at.isoformat(),
                    'sender': {
                        'id': message.sender.id,
                        'first_name': message.sender.first_name,
                        'last_name': message.sender.last_name,
                        'avatar': message.sender.avatar.url if message.sender.avatar else None
                    },
                    'is_me': False,  # Will be determined client-side
                }
                
                async_to_sync(channel_layer.group_send)(
                    f'chat_{conversation.id}',
                    {
                        'type': 'chat_message',
                        'message': message_data,
                        'sender_id': message.sender.id
                    }
                )
        except Exception as e:
            print(f"Chat room broadcast error: {e}")
    
    transaction.on_commit(create_notification_and_broadcast)
    # Send email after transaction commits
    transaction.on_commit(send_message_email)


@receiver(post_save, sender=MessageReaction)
def notify_message_reaction(sender, instance, created, **kwargs):
    """
    Create a notification when someone reacts to a message.
    Only notifies the message sender (not the person who reacted).
    """
    if not created:
        return
    
    message = instance.message
    reactor = instance.user
    message_sender = message.sender
    
    # Don't notify if the reactor is the message sender
    if reactor == message_sender:
        return
    
    # Get reaction emoji
    reaction_emojis = {
        'LIKE': '👍',
        'LOVE': '❤️',
        'LAUGH': '😂',
        'WOW': '😮',
        'SAD': '😢',
        'ANGRY': '😠',
    }
    emoji = reaction_emojis.get(instance.reaction_type, '👍')
    
    reactor_name = reactor.get_full_name() or reactor.email
    
    # Truncate message content for context
    content_preview = message.content[:50] + '...' if len(message.content) > 50 else message.content
    if not content_preview:
        content_preview = "your message"
    
    # Create the notification
    def create_notification():
        Notification.objects.create(
            recipient=message_sender,
            category=Notification.Category.MESSAGE,
            title=f"{reactor_name} reacted {emoji}",
            body=f"Reacted to: {content_preview}",
            action_url=f"/messages?conversation={message.conversation.id}"
        )
    
    transaction.on_commit(create_notification)
