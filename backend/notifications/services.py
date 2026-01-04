import re
import logging
from .models import Notification, NotificationTemplate

logger = logging.getLogger(__name__)


def render_notification_template(title_template: str, body_template: str, context: dict) -> dict:
    """
    Render notification title and body templates with the given context.
    Uses simple {{variable}} syntax for variable substitution.
    
    Args:
        title_template: The title template string with {{variable}} placeholders
        body_template: The body template string with {{variable}} placeholders
        context: Dictionary of variable names to values
    
    Returns:
        Dictionary with 'title' and 'body' keys containing rendered strings
    """
    def replace_variables(template: str, ctx: dict) -> str:
        """Replace {{variable}} with values from context."""
        def replacer(match):
            var_name = match.group(1).strip()
            return str(ctx.get(var_name, match.group(0)))
        
        # Match {{variable_name}} pattern
        pattern = r'\{\{([^}]+)\}\}'
        return re.sub(pattern, replacer, template)
    
    return {
        'title': replace_variables(title_template, context),
        'body': replace_variables(body_template, context),
    }


def send_notification(user, title, body, category=Notification.Category.SYSTEM, action_url=None):
    """
    Creates a notification for a user.
    This is the legacy function for backwards compatibility.
    For new code, prefer using send_templated_notification.
    """
    return Notification.objects.create(
        recipient=user,
        title=title,
        body=body,
        category=category,
        action_url=action_url
    )


def send_templated_notification(
    user,
    template_type: str,
    context: dict = None,
    action_url: str = None,
    category_override: str = None,
):
    """
    Creates a notification for a user using a template.
    The notification will be rendered in the user's preferred language.
    
    Args:
        user: The user to send the notification to
        template_type: The NotificationTemplate.Type value (e.g., 'event_registration_confirmed')
        context: Dictionary of variables to substitute in the template
        action_url: Optional URL for the notification action (overrides any default)
        category_override: Optional category override (uses template's default if not provided)
    
    Returns:
        The created Notification object, or None if template not found/inactive
    
    Example:
        send_templated_notification(
            user=user,
            template_type='booking_confirmed',
            context={
                'resource_name': 'Studio A',
                'date': '2025-01-15',
                'time': '14:00',
            },
            action_url='/dashboard/youth/bookings/123'
        )
    """
    context = context or {}
    
    # Get the template
    try:
        template = NotificationTemplate.objects.get(type=template_type)
    except NotificationTemplate.DoesNotExist:
        logger.warning(f"Notification template not found: {template_type}")
        return None
    
    # Check if template is active
    if not template.is_active:
        logger.info(f"Notification template is disabled: {template_type}")
        return None
    
    # Get user's preferred language (default to Swedish)
    user_language = getattr(user, 'language', None) or 'sv'
    
    # Get the translation for the user's language
    translation = template.get_translation(user_language)
    
    if not translation:
        logger.warning(f"No translation found for template {template_type} in language {user_language}")
        return None
    
    # Render the template with context
    rendered = render_notification_template(
        translation.title,
        translation.body,
        context
    )
    
    # Determine category
    category = category_override or template.category
    
    # Create the notification
    return Notification.objects.create(
        recipient=user,
        title=rendered['title'],
        body=rendered['body'],
        category=category,
        action_url=action_url
    )


def send_bulk_templated_notifications(
    users,
    template_type: str,
    context: dict = None,
    action_url: str = None,
    category_override: str = None,
    user_context_func=None,
):
    """
    Creates notifications for multiple users using a template.
    Each notification will be rendered in the user's preferred language.
    
    Args:
        users: QuerySet or list of users to send notifications to
        template_type: The NotificationTemplate.Type value
        context: Base dictionary of variables (applied to all users)
        action_url: Optional URL for the notification action
        category_override: Optional category override
        user_context_func: Optional function that takes a user and returns additional context
                          for that specific user. The returned dict will be merged with base context.
    
    Returns:
        List of created Notification objects
    
    Example:
        send_bulk_templated_notifications(
            users=User.objects.filter(role='YOUTH'),
            template_type='news_published',
            context={'news_title': article.title},
            action_url=f'/dashboard/youth/news/{article.id}'
        )
    """
    context = context or {}
    
    # Get the template
    try:
        template = NotificationTemplate.objects.get(type=template_type)
    except NotificationTemplate.DoesNotExist:
        logger.warning(f"Notification template not found: {template_type}")
        return []
    
    # Check if template is active
    if not template.is_active:
        logger.info(f"Notification template is disabled: {template_type}")
        return []
    
    # Determine category
    category = category_override or template.category
    
    # Group users by language for efficient translation lookup
    users_by_language = {}
    for user in users:
        user_language = getattr(user, 'language', None) or 'sv'
        if user_language not in users_by_language:
            users_by_language[user_language] = []
        users_by_language[user_language].append(user)
    
    notifications_to_create = []
    
    for language, language_users in users_by_language.items():
        # Get translation for this language
        translation = template.get_translation(language)
        
        if not translation:
            logger.warning(f"No translation found for template {template_type} in language {language}")
            # Fall back to Swedish
            translation = template.get_translation('sv')
            if not translation:
                continue
        
        for user in language_users:
            # Build user-specific context
            user_context = dict(context)  # Copy base context
            if user_context_func:
                user_specific = user_context_func(user)
                if user_specific:
                    user_context.update(user_specific)
            
            # Render the template
            rendered = render_notification_template(
                translation.title,
                translation.body,
                user_context
            )
            
            notifications_to_create.append(
                Notification(
                    recipient=user,
                    title=rendered['title'],
                    body=rendered['body'],
                    category=category,
                    action_url=action_url
                )
            )
    
    # Bulk create for efficiency
    if notifications_to_create:
        return Notification.objects.bulk_create(notifications_to_create)
    
    return []
