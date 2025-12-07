from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, Max, Prefetch
from django.utils import timezone
from .models import Conversation, Message, MessageRecipient
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer, 
    CreateMessageSerializer, BroadcastSerializer, MessageSerializer
)
from .services import PermissionService, BroadcastService
from django.contrib.auth import get_user_model

User = get_user_model()

class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        """
        Complex Query:
        1. User is a participant (DMs)
        2. OR User has a MessageRecipient entry in that conversation (Broadcasts)
        3. Exclude 'Soft Deleted' conversations (logic: all messages deleted?)
           For MVP: We just check if they are part of it.
        """
        user = self.request.user
        
        # Subquery for unread count
        # We need to find conversations where the user has unread messages
        return Conversation.objects.filter(
            Q(participants=user) | 
            Q(messages__recipient_statuses__recipient=user)
        ).annotate(
            last_activity=Max('messages__created_at'),
            unread_count=Count(
                'messages__recipient_statuses',
                filter=Q(
                    messages__recipient_statuses__recipient=user,
                    messages__recipient_statuses__is_read=False
                )
            )
        ).order_by('-last_activity').distinct()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Mark all messages in this conversation as read for this user
        unread = MessageRecipient.objects.filter(
            message__conversation=instance,
            recipient=request.user,
            is_read=False
        )
        if unread.exists():
            unread.update(is_read=True, read_at=timezone.now())
            
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a new 1:1 DM"""
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        recipient_id = serializer.validated_data.get('recipient_id')
        if not recipient_id:
            return Response({"error": "recipient_id required"}, status=400)
            
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        # 1. Check Permissions
        allowed, reason = PermissionService.can_start_conversation(request.user, recipient)
        if not allowed:
            return Response({"error": reason}, status=403)

        # 2. Check if DM already exists
        existing = Conversation.objects.filter(
            type=Conversation.Type.DM,
            participants=request.user
        ).filter(participants=recipient).distinct()
        
        if existing.exists():
            # Return existing thread
            return Response({'id': existing.first().id, 'status': 'existing'})

        # 3. Create New
        conv = Conversation.objects.create(type=Conversation.Type.DM)
        conv.participants.add(request.user, recipient)
        
        # 4. Send Message if content provided
        content = serializer.validated_data.get('content')
        if content:
            msg = Message.objects.create(
                conversation=conv,
                sender=request.user,
                content=content
            )
            # Create recipient entries
            MessageRecipient.objects.create(message=msg, recipient=recipient)
            MessageRecipient.objects.create(message=msg, recipient=request.user, is_read=True)

        return Response({'id': conv.id, 'status': 'created'})

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """Reply to an existing thread"""
        conversation = self.get_object()
        content = request.data.get('content')
        attachment = request.FILES.get('attachment')

        if not content and not attachment:
            return Response({"error": "Empty message"}, status=400)

        # Logic for Broadcast Replies (Spec 4.3):
        # If user is replying to a BROADCAST where they are NOT the sender,
        # we might need to spawn a NEW conversation (Contact Staff) logic.
        # However, for simplicity here, we assume the Frontend handles "Contact Staff"
        # by calling 'start' endpoint. 
        # This endpoint assumes you ARE allowed to post into THIS conversation object.
        
        # Basic Participant check
        if request.user not in conversation.participants.all():
             # Special case: Broadcast recipients aren't in 'participants' usually, 
             # but they cannot reply to the broadcast thread anyway.
             return Response({"error": "You cannot reply to this conversation directly."}, status=403)

        msg = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            attachment=attachment
        )

        # Notify all OTHER participants
        for p in conversation.participants.all():
            is_read = (p == request.user)
            MessageRecipient.objects.create(
                message=msg,
                recipient=p,
                is_read=is_read,
                read_at=timezone.now() if is_read else None
            )

        return Response(MessageSerializer(msg, context={'request': request}).data)


class BroadcastViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def estimate(self, request):
        """Returns count of users matching the filters"""
        # Only admins can use this
        if request.user.role not in [User.Role.SUPER_ADMIN, User.Role.MUNICIPALITY_ADMIN, User.Role.CLUB_ADMIN]:
            return Response({"error": "Unauthorized"}, status=403)

        recipients = BroadcastService.resolve_recipients(request.user, request.data)
        return Response({"count": recipients.count()})

    @action(detail=False, methods=['post'])
    def send(self, request):
        """Sends the broadcast"""
        # Permissions check
        if request.user.role not in [User.Role.SUPER_ADMIN, User.Role.MUNICIPALITY_ADMIN, User.Role.CLUB_ADMIN]:
            return Response({"error": "Unauthorized"}, status=403)

        serializer = BroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Resolve
        recipients = BroadcastService.resolve_recipients(
            request.user, 
            {
                'target_level': data['target_level'],
                'target_id': data.get('target_id'),
                'recipient_type': data['recipient_type'],
                'specific_filters': data.get('filters')
            }
        )
        
        count = recipients.count()
        if count == 0:
            return Response({"error": "No recipients found for these filters"}, status=400)

        # Send
        BroadcastService.send_broadcast(
            sender=request.user,
            recipients=recipients,
            subject=data['subject'],
            content=data['content'],
            attachment=data.get('attachment')
        )

        return Response({"status": "sent", "recipient_count": count})


class InboxViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = MessageRecipient.objects.filter(
            recipient=request.user,
            is_read=False,
            is_deleted=False
        ).count()
        return Response({"count": count})