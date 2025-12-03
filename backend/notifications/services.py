from .models import Notification


def send_notification(user, title, body, category=Notification.Category.SYSTEM, action_url=None):
    """
    Creates a notification for a user.
    """
    return Notification.objects.create(
        recipient=user,
        title=title,
        body=body,
        category=category,
        action_url=action_url
    )

