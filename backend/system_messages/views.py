from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q
from users.permissions import IsSuperAdmin
from .models import SystemMessage
from .serializers import SystemMessageSerializer

class SystemMessageViewSet(viewsets.ModelViewSet):
    queryset = SystemMessage.objects.all()
    serializer_class = SystemMessageSerializer

    def get_permissions(self):
        # Only logged in users can check their messages
        if self.action in ['my_latest', 'active_list']:
            return [IsAuthenticated()]
        # Only Super Admins can manage (create/delete) messages
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
        for msg in active_messages:
            target_roles = msg.target_roles if isinstance(msg.target_roles, list) else []
            # Check if message targets "ALL" or the user's specific role
            if "ALL" in target_roles or user.role in target_roles:
                matching_messages.append(msg)

        return Response(SystemMessageSerializer(matching_messages, many=True).data)