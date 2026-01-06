from django.db.models.signals import post_save, pre_delete, pre_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils import timezone

# Import models
from users.models import User
from .models import Group, GroupMembership
from posts.models import Post, PostImage
from notifications.models import Notification

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
    
    Fix #9: The announcement post now targets the group via M2M relationship
    for reliable cleanup when the group is renamed or deleted.
    """
    # Only trigger on creation
    if not created:
        return

    # Only trigger for joinable groups (Open or Application)
    if instance.group_type not in [Group.GroupType.OPEN, Group.GroupType.APPLICATION]:
        return
    
    # Skip system groups
    if instance.is_system_group:
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
    
    # Safely truncate description
    description_preview = instance.description[:150] if instance.description else ""
    if len(instance.description or "") > 150:
        description_preview += "..."
    
    post_content = (
        f"<p>🎉 <strong>Ny grupp startad: {instance.name}</strong>!</p>"
        f"<p>{description_preview}</p>"
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

    # Fix #9: Link the announcement post to the group via target_groups M2M
    # This allows us to find and delete it reliably even if the group is renamed
    post.target_groups.add(instance)

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


# 5. Clean up announcement posts, activity posts, and notifications when a group is deleted
@receiver(pre_delete, sender=Group)
def delete_group_announcement_posts(sender, instance, **kwargs):
    """
    When a group is deleted:
    1. Delete the announcement post that was created for it
    2. Delete activity posts (e.g., "Joined {group.name}") that target this group
    3. Remove the group from any other posts that target it (via target_groups M2M)
    4. Delete notifications that reference this group
    
    Fix #9: Uses target_groups M2M relationship for reliable cleanup,
    with fallback to title-based matching for older posts.
    """
    # 1. Find and delete announcement posts
    # Primary method: Find posts that target this group AND have the announcement title pattern
    announcement_posts = Post.objects.filter(
        target_groups=instance,
        title__startswith="Ny Grupp:"
    ) | Post.objects.filter(
        target_groups=instance,
        title__startswith="New Group:"
    )
    
    # Fallback: Also try title-based matching for posts created before this fix
    # This handles cases where the post wasn't linked via target_groups
    announcement_posts = announcement_posts | Post.objects.filter(
        title=f"Ny Grupp: {instance.name}"
    ) | Post.objects.filter(
        title=f"New Group: {instance.name}"
    )
    
    # Delete the announcement posts
    announcement_posts.distinct().delete()
    
    # 2. Delete activity posts ("Joined {group.name}") that target this group
    # These are created when users join the group
    activity_posts = Post.objects.filter(
        target_groups=instance,
        title__startswith="Joined "
    ) | Post.objects.filter(
        title=f"Joined {instance.name}"
    )
    activity_posts.distinct().delete()
    
    # 3. Remove this group from any other posts that target it (via target_groups M2M)
    # The M2M relationship will be automatically cleaned up when the group is deleted,
    # but we explicitly remove it to avoid orphaned references
    posts_targeting_group = Post.objects.filter(target_groups=instance)
    for post in posts_targeting_group:
        post.target_groups.remove(instance)
    
    # 4. Delete notifications that reference this group (via action_url)
    Notification.objects.filter(
        action_url__icontains=f"/groups/{instance.id}"
    ).delete()


# --- NEW SIGNALS FOR MEMBERSHIP NOTIFICATIONS ---

# 6. Capture Previous Status (Pre-Save)
@receiver(pre_save, sender=GroupMembership)
def capture_membership_previous_state(sender, instance, **kwargs):
    """
    Before saving, check what the status currently is in the DB.
    We store this as a temporary attribute on the instance.
    """
    if instance.pk:
        try:
            old_instance = GroupMembership.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except GroupMembership.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


# 7. Send Notifications on Status Change (Post-Save)
@receiver(post_save, sender=GroupMembership)
def notify_membership_changes(sender, instance, created, **kwargs):
    """
    Triggers notifications when:
    1. A Pending application is Approved.
    2. A Pending application is Rejected.
    3. A user is directly added to a group (CLOSED, OPEN, or APPLICATION).
    
    Also creates an activity post when a user is accepted to a group.
    
    Fix #5: Now sends notifications for ALL direct member additions,
    not just CLOSED groups.
    """
    from posts.models import PostReaction
    
    # Skip system groups - no notifications for automatic memberships
    if instance.group.is_system_group:
        return
    
    # --- Scenario A: Status Change (Update) ---
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # 1. Application Approved
        if old_status == 'PENDING' and new_status == 'APPROVED':
            Notification.objects.create(
                recipient=instance.user,
                category=Notification.Category.SYSTEM,
                title=f"Välkommen till {instance.group.name}!",
                body=f"Din ansökan om att gå med i gruppen '{instance.group.name}' har godkänts.",
                action_url=f"/dashboard/youth/groups/{instance.group.id}"
            )
            
            # Create activity post for the user's feed
            create_group_join_activity_post(instance)
            
            # Process JOINED_GROUP reward trigger
            try:
                from rewards.trigger_handlers import JoinedGroupHandler
                JoinedGroupHandler.process(instance.user, instance)
            except Exception as e:
                print(f"Error processing JOINED_GROUP reward trigger: {e}")
            
        # 2. Application Rejected
        elif old_status == 'PENDING' and new_status == 'REJECTED':
            Notification.objects.create(
                recipient=instance.user,
                category=Notification.Category.SYSTEM,
                title=f"Ansökan avslogs",
                body=f"Din ansökan till gruppen '{instance.group.name}' blev tyvärr inte godkänd.",
                action_url="/dashboard/youth/groups" # Redirect to list
            )

    # --- Scenario B: Direct Add or Join (Creation) ---
    # When a user joins an OPEN group or is added to any group, it is created as 'APPROVED' immediately.
    if created and instance.status == 'APPROVED':
        print(f"🔔 GroupMembership created: User {instance.user.email} joined group {instance.group.name} (type: {instance.group.group_type})")
        
        # Fix #5: Send notification for ALL group types when directly added by admin
        # For CLOSED groups - user was added by admin
        if instance.group.group_type == Group.GroupType.CLOSED:
            Notification.objects.create(
                recipient=instance.user,
                category=Notification.Category.SYSTEM,
                title=f"Du har lagts till i en grupp",
                body=f"Du har blivit tillagd i den stängda gruppen '{instance.group.name}'.",
                action_url=f"/dashboard/youth/groups/{instance.group.id}"
            )
        # For OPEN/APPLICATION groups - check if this was an admin addition
        # We detect admin additions by checking if the membership was created via serializer
        # (members_to_add field) rather than the join action
        elif instance.group.group_type in [Group.GroupType.OPEN, Group.GroupType.APPLICATION]:
            # Check if this was likely an admin addition by seeing if there's a 
            # _added_by_admin flag (set by serializer) or if the user is different
            # from who we'd expect in a self-join scenario
            if getattr(instance, '_added_by_admin', False):
                Notification.objects.create(
                    recipient=instance.user,
                    category=Notification.Category.SYSTEM,
                    title=f"Du har lagts till i {instance.group.name}",
                    body=f"Du har blivit tillagd i gruppen '{instance.group.name}'.",
                    action_url=f"/dashboard/youth/groups/{instance.group.id}"
                )
        
        # Create activity post for all joins (OPEN, APPLICATION, CLOSED)
        # This includes both direct joins and approved applications
        create_group_join_activity_post(instance)
        
        # Process JOINED_GROUP reward trigger for direct joins
        try:
            from rewards.trigger_handlers import JoinedGroupHandler
            JoinedGroupHandler.process(instance.user, instance)
        except Exception as e:
            print(f"Error processing JOINED_GROUP reward trigger: {e}")


def create_group_join_activity_post(membership):
    """
    Creates a post that appears in the user's activity feed when they join a group.
    This post is automatically "liked" by the user so it shows up in their interactions feed.
    The post targets the group the user joined, ensuring it's visible to them.
    """
    from posts.models import Post, PostReaction
    
    group = membership.group
    user = membership.user
    join_date = membership.joined_at
    
    # Skip system groups - we don't want activity posts for automatic group memberships
    if group.is_system_group:
        return
    
    # Format the date nicely
    date_str = join_date.strftime('%B %d, %Y')
    
    # Create the post content
    post_content = (
        f"<p>🎉 <strong>Joined {group.name}</strong></p>"
        f"<p>Became a member on {date_str}</p>"
    )
    
    # Determine owner role based on group scope
    owner_role = Post.OwnerRole.SUPER_ADMIN
    if group.club:
        owner_role = Post.OwnerRole.CLUB_ADMIN
    elif group.municipality:
        owner_role = Post.OwnerRole.MUNICIPALITY_ADMIN
    
    try:
        # Create the activity post
        # Target the group so the user can see it (they're now a member)
        activity_post = Post.objects.create(
            title=f"Joined {group.name}",
            content=post_content,
            post_type=Post.PostType.IMAGE if (group.background_image or group.avatar) else Post.PostType.TEXT,
            
            # Ownership
            author=user,  # The user is the author of their own activity
            owner_role=owner_role,
            club=group.club,
            municipality=group.municipality,
            is_global=(group.club is None and group.municipality is None),
            
            # Targeting - Target the group so user can see it (they're a member)
            target_member_type=Post.TargetMemberType.YOUTH if user.role == 'YOUTH_MEMBER' else Post.TargetMemberType.GUARDIAN,
            
            # Settings
            status=Post.Status.PUBLISHED,
            published_at=join_date,  # Use join date for chronological ordering
            allow_comments=False,  # Activity posts don't need comments
            is_pinned=False
        )
        
        # Target the group so the post is visible to group members
        activity_post.target_groups.add(group)
        
        # Add group image if available
        if group.background_image or group.avatar:
            image_source = group.background_image or group.avatar
            PostImage.objects.create(
                post=activity_post,
                image=image_source,
                order=0
            )
        
        # Note: We don't add an automatic reaction anymore
        # The post will appear in interactions feed because author=user
        print(f"✅ Created activity post for {user.email} joining group {group.name} (Post ID: {activity_post.id})")
    except Exception as e:
        print(f"❌ Error creating activity post for group join: {e}")
        import traceback
        traceback.print_exc()
