from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from inventory.models import LendingSession
from notifications.models import Notification 

class Command(BaseCommand):
    help = 'Checks for overdue items and sends notifications.'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # 1. Find ALL overdue items (status='ACTIVE' and due_at is in the past)
        # We check for duplicate notifications per day to avoid spamming users
        overdue_sessions = LendingSession.objects.filter(
            status='ACTIVE',
            due_at__lte=now
        )
        
        self.stdout.write(f"Found {overdue_sessions.count()} overdue session(s)")

        count = 0
        skipped_count = 0
        
        for session in overdue_sessions:
            user = session.user
            item_title = session.item.title
            
            # Check if we've already sent a notification for this overdue item today
            # to avoid spamming the user if the command runs multiple times
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            expected_title = f"⚠️ Overdue: {item_title}"
            existing_notification = Notification.objects.filter(
                recipient=user,
                category=Notification.Category.SYSTEM,
                title=expected_title,
                created_at__gte=today_start
            ).exists()
            
            if not existing_notification:
                # Calculate how overdue the item is
                overdue_minutes = int((timezone.now() - session.due_at).total_seconds() / 60)
                overdue_hours = overdue_minutes // 60
                overdue_mins = overdue_minutes % 60
                
                if overdue_hours > 0:
                    overdue_text = f"{overdue_hours}h {overdue_mins}m"
                else:
                    overdue_text = f"{overdue_minutes}m"
                
                Notification.objects.create(
                    recipient=user,
                    category=Notification.Category.SYSTEM,
                    title=f"⚠️ Overdue: {item_title}",
                    body=f"Your borrowing time for '{item_title}' is up. It's been overdue for {overdue_text}. Please return it to the desk.",
                    action_url="/dashboard/youth/inventory/my-items"
                )
                
                self.stdout.write(f"✅ Sent overdue notification to {user.email}: '{item_title}' (overdue {overdue_text})")
            count += 1
            else:
                skipped_count += 1
                self.stdout.write(f"⏭️  Skipped {user.email}: '{item_title}' - notification already sent today")

        self.stdout.write(self.style.SUCCESS(f'Sent {count} overdue notifications. Skipped {skipped_count} (already notified today).'))