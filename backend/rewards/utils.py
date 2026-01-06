from django.utils import timezone
from .models import Reward, RewardUsage
from notifications.models import Notification


def is_user_eligible_for_reward(user, reward):
    """
    Checks if a user meets all targeting criteria for a reward.
    
    Checks performed:
    1. Active status
    2. Expiration date
    3. Scope (Municipality/Club ownership)
    4. Member type
    5. Demographics (gender, grade)
    6. Age range
    7. Target groups membership
    8. Target interests matching
    9. Global usage limit
    """
    # 1. Active Check
    if not reward.is_active:
        return False
    
    # 2. Expiration Check (FIXED: was missing)
    if reward.expiration_date and reward.expiration_date < timezone.now().date():
        return False
    
    # 3. Scope Check (FIXED: Super Admin rewards now respect their scope settings)
    if reward.owner_role == 'SUPER_ADMIN':
        # Super Admin rewards can optionally be scoped to municipality or club
        if reward.municipality:
            user_muni = user.assigned_municipality
            if not user_muni and user.preferred_club:
                user_muni = user.preferred_club.municipality
            if user_muni != reward.municipality:
                return False
        if reward.club:
            user_club = user.assigned_club or user.preferred_club
            if user_club != reward.club:
                return False
    elif reward.owner_role == 'MUNICIPALITY_ADMIN':
        user_muni = user.assigned_municipality
        if not user_muni and user.preferred_club:
            user_muni = user.preferred_club.municipality
        if user_muni != reward.municipality:
            return False
    elif reward.owner_role == 'CLUB_ADMIN':
        user_club = user.assigned_club or user.preferred_club
        if user_club != reward.club:
            return False

    # 4. Member Type
    if reward.target_member_type != user.role:
        return False

    # 5. Demographics
    if reward.target_genders and user.legal_gender not in reward.target_genders:
        return False
    
    if reward.target_grades:
        if user.grade is None or user.grade not in reward.target_grades:
            return False
    
    # 6. Age
    if user.age is not None:
        if reward.min_age and user.age < reward.min_age: 
            return False
        if reward.max_age and user.age > reward.max_age: 
            return False

    # 7. Target Groups Check (FIXED: was missing)
    # If reward targets specific groups, user must be a member of at least one
    if reward.target_groups.exists():
        from groups.models import GroupMembership
        user_group_ids = set(GroupMembership.objects.filter(
            user=user, 
            status='APPROVED'
        ).values_list('group_id', flat=True))
        
        target_group_ids = set(reward.target_groups.values_list('id', flat=True))
        if not target_group_ids.intersection(user_group_ids):
            return False
    
    # 8. Target Interests Check (FIXED: was missing)
    # If reward targets specific interests, user must have at least one matching interest
    if reward.target_interests.exists():
        user_interest_ids = set(user.interests.values_list('id', flat=True))
        target_interest_ids = set(reward.target_interests.values_list('id', flat=True))
        if not target_interest_ids.intersection(user_interest_ids):
            return False

    # 9. Global Usage Limit (FIXED: was per-user, now global)
    if reward.usage_limit:
        # Count ALL usages across ALL users for this reward
        total_count = RewardUsage.objects.filter(reward=reward).count()
        if total_count >= reward.usage_limit:
            return False

    return True


def grant_reward_with_context(user, reward, trigger_type, trigger_context=None):
    """
    Grants a reward to a user with trigger tracking.
    Creates a Notification and a RewardUsage record with trigger context.
    
    This is the preferred method for trigger-based rewards as it:
    - Tracks which trigger granted the reward
    - Stores context for deduplication (e.g., anniversary_year, birthday_year)
    - Prevents duplicate grants based on trigger context
    
    Args:
        user: The user to grant the reward to
        reward: The Reward object to grant
        trigger_type: String identifying which trigger granted this (e.g. 'BIRTHDAY')
        trigger_context: Dict with context data (e.g. {'birthday_year': 2024})
    
    Returns:
        bool: True if reward was granted, False otherwise
    """
    if not is_user_eligible_for_reward(user, reward):
        return False
    
    # Check if they already have an UNREDEEMED copy of this reward
    exists = RewardUsage.objects.filter(
        user=user, 
        reward=reward, 
        is_redeemed=False
    ).exists()
    
    if exists:
        # Already has it, do nothing
        return False

    # Create the record as AVAILABLE (not redeemed) with trigger context
    usage = RewardUsage.objects.create(
        user=user, 
        reward=reward, 
        is_redeemed=False,
        redeemed_at=None,
        trigger_type=trigger_type,
        trigger_context=trigger_context or {}
    )
    
    # Create Notification
    try:
        Notification.objects.create(
            recipient=user,
            category=Notification.Category.REWARD,
            title="🎁 New Reward Unlocked!",
            body=f"You have received a new reward: {reward.name}. Check your dashboard to claim it!",
            action_url="/dashboard/youth/profile?tab=wallet" 
        )
    except Exception as e:
        print(f"Error creating notification: {e}")

    print(f"-> Granted '{reward.name}' to {user.email} via {trigger_type} (Pending Redemption)")
    return True


def grant_reward(user, reward, trigger_type=None, trigger_context=None):
    """
    Grants a reward to a user (UNLOCKED state).
    Creates a Notification and a RewardUsage record.
    
    Args:
        user: The user to grant the reward to
        reward: The Reward object to grant
        trigger_type: Optional string identifying which trigger granted this
        trigger_context: Optional dict with context data for deduplication
    
    Returns:
        bool: True if reward was granted, False otherwise
    """
    # Use the context-aware version if trigger info is provided
    if trigger_type:
        return grant_reward_with_context(user, reward, trigger_type, trigger_context)
    
    if not is_user_eligible_for_reward(user, reward):
        return False
    
    # Check if they already have an UNREDEEMED copy of this reward
    exists = RewardUsage.objects.filter(
        user=user, 
        reward=reward, 
        is_redeemed=False
    ).exists()
    
    if exists:
        # Already has it, do nothing
        return False

    # Create the record as AVAILABLE (not redeemed)
    usage = RewardUsage.objects.create(
        user=user, 
        reward=reward, 
        is_redeemed=False,
        redeemed_at=None
    )
    
    # Create Notification
    try:
        Notification.objects.create(
            recipient=user,
            category=Notification.Category.REWARD,
            title="🎁 New Reward Unlocked!",
            body=f"You have received a new reward: {reward.name}. Check your dashboard to claim it!",
            action_url="/dashboard/youth/profile?tab=wallet" 
        )
    except Exception as e:
        print(f"Error creating notification: {e}")

    print(f"-> Granted '{reward.name}' to {user.email} (Pending Redemption)")
    return True


def has_received_trigger_reward(user, reward, trigger_type, context_filter=None):
    """
    Check if user has EVER received this specific trigger reward.
    
    Args:
        user: The user to check
        reward: The reward to check
        trigger_type: The trigger type string
        context_filter: Optional dict to filter by trigger_context fields
    
    Returns:
        bool: True if user has already received this reward via this trigger
    """
    queryset = RewardUsage.objects.filter(
        user=user,
        reward=reward,
        trigger_type=trigger_type
    )
    
    if context_filter:
        for key, value in context_filter.items():
            queryset = queryset.filter(**{f'trigger_context__{key}': value})
    
    return queryset.exists()
