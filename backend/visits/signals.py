from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import CheckInSession


@receiver(post_save, sender=CheckInSession)
def update_last_active_on_checkin(sender, instance, created, **kwargs):
    """
    Update user's last_active_at when they check in at a club.
    """
    if created:
        from users.models import User
        User.objects.filter(pk=instance.user_id).update(last_active_at=timezone.now())


@receiver(post_save, sender=CheckInSession)
def process_checkin_reward_triggers(sender, instance, created, **kwargs):
    """
    Process reward triggers when a user checks in.
    Handles: FIRST_CHECKIN, CHECKIN_STREAK, CHECKIN_MILESTONE
    """
    if created:
        try:
            from rewards.trigger_handlers import process_checkin_triggers
            process_checkin_triggers(instance.user, instance)
        except Exception as e:
            # Don't let reward processing break check-in functionality
            print(f"Error processing check-in reward triggers: {e}")

