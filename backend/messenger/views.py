from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, Max, Prefetch
from django.utils import timezone
from .models import Conversation, Message, MessageRecipient, ConversationUserStatus, MessageReaction
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer, 
    CreateMessageSerializer, BroadcastSerializer, MessageSerializer
)
from .services import PermissionService, BroadcastService
from django.contrib.auth import get_user_model
from users.models import GuardianYouthLink
from visits.models import CheckInSession
from users.serializers import UserListSerializer

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
        
        from django.db.models import Case, When, Value, DateTimeField, Subquery, OuterRef
        
        # First, get distinct conversation IDs where user is involved
        # Use the most direct ManyToMany lookup: participants=user
        # Also include conversations where user has received messages (for broadcasts)
        conversation_ids = list(
            Conversation.objects.filter(
            Q(participants=user) | 
            Q(messages__recipient_statuses__recipient=user)
            ).distinct().values_list('id', flat=True)
        )
        
        # Get user statuses for conversations
        user_statuses = ConversationUserStatus.objects.filter(
            user=user,
            conversation_id__in=conversation_ids
        ) if conversation_ids else ConversationUserStatus.objects.none()
        
        # Build sets of hidden and deleted conversation IDs
        hidden_ids = set()
        deleted_ids = set()
        hidden_with_timestamps = {}  # {conversation_id: hidden_at}
        
        for status in user_statuses:
            if status.is_deleted:
                deleted_ids.add(status.conversation_id)
            elif status.is_hidden:
                hidden_ids.add(status.conversation_id)
                if status.hidden_at:
                    hidden_with_timestamps[status.conversation_id] = status.hidden_at
        
        # Check which hidden conversations have new unread messages
        # If hidden_at exists and there are unread messages created after it, show the conversation
        hidden_with_new_messages = set()
        if hidden_ids:
            # Get conversations that have unread messages
            hidden_convs_with_unread = Conversation.objects.filter(
                id__in=hidden_ids,
                messages__recipient_statuses__recipient=user,
                messages__recipient_statuses__is_read=False
            ).distinct()
            
            for conv_id in hidden_convs_with_unread.values_list('id', flat=True):
                hidden_at = hidden_with_timestamps.get(conv_id)
                if hidden_at:
                    # Check if there are unread messages created after hidden_at
                    from django.db.models import Exists, OuterRef
                    has_new = Message.objects.filter(
                        conversation_id=conv_id,
                        recipient_statuses__recipient=user,
                        recipient_statuses__is_read=False,
                        created_at__gt=hidden_at
                    ).exists()
                    if has_new:
                        hidden_with_new_messages.add(conv_id)
                else:
                    # If no hidden_at timestamp, show it if it has unread messages
                    hidden_with_new_messages.add(conv_id)
        
        # Exclude deleted conversations
        # Exclude hidden conversations unless they have new messages
        visible_ids = set(conversation_ids) - deleted_ids
        visible_ids = visible_ids - hidden_ids | hidden_with_new_messages
        
        # If no visible conversations, return empty queryset
        if not visible_ids:
            return Conversation.objects.none()
        
        # Then fetch those conversations with annotations
        queryset = Conversation.objects.filter(id__in=list(visible_ids)).annotate(
            last_activity=Max('messages__created_at'),
            unread_count=Count(
                'messages__recipient_statuses',
                filter=Q(
                    messages__recipient_statuses__recipient=user,
                    messages__recipient_statuses__is_read=False
                )
            )
        ).annotate(
            # Use created_at as fallback if no messages exist yet
            sort_date=Case(
                When(last_activity__isnull=True, then='created_at'),
                default='last_activity',
                output_field=DateTimeField()
            )
        )
        
        # Apply filters from query parameters
        filter_type = self.request.query_params.get('filter', '').upper()
        search_query = self.request.query_params.get('search', '').strip()
        
        # Filter by type/participant role
        if filter_type == 'YOUTH':
            # Conversations with youth members as participants
            queryset = queryset.filter(
                Q(type=Conversation.Type.DM, participants__role='YOUTH_MEMBER') |
                Q(type=Conversation.Type.DM, messages__recipient_statuses__recipient__role='YOUTH_MEMBER')
            ).distinct()
        elif filter_type == 'GUARDIAN':
            # Conversations with guardians as participants
            queryset = queryset.filter(
                Q(type=Conversation.Type.DM, participants__role='GUARDIAN') |
                Q(type=Conversation.Type.DM, messages__recipient_statuses__recipient__role='GUARDIAN')
            ).distinct()
        elif filter_type == 'SYSTEM':
            # System and broadcast conversations
            queryset = queryset.filter(
                Q(type=Conversation.Type.SYSTEM) | Q(type=Conversation.Type.BROADCAST)
            )
        elif filter_type == 'GROUP':
            # Group conversations: EVENT type conversations or conversations with more than 2 participants
            queryset = queryset.annotate(
                participant_count=Count('participants')
            ).filter(
                Q(type=Conversation.Type.EVENT) | Q(participant_count__gt=2)
            )
        
        # Apply search filter (search in subject, participant names, or message content)
        if search_query:
            # Apply search directly to the queryset
            # This will search in subject, participant names/emails, and message content
            queryset = queryset.filter(
                Q(subject__icontains=search_query) |
                Q(participants__first_name__icontains=search_query) |
                Q(participants__last_name__icontains=search_query) |
                Q(participants__email__icontains=search_query) |
                Q(messages__content__icontains=search_query)
            ).distinct()
        
        queryset = queryset.order_by('-sort_date', '-created_at')
        
        # Add prefetching for better performance
        return queryset.prefetch_related(
            'participants',
            Prefetch(
                'messages',
                queryset=Message.objects.select_related('sender').order_by('-created_at')
            )
        )
    
    def list(self, request, *args, **kwargs):
        """
        Override list to ensure proper queryset with prefetching.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        # Get the conversation ID first
        conversation_id = kwargs.get('pk')
        
        # Mark all messages in this conversation as read for this user
        unread = MessageRecipient.objects.filter(
            message__conversation_id=conversation_id,
            recipient=request.user,
            is_read=False
        )
        if unread.exists():
            unread.update(is_read=True, read_at=timezone.now())
        
        # Fetch conversation with prefetched messages and reactions
        instance = Conversation.objects.prefetch_related(
            'participants',
            Prefetch(
                'messages',
                queryset=Message.objects.select_related('sender').prefetch_related(
                    Prefetch(
                        'reactions',
                        queryset=MessageReaction.objects.select_related('user')
                    ),
                    'recipient_statuses'
                ).order_by('created_at')
            )
        ).get(id=conversation_id)
            
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

        # 2. Check if DM already exists (excluding deleted conversations)
        existing = Conversation.objects.filter(
            type=Conversation.Type.DM,
            participants=request.user
        ).filter(participants=recipient).distinct()
        
        # Exclude conversations that are deleted for EITHER participant
        # If either user deleted it, treat it as non-existent so a new conversation can be created
        deleted_conversation_ids = ConversationUserStatus.objects.filter(
            user__in=[request.user, recipient],
            conversation__in=existing,
            is_deleted=True
        ).values_list('conversation_id', flat=True).distinct()
        
        existing = existing.exclude(id__in=deleted_conversation_ids)
        
        if existing.exists():
            conv = existing.first()
            
            # Update subject if provided (overrides old subject)
            subject = serializer.validated_data.get('subject', '').strip()
            if subject:
                conv.subject = subject
                conv.save(update_fields=['subject'])
            
            # If content or attachment provided, send message to existing conversation
            content = serializer.validated_data.get('content')
            attachment = serializer.validated_data.get('attachment')
            
            if content or attachment:
                msg = Message.objects.create(
                    conversation=conv,
                    sender=request.user,
                    content=content or '',
                    attachment=attachment
                )
                # Create recipient entries for both participants
                MessageRecipient.objects.create(
                    message=msg, 
                    recipient=recipient,
                    is_read=False
                )
                MessageRecipient.objects.create(
                    message=msg, 
                    recipient=request.user, 
                    is_read=True,
                    read_at=timezone.now()
                )
            
            # Return existing thread
            return Response({'id': conv.id, 'status': 'existing'})

        # 3. Create New - Subject is REQUIRED for new conversations
        subject = serializer.validated_data.get('subject', '').strip()
        if not subject:
            return Response({"error": "Subject is required for new conversations"}, status=400)
        
        conv = Conversation.objects.create(
            type=Conversation.Type.DM,
            subject=subject
        )
        conv.participants.add(request.user, recipient)
        
        # 4. Send Message if content or attachment provided
        content = serializer.validated_data.get('content')
        attachment = serializer.validated_data.get('attachment')
        
        if content or attachment:
            msg = Message.objects.create(
                conversation=conv,
                sender=request.user,
                content=content or '',
                attachment=attachment
            )
            # Create recipient entries for both participants
            MessageRecipient.objects.create(
                message=msg, 
                recipient=recipient,
                is_read=False
            )
            MessageRecipient.objects.create(
                message=msg, 
                recipient=request.user, 
                is_read=True,
                read_at=timezone.now()
            )

        return Response({'id': conv.id, 'status': 'created'})
    
    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        """
        Hide a conversation from the inbox.
        It will reappear when a new message arrives.
        """
        conversation = self.get_object()
        user = request.user
        
        # Check if user has access to this conversation
        if not (conversation.participants.filter(id=user.id).exists() or 
                conversation.messages.filter(recipient_statuses__recipient=user).exists()):
            return Response({"error": "You don't have access to this conversation"}, status=403)
        
        # Create or update user status
        status_obj, created = ConversationUserStatus.objects.get_or_create(
            conversation=conversation,
            user=user,
            defaults={'is_hidden': True, 'hidden_at': timezone.now()}
        )
        
        if not created:
            status_obj.is_hidden = True
            status_obj.hidden_at = timezone.now()
            status_obj.is_deleted = False  # Un-delete if it was deleted
            status_obj.deleted_at = None
            status_obj.save()
        
        return Response({'status': 'hidden', 'message': 'Conversation hidden from inbox'})
    
    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        """
        Permanently delete a conversation.
        For DMs: Deletes for ALL participants (both users see it deleted).
        For broadcasts: Requires admin permission, deletes only for the admin.
        """
        conversation = self.get_object()
        user = request.user
        
        # Check if user has access to this conversation
        if not (conversation.participants.filter(id=user.id).exists() or 
                conversation.messages.filter(recipient_statuses__recipient=user).exists()):
            return Response({"error": "You don't have access to this conversation"}, status=403)
        
        # For broadcasts, check if user is admin
        if conversation.type == Conversation.Type.BROADCAST and user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return Response({"error": "Only admins can delete broadcast conversations"}, status=403)
        
        # For DMs: Delete for ALL participants
        if conversation.type == Conversation.Type.DM:
            # Get all participants
            participants = conversation.participants.all()
            
            # Mark conversation as deleted for all participants
            for participant in participants:
                status_obj, created = ConversationUserStatus.objects.get_or_create(
                    conversation=conversation,
                    user=participant,
                    defaults={'is_deleted': True, 'deleted_at': timezone.now(), 'is_hidden': False}
                )
                
                if not created:
                    status_obj.is_deleted = True
                    status_obj.deleted_at = timezone.now()
                    status_obj.is_hidden = False  # Un-hide if it was hidden
                    status_obj.hidden_at = None
                    status_obj.save()
            
            return Response({
                'status': 'deleted', 
                'message': 'Conversation permanently deleted for all participants'
            })
        
        # For broadcasts: Delete only for the requesting admin
        else:
            status_obj, created = ConversationUserStatus.objects.get_or_create(
                conversation=conversation,
                user=user,
                defaults={'is_deleted': True, 'deleted_at': timezone.now(), 'is_hidden': False}
            )
            
            if not created:
                status_obj.is_deleted = True
                status_obj.deleted_at = timezone.now()
                status_obj.is_hidden = False  # Un-hide if it was hidden
                status_obj.hidden_at = None
                status_obj.save()
            
            return Response({'status': 'deleted', 'message': 'Conversation permanently deleted'})

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


class MessageViewSet(viewsets.ViewSet):
    """
    ViewSet for message-specific actions like reactions.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_message(self, message_id):
        """Helper to get message and check permissions"""
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            raise NotFound("Message not found")
        
        # Check if user has access to this message (is participant or recipient)
        user = self.request.user
        has_access = (
            message.conversation.participants.filter(id=user.id).exists() or
            message.recipient_statuses.filter(recipient=user).exists()
        )
        
        if not has_access:
            raise PermissionDenied("You don't have access to this message")
        
        return message
    
    @action(detail=False, methods=['post', 'put', 'delete'], url_path='(?P<message_id>[^/.]+)/reaction')
    def reaction(self, request, message_id=None):
        """
        Add, update, or remove a reaction to a message.
        POST: Add reaction (or update if exists)
        PUT: Update reaction type
        DELETE: Remove reaction
        """
        message = self.get_message(message_id)
        user = request.user
        
        # Get reaction type from request (defaults to LIKE)
        reaction_type = request.data.get('reaction_type', 'LIKE')
        if reaction_type not in [choice[0] for choice in MessageReaction.ReactionType.choices]:
            reaction_type = 'LIKE'
        
        if request.method == 'POST':
            # Add a reaction (or update if user already reacted with different type)
            reaction, created = MessageReaction.objects.get_or_create(
                message=message,
                user=user,
                defaults={'reaction_type': reaction_type}
            )
            
            if not created:
                # User already reacted, update the reaction type
                reaction.reaction_type = reaction_type
                reaction.save()
            
            # Get reaction breakdown
            from django.db.models import Count
            reaction_breakdown = message.reactions.values('reaction_type').annotate(count=Count('id'))
            reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
            
            return Response({
                "message": "Reaction added successfully.",
                "reaction_type": reaction_type,
                "reaction_count": message.reactions.count(),
                "reaction_breakdown": reaction_dict,
                "user_reaction": reaction_type
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            # Update existing reaction
            try:
                reaction = MessageReaction.objects.get(message=message, user=user)
                reaction.reaction_type = reaction_type
                reaction.save()
                
                # Get reaction breakdown
                from django.db.models import Count
                reaction_breakdown = message.reactions.values('reaction_type').annotate(count=Count('id'))
                reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
                
                return Response({
                    "message": "Reaction updated successfully.",
                    "reaction_type": reaction_type,
                    "reaction_count": message.reactions.count(),
                    "reaction_breakdown": reaction_dict,
                    "user_reaction": reaction_type
                }, status=status.HTTP_200_OK)
            except MessageReaction.DoesNotExist:
                # Create new reaction if it doesn't exist
                reaction = MessageReaction.objects.create(
                    message=message,
                    user=user,
                    reaction_type=reaction_type
                )
                
                from django.db.models import Count
                reaction_breakdown = message.reactions.values('reaction_type').annotate(count=Count('id'))
                reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
                
                return Response({
                    "message": "Reaction added successfully.",
                    "reaction_type": reaction_type,
                    "reaction_count": message.reactions.count(),
                    "reaction_breakdown": reaction_dict,
                    "user_reaction": reaction_type
                }, status=status.HTTP_201_CREATED)
        
        elif request.method == 'DELETE':
            # Remove reaction (optionally filter by reaction_type)
            delete_reaction_type = request.data.get('reaction_type', None)
            if delete_reaction_type:
                deleted = MessageReaction.objects.filter(
                    message=message, 
                    user=user, 
                    reaction_type=delete_reaction_type
                ).delete()[0]
            else:
                # Delete all reactions from this user for this message
                deleted = MessageReaction.objects.filter(message=message, user=user).delete()[0]
            
            if deleted:
                from django.db.models import Count
                reaction_breakdown = message.reactions.values('reaction_type').annotate(count=Count('id'))
                reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
                
                return Response({
                    "message": "Reaction removed successfully.",
                    "reaction_count": message.reactions.count(),
                    "reaction_breakdown": reaction_dict,
                    "user_reaction": None
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "message": "No reaction found to remove.",
                    "reaction_count": message.reactions.count(),
                    "reaction_breakdown": {},
                    "user_reaction": None
                }, status=status.HTTP_200_OK)


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
    
    @action(detail=False, methods=['get'])
    def search_users(self, request):
        """
        Search for users that the current admin can message.
        Filters based on admin role and permissions.
        Query params: q (search query), user_type (YOUTH, GUARDIAN, STAFF)
        """
        user = request.user
        
        # Only admins can use this endpoint
        if user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return Response({"error": "Unauthorized"}, status=403)
        
        search_query = request.query_params.get('q', '').strip()
        user_type = request.query_params.get('user_type', '').upper()  # YOUTH, GUARDIAN, STAFF
        
        if not search_query:
            return Response({"results": []})
        
        # Build base queryset based on user type
        queryset = User.objects.filter(is_active=True)
        
        if user_type == 'YOUTH':
            queryset = queryset.filter(role='YOUTH_MEMBER')
        elif user_type == 'GUARDIAN':
            queryset = queryset.filter(role='GUARDIAN')
        elif user_type == 'STAFF':
            # Staff includes CLUB_ADMIN and MUNICIPALITY_ADMIN
            queryset = queryset.filter(role__in=['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN'])
        else:
            # If no type specified, search all contactable users
            queryset = queryset.filter(role__in=['YOUTH_MEMBER', 'GUARDIAN', 'CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN'])
        
        # Apply search filter
        queryset = queryset.filter(
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(nickname__icontains=search_query)
        )
        
        # Apply permission-based filtering
        if user.role == 'CLUB_ADMIN':
            club = user.assigned_club
            if not club:
                return Response({"results": []})
            
            # Filter based on club admin permissions
            if user_type == 'STAFF':
                # Other admins in same club
                queryset = queryset.filter(role__in=['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN'])
                queryset = queryset.filter(
                    Q(assigned_club=club) | 
                    Q(role='SUPER_ADMIN') |
                    Q(role='MUNICIPALITY_ADMIN', assigned_club__municipality=club.municipality)
                )
            elif user_type == 'YOUTH':
                # Youth: preferred club, followers, or visited
                # Get all youth IDs that match search AND are connected to club
                youth_ids = set()
                
                # Preferred club (with search filter)
                preferred = User.objects.filter(
                    role='YOUTH_MEMBER',
                    is_active=True,
                    preferred_club=club
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                youth_ids.update(preferred)
                
                # Followers (with search filter)
                followers = User.objects.filter(
                    role='YOUTH_MEMBER',
                    is_active=True,
                    followed_clubs=club
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                youth_ids.update(followers)
                
                # Visited the club (with search filter)
                visited_user_ids = CheckInSession.objects.filter(club=club).values_list('user_id', flat=True).distinct()
                visited = User.objects.filter(
                    id__in=visited_user_ids,
                    role='YOUTH_MEMBER',
                    is_active=True
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                youth_ids.update(visited)
                
                queryset = queryset.filter(id__in=youth_ids)
            elif user_type == 'GUARDIAN':
                # Guardians linked to youth in this club (with search filter)
                guardian_ids = GuardianYouthLink.objects.filter(
                    youth__preferred_club=club
                ).values_list('guardian_id', flat=True).distinct()
                # Apply search filter to guardians
                queryset = queryset.filter(id__in=guardian_ids)
            else:
                # All types - combine all filters (with search already applied)
                all_ids = set()
                
                # Staff (with search filter)
                staff = User.objects.filter(
                    role__in=['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN'],
                    is_active=True
                ).filter(
                    Q(assigned_club=club) | 
                    Q(role='SUPER_ADMIN') |
                    Q(role='MUNICIPALITY_ADMIN', assigned_club__municipality=club.municipality)
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                all_ids.update(staff)
                
                # Youth (with search filter) - preferred, followers, or visited
                youth_ids = set()
                preferred_youth = User.objects.filter(
                    role='YOUTH_MEMBER',
                    is_active=True,
                    preferred_club=club
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                youth_ids.update(preferred_youth)
                
                followers_youth = User.objects.filter(
                    role='YOUTH_MEMBER',
                    is_active=True,
                    followed_clubs=club
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                youth_ids.update(followers_youth)
                
                visited_user_ids = CheckInSession.objects.filter(club=club).values_list('user_id', flat=True).distinct()
                visited_youth = User.objects.filter(
                    id__in=visited_user_ids,
                    role='YOUTH_MEMBER',
                    is_active=True
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                youth_ids.update(visited_youth)
                all_ids.update(youth_ids)
                
                # Guardians (with search filter)
                guardian_ids_list = GuardianYouthLink.objects.filter(
                    youth__preferred_club=club
                ).values_list('guardian_id', flat=True).distinct()
                guardians = User.objects.filter(
                    id__in=guardian_ids_list,
                    role='GUARDIAN',
                    is_active=True
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(email__icontains=search_query) |
                    Q(nickname__icontains=search_query)
                ).values_list('id', flat=True)
                all_ids.update(guardians)
                
                queryset = queryset.filter(id__in=all_ids)
        
        elif user.role == 'MUNICIPALITY_ADMIN':
            municipality = user.assigned_municipality
            if not municipality:
                return Response({"results": []})
            
            # Filter based on municipality admin permissions
            if user_type == 'STAFF':
                queryset = queryset.filter(
                    Q(role__in=['MUNICIPALITY_ADMIN', 'CLUB_ADMIN', 'SUPER_ADMIN']) &
                    (
                        Q(assigned_municipality=municipality) |
                        Q(assigned_club__municipality=municipality) |
                        Q(role='SUPER_ADMIN')
                    )
                )
            elif user_type == 'YOUTH':
                queryset = queryset.filter(
                    preferred_club__municipality=municipality
                )
            elif user_type == 'GUARDIAN':
                guardian_ids = GuardianYouthLink.objects.filter(
                    youth__preferred_club__municipality=municipality
                ).values_list('guardian_id', flat=True).distinct()
                queryset = queryset.filter(id__in=guardian_ids)
        
        elif user.role == 'SUPER_ADMIN':
            # Super admin can contact anyone
            pass  # No filtering needed
        
        # Limit results
        queryset = queryset[:50]
        
        # Serialize results
        serializer = UserListSerializer(queryset, many=True)
        return Response({"results": serializer.data})
    
    @action(detail=False, methods=['get'])
    def search_admins(self, request):
        """
        Search for admins that youth members can contact.
        Youth can contact:
        - Admins within their municipality
        - Admins of clubs they follow (even if different municipality)
        Query params: q (search query)
        """
        user = request.user
        
        # Only youth members can use this endpoint
        if user.role != 'YOUTH_MEMBER':
            return Response({"error": "Unauthorized"}, status=403)
        
        search_query = request.query_params.get('q', '').strip()
        
        if not search_query:
            return Response({"results": []})
        
        # Build base queryset for admins (EXCLUDE SUPER_ADMIN)
        queryset = User.objects.filter(
            is_active=True,
            role__in=['CLUB_ADMIN', 'MUNICIPALITY_ADMIN']
        )
        
        # Apply search filter
        queryset = queryset.filter(
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(nickname__icontains=search_query)
        )
        
        # Get youth's municipality (from preferred_club)
        youth_municipality = None
        if user.preferred_club and user.preferred_club.municipality:
            youth_municipality = user.preferred_club.municipality
        
        # Get clubs the youth follows
        followed_club_ids = list(user.followed_clubs.values_list('id', flat=True))
        
        # Build filter: admins youth can contact
        admin_filters = Q()
        
        # 1. Admins in youth's municipality (only if youth has a municipality)
        if youth_municipality:
            admin_filters |= Q(
                Q(role='MUNICIPALITY_ADMIN', assigned_municipality=youth_municipality) |
                Q(role='CLUB_ADMIN', assigned_club__municipality=youth_municipality)
            )
        
        # 2. Admins of clubs the youth follows (even if outside their municipality)
        if followed_club_ids:
            admin_filters |= Q(
                role='CLUB_ADMIN',
                assigned_club__id__in=followed_club_ids
            )
        
        # If no filters match, return empty
        if not admin_filters:
            return Response({"results": []})
        
        queryset = queryset.filter(admin_filters).distinct()
        
        # Limit results
        queryset = queryset[:50]
        
        # Serialize results with club/municipality info
        results = []
        for admin in queryset:
            admin_data = {
                'id': admin.id,
                'email': admin.email,
                'first_name': admin.first_name,
                'last_name': admin.last_name,
                'nickname': admin.nickname,
                'role': admin.role,
                'avatar_url': admin.avatar.url if admin.avatar else None,
            }
            
            # Add club/municipality information
            if admin.role == 'CLUB_ADMIN' and admin.assigned_club:
                admin_data['club'] = {
                    'id': admin.assigned_club.id,
                    'name': admin.assigned_club.name,
                    'municipality': admin.assigned_club.municipality.name if admin.assigned_club.municipality else None,
                }
                # Check if this club is in youth's municipality or if youth follows it
                is_in_youth_municipality = (
                    youth_municipality and 
                    admin.assigned_club.municipality == youth_municipality
                )
                is_followed = admin.assigned_club.id in followed_club_ids
                admin_data['club']['is_in_youth_municipality'] = is_in_youth_municipality
                admin_data['club']['is_followed'] = is_followed
            elif admin.role == 'MUNICIPALITY_ADMIN' and admin.assigned_municipality:
                admin_data['municipality'] = {
                    'id': admin.assigned_municipality.id,
                    'name': admin.assigned_municipality.name,
                }
            
            results.append(admin_data)
        
        return Response({"results": results})