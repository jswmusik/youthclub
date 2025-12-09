from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, OuterRef
from .models import Conversation, Message, MessageRecipient, MessageReaction
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
    reaction_count = serializers.SerializerMethodField()
    reaction_breakdown = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'attachment', 'created_at', 'is_me', 'read_status', 
                  'reaction_count', 'reaction_breakdown', 'user_reaction']

    def get_is_me(self, obj):
        request = self.context.get('request')
        return request.user == obj.sender if request else False

    def get_read_status(self, obj):
        """
        Returns read status for the message.
        - If current user is the sender: Returns whether the recipient(s) have read it
        - If current user is not the sender: Returns whether the current user has read it
        """
        request = self.context.get('request')
        if not request:
            return None
        
        user = request.user
        
        # If the current user is the sender, check if recipients have read it
        if obj.sender == user:
            # For DMs, check the other participant's read status
            # For broadcasts, we might want to show if all/most recipients have read it
            # For now, let's check if there's at least one recipient who has read it (excluding sender)
            read_recipients = obj.recipient_statuses.exclude(
                recipient=user  # Exclude sender
            ).filter(is_read=True)
            
            if read_recipients.exists():
                # Return the earliest read_at time
                earliest_read = read_recipients.order_by('read_at').first()
                read_at_str = None
                if earliest_read and earliest_read.read_at:
                    read_at_str = earliest_read.read_at.isoformat()
                return {
                    'is_read': True,
                    'read_at': read_at_str
                }
            else:
                return {'is_read': False, 'read_at': None}
        else:
            # Current user is a recipient, show their own read status
            try:
                status = obj.recipient_statuses.get(recipient=user)
                read_at_str = None
                if status.read_at:
                    read_at_str = status.read_at.isoformat()
                return {'is_read': status.is_read, 'read_at': read_at_str}
            except MessageRecipient.DoesNotExist:
                return None
    
    def get_reaction_count(self, obj):
        """Get total number of reactions on this message"""
        try:
            # Use prefetched reactions if available, otherwise count from DB
            if hasattr(obj, '_prefetched_objects_cache') and 'reactions' in obj._prefetched_objects_cache:
                reactions = obj._prefetched_objects_cache['reactions']
                if reactions is not None:
                    return len(reactions)
            # Fallback to DB query
            if hasattr(obj, 'reactions'):
                return obj.reactions.count()
            return 0
        except Exception:
            return 0
    
    def get_reaction_breakdown(self, obj):
        """Get breakdown of reactions by type"""
        try:
            from django.db.models import Count
            # Use prefetched reactions if available
            if hasattr(obj, '_prefetched_objects_cache') and 'reactions' in obj._prefetched_objects_cache:
                reactions = obj._prefetched_objects_cache['reactions']
                if reactions is not None:
                    breakdown = {}
                    for reaction in reactions:
                        reaction_type = getattr(reaction, 'reaction_type', None)
                        if reaction_type:
                            breakdown[reaction_type] = breakdown.get(reaction_type, 0) + 1
                    return breakdown
            # Otherwise query from DB
            if hasattr(obj, 'reactions'):
                breakdown = obj.reactions.values('reaction_type').annotate(count=Count('id'))
                return {item['reaction_type']: item['count'] for item in breakdown}
            return {}
        except Exception:
            return {}
    
    def get_user_reaction(self, obj):
        """Get the current user's reaction to this message"""
        try:
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                return None
            
            # Use prefetched reactions if available
            if hasattr(obj, '_prefetched_objects_cache') and 'reactions' in obj._prefetched_objects_cache:
                reactions = obj._prefetched_objects_cache['reactions']
                if reactions is not None:
                    for reaction in reactions:
                        # Check both user_id (if prefetched) and user.id (if user is loaded)
                        user_id = getattr(reaction, 'user_id', None)
                        if not user_id and hasattr(reaction, 'user') and reaction.user:
                            user_id = reaction.user.id
                        if user_id == request.user.id:
                            return getattr(reaction, 'reaction_type', None)
                return None
            
            # Otherwise query from DB
            if hasattr(obj, 'reactions'):
                try:
                    reaction = obj.reactions.get(user=request.user)
                    return reaction.reaction_type
                except MessageReaction.DoesNotExist:
                    return None
            return None
        except Exception:
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
            sender_avatar = None
            if hasattr(last_msg.sender, 'avatar') and last_msg.sender.avatar:
                try:
                    sender_avatar = last_msg.sender.avatar.url
                except:
                    sender_avatar = None
            return {
                'content': last_msg.content[:50] + '...' if len(last_msg.content) > 50 else last_msg.content,
                'created_at': last_msg.created_at,
                'sender_name': last_msg.sender.get_full_name(),
                'sender_avatar': sender_avatar
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
    subject = serializers.CharField(required=False, allow_blank=True, max_length=255) # Optional subject for new conversations
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
    
    # JSON filters
    # Expected structure: { 'gender': 'MALE', 'groups': [1,2], 'age_min': 12, 'age_max': 18, 'grade': 5, 'interests': [1,2,3] }
    filters = serializers.JSONField(required=False, default=dict)
    
    subject = serializers.CharField(max_length=255)
    content = serializers.CharField()
    attachment = serializers.ImageField(required=False)