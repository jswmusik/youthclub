"""
Celery tasks for async email sending.

These tasks run in the background, allowing API requests to return immediately
instead of waiting for emails to send.

Usage:
    # Async (non-blocking):
    send_email_task.delay(template_type='welcome', recipient_id=123, context={...})
    
    # Synchronous (for testing):
    send_email_task(template_type='welcome', recipient_id=123, context={...})
"""
from celery import shared_task
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name='emails.send_email',
    max_retries=3,
    default_retry_delay=60,  # Retry after 1 minute
    autoretry_for=(Exception,),  # Auto-retry on any exception
    retry_backoff=True,  # Exponential backoff: 60s, 120s, 240s
    retry_jitter=True  # Add random jitter to prevent thundering herd
)
def send_email_task(self, template_type, recipient_id=None, recipient_email=None, context=None):
    """
    Send an email using the EmailService.
    
    Args:
        template_type (str): Email template type (e.g., 'welcome', 'new_post')
        recipient_id (int, optional): User ID to send email to
        recipient_email (str, optional): Email address (used if recipient_id is None)
        context (dict): Template context variables
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    
    Raises:
        Retry: If email sending fails and retries are available
    """
    try:
        from .services import EmailService
        from users.models import User
        
        context = context or {}
        
        # Get recipient user object if ID provided
        recipient_user = None
        if recipient_id:
            try:
                recipient_user = User.objects.get(id=recipient_id)
            except User.DoesNotExist:
                logger.error(f"User {recipient_id} not found for email {template_type}")
                return False
        
        # Send email
        success = EmailService.send(
            template_type=template_type,
            recipient=recipient_user,
            override_email=recipient_email if not recipient_user else None,
            context=context
        )
        
        if success:
            logger.info(
                f"Email sent successfully: {template_type} to "
                f"{recipient_user.email if recipient_user else recipient_email}"
            )
        else:
            logger.warning(
                f"Email sending returned False: {template_type} to "
                f"{recipient_user.email if recipient_user else recipient_email}"
            )
        
        return success
        
    except Exception as exc:
        logger.error(
            f"Failed to send email {template_type} "
            f"(attempt {self.request.retries + 1}/{self.max_retries}): {exc}"
        )
        
        # Don't retry if we've exhausted retries
        if self.request.retries >= self.max_retries:
            logger.error(
                f"Max retries exceeded for email {template_type}. Giving up."
            )
            return False
        
        # Retry the task
        raise self.retry(exc=exc)


@shared_task(name='emails.send_bulk_emails')
def send_bulk_emails_task(template_type, recipient_ids, context=None):
    """
    Send the same email to multiple recipients efficiently.
    
    This creates individual tasks for each recipient, allowing them to be
    processed in parallel by multiple Celery workers.
    
    Args:
        template_type (str): Email template type
        recipient_ids (list): List of user IDs
        context (dict): Shared template context
    
    Returns:
        dict: Summary of queued emails
    """
    from celery import group
    
    context = context or {}
    
    # Create a group of email tasks
    job = group(
        send_email_task.s(
            template_type=template_type,
            recipient_id=recipient_id,
            context=context
        )
        for recipient_id in recipient_ids
    )
    
    # Execute all tasks
    result = job.apply_async()
    
    logger.info(
        f"Queued {len(recipient_ids)} emails of type {template_type}"
    )
    
    return {
        'queued': len(recipient_ids),
        'template_type': template_type,
        'task_id': result.id if hasattr(result, 'id') else None
    }


# Helper function for synchronous/async email sending
def send_email_async(template_type, recipient=None, recipient_email=None, context=None):
    """
    Smart email sender that works in both development and production.
    
    - In development (CELERY_TASK_ALWAYS_EAGER=True): Sends immediately
    - In production (CELERY_TASK_ALWAYS_EAGER=False): Sends via Celery worker
    
    This is the recommended function to use in your code instead of calling
    EmailService.send() directly.
    
    Args:
        template_type (str): Email template type
        recipient (User, optional): User object to send email to
        recipient_email (str, optional): Email address (if no User object)
        context (dict): Template context variables
    
    Returns:
        AsyncResult or bool: Celery task result (async) or boolean (sync)
    """
    context = context or {}
    
    # Prepare task arguments
    recipient_id = recipient.id if recipient else None
    email = recipient_email if not recipient else None
    
    # Use Celery delay() which respects CELERY_TASK_ALWAYS_EAGER setting
    # - If True (dev): Runs synchronously and returns result immediately
    # - If False (prod): Queues task and returns AsyncResult
    return send_email_task.delay(
        template_type=template_type,
        recipient_id=recipient_id,
        recipient_email=email,
        context=context
    )


