from datetime import timedelta, date, datetime
from django.db.models import Q
from organization.models import ClubClosure
from .models import Booking

def get_week_cycle_type(check_date):
    """
    Returns 'ODD' or 'EVEN' based on the ISO week number.
    """
    week_num = check_date.isocalendar()[1]
    return 'ODD' if week_num % 2 != 0 else 'EVEN'

def get_available_slots(resource, start_date, end_date):
    """
    Generates a list of available time slots for a resource within a date range.
    """
    available_slots = []
    
    # 1. Fetch all Club Closures in this range
    closures = ClubClosure.objects.filter(
        club=resource.club,
        start_date__lte=end_date,
        end_date__gte=start_date
    )
    
    # Helper to check if a specific date is closed
    def is_date_closed(check_date):
        for closure in closures:
            if closure.start_date <= check_date <= closure.end_date:
                return True
        return False

    # 2. Fetch all existing APPROVED or PENDING bookings in this range
    # We purposefully exclude CANCELLED/REJECTED
    existing_bookings = Booking.objects.filter(
        resource=resource,
        status__in=[Booking.Status.APPROVED, Booking.Status.PENDING],
        start_time__date__lte=end_date,
        end_time__date__gte=start_date
    )

    # 3. Iterate through each day in the requested range
    current_date = start_date
    while current_date <= end_date:
        # Skip if the club is closed on this specific date
        if is_date_closed(current_date):
            current_date += timedelta(days=1)
            continue
            
        # Determine schedule matching criteria
        weekday_num = current_date.isoweekday() # 1=Monday, 7=Sunday
        week_type = get_week_cycle_type(current_date)
        
        # Fetch relevant schedule templates
        # Matches: Same weekday AND (Cycle is ALL or matches current week type)
        schedules = resource.schedules.filter(
            weekday=weekday_num
        ).filter(
            Q(week_cycle='ALL') | Q(week_cycle=week_type)
        )
        
        for schedule in schedules:
            # Construct specific datetime objects for this slot
            slot_start = datetime.combine(current_date, schedule.start_time)
            slot_end = datetime.combine(current_date, schedule.end_time)
            
            # Check for overlaps with existing bookings
            is_taken = False
            for booking in existing_bookings:
                # Standard overlap formula: StartA < EndB && EndA > StartB
                # Note: We use naive or aware datetimes consistently. 
                # Assuming Django is managing timezone awareness (USE_TZ=True).
                booking_start = booking.start_time
                booking_end = booking.end_time
                
                # Make naive/aware compatible if needed (usually handled by Django)
                if booking_start.tzinfo and not slot_start.tzinfo:
                    from django.utils.timezone import make_aware
                    slot_start = make_aware(slot_start)
                    slot_end = make_aware(slot_end)
                
                if slot_start < booking_end and slot_end > booking_start:
                    is_taken = True
                    break
            
            if not is_taken:
                available_slots.append({
                    "start": slot_start,
                    "end": slot_end,
                    "title": schedule.resource.name
                })
        
        current_date += timedelta(days=1)

    return available_slots