"""
Trigger Handlers for the Rewards System.

This module contains all the logic for processing reward triggers.
Each trigger type has its own handler class that determines eligibility
and grants rewards while preventing abuse (duplicate grants).
"""
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate
from datetime import timedelta

from .models import Reward, RewardUsage
from .utils import is_user_eligible_for_reward, grant_reward_with_context


class BaseTriggerHandler:
    """Base class for all trigger handlers"""
    
    trigger_type = None  # Override in subclass
    
    @classmethod
    def get_rewards_for_trigger(cls):
        """Get all active rewards with this trigger type that are not expired"""
        from django.db.models import Q
        
        if not cls.trigger_type:
            return Reward.objects.none()
        
        today = timezone.now().date()
        
        return Reward.objects.filter(
            active_triggers__icontains=cls.trigger_type,
            is_active=True
        ).filter(
            # Not expired: either no expiration date OR expiration date is today or in the future
            Q(expiration_date__isnull=True) | Q(expiration_date__gte=today)
        )
    
    @classmethod
    def has_received_trigger_reward(cls, user, reward, context_filter=None):
        """
        Check if user has EVER received this specific trigger reward.
        
        Args:
            user: The user to check
            reward: The reward to check
            context_filter: Optional dict to filter by trigger_context fields
        
        Returns:
            bool: True if user has already received this reward via this trigger
        """
        queryset = RewardUsage.objects.filter(
            user=user,
            reward=reward,
            trigger_type=cls.trigger_type
        )
        
        if context_filter:
            for key, value in context_filter.items():
                queryset = queryset.filter(**{f'trigger_context__{key}': value})
        
        return queryset.exists()


class FirstCheckinHandler(BaseTriggerHandler):
    """
    Handles FIRST_CHECKIN trigger.
    Grants reward when user checks in for the very first time.
    """
    trigger_type = 'FIRST_CHECKIN'
    
    @classmethod
    def process(cls, user, checkin_session):
        """
        Process first check-in trigger.
        
        Args:
            user: The user who checked in
            checkin_session: The CheckInSession object
        """
        from visits.models import CheckInSession
        
        # Count total check-ins for this user
        visit_count = CheckInSession.objects.filter(user=user).count()
        
        # Only trigger on the very first check-in
        if visit_count != 1:
            return
        
        print(f"🎉 First check-in detected for {user.email}")
        
        rewards = cls.get_rewards_for_trigger()
        for reward in rewards:
            # Check if user already received this reward (safety check)
            if cls.has_received_trigger_reward(user, reward):
                print(f"-> Skipped '{reward.name}' - user already received FIRST_CHECKIN reward")
                continue
            
            grant_reward_with_context(
                user=user,
                reward=reward,
                trigger_type=cls.trigger_type,
                trigger_context={'club_id': checkin_session.club_id}
            )


class CheckinStreakHandler(BaseTriggerHandler):
    """
    Handles CHECKIN_STREAK trigger.
    Grants reward when user checks in X unique days within Y days.
    
    trigger_config format:
    {
        "required_checkins": 5,  # Number of unique days required
        "within_days": 10        # Time window in days
    }
    """
    trigger_type = 'CHECKIN_STREAK'
    
    @classmethod
    def process(cls, user, checkin_session):
        """
        Process check-in streak trigger.
        Called after each check-in to evaluate streak progress.
        """
        from visits.models import CheckInSession
        
        rewards = cls.get_rewards_for_trigger()
        
        for reward in rewards:
            config = reward.trigger_config or {}
            required_checkins = config.get('required_checkins', 5)
            within_days = config.get('within_days', 10)
            
            # Build context key for this specific streak configuration
            context_key = f"{required_checkins}_in_{within_days}"
            
            # Check if user already received this specific streak reward
            if cls.has_received_trigger_reward(user, reward, {'streak_config': context_key}):
                continue
            
            # Count unique check-in days within the time window
            cutoff_date = timezone.now() - timedelta(days=within_days)
            
            distinct_days = CheckInSession.objects.filter(
                user=user,
                check_in_at__gte=cutoff_date
            ).annotate(
                checkin_date=TruncDate('check_in_at')
            ).values('checkin_date').distinct().count()
            
            if distinct_days >= required_checkins:
                print(f"🔥 Check-in streak achieved for {user.email}: {distinct_days} days in {within_days} days")
                grant_reward_with_context(
                    user=user,
                    reward=reward,
                    trigger_type=cls.trigger_type,
                    trigger_context={
                        'streak_config': context_key,
                        'days_achieved': distinct_days,
                        'within_days': within_days
                    }
                )


class CheckinMilestoneHandler(BaseTriggerHandler):
    """
    Handles CHECKIN_MILESTONE trigger.
    Grants reward when user reaches a specific number of total check-ins (unique days).
    
    trigger_config format:
    {
        "milestone_count": 50  # Total unique days required
    }
    """
    trigger_type = 'CHECKIN_MILESTONE'
    
    @classmethod
    def process(cls, user, checkin_session):
        """
        Process check-in milestone trigger.
        Called after each check-in to evaluate milestone progress.
        """
        from visits.models import CheckInSession
        
        rewards = cls.get_rewards_for_trigger()
        
        for reward in rewards:
            config = reward.trigger_config or {}
            milestone_count = config.get('milestone_count', 10)
            
            # Check if user already received this specific milestone reward
            if cls.has_received_trigger_reward(user, reward, {'milestone_reached': milestone_count}):
                continue
            
            # Count total unique check-in days (all time)
            total_unique_days = CheckInSession.objects.filter(
                user=user
            ).annotate(
                checkin_date=TruncDate('check_in_at')
            ).values('checkin_date').distinct().count()
            
            if total_unique_days >= milestone_count:
                print(f"🏆 Check-in milestone reached for {user.email}: {total_unique_days} unique days (milestone: {milestone_count})")
                grant_reward_with_context(
                    user=user,
                    reward=reward,
                    trigger_type=cls.trigger_type,
                    trigger_context={
                        'milestone_reached': milestone_count,
                        'total_days': total_unique_days
                    }
                )


class EventAttendedHandler(BaseTriggerHandler):
    """
    Handles EVENT_ATTENDED trigger.
    Grants reward when user checks in to a specific event using their ticket.
    
    trigger_config format:
    {
        "event_ids": [123, 456]  # List of event IDs that qualify
    }
    """
    trigger_type = 'EVENT_ATTENDED'
    
    @classmethod
    def process(cls, user, event_ticket):
        """
        Process event attended trigger.
        Called when a ticket is checked in.
        
        Args:
            user: The user who attended
            event_ticket: The EventTicket object that was checked in
        """
        event = event_ticket.registration.event
        event_id = event.id
        
        print(f"📅 Event attendance detected for {user.email} at event {event.title} (ID: {event_id})")
        
        rewards = cls.get_rewards_for_trigger()
        
        for reward in rewards:
            config = reward.trigger_config or {}
            event_ids = config.get('event_ids', [])
            
            # Check if this event qualifies for this reward
            if event_id not in event_ids:
                continue
            
            # Check if user already received reward for this specific event
            if cls.has_received_trigger_reward(user, reward, {'event_id': event_id}):
                print(f"-> Skipped '{reward.name}' - user already received reward for event {event_id}")
                continue
            
            grant_reward_with_context(
                user=user,
                reward=reward,
                trigger_type=cls.trigger_type,
                trigger_context={
                    'event_id': event_id,
                    'event_title': event.title
                }
            )


class JoinedGroupHandler(BaseTriggerHandler):
    """
    Handles JOINED_GROUP trigger.
    Grants reward when user joins a specific group.
    
    trigger_config format:
    {
        "group_id": 45  # The group ID that qualifies
    }
    """
    trigger_type = 'JOINED_GROUP'
    
    @classmethod
    def process(cls, user, group_membership):
        """
        Process joined group trigger.
        Called when a group membership is approved.
        
        Args:
            user: The user who joined
            group_membership: The GroupMembership object
        """
        from groups.models import GroupMembership
        
        # Only trigger on approved memberships
        if group_membership.status != GroupMembership.Status.APPROVED:
            return
        
        group = group_membership.group
        group_id = group.id
        
        print(f"👥 Group join detected for {user.email} in group {group.name} (ID: {group_id})")
        
        rewards = cls.get_rewards_for_trigger()
        
        for reward in rewards:
            config = reward.trigger_config or {}
            target_group_id = config.get('group_id')
            
            # Check if this group qualifies for this reward
            if target_group_id != group_id:
                continue
            
            # Check if user already received reward for joining this group
            # This prevents abuse from leaving and rejoining
            if cls.has_received_trigger_reward(user, reward, {'group_id': group_id}):
                print(f"-> Skipped '{reward.name}' - user already received reward for group {group_id}")
                continue
            
            grant_reward_with_context(
                user=user,
                reward=reward,
                trigger_type=cls.trigger_type,
                trigger_context={
                    'group_id': group_id,
                    'group_name': group.name
                }
            )


class AnniversaryHandler(BaseTriggerHandler):
    """
    Handles ANNIVERSARY trigger.
    Grants reward on user's account anniversary (yearly).
    This is processed by a scheduled task, not real-time.
    """
    trigger_type = 'ANNIVERSARY'
    
    @classmethod
    def process_for_user(cls, user):
        """
        Process anniversary trigger for a single user.
        Called by the scheduled task for users whose anniversary is today.
        
        Args:
            user: The user to check
        """
        today = timezone.now().date()
        join_date = user.date_joined.date()
        
        # Calculate years since joining
        years_since_joined = today.year - join_date.year
        
        # Must be at least 1 year
        if years_since_joined < 1:
            return
        
        print(f"🎂 Anniversary detected for {user.email}: {years_since_joined} year(s)")
        
        rewards = cls.get_rewards_for_trigger()
        
        for reward in rewards:
            # Check if user already received reward for this specific anniversary year
            if cls.has_received_trigger_reward(user, reward, {'anniversary_year': years_since_joined}):
                print(f"-> Skipped '{reward.name}' - user already received {years_since_joined}-year anniversary reward")
                continue
            
            grant_reward_with_context(
                user=user,
                reward=reward,
                trigger_type=cls.trigger_type,
                trigger_context={
                    'anniversary_year': years_since_joined,
                    'join_date': str(join_date)
                }
            )


class MostCheckedInHandler(BaseTriggerHandler):
    """
    Handles MOST_CHECKED_IN trigger.
    Grants reward to top N users with most check-ins (unique days) in a period.
    This is processed by a scheduled task, not real-time.
    Club-scoped only.
    
    trigger_config format:
    {
        "period": "WEEKLY",  # or "MONTHLY"
        "top_n": 10          # Number of top users to reward
    }
    """
    trigger_type = 'MOST_CHECKED_IN'
    
    @classmethod
    def process_for_club(cls, club, period='WEEKLY'):
        """
        Process most checked-in trigger for a specific club.
        Called by the scheduled task.
        
        Args:
            club: The Club object to process
            period: 'WEEKLY' or 'MONTHLY'
        """
        from visits.models import CheckInSession
        from users.models import User
        
        # Determine time window
        if period == 'WEEKLY':
            cutoff_date = timezone.now() - timedelta(days=7)
            period_key = f"week_{timezone.now().isocalendar()[1]}_{timezone.now().year}"
        else:  # MONTHLY
            cutoff_date = timezone.now() - timedelta(days=30)
            period_key = f"month_{timezone.now().month}_{timezone.now().year}"
        
        # Get rewards for this trigger that are scoped to this club
        rewards = cls.get_rewards_for_trigger().filter(club=club)
        
        for reward in rewards:
            config = reward.trigger_config or {}
            config_period = config.get('period', 'WEEKLY')
            top_n = config.get('top_n', 10)
            
            # Skip if period doesn't match
            if config_period != period:
                continue
            
            # Get top users by unique check-in days at this club
            top_users = CheckInSession.objects.filter(
                club=club,
                check_in_at__gte=cutoff_date
            ).annotate(
                checkin_date=TruncDate('check_in_at')
            ).values('user').annotate(
                unique_days=Count('checkin_date', distinct=True)
            ).order_by('-unique_days')[:top_n]
            
            print(f"🏅 Processing MOST_CHECKED_IN for {club.name} ({period}): Found {len(top_users)} top users")
            
            for rank, entry in enumerate(top_users, 1):
                user_id = entry['user']
                unique_days = entry['unique_days']
                
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    continue
                
                # Check if user already received reward for this period
                if cls.has_received_trigger_reward(user, reward, {'period_key': period_key, 'club_id': club.id}):
                    print(f"-> Skipped {user.email} - already received for {period_key}")
                    continue
                
                grant_reward_with_context(
                    user=user,
                    reward=reward,
                    trigger_type=cls.trigger_type,
                    trigger_context={
                        'period_key': period_key,
                        'club_id': club.id,
                        'club_name': club.name,
                        'rank': rank,
                        'unique_days': unique_days
                    }
                )


# Convenience function to process all check-in triggers at once
def process_checkin_triggers(user, checkin_session):
    """
    Process all check-in related triggers for a user.
    Called from visits/signals.py after a check-in is created.
    """
    FirstCheckinHandler.process(user, checkin_session)
    CheckinStreakHandler.process(user, checkin_session)
    CheckinMilestoneHandler.process(user, checkin_session)

