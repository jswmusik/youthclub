from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rewards.models import Reward, RewardUsage
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Cleans up expired unredeemed rewards and notifies users. Run weekly.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--grace-days',
            type=int,
            default=30,
            help='Number of days after expiration before cleanup (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually deleting'
        )
        parser.add_argument(
            '--notify-users',
            action='store_true',
            default=True,
            help='Send notification to users about deleted rewards (default: True)'
        )

    def handle(self, *args, **options):
        grace_days = options['grace_days']
        dry_run = options['dry_run']
        notify_users = options['notify_users']
        today = timezone.now().date()
        cutoff_date = today - timedelta(days=grace_days)
        
        self.stdout.write(f"🧹 Cleaning up rewards expired before {cutoff_date} ({grace_days} days grace period)")
        if dry_run:
            self.stdout.write(self.style.WARNING("   DRY RUN - No changes will be made"))

        # Find rewards that expired more than grace_days ago
        expired_rewards = Reward.objects.filter(
            expiration_date__lt=cutoff_date
        )
        
        self.stdout.write(f"📦 Found {expired_rewards.count()} expired reward(s)")

        total_usages_deleted = 0
        users_notified = set()

        for reward in expired_rewards:
            self.stdout.write(f"\n   Processing Reward: {reward.name} (expired: {reward.expiration_date})")
            
            # Find unredeemed usages for this reward
            unredeemed_usages = RewardUsage.objects.filter(
                reward=reward,
                is_redeemed=False
            ).select_related('user')
            
            usage_count = unredeemed_usages.count()
            self.stdout.write(f"      - {usage_count} unredeemed usage(s) to clean up")
            
            if usage_count > 0:
                # Collect users to notify before deletion
                if notify_users and not dry_run:
                    for usage in unredeemed_usages:
                        user = usage.user
                        if user.id not in users_notified:
                            # Create a summary notification (we'll batch them)
                            Notification.objects.create(
                                recipient=user,
                                category=Notification.Category.SYSTEM,
                                title="🗑️ Expired Reward Removed",
                                body=f"Your unredeemed reward '{reward.name}' has been removed because it expired on {reward.expiration_date.strftime('%B %d, %Y')}.",
                                action_url="/dashboard/youth/profile?tab=wallet"
                            )
                            users_notified.add(user.id)
                            self.stdout.write(f"      - Notified {user.email}")
                
                # Delete the unredeemed usages
                if not dry_run:
                    unredeemed_usages.delete()
                
                total_usages_deleted += usage_count
            
            # Also clean up any orphaned notifications for this reward
            if not dry_run:
                # Delete "New Reward Unlocked" notifications for expired rewards
                # that users never acted on
                orphaned_notifications = Notification.objects.filter(
                    category=Notification.Category.REWARD,
                    body__icontains=reward.name,
                    is_read=False
                )
                orphaned_count = orphaned_notifications.count()
                if orphaned_count > 0:
                    orphaned_notifications.delete()
                    self.stdout.write(f"      - Cleaned up {orphaned_count} orphaned notification(s)")

        # Summary
        self.stdout.write(self.style.SUCCESS(f"\n✅ Cleanup complete!"))
        self.stdout.write(f"   - Rewards processed: {expired_rewards.count()}")
        self.stdout.write(f"   - Unredeemed usages {'would be ' if dry_run else ''}deleted: {total_usages_deleted}")
        self.stdout.write(f"   - Users {'would be ' if dry_run else ''}notified: {len(users_notified)}")
        
        # Optionally deactivate very old expired rewards
        very_old_cutoff = today - timedelta(days=grace_days * 2)  # 60 days by default
        very_old_rewards = Reward.objects.filter(
            expiration_date__lt=very_old_cutoff,
            is_active=True
        )
        
        if very_old_rewards.exists():
            self.stdout.write(f"\n⚠️  Found {very_old_rewards.count()} reward(s) expired more than {grace_days * 2} days ago still marked as active")
            if not dry_run:
                very_old_rewards.update(is_active=False)
                self.stdout.write(self.style.SUCCESS(f"   - Deactivated {very_old_rewards.count()} very old reward(s)"))
            else:
                self.stdout.write(f"   - Would deactivate {very_old_rewards.count()} very old reward(s)")








