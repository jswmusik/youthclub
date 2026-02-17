"""
API views for audit logs.

Provides read-only access to audit logs for users and administrators.
"""

from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from datetime import timedelta
from django.utils import timezone

from .models import AuditLog
from .serializers import AuditLogSerializer, AuditLogSummarySerializer


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission that allows users to view their own audit logs,
    and admins to view all audit logs in their scope.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # User can view their own audit logs
        if obj.user == request.user:
            return True
        
        # Admins can view audit logs in their scope
        if request.user.role == 'SUPER_ADMIN':
            return True
        
        if request.user.role == 'MUNICIPALITY_ADMIN' and request.user.assigned_municipality:
            # Check if the log relates to their municipality
            if obj.user and hasattr(obj.user, 'assigned_municipality'):
                return obj.user.assigned_municipality == request.user.assigned_municipality
        
        if request.user.role == 'CLUB_ADMIN' and request.user.assigned_club:
            # Check if the log relates to their club
            if obj.user and hasattr(obj.user, 'assigned_club'):
                return obj.user.assigned_club == request.user.assigned_club
        
        return False


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing audit logs.
    
    - Users can view their own audit logs
    - Admins can view logs for users in their scope
    - All operations are read-only
    """
    
    permission_classes = [IsOwnerOrAdmin]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name']
    search_fields = ['object_repr', 'reason', 'endpoint']
    ordering_fields = ['timestamp', 'action']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """
        Filter audit logs based on user role.
        """
        user = self.request.user
        queryset = AuditLog.objects.select_related('user', 'admin_user')
        
        # Super admin sees all logs
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # Municipality admin sees logs for their municipality
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            return queryset.filter(
                user__assigned_municipality=user.assigned_municipality
            )
        
        # Club admin sees logs for their club
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            return queryset.filter(
                user__assigned_club=user.assigned_club
            )
        
        # Regular users see only their own logs
        return queryset.filter(user=user)
    
    def get_serializer_class(self):
        """Use summary serializer for list view"""
        if self.action == 'list':
            return AuditLogSummarySerializer
        return AuditLogSerializer
    
    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        """
        Get audit logs for the authenticated user.
        
        This is a convenience endpoint for users to see their own activity.
        """
        logs = AuditLog.objects.filter(user=request.user).order_by('-timestamp')[:50]
        serializer = AuditLogSummarySerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary statistics for audit logs.
        
        Returns:
        - Total logs
        - Logs by action type
        - Recent activity count
        """
        user = request.user
        
        # Get queryset based on user permissions
        if user.role == 'SUPER_ADMIN':
            queryset = AuditLog.objects.all()
        elif user.role in ['MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            queryset = self.get_queryset()
        else:
            queryset = AuditLog.objects.filter(user=user)
        
        # Calculate statistics
        total_logs = queryset.count()
        
        # Logs by action type
        by_action = queryset.values('action').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recent activity (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_count = queryset.filter(timestamp__gte=seven_days_ago).count()
        
        # Recent activity by day
        recent_by_day = []
        for i in range(7):
            day_start = timezone.now() - timedelta(days=i)
            day_end = day_start - timedelta(days=1)
            count = queryset.filter(
                timestamp__gte=day_end,
                timestamp__lt=day_start
            ).count()
            recent_by_day.append({
                'date': day_start.date().isoformat(),
                'count': count
            })
        
        return Response({
            'total_logs': total_logs,
            'by_action': list(by_action),
            'recent_count': recent_count,
            'recent_by_day': recent_by_day,
        })


