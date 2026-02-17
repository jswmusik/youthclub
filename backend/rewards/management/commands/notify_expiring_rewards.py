from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rewards.models import Reward, RewardUsage
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Notifies users about rewards that are expiring soon (3 days before expiration)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-before',
            type=int,
            default=3,
            help='Number of days before expiration to send notification (default: 3)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually sending notifications'
        )

    def handle(self, *args, **options):
        days_before = options['days_before']
        dry_run = options['dry_run']
        today = timezone.now().date()
        target_date = today + timedelta(days=days_before)
        
        self.stdout.write(f"⏰ Checking for rewards expiring on {target_date} (in {days_before} days)")
        if dry_run:
            self.stdout.write(self.style.WARNING("   DRY RUN - No notifications will be sent"))

        # Find rewards expiring on the target date
        expiring_rewards = Reward.objects.filter(
            expiration_date=target_date,
            is_active=True
        )
        
        self.stdout.write(f"🎁 Found {expiring_rewards.count()} reward(s) expiring on {target_date}")
        
        if not expiring_rewards.exists():
            self.stdout.write(self.style.SUCCESS("   -> No expiring rewards found. Nothing to do."))
            return

        notifications_created = 0
        
        for reward in expiring_rewards:
            self.stdout.write(f"\n   Processing Reward: {reward.name}")
            
            # Find users who have unredeemed copies of this reward
            unredeemed_usages = RewardUsage.objects.filter(
                reward=reward,
                is_redeemed=False
            ).select_related('user')
            
            self.stdout.write(f"      - {unredeemed_usages.count()} user(s) have unredeemed copies")
            
            for usage in unredeemed_usages:
                user = usage.user
                
                # Check if we already sent an expiration notification for this reward to this user
                # We use a specific pattern in the notification body to detect duplicates
                existing_notification = Notification.objects.filter(
                    recipient=user,
                    category=Notification.Category.REWARD,
                    body__icontains=f"'{reward.name}' expires",
                    created_at__date=today
                ).exists()
                
                if existing_notification:
                    self.stdout.write(f"      - Skipping {user.email} (already notified today)")
                    continue
                
                if not dry_run:
                    Notification.objects.create(
                        recipient=user,
                        category=Notification.Category.REWARD,
                        title="⏰ Reward Expiring Soon!",
                        body=f"Your reward '{reward.name}' expires in {days_before} days! Use it before {target_date.strftime('%B %d, %Y')}.",
                        action_url="/dashboard/youth/profile?tab=wallet"
                    )
                
                notifications_created += 1
                self.stdout.write(f"      - {'Would notify' if dry_run else 'Notified'} {user.email}")

        self.stdout.write(self.style.SUCCESS(f"\n✅ Done. {'Would create' if dry_run else 'Created'} {notifications_created} notification(s)."))








