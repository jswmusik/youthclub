from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import WaitingList, LendingSession
from notifications.models import Notification

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
    Also stores the old returned_at value to detect when an item is returned.
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
    else:
        # Store old returned_at value to detect when it changes from None to a value
        try:
            old_instance = LendingSession.objects.get(pk=instance.pk)
            instance._old_returned_at = old_instance.returned_at
        except LendingSession.DoesNotExist:
            instance._old_returned_at = None

@receiver(post_save, sender=LendingSession)
def create_inventory_activity_post(sender, instance, created, **kwargs):
    """
    Creates an activity post when a user borrows or returns an item.
    These posts appear in the user's activity timeline but not in the main feed.
    """
    from posts.models import Post, PostImage
    
    # Only create posts for youth members
    if instance.user.role != 'YOUTH_MEMBER':
        return
    
    item = instance.item
    user = instance.user
    club = item.club
    
    # Determine if this is a borrow or return action
    is_borrow = created and instance.status == 'ACTIVE'
    
    # For returns, check if returned_at was just set (changed from None to a value)
    is_return = False
    if not created:
        old_returned_at = getattr(instance, '_old_returned_at', None)
        is_return = (
            old_returned_at is None and 
            instance.returned_at is not None and 
            instance.status in ['RETURNED_USER', 'RETURNED_ADMIN', 'RETURNED_SYSTEM']
        )
    
    # Handle borrow action - create new post
    if is_borrow:
        # Check if borrow post already exists
        existing_post = Post.objects.filter(
            author=user,
            title=f"Borrowed {item.title}",
            published_at__date=instance.borrowed_at.date()
        ).exists()
        if existing_post:
            return
        
        # Format the date nicely
        borrow_date = instance.borrowed_at
        borrow_date_str = borrow_date.strftime('%B %d, %Y')
        borrow_time_str = borrow_date.strftime('%I:%M %p')
        
        title = f"Borrowed {item.title}"
        post_content = (
            f"<p>📦 <strong>Borrowed {item.title}</strong></p>"
            f"<p>Borrowed from {club.name} on {borrow_date_str} at {borrow_time_str}</p>"
        )
        
        try:
            # Create the activity post
            activity_post = Post.objects.create(
                title=title,
                content=post_content,
                post_type=Post.PostType.IMAGE if item.image else Post.PostType.TEXT,
                
                # Ownership - user is the author of their own activity
                author=user,
                owner_role=Post.OwnerRole.CLUB_ADMIN,
                club=club,
                municipality=club.municipality if club.municipality else None,
                is_global=False,
                
                # Targeting - only visible to the user
                target_member_type=Post.TargetMemberType.YOUTH,
                
                # Settings
                status=Post.Status.PUBLISHED,
                published_at=borrow_date,  # Use borrow date for chronological ordering
                allow_comments=False,  # Activity posts don't need comments
                is_pinned=False
            )
            
            # Target the club so the post is visible to club members (but main feed excludes authored posts)
            activity_post.target_clubs.add(club)
            
            # Add item image if available
            if item.image:
                PostImage.objects.create(
                    post=activity_post,
                    image=item.image,
                    order=0
                )
            
            print(f"✅ Created activity post for {user.email} borrowing {item.title} (Post ID: {activity_post.id})")
        except Exception as e:
            print(f"❌ Error creating activity post for inventory borrow: {e}")
            import traceback
            traceback.print_exc()
    
    # Handle return action - update existing "Borrowed" post
    elif is_return:
        # Find the existing "Borrowed" post for this item
        # Look for posts with title starting with "Borrowed" and matching item title
        borrowed_post = Post.objects.filter(
            author=user,
            title__startswith='Borrowed ',
            club=club
        ).filter(
            title__endswith=item.title
        ).order_by('-published_at').first()
        
        if borrowed_post:
            # Update the existing post to show returned status
            return_date = instance.returned_at
            return_date_str = return_date.strftime('%B %d, %Y')
            return_time_str = return_date.strftime('%I:%M %p')
            
            # Extract borrow date from existing content or use published_at
            borrow_date = borrowed_post.published_at
            borrow_date_str = borrow_date.strftime('%B %d, %Y')
            borrow_time_str = borrow_date.strftime('%I:%M %p')
            
            # Update title and content to show returned status
            borrowed_post.title = f"Borrowed {item.title}"
            borrowed_post.content = (
                f"<p>📦 <strong>Borrowed {item.title}</strong> ✅ <strong>Returned</strong></p>"
                f"<p>Borrowed from {club.name} on {borrow_date_str} at {borrow_time_str}</p>"
                f"<p>Returned to {club.name} on {return_date_str} at {return_time_str}</p>"
            )
            borrowed_post.save()
            
            print(f"✅ Updated activity post for {user.email} returning {item.title} (Post ID: {borrowed_post.id})")
        else:
            # Edge case: No borrow post found, create a return-only post
            return_date = instance.returned_at
            return_date_str = return_date.strftime('%B %d, %Y')
            return_time_str = return_date.strftime('%I:%M %p')
            
            title = f"Returned {item.title}"
            post_content = (
                f"<p>✅ <strong>Returned {item.title}</strong></p>"
                f"<p>Returned to {club.name} on {return_date_str} at {return_time_str}</p>"
            )
            
            try:
                activity_post = Post.objects.create(
                    title=title,
                    content=post_content,
                    post_type=Post.PostType.IMAGE if item.image else Post.PostType.TEXT,
                    author=user,
                    owner_role=Post.OwnerRole.CLUB_ADMIN,
                    club=club,
                    municipality=club.municipality if club.municipality else None,
                    is_global=False,
                    target_member_type=Post.TargetMemberType.YOUTH,
                    status=Post.Status.PUBLISHED,
                    published_at=return_date,
                    allow_comments=False,
                    is_pinned=False
                )
                activity_post.target_clubs.add(club)
                
                if item.image:
                    PostImage.objects.create(
                        post=activity_post,
                        image=item.image,
                        order=0
                    )
                
                print(f"✅ Created return-only activity post for {user.email} returning {item.title} (Post ID: {activity_post.id})")
            except Exception as e:
                print(f"❌ Error creating return-only activity post: {e}")
                import traceback
                traceback.print_exc()
        
        # Notify the first person in the waiting list (if any) - runs for all returns
        # Only send notification if we haven't already notified them today (prevents duplicates)
        first_in_queue = WaitingList.objects.filter(item=item).order_by('queued_at').first()
        if first_in_queue:
            # Check if we've already sent a notification for this item today
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            expected_title = f"{item.title} is now available!"
            existing_notification = Notification.objects.filter(
                recipient=first_in_queue.user,
                category=Notification.Category.SYSTEM,
                title=expected_title,
                created_at__gte=today_start
            ).exists()
            
            # Also check if we've already marked this queue entry as notified
            if not existing_notification and not first_in_queue.notified_at:
                Notification.objects.create(
                    recipient=first_in_queue.user,
                    category=Notification.Category.SYSTEM,
                    title=expected_title,
                    body=f"The item '{item.title}' you were waiting for is now available. You can borrow it now!",
                    action_url=f"/dashboard/youth/inventory"
                )
                # Mark as notified
                first_in_queue.notified_at = timezone.now()
                first_in_queue.save()
                print(f"✅ Sent notification to {first_in_queue.user.email} about {item.title} being available")
            else:
                print(f"⏭️  Skipped duplicate notification for {first_in_queue.user.email} about {item.title}")