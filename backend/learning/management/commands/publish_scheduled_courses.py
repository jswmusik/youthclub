"""
Management command to publish scheduled courses.

This command should be run periodically (e.g., via cron or celery) to check for
courses that have a published_at date in the past and publish them
by changing their status from SCHEDULED to PUBLISHED.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from learning.models import Course


class Command(BaseCommand):
    help = 'Publishes courses that have reached their scheduled published_at date'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Find courses that:
        # 1. Have status SCHEDULED
        # 2. Have a published_at set
        # 3. published_at is <= now (time has arrived)
        scheduled_courses = Course.objects.filter(
            status=Course.Status.SCHEDULED,
            published_at__isnull=False,
            published_at__lte=now
        )
        
        count = 0
        for course in scheduled_courses:
            # Change status from SCHEDULED to PUBLISHED
            course.status = Course.Status.PUBLISHED
            course.save(update_fields=['status'])
            count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'Published course "{course.title}" (ID: {course.id})'
                )
            )
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No scheduled courses to publish.'))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully published {count} course(s).'
                )
            )

