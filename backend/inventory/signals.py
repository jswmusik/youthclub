from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import WaitingList, LendingSession

@receiver(pre_save, sender=WaitingList)
def enforce_queue_limit(sender, instance, **kwargs):
    """
    Ensure no more than 3 people can be in the queue for a specific item.
    """
    # Only check on creation (not updates)
    if not instance.pk:
        current_count = WaitingList.objects.filter(item=instance.item).count()
        if current_count >= 3:
            raise ValidationError(f"The queue for '{instance.item.title}' is full (Max 3).")

@receiver(pre_save, sender=LendingSession)
def set_guest_status(sender, instance, **kwargs):
    """
    Automatically mark the session as a 'Guest' session if the 
    user's preferred club does not match the item's club.
    """
    # Only check on creation
    if not instance.pk:
        # We assume the user has a preferred_club. 
        # If they don't, or if it differs from the item's club, they are a guest.
        user_home_club = instance.user.preferred_club
        item_club = instance.item.club
        
        if user_home_club != item_club:
            instance.is_guest = True
        else:
            instance.is_guest = False