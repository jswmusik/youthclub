from django.db.models.signals import pre_save, post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Q
from users.models import User
from notifications.models import Notification
from .models import Reward, RewardUsage
from .utils import grant_reward, has_received_trigger_reward, grant_reward_with_context


@receiver(pre_delete, sender=Reward)
def cleanup_reward_notifications(sender, instance, **kwargs):
    """
    Delete all notifications related to this reward when it is deleted.
    This prevents users from clicking on notifications that point to deleted rewards.
    """
    reward = instance
    
    # Delete notifications that reference this reward
    # Reward notifications use action_url like "/dashboard/youth/profile?tab=wallet"
    # and include the reward name in the body
    # Since we can't reliably filter by reward ID (not in URL), we delete by category and body content
    Notification.objects.filter(
        category=Notification.Category.REWARD,
        body__icontains=reward.name
    ).delete()


@receiver(pre_save, sender=User)
def track_dob_change(sender, instance, **kwargs):
    """
    Checks if date_of_birth is changing.
    We attach temporary flags to the instance to check in post_save:
    - _dob_changed: True if DOB changed
    - _old_dob: The previous DOB value (for abuse prevention)
    """
    if instance.pk:  # Only for existing users
        try:
            old_user = User.objects.get(pk=instance.pk)
            if old_user.date_of_birth != instance.date_of_birth:
                instance._dob_changed = True
                instance._old_dob = old_user.date_of_birth
        except User.DoesNotExist:
            pass


@receiver(pre_save, sender=User)
def track_verification_status_change(sender, instance, **kwargs):
    """
    Checks if verification_status is changing to VERIFIED.
    We attach a temporary flag '_verification_status_changed_to_verified' to the instance to check in post_save.
    """
    if instance.pk:  # Only for existing users
        try:
            old_user = User.objects.get(pk=instance.pk)
            # Only flag if status changed FROM something else TO VERIFIED
            if old_user.verification_status != 'VERIFIED' and instance.verification_status == 'VERIFIED':
                instance._verification_status_changed_to_verified = True
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
                # Check if user has EVER received this WELCOME reward before
                if not has_received_trigger_reward(user, reward, 'WELCOME'):
                    grant_reward_with_context(user, reward, 'WELCOME', {
                        'granted_at': timezone.now().isoformat()
                    })
                else:
                    print(f"-> Skipped granting '{reward.name}' to {user.email} - user has already received this WELCOME reward before")

    # --- 2. VERIFIED TRIGGER (On Update - Only when status changes TO VERIFIED) ---
    if not created and getattr(instance, '_verification_status_changed_to_verified', False):
        verified_rewards = Reward.objects.filter(active_triggers__icontains="VERIFIED", is_active=True)
        for reward in verified_rewards:
            triggers = reward.active_triggers if isinstance(reward.active_triggers, list) else []
            if "VERIFIED" in triggers:
                # Check if user has EVER received this VERIFIED reward before
                if not has_received_trigger_reward(user, reward, 'VERIFIED'):
                    grant_reward_with_context(user, reward, 'VERIFIED', {
                        'verified_at': timezone.now().isoformat()
                    })
                else:
                    print(f"-> Skipped granting '{reward.name}' to {user.email} - user has already received this VERIFIED reward before")

    # --- 3. BIRTHDAY TRIGGER (On DOB Change) ---
    # NOTE: Birthday rewards are primarily granted via the daily management command.
    # This signal handles the edge case where a user changes their DOB to today.
    # We do NOT revoke existing birthday rewards when DOB changes - that would be punitive.
    # Instead, we track the DOB used when granting to prevent abuse.
    if getattr(instance, '_dob_changed', False):
        today = timezone.now().date()
        current_year = today.year
        
        # Check if NEW birthday is today
        if user.date_of_birth and user.date_of_birth.month == today.month and user.date_of_birth.day == today.day:
            birthday_rewards = Reward.objects.filter(active_triggers__icontains="BIRTHDAY", is_active=True)
            for reward in birthday_rewards:
                triggers = reward.active_triggers if isinstance(reward.active_triggers, list) else []
                if "BIRTHDAY" in triggers:
                    # Check if user already received birthday reward for THIS YEAR
                    # We track both the year AND the DOB used to prevent abuse
                    if not has_received_trigger_reward(user, reward, 'BIRTHDAY', {'birthday_year': current_year}):
                        grant_reward_with_context(user, reward, 'BIRTHDAY', {
                            'birthday_year': current_year,
                            'dob_used': str(user.date_of_birth),
                            'granted_at': timezone.now().isoformat()
                        })
                    else:
                        print(f"-> Skipped granting '{reward.name}' to {user.email} - already received birthday reward for {current_year}")


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
