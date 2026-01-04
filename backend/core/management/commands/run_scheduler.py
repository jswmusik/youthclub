"""
Management command to run the APScheduler background task scheduler.

This should be run alongside your Django server:
    python manage.py run_scheduler

It will automatically run scheduled tasks like:
- Data retention processing (daily at 3 AM)
- Publishing scheduled events
- Publishing scheduled courses
- Publishing scheduled questionnaires
- Cleanup old notifications (daily at 4:30 AM - deletes notifications older than 7 days)
- Increment student grades (yearly on July 1st - aligns with Swedish school year)

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


def cleanup_old_notifications_job():
    """
    Daily job to delete notifications older than 7 days.
    This keeps the notifications table clean and prevents it from growing indefinitely.
    """
    from django.utils import timezone
    from datetime import timedelta
    from notifications.models import Notification
    
    # Calculate the cutoff date (7 days ago)
    cutoff_date = timezone.now() - timedelta(days=7)
    
    # Get count before deletion for logging
    old_notifications = Notification.objects.filter(created_at__lt=cutoff_date)
    count = old_notifications.count()
    
    if count > 0:
        # Delete old notifications
        old_notifications.delete()
        logger.info(f"Notification cleanup: Deleted {count} notification(s) older than 7 days")
    else:
        logger.info("Notification cleanup: No old notifications to delete")


def increment_grades_job():
    """
    Yearly job to increment grades for all youth members.
    Runs on July 1st at midnight to align with the Swedish school year.
    When the new school year starts in August, students will have already 
    been promoted to the next grade.
    """
    from django.db.models import F
    from users.models import User
    
    # Get all youth members with a grade
    youth_with_grades = User.objects.filter(role='YOUTH_MEMBER', grade__isnull=False)
    
    count = youth_with_grades.count()
    
    if count == 0:
        logger.info("Grade increment: No youth members with grades found.")
        return
    
    # Increment grade by 1 efficiently in the database
    youth_with_grades.update(grade=F('grade') + 1)
    
    logger.info(f"Grade increment: Successfully incremented grades for {count} youth member(s)")


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

        # --- CLEANUP OLD NOTIFICATIONS: Run daily at 4:30 AM ---
        scheduler.add_job(
            cleanup_old_notifications_job,
            trigger=CronTrigger(hour=4, minute=30),
            id="cleanup_old_notifications",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: cleanup_old_notifications (daily at 4:30 AM)")

        # --- INCREMENT GRADES: Run yearly on July 1st at midnight ---
        # This aligns with the Swedish school year - when school starts in August,
        # students will have already been promoted to the next grade
        scheduler.add_job(
            increment_grades_job,
            trigger=CronTrigger(month=7, day=1, hour=0, minute=0),
            id="increment_grades",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: increment_grades (yearly on July 1st at 00:00)")

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
                "  • Cleanup old notifications - Daily at 4:30 AM\n"
                "  • Increment student grades - Yearly on July 1st\n"
                "="*60 + "\n"
                "Press Ctrl+C to stop.\n"
            ))
            scheduler.start()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Scheduler stopped."))
            scheduler.shutdown()

