from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import GuardianYouthLink, User, UserLoginHistory


@receiver(post_save, sender=UserLoginHistory)
def update_last_active_on_login(sender, instance, created, **kwargs):
    """
    Update user's last_active_at when a login is recorded.
    """
    if created:
        User.objects.filter(pk=instance.user_id).update(last_active_at=timezone.now())


@receiver(post_save, sender=GuardianYouthLink)
def assign_guardian_municipality_on_link_active(sender, instance, created, **kwargs):
    """
    When a GuardianYouthLink becomes ACTIVE, assign the guardian's municipality
    based on the youth's preferred_club's municipality (if not already assigned).
    
    The guardian inherits the municipality from their first connected child.
    """
    # Only process if the link is now ACTIVE
    if instance.status != 'ACTIVE':
        return
    
    guardian = instance.guardian
    youth = instance.youth
    
    # If guardian already has a municipality assigned, don't change it
    if guardian.assigned_municipality_id:
        return
    
    # Try to get municipality from youth's preferred_club
    municipality = None
    
    if youth.preferred_club and youth.preferred_club.municipality:
        municipality = youth.preferred_club.municipality
    elif youth.assigned_municipality:
        # Fallback to youth's assigned municipality if they have one
        municipality = youth.assigned_municipality
    
    # Assign the municipality to the guardian
    if municipality:
        guardian.assigned_municipality = municipality
        guardian.save(update_fields=['assigned_municipality'])


