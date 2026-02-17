"""
Management command to run the APScheduler background task scheduler.

This should be run alongside your Django server:
    python manage.py run_scheduler

It will automatically run scheduled tasks like:

CLEANUP JOBS:
- Cleanup expired rewards (Sundays at 2:00 AM - removes expired rewards after grace period)
- Data retention processing (daily at 3:00 AM - GDPR compliance: warnings & deletions)
- Cleanup old job logs (daily at 4:00 AM - keeps scheduler logs manageable)
- Cleanup old notifications (daily at 4:30 AM - deletes notifications older than 7 days)
- Cleanup deleted messages (daily at 5:00 AM - permanently removes soft-deleted messages)

REWARD JOBS:
- Birthday rewards (daily at 6:00 AM - grants rewards to users on their birthday)
- Anniversary rewards (daily at 6:30 AM - grants rewards on account anniversaries)
- Most checked-in rewards - weekly (Mondays at 7:00 AM - top users per club)
- Most checked-in rewards - monthly (1st of month at 7:00 AM - top users per club)
- Notify expiring rewards (daily at 8:00 AM - warns users 3 days before expiration)

EMAIL & NOTIFICATION JOBS:
- Send birthday emails (daily at 9:00 AM - birthday greetings to users)
- Send trial expiring emails (daily at 10:00 AM - warns about trial ending in 3 days)
- Send survey reminders (daily at 11:00 AM - reminds users to complete started questionnaires)

PUBLISHING JOBS:
- Publish scheduled events (every 5 minutes - auto-publish when scheduled time is reached)
- Publish scheduled courses (every 5 minutes - auto-publish when scheduled time is reached)
- Publish scheduled questionnaires (every 5 minutes - auto-publish when scheduled time is reached)

MONITORING JOBS:
- Auto-checkout users (every 15 minutes - checks out users when clubs close)
- Check inventory overdue (every 30 minutes - notifies users about overdue borrowed items)

YEARLY JOBS:
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
        success = InactiveUserService.send_deletion_warning(
            user=item['user'],
            days_until_deletion=item['days_until_deletion'],
            deletion_date=item['deletion_date'],
            is_final=False
        )
        if success:
            logger.info(f"Sent first warning to {item['user'].email}")
        else:
            logger.error(f"Failed to send first warning to {item['user'].email}")
    
    # Send final warnings
    final_warnings = InactiveUserService.get_users_needing_final_warning(
        settings.second_warning_notification_days
    )
    for item in final_warnings:
        success = InactiveUserService.send_deletion_warning(
            user=item['user'],
            days_until_deletion=item['days_until_deletion'],
            deletion_date=item['deletion_date'],
            is_final=True
        )
        if success:
            logger.info(f"Sent final warning to {item['user'].email}")
        else:
            logger.error(f"Failed to send final warning to {item['user'].email}")
    
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
        scheduled_publish_date__isnull=False,
        scheduled_publish_date__lte=now
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
        scheduled_publish_date__isnull=False,
        scheduled_publish_date__lte=now
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


def send_birthday_emails_job():
    """
    Daily job to send birthday emails to users whose birthday is today.
    """
    from django.core.management import call_command
    
    logger.info("Starting birthday email job...")
    try:
        call_command('send_birthday_emails')
        logger.info("Birthday email job completed")
    except Exception as e:
        logger.error(f"Birthday email job failed: {e}")


def send_trial_expiring_emails_job():
    """
    Daily job to send trial expiring warning emails.
    Sends to users whose trial expires in 3 days.
    """
    from django.core.management import call_command
    
    logger.info("Starting trial expiring email job...")
    try:
        call_command('send_trial_expiring_emails', '--days-before=3')
        logger.info("Trial expiring email job completed")
    except Exception as e:
        logger.error(f"Trial expiring email job failed: {e}")


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


def process_auto_checkout_job():
    """
    Frequent job to automatically check out users when their club closes.
    Runs every 15 minutes to ensure timely checkout after closing time.
    Also auto-returns any borrowed inventory items.
    """
    from django.core.management import call_command
    
    logger.info("Starting auto-checkout processing...")
    try:
        call_command('process_auto_checkout')
        logger.info("Auto-checkout processing completed")
    except Exception as e:
        logger.error(f"Auto-checkout processing failed: {e}")


def cleanup_deleted_messages_job():
    """
    Daily job to permanently delete soft-deleted messages older than 90 days.
    Prevents database bloat from accumulating deleted messages.
    """
    from django.core.management import call_command
    
    logger.info("Starting deleted messages cleanup...")
    try:
        call_command('cleanup_deleted_messages')
        logger.info("Deleted messages cleanup completed")
    except Exception as e:
        logger.error(f"Deleted messages cleanup failed: {e}")


def process_birthday_rewards_job():
    """
    Daily job to grant birthday rewards to users whose birthday is today.
    Only runs if birthday rewards are configured.
    """
    from django.core.management import call_command
    
    logger.info("Starting birthday rewards processing...")
    try:
        call_command('process_birthday_rewards')
        logger.info("Birthday rewards processing completed")
    except Exception as e:
        logger.error(f"Birthday rewards processing failed: {e}")


def process_anniversary_rewards_job():
    """
    Daily job to grant anniversary rewards to users whose account anniversary is today.
    Only runs if anniversary rewards are configured.
    """
    from django.core.management import call_command
    
    logger.info("Starting anniversary rewards processing...")
    try:
        call_command('process_anniversary_rewards')
        logger.info("Anniversary rewards processing completed")
    except Exception as e:
        logger.error(f"Anniversary rewards processing failed: {e}")


def process_most_checkedin_weekly_job():
    """
    Weekly job to grant rewards to most checked-in users per club.
    Runs on Mondays at 7:00 AM.
    """
    from django.core.management import call_command
    
    logger.info("Starting weekly most-checked-in rewards processing...")
    try:
        call_command('process_most_checkedin_rewards', '--period=WEEKLY')
        logger.info("Weekly most-checked-in rewards processing completed")
    except Exception as e:
        logger.error(f"Weekly most-checked-in rewards processing failed: {e}")


def process_most_checkedin_monthly_job():
    """
    Monthly job to grant rewards to most checked-in users per club.
    Runs on the 1st of each month at 7:00 AM.
    """
    from django.core.management import call_command
    
    logger.info("Starting monthly most-checked-in rewards processing...")
    try:
        call_command('process_most_checkedin_rewards', '--period=MONTHLY')
        logger.info("Monthly most-checked-in rewards processing completed")
    except Exception as e:
        logger.error(f"Monthly most-checked-in rewards processing failed: {e}")


def cleanup_expired_data_exports_job():
    """
    Daily job to clean up expired data export files (GDPR).
    Export files are kept for 7 days after creation, then deleted.
    """
    from gdpr.tasks import cleanup_expired_exports
    
    logger.info("Starting expired data exports cleanup...")
    try:
        result = cleanup_expired_exports()
        logger.info(f"Expired data exports cleanup completed: {result.get('cleaned_up', 0)} files")
    except Exception as e:
        logger.error(f"Expired data exports cleanup failed: {e}")


def notify_expiring_rewards_job():
    """
    Daily job to notify users about rewards expiring in 3 days.
    Helps ensure users don't miss out on their rewards.
    """
    from django.core.management import call_command
    
    logger.info("Starting expiring rewards notification...")
    try:
        call_command('notify_expiring_rewards', '--days-before=3')
        logger.info("Expiring rewards notification completed")
    except Exception as e:
        logger.error(f"Expiring rewards notification failed: {e}")


def cleanup_expired_rewards_job():
    """
    Weekly job to clean up expired unredeemed rewards.
    Runs on Sundays at 2:00 AM with 30-day grace period.
    """
    from django.core.management import call_command
    
    logger.info("Starting expired rewards cleanup...")
    try:
        call_command('cleanup_expired_rewards', '--grace-days=30', '--notify-users')
        logger.info("Expired rewards cleanup completed")
    except Exception as e:
        logger.error(f"Expired rewards cleanup failed: {e}")


def send_survey_reminders_job():
    """
    Daily job to send reminders to users who started but didn't complete questionnaires.
    Sends reminder if started >24h ago and not reminded in last 24h.
    """
    from django.core.management import call_command
    
    logger.info("Starting survey reminders...")
    try:
        call_command('send_survey_reminders')
        logger.info("Survey reminders completed")
    except Exception as e:
        logger.error(f"Survey reminders failed: {e}")


def check_inventory_overdue_job():
    """
    Frequent job to check for overdue borrowed items and notify users.
    Runs every 30 minutes to ensure timely notifications.
    """
    from django.core.management import call_command
    
    logger.info("Starting inventory overdue check...")
    try:
        call_command('check_inventory_overdue')
        logger.info("Inventory overdue check completed")
    except Exception as e:
        logger.error(f"Inventory overdue check failed: {e}")


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

        # --- BIRTHDAY EMAILS: Run daily at 9:00 AM ---
        scheduler.add_job(
            send_birthday_emails_job,
            trigger=CronTrigger(hour=9, minute=0),
            id="send_birthday_emails",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: send_birthday_emails (daily at 9:00 AM)")

        # --- TRIAL EXPIRING EMAILS: Run daily at 10:00 AM ---
        scheduler.add_job(
            send_trial_expiring_emails_job,
            trigger=CronTrigger(hour=10, minute=0),
            id="send_trial_expiring_emails",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: send_trial_expiring_emails (daily at 10:00 AM)")

        # --- AUTO-CHECKOUT: Run every 15 minutes ---
        # Automatically checks out users when their club closes
        # and returns any borrowed inventory items
        from apscheduler.triggers.interval import IntervalTrigger
        scheduler.add_job(
            process_auto_checkout_job,
            trigger=IntervalTrigger(minutes=15),
            id="process_auto_checkout",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: process_auto_checkout (every 15 minutes)")

        # --- CLEANUP DELETED MESSAGES: Run daily at 5:00 AM ---
        scheduler.add_job(
            cleanup_deleted_messages_job,
            trigger=CronTrigger(hour=5, minute=0),
            id="cleanup_deleted_messages",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: cleanup_deleted_messages (daily at 5:00 AM)")

        # --- BIRTHDAY REWARDS: Run daily at 6:00 AM ---
        scheduler.add_job(
            process_birthday_rewards_job,
            trigger=CronTrigger(hour=6, minute=0),
            id="process_birthday_rewards",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: process_birthday_rewards (daily at 6:00 AM)")

        # --- ANNIVERSARY REWARDS: Run daily at 6:30 AM ---
        scheduler.add_job(
            process_anniversary_rewards_job,
            trigger=CronTrigger(hour=6, minute=30),
            id="process_anniversary_rewards",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: process_anniversary_rewards (daily at 6:30 AM)")

        # --- MOST CHECKED-IN REWARDS (WEEKLY): Run Mondays at 7:00 AM ---
        scheduler.add_job(
            process_most_checkedin_weekly_job,
            trigger=CronTrigger(day_of_week='mon', hour=7, minute=0),
            id="process_most_checkedin_weekly",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: process_most_checkedin_weekly (Mondays at 7:00 AM)")

        # --- MOST CHECKED-IN REWARDS (MONTHLY): Run 1st of month at 7:00 AM ---
        scheduler.add_job(
            process_most_checkedin_monthly_job,
            trigger=CronTrigger(day=1, hour=7, minute=0),
            id="process_most_checkedin_monthly",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: process_most_checkedin_monthly (1st of month at 7:00 AM)")

        # --- NOTIFY EXPIRING REWARDS: Run daily at 8:00 AM ---
        scheduler.add_job(
            notify_expiring_rewards_job,
            trigger=CronTrigger(hour=8, minute=0),
            id="notify_expiring_rewards",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: notify_expiring_rewards (daily at 8:00 AM)")

        # --- CLEANUP EXPIRED REWARDS: Run Sundays at 2:00 AM ---
        scheduler.add_job(
            cleanup_expired_rewards_job,
            trigger=CronTrigger(day_of_week='sun', hour=2, minute=0),
            id="cleanup_expired_rewards",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: cleanup_expired_rewards (Sundays at 2:00 AM)")

        # --- SEND SURVEY REMINDERS: Run daily at 11:00 AM ---
        scheduler.add_job(
            send_survey_reminders_job,
            trigger=CronTrigger(hour=11, minute=0),
            id="send_survey_reminders",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: send_survey_reminders (daily at 11:00 AM)")

        # --- CHECK INVENTORY OVERDUE: Run every 30 minutes ---
        scheduler.add_job(
            check_inventory_overdue_job,
            trigger=IntervalTrigger(minutes=30),
            id="check_inventory_overdue",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: check_inventory_overdue (every 30 minutes)")

        # --- CLEANUP EXPIRED DATA EXPORTS: Run daily at 3:30 AM ---
        scheduler.add_job(
            cleanup_expired_data_exports_job,
            trigger=CronTrigger(hour=3, minute=30),
            id="cleanup_expired_data_exports",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job: cleanup_expired_data_exports (daily at 3:30 AM)")

        try:
            self.stdout.write(self.style.SUCCESS(
                "\n" + "="*70 + "\n"
                "SCHEDULER STARTED - 19 Jobs Configured\n"
                "="*70 + "\n"
                "🧹 CLEANUP JOBS:\n"
                "  • Cleanup expired rewards - Sundays at 2:00 AM\n"
                "  • Data retention processing - Daily at 3:00 AM\n"
                "  • Cleanup expired data exports (GDPR) - Daily at 3:30 AM\n"
                "  • Cleanup old job logs - Daily at 4:00 AM\n"
                "  • Cleanup old notifications - Daily at 4:30 AM\n"
                "  • Cleanup deleted messages - Daily at 5:00 AM\n"
                "\n"
                "🎁 REWARD JOBS:\n"
                "  • Birthday rewards - Daily at 6:00 AM\n"
                "  • Anniversary rewards - Daily at 6:30 AM\n"
                "  • Most checked-in (weekly) - Mondays at 7:00 AM\n"
                "  • Most checked-in (monthly) - 1st of month at 7:00 AM\n"
                "  • Notify expiring rewards - Daily at 8:00 AM\n"
                "\n"
                "📧 EMAIL & NOTIFICATION JOBS:\n"
                "  • Send birthday emails - Daily at 9:00 AM\n"
                "  • Send trial expiring emails - Daily at 10:00 AM\n"
                "  • Send survey reminders - Daily at 11:00 AM\n"
                "\n"
                "📰 PUBLISHING JOBS:\n"
                "  • Publish scheduled events - Every 5 minutes\n"
                "  • Publish scheduled courses - Every 5 minutes\n"
                "  • Publish scheduled questionnaires - Every 5 minutes\n"
                "\n"
                "🔄 MONITORING JOBS:\n"
                "  • Auto-checkout users - Every 15 minutes\n"
                "  • Check inventory overdue - Every 30 minutes\n"
                "\n"
                "📅 YEARLY JOBS:\n"
                "  • Increment student grades - July 1st at 00:00\n"
                "="*70 + "\n"
                "Press Ctrl+C to stop.\n"
            ))
            scheduler.start()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Scheduler stopped."))
            scheduler.shutdown()

