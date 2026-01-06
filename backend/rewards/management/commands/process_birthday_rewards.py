from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User
from rewards.models import Reward, RewardUsage
from rewards.utils import grant_reward_with_context, has_received_trigger_reward


class Command(BaseCommand):
    help = 'Grants rewards to users whose birthday is today (once per year)'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        current_year = today.year
        self.stdout.write(f"📅 Checking birthdays for Date: {today}")

        # 1. Find active Birthday Rewards
        birthday_rewards = []
        all_rewards = Reward.objects.filter(is_active=True)
        for r in all_rewards:
            triggers = r.active_triggers if isinstance(r.active_triggers, list) else []
            # Check for exact string match
            if "BIRTHDAY" in triggers:
                # Also check expiration
                if r.expiration_date and r.expiration_date < today:
                    self.stdout.write(self.style.WARNING(f"   -> Skipping '{r.name}' - expired on {r.expiration_date}"))
                    continue
                birthday_rewards.append(r)

        self.stdout.write(f"🎁 Found {len(birthday_rewards)} active Birthday Reward(s).")
        if not birthday_rewards:
            self.stdout.write(self.style.WARNING("   -> No rewards found. Check if Reward is Active and Trigger is 'BIRTHDAY'."))
            return

        # 2. Find Users with birthday today
        birthday_users = User.objects.filter(
            date_of_birth__month=today.month, 
            date_of_birth__day=today.day,
            is_active=True
        )
        
        self.stdout.write(f"🎂 Found {len(birthday_users)} User(s) with birthday today.")
        if not birthday_users:
            self.stdout.write(self.style.WARNING("   -> No users found. Check User 'Date of birth'."))

        # 3. Process
        count = 0
        for user in birthday_users:
            self.stdout.write(f"   Processing User: {user.email} (Role: {user.role}, DOB: {user.date_of_birth})")
            for reward in birthday_rewards:
                self.stdout.write(f"      - Trying Reward: {reward.name}")
                
                # Check if user already received this birthday reward THIS YEAR
                if has_received_trigger_reward(user, reward, 'BIRTHDAY', {'birthday_year': current_year}):
                    self.stdout.write(self.style.WARNING(f"        -> SKIPPED (already received for {current_year})"))
                    continue
                
                # Use grant_reward_with_context for proper tracking
                success = grant_reward_with_context(
                    user=user,
                    reward=reward,
                    trigger_type='BIRTHDAY',
                    trigger_context={
                        'birthday_year': current_year,
                        'dob_used': str(user.date_of_birth),
                        'granted_at': timezone.now().isoformat()
                    }
                )
                
                if success:
                    count += 1
                    self.stdout.write(self.style.SUCCESS(f"        -> GRANTED!"))
                else:
                    self.stdout.write(self.style.WARNING(f"        -> SKIPPED (not eligible or already has unredeemed copy)"))

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Total rewards granted: {count}"))
