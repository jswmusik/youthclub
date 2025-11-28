from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from .models import Reward, RewardUsage
from .serializers import RewardSerializer, RewardUsageSerializer

class RewardViewSet(viewsets.ModelViewSet):
    serializer_class = RewardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter rewards based on the Admin's scope (Section 2).
        """
        user = self.request.user
        queryset = Reward.objects.all().order_by('-created_at')

        # Super Admin sees everything
        if user.role == 'SUPER_ADMIN':
            return queryset

        # Municipality Admin sees rewards in their muni + rewards in clubs of their muni
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            return queryset.filter(
                Q(municipality=user.assigned_municipality) |
                Q(club__municipality=user.assigned_municipality)
            )

        # Club Admin sees only rewards in their club
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            return queryset.filter(club=user.assigned_club)

        # Regular users (Youth/Guardian) should not access this management endpoint
        # They will use a separate endpoint later to "see available rewards"
        return Reward.objects.none()

    def perform_create(self, serializer):
        """
        Automatically assign owner_role and scope based on the logged-in user.
        """
        user = self.request.user
        
        if user.role == 'SUPER_ADMIN':
            # Super Admin can create Global rewards (no muni/club)
            # OR they can manually assign them in the serializer if passed (not handled here for simplicity)
            serializer.save(owner_role='SUPER_ADMIN', municipality=None, club=None)
            
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            serializer.save(
                owner_role='MUNICIPALITY_ADMIN', 
                municipality=user.assigned_municipality,
                club=None
            )
            
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            serializer.save(
                owner_role='CLUB_ADMIN', 
                municipality=None, # Explicitly None, as it belongs to the Club specifically
                club=user.assigned_club
            )
        else:
            raise PermissionDenied("You do not have permission to create rewards.")

    @action(detail=False, methods=['get'])
    def analytics_overview(self, request):
        """
        Analytics for the Management Page (Section 10.A).
        """
        queryset = self.get_queryset()
        now = timezone.now().date()
        
        # 1. Totals
        total_created = queryset.count()
        
        # Active: is_active=True AND (expiration is None OR expiration > today)
        active_count = queryset.filter(
            Q(is_active=True) & 
            (Q(expiration_date__isnull=True) | Q(expiration_date__gte=now))
        ).count()
        
        expired_count = queryset.filter(expiration_date__lt=now).count()

        # 2. Usage Stats (Across all visible rewards)
        # We need to filter usages based on the rewards visible to this admin
        visible_reward_ids = queryset.values_list('id', flat=True)
        usages = RewardUsage.objects.filter(reward_id__in=visible_reward_ids)
        
        total_uses = usages.count()
        
        seven_days_ago = timezone.now() - timedelta(days=7)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        uses_7d = usages.filter(used_at__gte=seven_days_ago).count()
        uses_30d = usages.filter(used_at__gte=thirty_days_ago).count()

        return Response({
            "total_created": total_created,
            "active_rewards": active_count,
            "expired_rewards": expired_count,
            "total_uses": total_uses,
            "uses_last_7_days": uses_7d,
            "uses_last_30_days": uses_30d
        })

    @action(detail=True, methods=['get'])
    def analytics_detail(self, request, pk=None):
        """
        Analytics for a Single Reward Detail Page (Section 10.B).
        """
        reward = self.get_object()
        usages = reward.usages.all()
        now = timezone.now()

        total_uses = usages.count()
        uses_24h = usages.filter(used_at__gte=now - timedelta(hours=24)).count()
        uses_7d = usages.filter(used_at__gte=now - timedelta(days=7)).count()
        uses_30d = usages.filter(used_at__gte=now - timedelta(days=30)).count()

        days_remaining = None
        if reward.expiration_date:
            delta = (reward.expiration_date - now.date()).days
            days_remaining = max(delta, 0) # Don't return negative numbers

        return Response({
            "total_uses": total_uses,
            "uses_last_24h": uses_24h,
            "uses_last_7d": uses_7d,
            "uses_last_30d": uses_30d,
            "days_remaining": days_remaining
        })

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Returns the list of users who claimed this reward (Section 9).
        """
        reward = self.get_object()
        # Get usage history, newest first
        usages = reward.usages.select_related('user').order_by('-used_at')
        
        # Support pagination
        page = self.paginate_queryset(usages)
        if page is not None:
            serializer = RewardUsageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = RewardUsageSerializer(usages, many=True)
        return Response(serializer.data)