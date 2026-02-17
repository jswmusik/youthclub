"""
Management command to send birthday emails to users.

This should be run daily (scheduled via APScheduler):
    python manage.py send_birthday_emails
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from users.models import User
from emails.tasks import send_email_async
from emails.models import EmailTemplate


class Command(BaseCommand):
    help = 'Send birthday emails to users whose birthday is today'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # Find users with birthday today
        birthday_users = User.objects.filter(
            date_of_birth__month=today.month,
            date_of_birth__day=today.day,
            is_active=True
        ).exclude(
            email__icontains='@anonymized.local'  # Skip anonymized users
        )
        
        sent_count = 0
        failed_count = 0
        
        for user in birthday_users:
            self.stdout.write(f"Sending birthday email to {user.email}...")
            
            # Calculate age
            age = today.year - user.date_of_birth.year
            
            try:
                success = send_email_async(
                    template_type=EmailTemplate.Type.BIRTHDAY,
                    recipient=user,
                    context={
                        'age': age,
                        'birthday_date': today.strftime('%Y-%m-%d'),
                    }
                )
                
                if success:
                    sent_count += 1
                    self.stdout.write(self.style.SUCCESS(f"  ✓ Sent to {user.email}"))
                else:
                    failed_count += 1
                    self.stdout.write(self.style.ERROR(f"  ✗ Failed to send to {user.email}"))
                    
            except Exception as e:
                failed_count += 1
                self.stdout.write(self.style.ERROR(f"  ✗ Error sending to {user.email}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Birthday Email Summary:\n"
            f"   Sent: {sent_count}\n"
            f"   Failed: {failed_count}\n"
        ))


