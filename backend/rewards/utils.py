from django.utils import timezone
from .models import Reward, RewardUsage

def is_user_eligible_for_reward(user, reward):
    """
    Checks if a user meets all targeting criteria for a reward.
    """
    print(f"Checking eligibility for User: {user.email} vs Reward: {reward.name}")

    # 1. Active Check
    if not reward.is_active:
        print("-> Failed: Reward is inactive")
        return False
    
    # 2. Scope Check
    if reward.owner_role == 'MUNICIPALITY_ADMIN':
        user_muni = user.assigned_municipality
        if not user_muni and user.preferred_club:
            user_muni = user.preferred_club.municipality
        if user_muni != reward.municipality:
            print("-> Failed: Municipality scope mismatch")
            return False
            
    if reward.owner_role == 'CLUB_ADMIN':
        user_club = user.assigned_club or user.preferred_club
        if user_club != reward.club:
            print("-> Failed: Club scope mismatch")
            return False

    # 3. Member Type
    if reward.target_member_type != user.role:
        print(f"-> Failed: Role mismatch. Reward wants {reward.target_member_type}, User is {user.role}")
        return False

    # 4. Demographics
    if reward.target_genders and user.legal_gender not in reward.target_genders:
        print(f"-> Failed: Gender mismatch. Reward needs {reward.target_genders}")
        return False
    
    # Note: Ensure user.grade is not None before comparing if target_grades is set
    if reward.target_grades:
        if user.grade is None or user.grade not in reward.target_grades:
            print(f"-> Failed: Grade mismatch. User grade is {user.grade}")
            return False
    
    # 5. Age
    if user.age is not None:
        if reward.min_age and user.age < reward.min_age: 
            print(f"-> Failed: Too young ({user.age} < {reward.min_age})")
            return False
        if reward.max_age and user.age > reward.max_age: 
            print(f"-> Failed: Too old ({user.age} > {reward.max_age})")
            return False

    # 6. Usage Limit
    if reward.usage_limit:
        count = RewardUsage.objects.filter(user=user, reward=reward).count()
        if count >= reward.usage_limit:
            print("-> Failed: Usage limit reached")
            return False

    print("-> Success! Eligible.")
    return True

def grant_reward(user, reward):
    """
    Grants a reward to a user (UNLOCKED state).
    It does NOT mark it as redeemed yet.
    """
    if is_user_eligible_for_reward(user, reward):
        # Check if they already have an UNREDEEMED copy of this reward
        # We generally don't want to stack 5 "Welcome" rewards if the trigger fires 5 times by accident
        exists = RewardUsage.objects.filter(
            user=user, 
            reward=reward, 
            is_redeemed=False
        ).exists()
        
        if exists:
            print(f"-> Skipped: User already has an active copy of '{reward.name}'")
            return False

        # Create the record as AVAILABLE (not redeemed)
        RewardUsage.objects.create(
            user=user, 
            reward=reward, 
            is_redeemed=False,
            redeemed_at=None
        )
        print(f"-> Granted '{reward.name}' to {user.email} (Pending Redemption)")
        return True
        
    return False