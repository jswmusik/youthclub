"""
Management command to run the APScheduler background task scheduler.

This should be run alongside your Django server:
    python manage.py run_scheduler

It will automatically run scheduled tasks like:
- Data retention processing (daily at 3 AM)
- Publishing scheduled events
- Publishing scheduled courses
- Publishing scheduled questionnaires

In production, run this as a separate process or use a process manager like supervisord.
"""
import logging
from django.conf import settings
from django.core.management.base import BaseCommand

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
from django_apscheduler import util

logger = logging.getLogger(__name__)


def process_inactive_users_job():
    """
    Daily job to process inactive users for data retention.
    Sends warnings and deletes users past their retention period.
    """
    from users.services import InactiveUserService
    from licensing.models import GlobalDataRetentionSettings
    
    settings = GlobalDataRetentionSettings.get_settings()
    
    if not settings.is_auto_deletion_enabled:
        logger.info("Data retention: Auto-deletion is disabled. Skipping.")
        return
    
    logger.info("Data retention: Starting daily processing...")
    
    # Send first warnings
    first_warnings = InactiveUserService.get_users_needing_warning(
        settings.warning_notification_days
    )
    for item in first_warnings:
        # TODO: Send actual email notification
        InactiveUserService.mark_warning_sent(item['user'], is_final=False)
        logger.info(f"Sent first warning to {item['user'].email}")
    
    # Send final warnings
    final_warnings = InactiveUserService.get_users_needing_final_warning(
        settings.second_warning_notification_days
    )
    for item in final_warnings:
        # TODO: Send actual email notification
        InactiveUserService.mark_warning_sent(item['user'], is_final=True)
        logger.info(f"Sent final warning to {item['user'].email}")
    
    # Process deletions
    pending = InactiveUserService.get_users_pending_deletion()
    for item in pending:
        try:
            result = InactiveUserService.anonymize_user(
                item['user'],
                reason=f"Inactive for {item['days_inactive']} days"
            )
            logger.info(f"Deleted user: {result['original_email']}")
        except Exception as e:
            logger.error(f"Failed to delete {item['user'].email}: {e}")
    
    logger.info(f"Data retention: Sent {len(first_warnings)} first warnings, "
                f"{len(final_warnings)} final warnings, deleted {len(pending)} users.")


def publish_scheduled_events_job():
    """Publish events that have reached their scheduled time."""
    from django.utils import timezone
    from events.models import Event
    
    now = timezone.now()
    events = Event.objects.filter(
        status='SCHEDULED',
        scheduled_publish_at__isnull=False,
        scheduled_publish_at__lte=now
    )
    
    count = 0
    for event in events:
        event.status = 'PUBLISHED'
        event.save(update_fields=['status'])
        count += 1
        logger.info(f"Published event: {event.title}")
    
    if count > 0:
        logger.info(f"Published {count} scheduled event(s)")


def publish_scheduled_courses_job():
    """Publish courses that have reached their scheduled time."""
    from django.utils import timezone
    from learning.models import Course
    
    now = timezone.now()
    courses = Course.objects.filter(
        status=Course.Status.SCHEDULED,
        published_at__isnull=False,
        published_at__lte=now
    )
    
    count = 0
    for course in courses:
        course.status = Course.Status.PUBLISHED
        course.save(update_fields=['status'])
        count += 1
        logger.info(f"Published course: {course.title}")
    
    if count > 0:
        logger.info(f"Published {count} scheduled course(s)")


def publish_scheduled_questionnaires_job():
    """Publish questionnaires that have reached their scheduled time."""
    from django.utils import timezone
    from questionnaires.models import Questionnaire
    
    now = timezone.now()
    questionnaires = Questionnaire.objects.filter(
        status='SCHEDULED',
        scheduled_publish_at__isnull=False,
        scheduled_publish_at__lte=now
    )
    
    count = 0
    for q in questionnaires:
        q.status = 'PUBLISHED'
        q.save(update_fields=['status'])
        count += 1
        logger.info(f"Published questionnaire: {q.title}")
    
    if count > 0:
        logger.info(f"Published {count} scheduled questionnaire(s)")


@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
    """
    Delete job execution entries older than `max_age` seconds (default: 7 days).
    Helps prevent the database from filling up with old execution records.
    """
    DjangoJobExecution.objects.delete_old_job_executions(max_age)


class Command(BaseCommand):
    help = "Runs APScheduler for background tasks (data retention, publishing, etc.)"

    def handle(self, *args, **options):
        scheduler = BlockingScheduler(timezone=settings.TIME_ZONE)
        scheduler.add_jobstore(DjangoJobStore(), "default")

        # --- DATA RETENTION: Run daily at 3:00 AM ---
        scheduler.add_job(
            process_inactive_users_job,
            trigger=CronTrigger(hour=3, minute=0),
            id="process_inactive_users",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: process_inactive_users (daily at 3:00 AM)")

        # --- PUBLISH SCHEDULED EVENTS: Run every 5 minutes ---
        scheduler.add_job(
            publish_scheduled_events_job,
            trigger=CronTrigger(minute="*/5"),
            id="publish_scheduled_events",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: publish_scheduled_events (every 5 minutes)")

        # --- PUBLISH SCHEDULED COURSES: Run every 5 minutes ---
        scheduler.add_job(
            publish_scheduled_courses_job,
            trigger=CronTrigger(minute="*/5"),
            id="publish_scheduled_courses",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: publish_scheduled_courses (every 5 minutes)")

        # --- PUBLISH SCHEDULED QUESTIONNAIRES: Run every 5 minutes ---
        scheduler.add_job(
            publish_scheduled_questionnaires_job,
            trigger=CronTrigger(minute="*/5"),
            id="publish_scheduled_questionnaires",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: publish_scheduled_questionnaires (every 5 minutes)")

        # --- CLEANUP OLD JOB EXECUTIONS: Run daily at 4:00 AM ---
        scheduler.add_job(
            delete_old_job_executions,
            trigger=CronTrigger(hour=4, minute=0),
            id="delete_old_job_executions",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: delete_old_job_executions (daily at 4:00 AM)")

        try:
            self.stdout.write(self.style.SUCCESS(
                "\n" + "="*60 + "\n"
                "SCHEDULER STARTED\n"
                "="*60 + "\n"
                "Running scheduled tasks:\n"
                "  • Data retention processing - Daily at 3:00 AM\n"
                "  • Publish scheduled events - Every 5 minutes\n"
                "  • Publish scheduled courses - Every 5 minutes\n"
                "  • Publish scheduled questionnaires - Every 5 minutes\n"
                "  • Cleanup old job logs - Daily at 4:00 AM\n"
                "="*60 + "\n"
                "Press Ctrl+C to stop.\n"
            ))
            scheduler.start()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Scheduler stopped."))
            scheduler.shutdown()

