from django.core.management.base import BaseCommand
from django.utils import timezone
from visits.models import CheckInSession
from organization.models import RegularOpeningHour
import datetime

class Command(BaseCommand):
    help = 'Automatically checks out members if the club has closed.'

    def handle(self, *args, **options):
        now = timezone.localtime()

        # 1. Get all currently active sessions
        active_sessions = CheckInSession.objects.filter(check_out_at__isnull=True).select_related('club')

        count = 0
        for session in active_sessions:
            club = session.club
            
            # Use the weekday of the Check-In, not "Right Now".
            # This ensures if I checked in on Monday, we look for Monday's closing time,
            # even if the script runs early Tuesday morning.
            session_local_time = timezone.localtime(session.check_in_at)
            checkin_weekday = session_local_time.isoweekday()
            
            # Find the closing time for the day the user checked in
            opening_hours = RegularOpeningHour.objects.filter(
                club=club, 
                weekday=checkin_weekday
            ).order_by('-close_time').first()

            if opening_hours:
                # Create the specific datetime for that closing
                closing_dt = timezone.make_aware(
                    datetime.datetime.combine(session_local_time.date(), opening_hours.close_time)
                )
                # Fix: Removed the 30-minute buffer so it checks out immediately at closing time.
                # If you want a small grace period (e.g. 5 mins), change to minutes=5.
                checkout_threshold = closing_dt + datetime.timedelta(minutes=0)
                
                # If the current time is past the closing time of the check-in day
                if now > checkout_threshold:
                    session.check_out_at = closing_dt  # Set checkout time to exact closing time
                    session.method = 'MANUAL_ADMIN'    # Mark as system/admin auto-action
                    session.save()
                    count += 1
                    self.stdout.write(f"Auto-checked out {session.user} from {club.name}")

        self.stdout.write(self.style.SUCCESS(f'Successfully processed {count} auto-checkouts'))

