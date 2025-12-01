from django.utils import timezone
from .models import Reward, RewardUsage
# Import Notification model
from notifications.models import Notification

def is_user_eligible_for_reward(user, reward):
    """
    Checks if a user meets all targeting criteria for a reward.
    (Existing logic remains unchanged)
    """
    # 1. Active Check
    if not reward.is_active:
        return False
    
    # 2. Scope Check
    if reward.owner_role == 'MUNICIPALITY_ADMIN':
        user_muni = user.assigned_municipality
        if not user_muni and user.preferred_club:
            user_muni = user.preferred_club.municipality
        if user_muni != reward.municipality:
            return False
            
    if reward.owner_role == 'CLUB_ADMIN':
        user_club = user.assigned_club or user.preferred_club
        if user_club != reward.club:
            return False

    # 3. Member Type
    if reward.target_member_type != user.role:
        return False

    # 4. Demographics
    if reward.target_genders and user.legal_gender not in reward.target_genders:
        return False
    
    if reward.target_grades:
        if user.grade is None or user.grade not in reward.target_grades:
            return False
    
    # 5. Age
    if user.age is not None:
        if reward.min_age and user.age < reward.min_age: 
            return False
        if reward.max_age and user.age > reward.max_age: 
            return False

    # 6. Usage Limit
    if reward.usage_limit:
        count = RewardUsage.objects.filter(user=user, reward=reward).count()
        if count >= reward.usage_limit:
            return False

    return True

def grant_reward(user, reward):
    """
    Grants a reward to a user (UNLOCKED state).
    Creates a Notification and a RewardUsage record.
    """
    if is_user_eligible_for_reward(user, reward):
        # Check if they already have an UNREDEEMED copy of this reward
        exists = RewardUsage.objects.filter(
            user=user, 
            reward=reward, 
            is_redeemed=False
        ).exists()
        
        if exists:
            # Already has it, do nothing
            return False

        # 1. Create the record as AVAILABLE (not redeemed)
        usage = RewardUsage.objects.create(
            user=user, 
            reward=reward, 
            is_redeemed=False,
            redeemed_at=None
        )
        
        # 2. NEW: Create Notification
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
        
    return False