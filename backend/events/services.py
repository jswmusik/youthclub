from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Event, EventRegistration


def register_user_for_event(user, event):
    """
    Handles the registration logic state machine.
    Determines if user goes to APPROVED, WAITLIST, PENDING_GUARDIAN, or PENDING_ADMIN.
    """
    
    # 1. Basic Validation
    if event.status != Event.Status.PUBLISHED:
        raise ValidationError("Event is not open for registration.")
    
    if event.registration_open_date and timezone.now() < event.registration_open_date:
        raise ValidationError("Registration has not opened yet.")
        
    if event.registration_close_date and timezone.now() > event.registration_close_date:
        raise ValidationError("Registration is closed.")

    if EventRegistration.objects.filter(user=user, event=event).exclude(status=EventRegistration.Status.CANCELLED).exists():
        raise ValidationError("You are already registered for this event.")

    # 2. Determine Initial Status
    initial_status = None

    # Priority 1: Guardian Approval Required
    if event.requires_guardian_approval:
        initial_status = EventRegistration.Status.PENDING_GUARDIAN
    
    # Priority 2: Admin Approval Required (Only if Guardian isn't blocking it)
    elif event.requires_admin_approval:
        initial_status = EventRegistration.Status.PENDING_ADMIN
    
    # Priority 3: Automatic Assignment based on Capacity
    else:
        if not event.is_full:
            initial_status = EventRegistration.Status.APPROVED
        elif event.max_waitlist > 0 and event.waitlist_count < event.max_waitlist:
            initial_status = EventRegistration.Status.WAITLIST
        else:
            raise ValidationError("Event is full and waitlist is at capacity.")

    # 3. Create Registration Transactionally
    with transaction.atomic():
        registration = EventRegistration.objects.create(
            user=user,
            event=event,
            status=initial_status
        )
        
        # Update Denormalized Counters
        if initial_status == EventRegistration.Status.APPROVED:
            event.confirmed_participants_count += 1
            event.save(update_fields=['confirmed_participants_count'])
        elif initial_status == EventRegistration.Status.WAITLIST:
            event.waitlist_count += 1
            event.save(update_fields=['waitlist_count'])
            
    return registration


def cancel_registration(registration):
    """
    Cancels a registration and triggers logic to free up the seat.
    """
    with transaction.atomic():
        old_status = registration.status
        registration.status = EventRegistration.Status.CANCELLED
        registration.save()
        
        event = registration.event
        
        # Decrement Counters based on what they *were*
        if old_status == EventRegistration.Status.APPROVED:
            event.confirmed_participants_count = max(0, event.confirmed_participants_count - 1)
            event.save(update_fields=['confirmed_participants_count'])
            
            # TRIGGER WAITLIST PROMOTION
            # We explicitly call a helper here or rely on Signals. 
            # I prefer explicit service calls for complex logic like this.
            process_waitlist_promotion(event)
            
        elif old_status == EventRegistration.Status.WAITLIST:
            event.waitlist_count = max(0, event.waitlist_count - 1)
            event.save(update_fields=['waitlist_count'])


def process_waitlist_promotion(event):
    """
    Checks if there is space and moves the first waitlisted person to APPROVED.
    """
    # Only promote if auto-promote is desired (implicit in requirements) and space exists
    if not event.is_full and event.waitlist_count > 0:
        # Get first person in line
        next_in_line = event.registrations.filter(
            status=EventRegistration.Status.WAITLIST
        ).order_by('created_at').first()
        
        if next_in_line:
            next_in_line.status = EventRegistration.Status.APPROVED
            next_in_line.save() # This save triggers the Ticket Generation Signal
            
            # Update counters
            event.confirmed_participants_count += 1
            event.waitlist_count = max(0, event.waitlist_count - 1)
            event.save(update_fields=['confirmed_participants_count', 'waitlist_count'])

