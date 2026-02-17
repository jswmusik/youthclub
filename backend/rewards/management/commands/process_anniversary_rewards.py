from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User
from rewards.models import Reward
from rewards.trigger_handlers import AnniversaryHandler


class Command(BaseCommand):
    help = 'Grants anniversary rewards to users whose account anniversary is today'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        self.stdout.write(f"🎂 Checking account anniversaries for Date: {today}")

        # 1. Find active Anniversary Rewards
        anniversary_rewards = []
        all_rewards = Reward.objects.filter(is_active=True)
        for r in all_rewards:
            triggers = r.active_triggers if isinstance(r.active_triggers, list) else []
            if "ANNIVERSARY" in triggers:
                anniversary_rewards.append(r)

        self.stdout.write(f"🎁 Found {len(anniversary_rewards)} active Anniversary Reward(s).")
        if not anniversary_rewards:
            self.stdout.write(self.style.WARNING("   -> No rewards found. Check if Reward is Active and Trigger is 'ANNIVERSARY'."))
            return

        # 2. Find Users whose join date month/day matches today
        # This finds users who registered on this day in any previous year
        anniversary_users = User.objects.filter(
            date_joined__month=today.month, 
            date_joined__day=today.day,
            is_active=True
        )
        
        # Filter to only include users who have been members for at least 1 year
        eligible_users = []
        for user in anniversary_users:
            join_date = user.date_joined.date()
            years_since_joined = today.year - join_date.year
            if years_since_joined >= 1:
                eligible_users.append((user, years_since_joined))
        
        self.stdout.write(f"🎉 Found {len(eligible_users)} User(s) with account anniversary today.")
        if not eligible_users:
            self.stdout.write(self.style.WARNING("   -> No eligible users found (need at least 1 year membership)."))

        # 3. Process
        count = 0
        for user, years in eligible_users:
            self.stdout.write(f"   Processing User: {user.email} ({years} year(s) anniversary)")
            
            # Use the handler to process anniversary rewards
            AnniversaryHandler.process_for_user(user)
            count += 1

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Processed {count} user(s) for anniversary rewards."))








