from django.db.models.signals import post_save, pre_delete
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils import timezone

# Import models
from users.models import User
from .models import Group, GroupMembership
from posts.models import Post, PostImage

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

# 4. New Group Announcement (Post & Notification)
@receiver(post_save, sender=Group)
def announce_new_group(sender, instance, created, **kwargs):
    """
    When a new OPEN or APPLICATION group is created:
    1. Create a Post on the timeline for eligible users.
    2. Send a Notification to eligible users.
    """
    # Only trigger on creation
    if not created:
        return

    # Only trigger for joinable groups (Open or Application)
    if instance.group_type not in [Group.GroupType.OPEN, Group.GroupType.APPLICATION]:
        return

    # --- 1. Create the Announcement Post ---
    
    # Determine Owner Role and Context
    owner_role = Post.OwnerRole.SUPER_ADMIN # Default
    if instance.club:
        owner_role = Post.OwnerRole.CLUB_ADMIN
    elif instance.municipality:
        owner_role = Post.OwnerRole.MUNICIPALITY_ADMIN

    # Construct the content using HTML for the frontend
    group_url = f"/dashboard/youth/groups/{instance.id}"
    join_text = "Gå med nu" if instance.group_type == Group.GroupType.OPEN else "Ansök nu"
    
    post_content = (
        f"<p>🎉 <strong>Ny grupp startad: {instance.name}</strong>!</p>"
        f"<p>{instance.description[:150]}...</p>"
        f"<p>Är du intresserad? <a href='{group_url}' style='color: #2563eb; font-weight: bold; text-decoration: underline;'>{join_text}</a> och träffa nya vänner!</p>"
    )

    # Create the Post object mapping Group targets -> Post targets
    post = Post.objects.create(
        title=f"Ny Grupp: {instance.name}",
        content=post_content,
        post_type=Post.PostType.IMAGE if (instance.background_image or instance.avatar) else Post.PostType.TEXT,
        
        # Ownership
        author=None, # System post (or attributed to entity)
        owner_role=owner_role,
        club=instance.club,
        municipality=instance.municipality,
        is_global=(instance.club is None and instance.municipality is None),

        # Targeting (Map Group criteria to Post criteria)
        target_member_type=Post.TargetMemberType.YOUTH, # Groups are usually for youth
        target_grades=instance.grades,
        target_genders=instance.genders,
        target_min_age=instance.min_age,
        target_max_age=instance.max_age,
        # We attach interests if they exist below (M2M)

        # Settings
        status=Post.Status.PUBLISHED,
        published_at=timezone.now(),
        allow_comments=False, # Per requirements
        is_pinned=False
    )

    # Add Many-to-Many Interests
    if instance.interests.exists():
        post.target_interests.set(instance.interests.all())

    # Create Post Image (Use Group Background or Avatar)
    image_source = instance.background_image or instance.avatar
    if image_source:
        PostImage.objects.create(
            post=post,
            image=image_source,
            order=0
        )

    # Note: Notifications are handled by the post signal (posts/signals.py)
    # to avoid duplicate notifications


# 5. Clean up announcement posts when a group is deleted
@receiver(pre_delete, sender=Group)
def delete_group_announcement_posts(sender, instance, **kwargs):
    """
    When a group is deleted:
    1. Delete the announcement post that was created for it (identified by title pattern)
    2. Remove the group from any posts that target it (via target_groups M2M)
    """
    # 1. Find and delete announcement posts with titles matching the group announcement pattern
    announcement_posts = Post.objects.filter(
        title__startswith=f"Ny Grupp: {instance.name}"
    ) | Post.objects.filter(
        title__startswith=f"New Group: {instance.name}"
    )
    
    # Delete the posts (this will cascade to PostImages, PostComments, PostReactions via CASCADE)
    announcement_posts.delete()
    
    # 2. Remove this group from posts that target it (via target_groups M2M)
    # The M2M relationship will be automatically cleaned up when the group is deleted,
    # but we can also explicitly remove it if needed
    posts_targeting_group = Post.objects.filter(target_groups=instance)
    for post in posts_targeting_group:
        post.target_groups.remove(instance)
