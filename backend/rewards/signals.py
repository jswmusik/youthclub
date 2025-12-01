from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Q
from users.models import User
from .models import Reward, RewardUsage
from .utils import grant_reward


@receiver(pre_save, sender=User)
def track_dob_change(sender, instance, **kwargs):
    """
    Checks if date_of_birth is changing.
    We attach a temporary flag '_dob_changed' to the instance to check in post_save.
    """
    if instance.pk: # Only for existing users
        try:
            old_user = User.objects.get(pk=instance.pk)
            if old_user.date_of_birth != instance.date_of_birth:
                instance._dob_changed = True
        except User.DoesNotExist:
            pass


@receiver(post_save, sender=User)
def check_reward_triggers(sender, instance, created, **kwargs):
    """
    Handles all automatic triggers: WELCOME, VERIFIED, and BIRTHDAY (on change).
    """
    user = instance
    
    # --- 1. WELCOME TRIGGER (On Creation) ---
    if created:
        welcome_rewards = Reward.objects.filter(active_triggers__icontains="WELCOME", is_active=True)
        for reward in welcome_rewards:
            triggers = reward.active_triggers if isinstance(reward.active_triggers, list) else []
            if "WELCOME" in triggers:
                grant_reward(user, reward)

    # --- 2. VERIFIED TRIGGER (On Update) ---
    if not created and user.verification_status == 'VERIFIED':
        verified_rewards = Reward.objects.filter(active_triggers__icontains="VERIFIED", is_active=True)
        for reward in verified_rewards:
            triggers = reward.active_triggers if isinstance(reward.active_triggers, list) else []
            if "VERIFIED" in triggers:
                grant_reward(user, reward)

    # --- 3. BIRTHDAY TRIGGER (On DOB Change) ---
    if getattr(instance, '_dob_changed', False):
        # A. Revoke existing unredeemed birthday rewards
        user_usages = RewardUsage.objects.filter(user=user, is_redeemed=False)
        for usage in user_usages:
            triggers = usage.reward.active_triggers if isinstance(usage.reward.active_triggers, list) else []
            if "BIRTHDAY" in triggers:
                usage.delete()

        # B. Check if NEW birthday is today
        today = timezone.now().date()
        if user.date_of_birth and user.date_of_birth.month == today.month and user.date_of_birth.day == today.day:
            birthday_rewards = Reward.objects.filter(active_triggers__icontains="BIRTHDAY", is_active=True)
            for reward in birthday_rewards:
                triggers = reward.active_triggers if isinstance(reward.active_triggers, list) else []
                if "BIRTHDAY" in triggers:
                    grant_reward(user, reward)


@receiver(post_save, sender=Reward)
def process_new_reward_distribution(sender, instance, created, **kwargs):
    """
    DISTRIBUTION ENGINE:
    Listens for new rewards. If a reward has NO automatic triggers (meaning it is 
    a Manual or Broadcast reward), we immediately distribute it to eligible users.
    """
    # Only run this for newly created rewards
    if not created:
        return
    # Check if this is a "Manual/Broadcast" reward.
    # It is manual if active_triggers is empty list [] OR contains "NONE"
    triggers = instance.active_triggers if isinstance(instance.active_triggers, list) else []
    is_manual = len(triggers) == 0 or "NONE" in triggers

    if is_manual and instance.is_active:
        print(f"🚀 Starting distribution for reward: {instance.name}")
        
        # 1. Broad Filtering: Get all potential Youth Members
        # We perform a database-level filter first to avoid iterating over unrelated users (e.g. users in other municipalities)
        candidates = User.objects.filter(role=User.Role.YOUTH_MEMBER, is_active=True)
        
        # 2. Scope Filtering (Optimization)
        if instance.municipality:
            # Only users belonging to this municipality (via their preferred club)
            candidates = candidates.filter(preferred_club__municipality=instance.municipality)
        
        if instance.club:
            # Users who prefer this club OR follow this club
            candidates = candidates.filter(
                Q(preferred_club=instance.club) | 
                Q(followed_clubs=instance.club)
            ).distinct()

        # 3. Detailed Eligibility Check & Granting
        # grant_reward() inside utils.py performs the strict checks (Age, Gender, Interests, Group)
        count = 0
        for user in candidates:
            success = grant_reward(user, instance)
            if success:
                count += 1
        
        print(f"✅ Distribution complete. Granted '{instance.name}' to {count} users.")
