from datetime import timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q
from dateutil.relativedelta import relativedelta
from .models import Event, EventRegistration, EventImage


def generate_recurring_events(master_event):
    """
    Creates copies of the master_event based on its recurrence pattern
    until recurrence_end_date.
    """
    import logging
    import sys
    logger = logging.getLogger(__name__)
    
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"=== generate_recurring_events CALLED ===", file=sys.stderr)
    print(f"Event ID: {master_event.id}", file=sys.stderr)
    print(f"is_recurring: {master_event.is_recurring}", file=sys.stderr)
    print(f"recurrence_pattern: {master_event.recurrence_pattern}", file=sys.stderr)
    print(f"recurrence_end_date: {master_event.recurrence_end_date}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)
    
    logger.info(f"=== generate_recurring_events called ===")
    logger.info(f"Event ID: {master_event.id}")
    logger.info(f"is_recurring: {master_event.is_recurring}")
    logger.info(f"recurrence_pattern: {master_event.recurrence_pattern}")
    logger.info(f"recurrence_end_date: {master_event.recurrence_end_date}")
    
    if not master_event.is_recurring:
        print(f"WARNING: Event is not marked as recurring, skipping generation", file=sys.stderr)
        logger.warning("Event is not marked as recurring, skipping generation")
        return
    
    if not master_event.recurrence_end_date:
        print(f"WARNING: recurrence_end_date is not set, skipping generation", file=sys.stderr)
        logger.warning("recurrence_end_date is not set, skipping generation")
        return

    # Determine interval
    interval = None
    if master_event.recurrence_pattern == Event.Recurrence.DAILY:
        interval = timedelta(days=1)
    elif master_event.recurrence_pattern == Event.Recurrence.WEEKLY:
        interval = timedelta(weeks=1)
    elif master_event.recurrence_pattern == Event.Recurrence.MONTHLY:
        interval = relativedelta(months=1)
    
    if not interval:
        logger.warning(f"Invalid or missing recurrence_pattern: {master_event.recurrence_pattern}")
        return
    
    logger.info(f"Using interval: {interval}")

    current_start = master_event.start_date
    current_end = master_event.end_date
    
    print(f"Master event start_date: {master_event.start_date}", file=sys.stderr)
    print(f"Master event recurrence_end_date: {master_event.recurrence_end_date}", file=sys.stderr)
    print(f"Interval: {interval}", file=sys.stderr)
    
    # We start from the *next* slot, since master_event is the first one
    if isinstance(interval, timedelta):
        current_start += interval
        current_end += interval
    else:
        current_start += interval
        current_end += interval

    # Convert recurrence_end_date to datetime for proper comparison
    # We compare dates, but need to ensure timezone awareness
    recurrence_end_datetime = timezone.make_aware(
        timezone.datetime.combine(master_event.recurrence_end_date, timezone.datetime.max.time())
    ) if master_event.recurrence_end_date else None
    
    print(f"After adding interval:", file=sys.stderr)
    print(f"  current_start: {current_start} ({current_start.date()})", file=sys.stderr)
    print(f"  recurrence_end_date: {master_event.recurrence_end_date}", file=sys.stderr)
    if recurrence_end_datetime:
        print(f"  recurrence_end_datetime: {recurrence_end_datetime}", file=sys.stderr)
    print(f"  Loop condition check: {current_start.date()} <= {master_event.recurrence_end_date} = {current_start.date() <= master_event.recurrence_end_date}", file=sys.stderr)

    events_to_create = []
    instance_count = 0

    print(f"Starting recurrence generation from {current_start.date()} to {master_event.recurrence_end_date}", file=sys.stderr)
    logger.info(f"Starting recurrence generation from {current_start.date()} to {master_event.recurrence_end_date}")

    max_iterations = 1000  # Safety limit
    iteration = 0
    
    # Use date comparison for the loop condition - this works for all patterns
    # Ensure we're comparing date objects correctly
    recurrence_end_date = master_event.recurrence_end_date
    
    while iteration < max_iterations:
        # Compare dates - both should be date objects
        current_date = current_start.date()
        if current_date > recurrence_end_date:
            print(f"Stopping: {current_date} > {recurrence_end_date}", file=sys.stderr)
            logger.info(f"Stopping recurrence generation: {current_date} > {recurrence_end_date}")
            break
        
        iteration += 1
        instance_count += 1
        
        print(f"Iteration {iteration}: Creating instance for {current_date} (pattern: {master_event.recurrence_pattern})", file=sys.stderr)
        
        # Generate unique slug for this instance
        from django.utils.text import slugify
        base_slug = slugify(master_event.title)
        instance_slug = f"{base_slug}-{current_start.strftime('%Y-%m-%d')}"
        # Ensure uniqueness
        counter = 1
        while Event.objects.filter(slug=instance_slug).exists():
            instance_slug = f"{base_slug}-{current_start.strftime('%Y-%m-%d')}-{counter}"
            counter += 1
        
        # Create a copy in memory
        new_event = Event(
            title=master_event.title,
            description=master_event.description,
            cover_image=master_event.cover_image, # Note: FileField copy might reference same file (good)
            video_url=master_event.video_url,
            cost=master_event.cost,
            municipality=master_event.municipality,
            club=master_event.club,
            organizer_name=master_event.organizer_name,
            status=master_event.status,
            
            start_date=current_start,
            end_date=current_end,
            
            location_name=master_event.location_name,
            address=master_event.address,
            latitude=master_event.latitude,
            longitude=master_event.longitude,
            is_map_visible=master_event.is_map_visible,
            
            is_global=master_event.is_global,
            target_audience=master_event.target_audience,
            target_genders=master_event.target_genders,
            target_min_age=master_event.target_min_age,
            target_max_age=master_event.target_max_age,
            target_grades=master_event.target_grades,
            
            allow_registration=master_event.allow_registration,
            requires_verified_account=master_event.requires_verified_account,
            requires_guardian_approval=master_event.requires_guardian_approval,
            requires_admin_approval=master_event.requires_admin_approval,
            
            max_seats=master_event.max_seats,
            max_waitlist=master_event.max_waitlist,
            enable_tickets=master_event.enable_tickets,
            send_reminders=master_event.send_reminders,
            custom_welcome_message=master_event.custom_welcome_message,
            
            # SEO fields
            slug=instance_slug,
            meta_description=master_event.meta_description,
            meta_tags=master_event.meta_tags,
            page_title=master_event.page_title,
            og_title=master_event.og_title,
            og_description=master_event.og_description,
            og_image=master_event.og_image,
            twitter_card_type=master_event.twitter_card_type,
            twitter_title=master_event.twitter_title,
            twitter_description=master_event.twitter_description,
            twitter_image=master_event.twitter_image,
            
            # Link to parent for tracking
            parent_event=master_event,
            
            # Child events are NOT recurring themselves (prevent infinite loops)
            is_recurring=False 
        )
        events_to_create.append(new_event)
        
        print(f"Prepared instance {instance_count} for {current_start.date()} (slug: {instance_slug})", file=sys.stderr)
        logger.info(f"Prepared instance {instance_count} for {current_start.date()}")

        # Step forward
        if isinstance(interval, timedelta):
            current_start += interval
            current_end += interval
        else:
            # relativedelta for monthly
            current_start += interval
            current_end += interval
        
        # Check if we've exceeded the end date after incrementing
        if current_start.date() > recurrence_end_date:
            print(f"Next iteration would exceed end date ({current_start.date()} > {recurrence_end_date}), stopping", file=sys.stderr)
            logger.info(f"Next iteration would exceed end date, stopping")
            break
    
    if iteration >= max_iterations:
        print(f"WARNING: Hit max iterations limit ({max_iterations})", file=sys.stderr)
        logger.warning(f"Hit max iterations limit ({max_iterations})")

    print(f"Total instances to create: {len(events_to_create)}", file=sys.stderr)
    logger.info(f"Creating {len(events_to_create)} recurring instances...")
    
    if len(events_to_create) == 0:
        print(f"WARNING: No instances to create! Loop condition might be wrong.", file=sys.stderr)
        print(f"  current_start.date(): {current_start.date()}", file=sys.stderr)
        print(f"  recurrence_end_date: {master_event.recurrence_end_date}", file=sys.stderr)
        print(f"  Condition: {current_start.date()} <= {master_event.recurrence_end_date} = {current_start.date() <= master_event.recurrence_end_date}", file=sys.stderr)
        logger.warning("No instances to create - loop condition might be wrong")
        return
    
    # Bulk create for performance (excluding M2M fields)
    # Note: In SQLite, bulk_create might not return IDs, so we need to handle that
    try:
        created_events = Event.objects.bulk_create(events_to_create, ignore_conflicts=False)
        print(f"Successfully created {len(created_events)} recurring instances", file=sys.stderr)
        logger.info(f"Successfully created {len(created_events)} recurring instances")
        
        # In SQLite, bulk_create doesn't return IDs, so we need to fetch them
        # For other databases, the objects will have IDs
        if created_events and (not hasattr(created_events[0], 'id') or created_events[0].id is None):
            logger.info("bulk_create didn't return IDs, fetching created events...")
            # Fetch the created events by matching on parent_event and date range
            # We know the first instance starts after master_event.start_date + interval
            first_instance_start = master_event.start_date + interval if isinstance(interval, timedelta) else master_event.start_date + interval
            created_events = list(Event.objects.filter(
                parent_event=master_event,
                start_date__gte=first_instance_start
            ).order_by('start_date'))
            logger.info(f"Fetched {len(created_events)} created instances")
    except Exception as e:
        logger.error(f"Error during bulk_create: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise

    # Copy ManyToMany fields (bulk_create doesn't do this)
    # We must iterate and set them.
    logger.info(f"Copying M2M relationships and images for {len(created_events)} instances...")
    for evt in created_events:
        try:
            evt.target_groups.set(master_event.target_groups.all())
            evt.target_interests.set(master_event.target_interests.all())
            # Copy Image Gallery if needed (needs separate query)
            for img in master_event.images.all():
                EventImage.objects.create(
                    event=evt,
                    image=img.image,
                    caption=img.caption,
                    order=img.order
                )
        except Exception as e:
            logger.error(f"Error copying M2M relationships for event {getattr(evt, 'id', 'unknown')}: {str(e)}")
            # Continue with other events even if one fails
    
    logger.info(f"=== Recurrence generation completed: {len(created_events)} instances created ===")


def is_user_eligible_for_event(user, event):
    """
    Checks if a user is eligible for an event based on targeting criteria.
    Returns (is_eligible, reason) tuple.
    """
    from users.models import User
    from datetime import date
    from groups.models import GroupMembership
    
    # Check target audience
    if event.target_audience == Event.TargetAudience.YOUTH:
        if user.role != User.Role.YOUTH_MEMBER:
            return False, "Event is only for youth members"
    elif event.target_audience == Event.TargetAudience.GUARDIAN:
        if user.role != User.Role.GUARDIAN:
            return False, "Event is only for guardians"
    
    # Check if event has any targeting criteria
    has_targeting = (
        event.target_groups.exists() or
        event.target_interests.exists() or
        (event.target_genders and len(event.target_genders) > 0) or
        event.target_min_age is not None or
        event.target_max_age is not None or
        (event.target_grades and len(event.target_grades) > 0)
    )
    
    # If event has targeting criteria, all must match
    if has_targeting:
        # Check group targeting
        if event.target_groups.exists():
            user_group_ids = set(GroupMembership.objects.filter(
                user=user,
                status=GroupMembership.Status.APPROVED
            ).values_list('group_id', flat=True))
            event_group_ids = set(event.target_groups.values_list('id', flat=True))
            if not user_group_ids.intersection(event_group_ids):
                return False, "User is not in any targeted group"
        
        # Check interest targeting
        if event.target_interests.exists():
            user_interest_ids = set(user.interests.values_list('id', flat=True))
            event_interest_ids = set(event.target_interests.values_list('id', flat=True))
            if not user_interest_ids.intersection(event_interest_ids):
                return False, "User doesn't have any targeted interests"
        
        # Check gender targeting
        if event.target_genders and len(event.target_genders) > 0:
            if not user.legal_gender or user.legal_gender not in event.target_genders:
                return False, f"User's gender ({user.legal_gender}) doesn't match targeted genders"
        
        # Check age targeting
        if user.date_of_birth:
            today = date.today()
            user_age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            if event.target_min_age is not None and user_age < event.target_min_age:
                return False, f"User's age ({user_age}) is below minimum ({event.target_min_age})"
            if event.target_max_age is not None and user_age > event.target_max_age:
                return False, f"User's age ({user_age}) is above maximum ({event.target_max_age})"
        
        # Check grade targeting
        if event.target_grades and len(event.target_grades) > 0:
            if not user.grade or user.grade not in event.target_grades:
                return False, f"User's grade ({user.grade}) doesn't match targeted grades"
    
    return True, None


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


def admin_add_user_to_event(user, event, admin_user, status=None):
    """
    Admin function to add a user to an event, bypassing normal registration checks.
    Admin can override eligibility and set status directly.
    """
    from django.db import transaction
    
    # Check for existing non-cancelled registration
    existing_reg = EventRegistration.objects.filter(user=user, event=event).exclude(status=EventRegistration.Status.CANCELLED).first()
    if existing_reg:
        raise ValidationError("User is already registered for this event.")
    
    # Check for cancelled registration that we can reuse
    cancelled_reg = EventRegistration.objects.filter(user=user, event=event, status=EventRegistration.Status.CANCELLED).first()
    
    # Determine status - use provided status or default based on event settings
    if status:
        initial_status = status
    else:
        # Default logic similar to register_user_for_event
        if event.requires_guardian_approval:
            initial_status = EventRegistration.Status.PENDING_GUARDIAN
        elif event.requires_admin_approval:
            initial_status = EventRegistration.Status.PENDING_ADMIN
        else:
            if not event.is_full:
                initial_status = EventRegistration.Status.APPROVED
            elif event.max_waitlist > 0 and event.waitlist_count < event.max_waitlist:
                initial_status = EventRegistration.Status.WAITLIST
            else:
                # If full, still allow admin to add but set as waitlist
                initial_status = EventRegistration.Status.WAITLIST
    
    # Create or Update Registration Transactionally
    with transaction.atomic():
        if cancelled_reg:
            cancelled_reg.status = initial_status
            cancelled_reg.approved_by = admin_user
            cancelled_reg.approval_date = timezone.now()
            cancelled_reg.save()
            registration = cancelled_reg
            
            # Update counters
            if initial_status == EventRegistration.Status.APPROVED:
                event.confirmed_participants_count += 1
                event.save(update_fields=['confirmed_participants_count'])
            elif initial_status == EventRegistration.Status.WAITLIST:
                event.waitlist_count += 1
                event.save(update_fields=['waitlist_count'])
        else:
            registration = EventRegistration.objects.create(
                user=user,
                event=event,
                status=initial_status,
                approved_by=admin_user,
                approval_date=timezone.now() if initial_status == EventRegistration.Status.APPROVED else None
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


def filter_events_by_targeting(events_queryset, user):
    """
    Filters a queryset of events based on user targeting criteria.
    Returns a list of event IDs that match the user's attributes.
    
    This function checks:
    - Target audience (YOUTH/GUARDIAN/BOTH)
    - Group targeting
    - Interest targeting
    - Gender targeting
    - Age targeting
    - Grade targeting
    """
    from users.models import User
    from datetime import date
    from groups.models import GroupMembership
    
    if not user or not user.is_authenticated:
        return []
    
    # Prefetch user's group memberships
    user_group_ids = set(GroupMembership.objects.filter(
        user=user,
        status=GroupMembership.Status.APPROVED
    ).values_list('group_id', flat=True))
    
    # Prefetch user's interests
    user_interest_ids = set(user.interests.values_list('id', flat=True))
    
    # Calculate user's age if date_of_birth is available
    user_age = None
    if user.date_of_birth:
        today = date.today()
        user_age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
    
    matching_event_ids = []
    
    for event in events_queryset.select_related('municipality', 'club').prefetch_related('target_groups', 'target_interests'):
        # Check target audience first (applies to all events, including global)
        if event.target_audience == Event.TargetAudience.YOUTH:
            if user.role != User.Role.YOUTH_MEMBER:
                continue
        elif event.target_audience == Event.TargetAudience.GUARDIAN:
            if user.role != User.Role.GUARDIAN:
                continue
        # BOTH allows both roles, so no check needed
        
        # Global events bypass scope restrictions (municipality/club) but still respect targeting criteria
        # (groups, interests, gender, age, grade) - these checks happen below
        
        # Check if event has any targeting criteria
        has_targeting = (
            event.target_groups.exists() or
            event.target_interests.exists() or
            (event.target_genders and len(event.target_genders) > 0) or
            event.target_min_age is not None or
            event.target_max_age is not None or
            (event.target_grades and len(event.target_grades) > 0)
        )
        
        # If event has targeting criteria, all must match
        # If event has no targeting criteria, it's visible to everyone (within scope)
        if has_targeting:
            # If event has group targeting, ONLY check groups (groups override other criteria)
            if event.target_groups.exists():
                event_group_ids = set(event.target_groups.values_list('id', flat=True))
                if not user_group_ids.intersection(event_group_ids):
                    continue  # User is not in any targeted group
                # If user is in a targeted group, they match (skip other checks)
                # This ensures groups are exclusive - only group members see group-targeted events
            else:
                # No groups set - check other criteria (age, grades, interests, gender)
                # All specified criteria must match
                
                # Check interest targeting - if event has interest targeting, user must have at least one
                if event.target_interests.exists():
                    event_interest_ids = set(event.target_interests.values_list('id', flat=True))
                    if not user_interest_ids.intersection(event_interest_ids):
                        continue  # User doesn't have any targeted interests
                
                # Check gender targeting - if event has gender targeting, user's gender must match
                if event.target_genders and len(event.target_genders) > 0:
                    if not user.legal_gender or user.legal_gender not in event.target_genders:
                        continue
                
                # Check age targeting - if event has age requirements, user must have age info and match
                if event.target_min_age is not None or event.target_max_age is not None:
                    if user_age is None:
                        # User doesn't have age info, but event requires age - exclude them
                        continue
                    if event.target_min_age is not None and user_age < event.target_min_age:
                        continue
                    if event.target_max_age is not None and user_age > event.target_max_age:
                        continue
                
                # Check grade targeting - if event has grade targeting, user's grade must match
                if event.target_grades and len(event.target_grades) > 0:
                    if not user.grade or user.grade not in event.target_grades:
                        continue
        
        # Event matches all criteria (or has no targeting criteria)
        matching_event_ids.append(event.id)
    
    return matching_event_ids


def get_events_for_user(user):
    """
    Returns a queryset of events that should be visible to the given user
    based on targeting criteria (groups, interests, demographics, etc.).
    Only returns published events that haven't started yet.
    Excludes recurring instances - only shows parent events.
    """
    from users.models import User
    from datetime import date
    
    now = timezone.now()
    
    # Base: Published events that haven't started yet
    # IMPORTANT: Exclude recurring instances (events with parent_event set)
    # Only show parent events in the feed to avoid cluttering
    queryset = Event.objects.filter(
        status=Event.Status.PUBLISHED,
        start_date__gt=now,  # Only future events
        parent_event__isnull=True  # Exclude recurring instances, only show parent events
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
    
    # Apply targeting criteria filtering
    matching_event_ids = filter_events_by_targeting(queryset, user)
    
    # Return queryset filtered to only include matching events
    return Event.objects.filter(id__in=matching_event_ids).order_by('start_date')

