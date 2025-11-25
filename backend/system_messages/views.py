from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from users.permissions import IsSuperAdmin
from .models import SystemMessage, SystemMessageDismissal
from .serializers import SystemMessageSerializer

class SystemMessageViewSet(viewsets.ModelViewSet):
    queryset = SystemMessage.objects.all()
    serializer_class = SystemMessageSerializer

    def get_permissions(self):
        # Logged in users can view/dismiss their applicable messages
        if self.action in ['my_latest', 'active_list', 'dismiss', 'destroy']:
            return [IsAuthenticated()]
        # Municipality admins may delete non-sticky messages targeted to them
        if self.action in ['destroy']:
            return [IsAuthenticated()]
        # Only Super Admins can manage everything else (create/update)
        return [IsSuperAdmin()]

    @action(detail=False, methods=['get'])
    def my_latest(self, request):
        """
        Returns the SINGLE latest active message for the current user.
        Logic: Active + Targets User Role + Newest First.
        """
        user = request.user
        now = timezone.now()
        
        # Get all active messages (not expired)
        active_messages = SystemMessage.objects.filter(
            expires_at__gt=now
        ).order_by('-created_at')
        
        # Filter in Python for JSONField compatibility (works with SQLite and PostgreSQL)
        for msg in active_messages:
            target_roles = msg.target_roles if isinstance(msg.target_roles, list) else []
            # Check if message targets "ALL" or the user's specific role
            if "ALL" in target_roles or user.role in target_roles:
                return Response(SystemMessageSerializer(msg).data)
        
        return Response(None)

    @action(detail=False, methods=['get'])
    def active_list(self, request):
        """
        Returns ALL active messages for the user (for the 'Archive' view).
        """
        user = request.user
        now = timezone.now()
        
        # Get all active messages (not expired)
        active_messages = SystemMessage.objects.filter(
            expires_at__gt=now
        ).order_by('-created_at')
        
        # Filter in Python for JSONField compatibility (works with SQLite and PostgreSQL)
        matching_messages = []
        dismissed_ids = set(
            SystemMessageDismissal.objects.filter(user=user).values_list('message_id', flat=True)
        )
        for msg in active_messages:
            target_roles = msg.target_roles if isinstance(msg.target_roles, list) else []
            # Check if message targets "ALL" or the user's specific role
            if msg.id in dismissed_ids:
                continue
            if "ALL" in target_roles or user.role in target_roles:
                matching_messages.append(msg)

        return Response(SystemMessageSerializer(matching_messages, many=True).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        target_roles = instance.target_roles if isinstance(instance.target_roles, list) else []
        can_access = "ALL" in target_roles or getattr(user, 'role', None) in target_roles

        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            return super().destroy(request, *args, **kwargs)

        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and can_access:
            if instance.is_sticky:
                raise PermissionDenied("Sticky messages cannot be dismissed.")
            SystemMessageDismissal.objects.get_or_create(user=user, message=instance)
            return Response(status=204)

        raise PermissionDenied("You do not have permission to delete this message.")

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='dismiss')
    def dismiss(self, request, pk=None):
        """
        Allows a user to dismiss a non-sticky message just for themselves.
        """
        user = request.user
        message = self.get_object()
        target_roles = message.target_roles if isinstance(message.target_roles, list) else []
        can_access = "ALL" in target_roles or getattr(user, 'role', None) in target_roles

        if not can_access:
            raise PermissionDenied("You do not have permission to dismiss this message.")

        if message.is_sticky and getattr(user, 'role', None) != 'SUPER_ADMIN':
            raise PermissionDenied("Sticky messages cannot be dismissed.")

        SystemMessageDismissal.objects.get_or_create(user=user, message=message)
        return Response({"status": "dismissed"})