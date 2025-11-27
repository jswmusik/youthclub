from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from users.models import User
from .models import Group, GroupMembership

# 1. Registered Members (Triggered when a User is created)
@receiver(post_save, sender=User)
def add_to_registered_group(sender, instance, created, **kwargs):
    if created:
        try:
            group = Group.objects.get(system_group_type='REGISTERED')
            GroupMembership.objects.get_or_create(user=instance, group=group, defaults={'status': 'APPROVED'})
        except Group.DoesNotExist:
            pass # Group hasn't been created yet

# 2. Verified Members (Triggered when User is saved/updated)
@receiver(post_save, sender=User)
def update_verified_group(sender, instance, **kwargs):
    try:
        group = Group.objects.get(system_group_type='VERIFIED')
        is_member = GroupMembership.objects.filter(user=instance, group=group).exists()
        
        # If user is verified but NOT in group -> Add them
        if instance.verification_status == 'VERIFIED' and not is_member:
            GroupMembership.objects.create(user=instance, group=group, status='APPROVED')
            
        # If user is NOT verified but IS in group -> Remove them
        elif instance.verification_status != 'VERIFIED' and is_member:
            GroupMembership.objects.filter(user=instance, group=group).delete()
            
    except Group.DoesNotExist:
        pass

# 3. Active Members (Triggered when User logs in)
@receiver(user_logged_in)
def add_to_active_group(sender, user, request, **kwargs):
    try:
        group = Group.objects.get(system_group_type='ACTIVE')
        # We use get_or_create to ensure we don't duplicate or crash
        GroupMembership.objects.get_or_create(user=user, group=group, defaults={'status': 'APPROVED'})
    except Group.DoesNotExist:
        pass