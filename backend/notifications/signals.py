# backend/notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications.models import Notification

# Import models from your other apps
from system_messages.models import SystemMessage
from news.models import NewsArticle
from rewards.models import RewardUsage

User = get_user_model()

# --- 1. SYSTEM MESSAGES (Broadcast with Role Targeting) ---
@receiver(post_save, sender=SystemMessage)
def distribute_system_message(sender, instance, created, **kwargs):
    """
    When a SystemMessage is created, create a Notification for every user
    that matches the target_roles.
    """
    if created:
        # Get target roles (handle if it's a list or string)
        target_roles = instance.target_roles if isinstance(instance.target_roles, list) else []
        
        # 1. Filter the Users based on targeting
        users_to_notify = User.objects.none()
        
        if "ALL" in target_roles:
            users_to_notify = User.objects.all()
        else:
            # Filter users where their role matches one of the target_roles
            users_to_notify = User.objects.filter(role__in=target_roles)

        # 2. Bulk Create Notifications (Efficient)
        notifications = [
            Notification(
                recipient=user,
                category=Notification.Category.SYSTEM,
                title=f"Message: {instance.title}",
                body=instance.message[:100] + "..." if len(instance.message) > 100 else instance.message,
                # You can adjust this URL to where your messages live in frontend
                action_url="/dashboard/messages" 
            )
            for user in users_to_notify
        ]
        
        Notification.objects.bulk_create(notifications)


# --- 2. NEWS ARTICLES (Broadcast with Role Targeting) ---
@receiver(post_save, sender=NewsArticle)
def distribute_news_article(sender, instance, created, **kwargs):
    """
    When a NewsArticle is Published, notify target audience.
    """
    # Only notify if it is published
    if instance.is_published:
        # Avoid spamming updates: 
        # Ideally, we check if it was JUST published, but for now we assume 
        # if 'created' is True and 'published' is True, it's new. 
        # Or if you change a draft to published.
        
        # Simple Logic: Only run on Create (New Publish) to avoid spam on edits
        # You can expand this logic later if needed.
        if created: 
            target_roles = instance.target_roles if isinstance(instance.target_roles, list) else []
            
            users_to_notify = User.objects.none()
            if "ALL" in target_roles:
                users_to_notify = User.objects.all()
            else:
                users_to_notify = User.objects.filter(role__in=target_roles)

            notifications = [
                Notification(
                    recipient=user,
                    category=Notification.Category.NEWS,
                    title=f"News: {instance.title}",
                    body=instance.excerpt,
                    action_url=f"/dashboard/news/{instance.id}"
                )
                for user in users_to_notify
            ]
            Notification.objects.bulk_create(notifications)


# --- 3. REWARDS (Personal Notification) ---
@receiver(post_save, sender=RewardUsage)
def notify_reward_received(sender, instance, created, **kwargs):
    """
    When a user RECEIVES a reward (RewardUsage created), notify them.
    This handles the 'targeting' naturally because the RewardUsage 
    is linked to a specific user.
    """
    if created:
        Notification.objects.create(
            recipient=instance.user,
            category=Notification.Category.REWARD,
            title="You earned a Reward!",
            body=f"Congratulations! You have received: {instance.reward.name}",
            # Link to the specific reward detail
            action_url=f"/dashboard/youth/rewards/{instance.reward.id}"
        )