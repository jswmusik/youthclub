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

