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

            # Find today's closing time for this club
            # Note: This is simplified. Real-world apps might check "DateOverride" or yesterday's late-night shifts.
            today_weekday = now.isoweekday()

            opening_hours = RegularOpeningHour.objects.filter(
                club=club, 
                weekday=today_weekday
            ).order_by('-close_time').first()

            if opening_hours:
                # Create a full datetime for today's closing
                closing_dt = timezone.make_aware(datetime.datetime.combine(now.date(), opening_hours.close_time))

                # Buffer: We check them out 30 mins AFTER closing to be sure they didn't just linger at the door
                checkout_threshold = closing_dt + datetime.timedelta(minutes=30)

                if now > checkout_threshold:
                    session.check_out_at = closing_dt # Set time to exact closing time
                    session.method = 'MANUAL_ADMIN' # Or a new 'SYSTEM_AUTO' if you add that choice
                    session.save()
                    count += 1
                    self.stdout.write(f"Auto-checked out {session.user} from {club.name}")

        self.stdout.write(self.style.SUCCESS(f'Successfully processed {count} auto-checkouts'))

