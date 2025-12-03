"""
Management command to publish scheduled questionnaires.

This command should be run periodically (e.g., via cron or celery) to check for
questionnaires that have a scheduled_publish_date in the past and publish them
by setting their start_date to now and status to PUBLISHED if needed.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from questionnaires.models import Questionnaire


class Command(BaseCommand):
    help = 'Publishes questionnaires that have reached their scheduled_publish_date'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Find questionnaires that:
        # 1. Have a scheduled_publish_date set
        # 2. scheduled_publish_date is <= now (time has arrived)
        # 3. Either:
        #    a) Are PUBLISHED but don't have start_date set yet (scheduled publish)
        #    b) Are DRAFT with scheduled_publish_date in the past (should be published)
        scheduled_questionnaires = Questionnaire.objects.filter(
            scheduled_publish_date__isnull=False,
            scheduled_publish_date__lte=now
        ).exclude(
            # Exclude already active questionnaires (have start_date set)
            start_date__isnull=False
        )
        
        count = 0
        for questionnaire in scheduled_questionnaires:
            # Set status to PUBLISHED if it's DRAFT
            if questionnaire.status == Questionnaire.Status.DRAFT:
                questionnaire.status = Questionnaire.Status.PUBLISHED
            
            # Set start_date to now, making the questionnaire actually visible
            questionnaire.start_date = now
            
            # Clear scheduled_publish_date since it's been processed
            questionnaire.scheduled_publish_date = None
            
            questionnaire.save(update_fields=['status', 'start_date', 'scheduled_publish_date'])
            count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'Published questionnaire "{questionnaire.title}" (ID: {questionnaire.id})'
                )
            )
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No scheduled questionnaires to publish.'))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully published {count} questionnaire(s).'
                )
            )

