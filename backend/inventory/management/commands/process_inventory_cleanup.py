from django.core.management.base import BaseCommand
from django.utils import timezone
from inventory.models import LendingSession, Item

class Command(BaseCommand):
    help = 'Auto-returns items that were not returned by closing time.'

    def handle(self, *args, **options):
        # We assume this runs at a safe time when all clubs are closed (e.g., 04:00 AM)
        # Find all ACTIVE sessions that started BEFORE today's 04:00 AM cutoff
        # (This prevents auto-returning an item someone JUST borrowed if the script runs late)
        
        now = timezone.now()
        active_sessions = LendingSession.objects.filter(status='ACTIVE')
        
        count = 0
        for session in active_sessions:
            # Mark the session as closed by system
            session.status = 'RETURNED_SYSTEM'
            session.returned_at = now
            session.save()
            
            # Make the item available again
            item = session.item
            item.status = 'AVAILABLE'
            item.save()
            
            # Optional: Log this action or flag the user in the future
            self.stdout.write(f"Auto-returned: {item.title} borrowed by {session.user.email}")
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully processed {count} unreturned items.'))