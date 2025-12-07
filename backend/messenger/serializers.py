from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message, MessageRecipient
from users.serializers import UserListSerializer  # Assuming this exists from your files

User = get_user_model()

class MessageRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageRecipient
        fields = ['is_read', 'read_at', 'is_deleted']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserListSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()
    read_status = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'attachment', 'created_at', 'is_me', 'read_status']

    def get_is_me(self, obj):
        request = self.context.get('request')
        return request.user == obj.sender if request else False

    def get_read_status(self, obj):
        # Only relevant for the current user viewing the message
        user = self.context.get('request').user
        try:
            status = obj.recipient_statuses.get(recipient=user)
            return {'is_read': status.is_read, 'read_at': status.read_at}
        except MessageRecipient.DoesNotExist:
            return None

class ConversationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the Sidebar/Inbox list.
    """
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True)
    participants = UserListSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'type', 'subject', 'created_at', 'last_message', 'unread_count', 'participants', 'is_broadcast_source']

    def get_last_message(self, obj):
        # Prefetched in ViewSet for performance
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content[:50] + '...' if len(last_msg.content) > 50 else last_msg.content,
                'created_at': last_msg.created_at,
                'sender_name': last_msg.sender.get_full_name()
            }
        return None

class ConversationDetailSerializer(serializers.ModelSerializer):
    """
    Full details for the Chat Window.
    """
    messages = MessageSerializer(many=True, read_only=True)
    participants = UserListSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'type', 'subject', 'created_at', 'participants', 'messages']

class CreateMessageSerializer(serializers.Serializer):
    """
    For sending a simple reply or DM.
    """
    conversation_id = serializers.IntegerField(required=False)
    recipient_id = serializers.IntegerField(required=False) # If new conversation
    content = serializers.CharField(required=False, allow_blank=True)
    attachment = serializers.ImageField(required=False)

    def validate(self, attrs):
        # If replying to existing conversation, content or attachment is required
        if attrs.get('conversation_id'):
            if not attrs.get('content') and not attrs.get('attachment'):
                raise serializers.ValidationError("Message must have content or attachment.")
        # If starting new conversation, content/attachment is optional (empty conversation is allowed)
        return attrs

class BroadcastSerializer(serializers.Serializer):
    """
    For the Admin Broadcast Composer.
    """
    target_level = serializers.ChoiceField(choices=['GLOBAL', 'MUNICIPALITY', 'CLUB'])
    target_id = serializers.IntegerField(required=False)
    recipient_type = serializers.ChoiceField(choices=['YOUTH', 'GUARDIAN', 'BOTH', 'ADMINS'])
    
    # JSON filters (Grade, Gender, Interest IDs)
    filters = serializers.JSONField(required=False, default=dict)
    
    subject = serializers.CharField(max_length=255)
    content = serializers.CharField()
    attachment = serializers.ImageField(required=False)