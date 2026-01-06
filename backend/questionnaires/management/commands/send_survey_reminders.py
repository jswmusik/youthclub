from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from questionnaires.models import QuestionnaireResponse, Questionnaire
from notifications.services import send_templated_notification
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Sends reminders to users who started but did not complete a questionnaire.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        # Criteria:
        # 1. Status is STARTED (not completed)
        # 2. Questionnaire is still active (not expired)
        # 3. Started at least 24h ago
        # 4. Last reminder was > 24h ago OR never reminded
        
        active_responses = QuestionnaireResponse.objects.filter(
            status=QuestionnaireResponse.Status.STARTED,
            questionnaire__status=Questionnaire.Status.PUBLISHED,
            questionnaire__expiration_date__gt=now,
            started_at__lte=now - timedelta(hours=24)
        )

        count = 0
        for response in active_responses:
            # Check last reminder interval
            if response.last_reminded_at and response.last_reminded_at > now - timedelta(hours=24):
                continue

            # Send Notification using templated system for proper translation support
            send_templated_notification(
                user=response.user,
                template_type='survey_reminder',
                context={
                    'questionnaire_title': response.questionnaire.title,
                },
                action_url=f"/dashboard/youth/questionnaires/{response.questionnaire.id}",
                category_override=Notification.Category.QUESTIONNAIRE
            )
            
            # Update timestamp
            response.last_reminded_at = now
            response.save(update_fields=['last_reminded_at'])
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully sent {count} reminders.'))

