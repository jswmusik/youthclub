# backend/notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications.models import Notification

# Import models from your other apps
from system_messages.models import SystemMessage
from news.models import NewsArticle
# RewardUsage import removed - reward notifications are now handled in rewards/utils.py

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
    Handles both new publications and when a draft is published later.
    """
    # Only notify if it is published
    if instance.is_published:
        # Check if we should notify:
        # 1. If it's a new article (created=True) and published immediately
        # 2. If it's an update and no notification exists yet (draft was just published)
        should_notify = created
        
        # If not created, check if there's already a notification for this article
        # If no notification exists, it means this is the first time it's being published
        if not created:
            existing_notification = Notification.objects.filter(
                category=Notification.Category.NEWS,
                action_url=f"/dashboard/youth/news/{instance.id}"
            ).first()
            should_notify = existing_notification is None
        
        if should_notify:
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
                    body=instance.excerpt[:200] + "..." if len(instance.excerpt) > 200 else instance.excerpt,
                    action_url=f"/dashboard/youth/news/{instance.id}"
                )
                for user in users_to_notify
            ]
            Notification.objects.bulk_create(notifications)


# --- 3. REWARDS (Personal Notification) ---
# NOTE: Reward notifications are now handled in rewards/utils.py grant_reward() function
# to avoid duplicate notifications. The notification is created there with the message
# "🎁 New Reward Unlocked!" when a reward is granted to a user.
#
# @receiver(post_save, sender=RewardUsage)
# def notify_reward_received(sender, instance, created, **kwargs):
#     """
#     When a user RECEIVES a reward (RewardUsage created), notify them.
#     This handles the 'targeting' naturally because the RewardUsage 
#     is linked to a specific user.
#     """
#     if created:
#         Notification.objects.create(
#             recipient=instance.user,
#             category=Notification.Category.REWARD,
#             title="You earned a Reward!",
#             body=f"Congratulations! You have received: {instance.reward.name}",
#             # Link to the specific reward detail
#             action_url=f"/dashboard/youth/rewards/{instance.reward.id}"
#         )