from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
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
    # If the user changes their birthday, we re-evaluate.
    if getattr(instance, '_dob_changed', False):
        print(f"🎂 DOB changed for {user.email}. Re-evaluating birthday rewards...")
        
        # A. Revoke existing unredeemed birthday rewards
        # (Because the previous birthday date is no longer valid)
        user_usages = RewardUsage.objects.filter(user=user, is_redeemed=False)
        for usage in user_usages:
            triggers = usage.reward.active_triggers if isinstance(usage.reward.active_triggers, list) else []
            if "BIRTHDAY" in triggers:
                print(f"   -> Revoking previous birthday reward '{usage.reward.name}'")
                usage.delete()

        # B. Check if NEW birthday is today
        today = timezone.now().date()
        if user.date_of_birth and user.date_of_birth.month == today.month and user.date_of_birth.day == today.day:
            print("   -> New birthday is TODAY! Granting rewards...")
            birthday_rewards = Reward.objects.filter(active_triggers__icontains="BIRTHDAY", is_active=True)
            for reward in birthday_rewards:
                triggers = reward.active_triggers if isinstance(reward.active_triggers, list) else []
                if "BIRTHDAY" in triggers:
                    grant_reward(user, reward)
        else:
            print("   -> New birthday is not today.")
