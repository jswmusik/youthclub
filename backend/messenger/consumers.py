# backend/messenger/consumers.py
"""
WebSocket consumers for real-time messaging functionality.

This module provides:
- ChatConsumer: Handles real-time chat within a conversation
  - Typing indicators
  - Real-time message delivery
  - Read receipts
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat functionality.
    
    Handles:
    - Joining/leaving conversation rooms
    - Broadcasting typing indicators
    - Receiving new messages in real-time
    - Read receipt updates
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]
        print(f"[CHAT] Connect attempt - user authenticated: {self.user.is_authenticated}, user_id: {getattr(self.user, 'id', 'N/A')}")
        
        # Reject unauthenticated connections
        if not self.user.is_authenticated:
            print(f"[CHAT] Rejecting unauthenticated connection")
            await self.close()
            return
        
        # Get conversation ID from URL route
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Verify user has access to this conversation
        has_access = await self.check_conversation_access()
        if not has_access:
            print(f"[CHAT] User {self.user.id} denied access to conversation {self.conversation_id}")
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        print(f"[CHAT] User {self.user.id} joined room {self.room_group_name}")
        await self.accept()
        
        # Notify others that user is online
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_presence',
                'user_id': self.user.id,
                'user_name': await self.get_user_display_name(),
                'status': 'online'
            }
        )
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            # Notify others that user is offline
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_presence',
                    'user_id': self.user.id,
                    'user_name': await self.get_user_display_name(),
                    'status': 'offline'
                }
            )
            
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'typing':
                # Broadcast typing indicator to other participants
                print(f"[TYPING] User {self.user.id} typing event: is_typing={data.get('is_typing', False)} in room {self.room_group_name}")
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'typing_indicator',
                        'user_id': self.user.id,
                        'user_name': await self.get_user_display_name(),
                        'is_typing': data.get('is_typing', False)
                    }
                )
            
            elif message_type == 'message_read':
                # Broadcast read receipt
                message_ids = data.get('message_ids', [])
                if message_ids:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'read_receipt',
                            'user_id': self.user.id,
                            'user_name': await self.get_user_display_name(),
                            'message_ids': message_ids,
                            'read_at': timezone.now().isoformat()
                        }
                    )
            
            elif message_type == 'ping':
                # Keep-alive ping
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    # --- Event Handlers (called by channel_layer.group_send) ---
    
    async def chat_message(self, event):
        """Handle new chat message event."""
        # Don't send to the sender (they already have the message)
        if event.get('sender_id') == self.user.id:
            return
        
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message']
        }))
    
    async def typing_indicator(self, event):
        """Handle typing indicator event."""
        # Don't send typing indicator to the user who is typing
        if event['user_id'] == self.user.id:
            print(f"[TYPING] Skipping typing indicator for self (user {self.user.id})")
            return
        
        print(f"[TYPING] Sending typing indicator to user {self.user.id}: {event['user_name']} is_typing={event['is_typing']}")
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'is_typing': event['is_typing']
        }))
    
    async def read_receipt(self, event):
        """Handle read receipt event."""
        # Don't send read receipt to the user who read the message
        if event['user_id'] == self.user.id:
            return
        
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'message_ids': event['message_ids'],
            'read_at': event['read_at']
        }))
    
    async def user_presence(self, event):
        """Handle user presence event."""
        # Don't send presence to the user themselves
        if event['user_id'] == self.user.id:
            return
        
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'status': event['status']
        }))
    
    # --- Helper Methods ---
    
    @database_sync_to_async
    def check_conversation_access(self):
        """Check if the user has access to this conversation."""
        from .models import Conversation
        
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            
            # Check if user is a participant
            if conversation.participants.filter(id=self.user.id).exists():
                return True
            
            # Check if user has received messages in this conversation (for broadcasts)
            if conversation.messages.filter(recipient_statuses__recipient=self.user).exists():
                return True
            
            return False
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_user_display_name(self):
        """Get the display name for the current user."""
        return self.user.get_full_name() or self.user.email


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for user-wide notifications.
    
    Each user has their own notification channel for:
    - New message notifications
    - Unread count updates
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]
        print(f"[NOTIFICATION] Connect attempt - user authenticated: {self.user.is_authenticated}, user_id: {getattr(self.user, 'id', 'N/A')}")
        
        if not self.user.is_authenticated:
            print(f"[NOTIFICATION] Rejecting unauthenticated connection")
            await self.close()
            return
        
        # Each user has their own notification group
        self.user_group_name = f'notifications_{self.user.id}'
        print(f"[NOTIFICATION] User {self.user.id} joining group: {self.user_group_name}")
        
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming messages (mainly for ping/pong)."""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
        except json.JSONDecodeError:
            pass
    
    async def new_message_notification(self, event):
        """Handle new message notification."""
        print(f"[CONSUMER] NotificationConsumer.new_message_notification called for user {self.user.id}")
        print(f"[CONSUMER] Sending: conversation_id={event['conversation_id']}, unread_count={event.get('unread_count')}")
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'conversation_id': event['conversation_id'],
            'message_preview': event.get('message_preview'),
            'sender_name': event.get('sender_name'),
            'unread_count': event.get('unread_count')
        }))
    
    async def unread_count_update(self, event):
        """Handle unread count update."""
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': event['count']
        }))





