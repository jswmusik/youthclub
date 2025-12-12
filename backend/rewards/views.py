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
        For regular users, allow access to rewards they have usages for (for redemption).
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

        # Regular users (Youth/Guardian) can only see rewards they have usages for
        # This allows them to redeem rewards via the redeem action
        if user.role in ['YOUTH_MEMBER', 'GUARDIAN']:
            # Get reward IDs that the user has usages for
            reward_ids = RewardUsage.objects.filter(user=user).values_list('reward_id', flat=True).distinct()
            return queryset.filter(id__in=reward_ids)
        
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

        # 2. Usage Stats (Redeemed only)
        visible_reward_ids = queryset.values_list('id', flat=True)
        usages = RewardUsage.objects.filter(reward_id__in=visible_reward_ids, is_redeemed=True)
        
        total_uses = usages.count()
        
        seven_days_ago = timezone.now() - timedelta(days=7)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        uses_7d = usages.filter(redeemed_at__gte=seven_days_ago).count()
        uses_30d = usages.filter(redeemed_at__gte=thirty_days_ago).count()

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
        Analytics for a Single Reward Detail Page.
        Only counts REDEEMED rewards.
        """
        reward = self.get_object()
        # Filter for redeemed items only
        usages = reward.usages.filter(is_redeemed=True)
        now = timezone.now()

        total_uses = usages.count()
        uses_24h = usages.filter(redeemed_at__gte=now - timedelta(hours=24)).count()
        uses_7d = usages.filter(redeemed_at__gte=now - timedelta(days=7)).count()
        uses_30d = usages.filter(redeemed_at__gte=now - timedelta(days=30)).count()

        days_remaining = None
        if reward.expiration_date:
            delta = (reward.expiration_date - now.date()).days
            days_remaining = max(delta, 0)

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
        Returns the list of users who claimed (redeemed) this reward.
        Supports filtering by:
        - search: Search by user first name, last name, or email
        - date_from: Filter claims from this date onwards
        - date_to: Filter claims up to this date
        """
        reward = self.get_object()
        
        # Only show REDEEMED rewards, ordered by when they were redeemed
        usages = reward.usages.filter(is_redeemed=True).select_related('user', 'user__preferred_club').order_by('-redeemed_at')
        
        # Apply search filter
        search = request.query_params.get('search', '').strip()
        if search:
            usages = usages.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # Apply date filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            try:
                from datetime import datetime
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                usages = usages.filter(redeemed_at__date__gte=date_from_obj)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        if date_to:
            try:
                from datetime import datetime
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                usages = usages.filter(redeemed_at__date__lte=date_to_obj)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        page = self.paginate_queryset(usages)
        if page is not None:
            serializer = RewardUsageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = RewardUsageSerializer(usages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def redeem(self, request, pk=None):
        """
        The User claims/uses the reward.
        """
        reward = self.get_object()
        user = request.user

        # 1. Check if they have a granted (unredeemed) copy
        usage = RewardUsage.objects.filter(
            user=user, 
            reward=reward, 
            is_redeemed=False
        ).first()

        if usage:
            # Mark as used
            usage.is_redeemed = True
            usage.redeemed_at = timezone.now()
            usage.save()
            return Response({"status": "redeemed", "message": f"You have used {reward.name}!"})
        
        # 2. If no granted copy, check if it's an "Open" reward (No Triggers)
        # If a reward has NO triggers, it is available to everyone who matches targeting
        # So we create a record and mark it redeemed immediately.
        if not reward.active_triggers:
            # We must re-check eligibility logic here to be safe
            from .utils import is_user_eligible_for_reward
            if is_user_eligible_for_reward(user, reward):
                RewardUsage.objects.create(
                    user=user, 
                    reward=reward, 
                    is_redeemed=True,
                    redeemed_at=timezone.now()
                )
                return Response({"status": "redeemed", "message": f"You have used {reward.name}!"})
            else:
                return Response({"error": "You are not eligible for this reward."}, status=403)

        return Response({"error": "No active reward to redeem."}, status=400)

    @action(detail=False, methods=['get'], url_path='my-redemptions')
    def my_redemptions(self, request):
        """
        Returns all redeemed rewards for the current user.
        Used for activity feed - shows when rewards were redeemed.
        """
        user = request.user
        
        if user.role not in ['YOUTH_MEMBER', 'GUARDIAN']:
            raise PermissionDenied("This endpoint is only available for Youth Members and Guardians.")
        
        # Get all redeemed rewards for this user, ordered by redemption date (newest first)
        redemptions = RewardUsage.objects.filter(
            user=user,
            is_redeemed=True
        ).select_related('reward').order_by('-redeemed_at')
        
        # Serialize the data for activity feed
        data = []
        for usage in redemptions:
            reward_image = None
            if usage.reward and usage.reward.image:
                try:
                    reward_image = usage.reward.image.url
                except (ValueError, AttributeError):
                    reward_image = None
            
            data.append({
                'id': usage.id,
                'type': 'reward_redemption',
                'reward_id': usage.reward.id if usage.reward else None,
                'reward_name': usage.reward.name if usage.reward else 'Unknown Reward',
                'reward_description': usage.reward.description if usage.reward else '',
                'reward_image': reward_image,
                'sponsor': usage.reward.sponsor_name if usage.reward else '',
                'redeemed_at': usage.redeemed_at.isoformat() if usage.redeemed_at else None,
                'created_at': usage.created_at.isoformat() if usage.created_at else None,
            })
        
        return Response(data)