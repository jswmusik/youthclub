from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from inventory.models import LendingSession
# Adjust this import based on your actual Notification model location
# from notifications.models import Notification 

class Command(BaseCommand):
    help = 'Checks for overdue items and sends notifications.'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # 1. Find items that became overdue in the last 15 minutes.
        # We filter by a time range to avoid spamming the user repeatedly 
        # (assuming this script runs every 10-15 mins).
        cutoff_time = now - timedelta(minutes=15)
        
        overdue_sessions = LendingSession.objects.filter(
            status='ACTIVE',
            due_at__lte=now,
            due_at__gt=cutoff_time
        )

        count = 0
        for session in overdue_sessions:
            user = session.user
            item_title = session.item.title
            
            # --- NOTIFICATION LOGIC START ---
            # Replace this with your actual notification service
            # Example:
            # Notification.objects.create(
            #     recipient=user,
            #     title="Time's Up!",
            #     message=f"Your borrowing time for '{item_title}' is up. Please return it to the desk.",
            #     type='ALERT' 
            # )
            
            # For now, we print to console to prove it works
            self.stdout.write(f"Sending Alert to {user.email}: Return '{item_title}'!")
            # --- NOTIFICATION LOGIC END ---
            
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Sent {count} overdue notifications.'))