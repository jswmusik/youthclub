from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EventRegistration, EventTicket
from notifications.services import send_notification


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

