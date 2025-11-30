from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Q
from .models import Post
from users.models import User
from notifications.models import Notification
from .engine import PostEngine

@receiver(post_save, sender=Post)
def create_post_notification(sender, instance, created, **kwargs):
    """
    Triggers when a Post is saved. 
    Checks if it is PUBLISHED and sends notifications to relevant users.
    """
    post = instance

    # 1. Basic Gatekeeping
    # Only notify if the post is PUBLISHED.
    # We also check if it was just created OR if the status just changed to PUBLISHED
    # (For simplicity in this step, we process if status is PUBLISHED)
    if post.status != Post.Status.PUBLISHED:
        return

    # If updated, avoid duplicate massive notifications? 
    # A simple check: if notifications already exist for this post, skip.
    # This prevents editing a typo from spamming everyone again.
    if Notification.objects.filter(category=Notification.Category.POST, action_url__icontains=f"post={post.id}").exists():
        return

    # 2. Find "Candidate" Users (Broad Net)
    # We want to find anyone who MIGHT be interested, then filter them down strictly.
    # This prevents us from running Python logic on thousands of unrelated users.
    
    candidates = User.objects.filter(
        role__in=[User.Role.YOUTH_MEMBER, User.Role.GUARDIAN],
        is_active=True
    )

    query_filter = Q()

    # A. Global Posts (Super Admin)
    if post.is_global:
        # Everyone is a candidate
        pass 
    else:
        # B. Club Targeting
        # Post targets specific clubs OR is owned by a club
        target_club_ids = set()
        
        # If the post is owned by a club, that club is a target
        if post.club:
            target_club_ids.add(post.club.id)
        
        # If the post explicitly targets other clubs
        if post.target_clubs.exists():
            target_club_ids.update(post.target_clubs.values_list('id', flat=True))
            
        if target_club_ids:
            # Users who have this as preferred_club OR follow it
            query_filter |= Q(preferred_club__id__in=target_club_ids)
            query_filter |= Q(followed_clubs__id__in=target_club_ids)

        # C. Municipality Targeting
        # Only if no specific club targeting is dominant, or if explicitly targeted
        if post.municipality or post.target_municipalities.exists():
            muni_ids = set()
            if post.municipality:
                muni_ids.add(post.municipality.id)
            if post.target_municipalities.exists():
                muni_ids.update(post.target_municipalities.values_list('id', flat=True))
            
            # Users in these municipalities (via preferred club)
            if muni_ids:
                query_filter |= Q(preferred_club__municipality__id__in=muni_ids)

    # Apply the broad filter to reduce the loop size
    if not post.is_global:
        if query_filter:
            candidates = candidates.filter(query_filter).distinct()
        else:
            # If it's not global and targets nothing we know of, notify no one
            return

    # 3. Smart Filtering & Bulk Creation
    notifications_to_create = []
    
    # Construct a message based on the source
    source_name = "Ungdomsappen"
    if post.club:
        source_name = post.club.name
    elif post.municipality:
        source_name = post.municipality.name
    
    # Truncate title for notification body
    display_title = post.title[:50] + "..." if len(post.title) > 50 else post.title

    # We need to loop to check specific permissions (Age, Group, Gender)
    # PostEngine.user_can_see_post is perfect for this.
    for user in candidates:
        # A. Strict Permission Check
        if PostEngine.user_can_see_post(user, post):
            
            notifications_to_create.append(
                Notification(
                    recipient=user,
                    category=Notification.Category.POST, # Uses 'POST' from your models.py
                    title=f"New post from {source_name}",
                    body=display_title,
                    # We link to the dashboard with a query param to highlight the post
                    # You can adjust this to match your frontend routing
                    action_url=f"/dashboard/youth?post={post.id}" 
                )
            )

    # 4. Bulk Insert for Performance
    if notifications_to_create:
        Notification.objects.bulk_create(notifications_to_create)

