from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q
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

    # Check for existing non-cancelled registration
    existing_reg = EventRegistration.objects.filter(user=user, event=event).exclude(status=EventRegistration.Status.CANCELLED).first()
    if existing_reg:
        raise ValidationError("You are already registered for this event.")

    # Check for cancelled registration that we can reuse
    cancelled_reg = EventRegistration.objects.filter(user=user, event=event, status=EventRegistration.Status.CANCELLED).first()

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

    # 3. Create or Update Registration Transactionally
    with transaction.atomic():
        if cancelled_reg:
            # Reuse cancelled registration by updating its status
            old_status = cancelled_reg.status
            cancelled_reg.status = initial_status
            cancelled_reg.approved_by = None
            cancelled_reg.approval_date = None
            cancelled_reg.save()
            registration = cancelled_reg
            
            # Update counters - only increment if the old status was CANCELLED
            # (which it always is in this branch, but being explicit)
            if initial_status == EventRegistration.Status.APPROVED:
                event.confirmed_participants_count += 1
                event.save(update_fields=['confirmed_participants_count'])
            elif initial_status == EventRegistration.Status.WAITLIST:
                event.waitlist_count += 1
                event.save(update_fields=['waitlist_count'])
        else:
            # Create new registration
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


def get_events_for_user(user):
    """
    Returns a queryset of events that should be visible to the given user
    based on targeting criteria (groups, interests, demographics, etc.).
    Only returns published events that haven't started yet.
    """
    from users.models import User
    from datetime import date
    
    now = timezone.now()
    
    # Base: Published events that haven't started yet
    queryset = Event.objects.filter(
        status=Event.Status.PUBLISHED,
        start_date__gt=now  # Only future events
    ).select_related('municipality', 'club').prefetch_related('target_groups', 'target_interests')
    
    # Build filter conditions
    conditions = Q()
    
    # 1. Global events (visible to everyone)
    conditions |= Q(is_global=True)
    
    # 2. Municipality/Club scope targeting
    if user.role == User.Role.YOUTH_MEMBER and user.preferred_club:
        # Municipality scope
        if user.preferred_club.municipality:
            conditions |= Q(municipality=user.preferred_club.municipality, club__isnull=True)
        # Club scope
        conditions |= Q(club=user.preferred_club)
    
    # 3. Group targeting (overrides other filters if set)
    if user.role == User.Role.YOUTH_MEMBER:
        from groups.models import GroupMembership
        user_group_ids = GroupMembership.objects.filter(
            user=user,
            status=GroupMembership.Status.APPROVED
        ).values_list('group_id', flat=True)
        if user_group_ids:
            conditions |= Q(target_groups__id__in=user_group_ids)
    
    # Apply base conditions
    queryset = queryset.filter(conditions).distinct()
    
    # Now filter by targeting criteria (only if no group targeting)
    filtered_events = []
    for event in queryset:
        # If event has group targeting, user must be in one of those groups
        if event.target_groups.exists():
            from groups.models import GroupMembership
            user_group_ids = set(GroupMembership.objects.filter(
                user=user,
                status=GroupMembership.Status.APPROVED
            ).values_list('group_id', flat=True))
            event_group_ids = set(event.target_groups.values_list('id', flat=True))
            if not user_group_ids.intersection(event_group_ids):
                continue  # User is not in any targeted group
        
        # Check target audience
        if event.target_audience == Event.TargetAudience.YOUTH:
            if user.role != User.Role.YOUTH_MEMBER:
                continue
        elif event.target_audience == Event.TargetAudience.GUARDIAN:
            if user.role != User.Role.GUARDIAN:
                continue
        # BOTH allows both roles, so no check needed
        
        # Check interest targeting
        if event.target_interests.exists():
            user_interest_ids = set(user.interests.values_list('id', flat=True))
            event_interest_ids = set(event.target_interests.values_list('id', flat=True))
            if not user_interest_ids.intersection(event_interest_ids):
                continue  # User doesn't have any targeted interests
        
        # Check gender targeting
        if event.target_genders:
            if not user.legal_gender or user.legal_gender not in event.target_genders:
                continue
        
        # Check age targeting
        if user.date_of_birth:
            today = date.today()
            age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            if event.target_min_age and age < event.target_min_age:
                continue
            if event.target_max_age and age > event.target_max_age:
                continue
        
        # Check grade targeting
        if event.target_grades and user.grade:
            if user.grade not in event.target_grades:
                continue
        
        filtered_events.append(event)
    
    # Return queryset filtered to only include matching events
    event_ids = [e.id for e in filtered_events]
    return Event.objects.filter(id__in=event_ids).order_by('start_date')

