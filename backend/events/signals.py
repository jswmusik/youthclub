from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.db import transaction
from .models import Event, EventRegistration, EventTicket
from notifications.models import Notification
from notifications.services import send_notification
import logging

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Event)
def track_event_status_change(sender, instance, **kwargs):
    """
    Track when an event status changes to PUBLISHED.
    This will be used to send notifications when an event is newly published.
    """
    if instance.pk:
        try:
            old_event = Event.objects.get(pk=instance.pk)
            # Track if status is changing TO published from another status
            if old_event.status != Event.Status.PUBLISHED and instance.status == Event.Status.PUBLISHED:
                instance._newly_published = True
            else:
                instance._newly_published = False
        except Event.DoesNotExist:
            # New event being created
            if instance.status == Event.Status.PUBLISHED:
                instance._newly_published = True
            else:
                instance._newly_published = False
    else:
        # New event being created
        if instance.status == Event.Status.PUBLISHED:
            instance._newly_published = True
        else:
            instance._newly_published = False


@receiver(pre_save, sender=EventTicket)
def track_ticket_checkin_change(sender, instance, **kwargs):
    """
    Track when checked_in_at changes from None to a value.
    This indicates the user attended the event.
    """
    if instance.pk:
        try:
            old_ticket = EventTicket.objects.get(pk=instance.pk)
            if old_ticket.checked_in_at is None and instance.checked_in_at is not None:
                instance._just_checked_in = True
        except EventTicket.DoesNotExist:
            pass


@receiver(post_save, sender=Event)
def notify_users_of_new_event(sender, instance, created, **kwargs):
    """
    Send notifications and emails when an event is newly published.
    Uses filter_events_by_targeting to ensure only eligible users are notified.
    
    Eligible users are those who:
    - Match the event's target audience (YOUTH/GUARDIAN/BOTH)
    - Are in the event's target groups (if specified)
    - Have the event's target interests (if specified)
    - Match age requirements (if specified)
    - Match gender requirements (if specified)
    - Match grade requirements (if specified)
    - Are in the event's club or municipality
    """
    event = instance
    
    # Only notify if event was newly published
    if not getattr(event, '_newly_published', False):
        return
    
    logger.info(f"[EVENT SIGNAL] Event {event.id} '{event.title}' was newly published, preparing notifications...")
    
    # Import here to avoid circular imports
    from users.models import User
    from .services import filter_events_by_targeting
    
    # Build candidate user queryset based on event scope
    candidates = User.objects.filter(is_active=True)
    
    # Filter by scope (club/municipality)
    if event.club:
        # Event is club-specific - notify youth members of this club
        candidates = candidates.filter(
            role=User.Role.YOUTH_MEMBER,
            preferred_club=event.club
        )
    elif event.municipality:
        # Event is municipality-wide - notify youth in this municipality
        candidates = candidates.filter(
            role=User.Role.YOUTH_MEMBER,
            preferred_club__municipality=event.municipality
        )
    elif event.is_global:
        # Global event - notify all youth members
        candidates = candidates.filter(role=User.Role.YOUTH_MEMBER)
    else:
        # Event has no scope set - shouldn't happen, but handle gracefully
        logger.warning(f"[EVENT SIGNAL] Event {event.id} has no club, municipality, or global flag set")
        return
    
    # Get all candidate users
    candidate_users = list(candidates.select_related('preferred_club__municipality').prefetch_related('interests', 'group_memberships'))
    
    if not candidate_users:
        logger.info(f"[EVENT SIGNAL] No candidate users found for event {event.id}")
        return
    
    logger.info(f"[EVENT SIGNAL] Found {len(candidate_users)} candidate users, applying targeting filters...")
    
    # Create a queryset with just this event for the filter function
    single_event_qs = Event.objects.filter(id=event.id)
    
    # Track users who should be notified
    eligible_user_ids = set()
    
    # Check each user against the targeting criteria
    for user in candidate_users:
        matching_event_ids = filter_events_by_targeting(single_event_qs, user)
        if event.id in matching_event_ids:
            eligible_user_ids.add(user.id)
    
    if not eligible_user_ids:
        logger.info(f"[EVENT SIGNAL] No users passed targeting criteria for event {event.id}")
        return
    
    logger.info(f"[EVENT SIGNAL] {len(eligible_user_ids)} users passed targeting criteria")
    
    # Get the eligible users
    eligible_users = [u for u in candidate_users if u.id in eligible_user_ids]
    
    # Determine source name for notification
    if event.club:
        source_name = event.club.name
    elif event.municipality:
        source_name = event.municipality.name
    else:
        source_name = "Ungdomsappen"
    
    # Prepare notifications for bulk create
    notifications_to_create = []
    
    for user in eligible_users:
        # Create in-app notification
        notifications_to_create.append(
            Notification(
                recipient=user,
                category=Notification.Category.EVENT,
                title=f"Nytt event: {event.title}",
                body=f"{source_name} har publicerat ett nytt event. Registrera dig nu!",
                action_url=f"/dashboard/youth/events/{event.id}"
            )
        )
        
        # Send email notification (async in production, sync in development)
        try:
            from emails.tasks import send_email_async
            from emails.models import EmailTemplate
            
            send_email_async(
                template_type=EmailTemplate.Type.NEW_EVENT,
                recipient=user,
                context={
                    'event_title': event.title,
                    'event_description': event.description[:200] if event.description else '',
                    'event_date': event.start_date.strftime('%Y-%m-%d %H:%M') if event.start_date else 'TBD',
                    'event_location': event.location_name or 'TBD',
                    'source_name': source_name,
                    'registration_required': event.registration_mode != Event.RegistrationMode.OPEN,
                }
            )
        except Exception as e:
            logger.error(f"Failed to queue new event email to {user.email}: {e}")
    
    # Bulk create in-app notifications
    if notifications_to_create:
        Notification.objects.bulk_create(notifications_to_create)
        logger.info(f"[EVENT SIGNAL] Created {len(notifications_to_create)} notifications and sent emails for event {event.id}")


@receiver(post_save, sender=EventTicket)
def process_event_attendance_reward(sender, instance, created, **kwargs):
    """
    Process EVENT_ATTENDED reward trigger when a ticket is checked in.
    """
    # Check if this ticket was just checked in (not on creation)
    if getattr(instance, '_just_checked_in', False):
        try:
            from rewards.trigger_handlers import EventAttendedHandler
            user = instance.registration.user
            EventAttendedHandler.process(user, instance)
        except Exception as e:
            # Don't let reward processing break ticket functionality
            print(f"Error processing event attendance reward trigger: {e}")


@receiver(pre_delete, sender=Event)
def cleanup_event_notifications(sender, instance, **kwargs):
    """
    Delete all notifications related to this event when it is deleted.
    Also send email notifications to registered users that the event is cancelled.
    """
    event = instance
    
    # Send cancellation emails to all registered users (APPROVED or WAITLIST)
    try:
        from emails.services import EmailService
        from emails.models import EmailTemplate
        
        registered_users = EventRegistration.objects.filter(
            event=event,
            status__in=[EventRegistration.Status.APPROVED, EventRegistration.Status.WAITLIST]
        ).select_related('user')
        
        for registration in registered_users:
            try:
                from emails.tasks import send_email_async
                
                send_email_async(
                    template_type=EmailTemplate.Type.EVENT_CANCELLED,
                    recipient=registration.user,
                    context={
                        'event_title': event.title,
                        'event_date': event.start_date.strftime('%Y-%m-%d %H:%M') if event.start_date else 'TBD',
                    }
                )
            except Exception as e:
                logger.error(f"Failed to queue event cancelled email to {registration.user.email}: {e}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending event cancelled emails: {e}")
    
    # Delete notifications that reference this event (via action_url)
    Notification.objects.filter(
        action_url__icontains=f"/events/{event.id}"
    ).delete()


@receiver(post_save, sender=EventRegistration)
def handle_registration_change(sender, instance, created, **kwargs):
    """
    Reacts to status changes:
    1. Generates Ticket if APPROVED.
    2. Sends Notifications.
    """
    
    # 1. Generate Ticket if Approved and doesn't exist
    if instance.status == EventRegistration.Status.APPROVED:
        if not hasattr(instance, 'ticket'):
            EventTicket.objects.create(registration=instance)

    # 2. Send Notifications (Only if status changed or it's new)
    # Note: determining 'status changed' in post_save requires tracking previous state, 
    # but often relying on the current state is sufficient for "Welcome" messages.
    
    user = instance.user
    event = instance.event
    
    if instance.status == EventRegistration.Status.APPROVED:
        title = "Seat Confirmed! 🎉"
        body = f"You have secured a seat for {event.title}. Tap to view your ticket."
        if event.custom_welcome_message:
            body = event.custom_welcome_message
        
        send_notification(user, title, body, action_url=f"/dashboard/youth/events/{event.id}")
        
        # Send confirmation email (async in production, sync in development)
        try:
            from emails.tasks import send_email_async
            from emails.models import EmailTemplate
            
            send_email_async(
                template_type=EmailTemplate.Type.EVENT_REGISTRATION_CONFIRMED,
                recipient=user,
                context={
                    'event_title': event.title,
                    'event_date': event.start_date.strftime('%Y-%m-%d %H:%M') if event.start_date else 'TBD',
                    'event_location': event.location_name or 'TBD',
                    'event_description': event.description or '',
                    'custom_message': event.custom_welcome_message or '',
                }
            )
        except Exception as e:
            logger.error(f"Failed to queue event confirmation email to {user.email}: {e}")

    elif instance.status == EventRegistration.Status.WAITLIST:
        send_notification(
            user, 
            "Added to Waitlist", 
            f"The event is full, but you are on the waitlist for {event.title}. We'll notify you if a spot opens up."
        )

    elif instance.status == EventRegistration.Status.PENDING_GUARDIAN:
        # Notify the Youth
        send_notification(
            user, 
            "Guardian Approval Needed", 
            f"Your registration for {event.title} is waiting for your guardian's approval."
        )
        # TODO: Ideally Notify the Guardian here as well if we have the link

