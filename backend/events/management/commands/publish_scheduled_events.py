"""
Management command to publish scheduled events.

This command should be run periodically (e.g., via cron or celery) to check for
events that have a scheduled_publish_date in the past and publish them
by changing their status from SCHEDULED to PUBLISHED.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import Event


class Command(BaseCommand):
    help = 'Publishes events that have reached their scheduled_publish_date'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Find events that:
        # 1. Have status SCHEDULED
        # 2. Have a scheduled_publish_date set
        # 3. scheduled_publish_date is <= now (time has arrived)
        scheduled_events = Event.objects.filter(
            status=Event.Status.SCHEDULED,
            scheduled_publish_date__isnull=False,
            scheduled_publish_date__lte=now
        )
        
        count = 0
        for event in scheduled_events:
            # Change status from SCHEDULED to PUBLISHED
            event.status = Event.Status.PUBLISHED
            
            # Optionally clear scheduled_publish_date since it's been processed
            # (or keep it for audit purposes - we'll clear it)
            event.scheduled_publish_date = None
            
            event.save(update_fields=['status', 'scheduled_publish_date'])
            count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'Published event "{event.title}" (ID: {event.id})'
                )
            )
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No scheduled events to publish.'))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully published {count} event(s).'
                )
            )

