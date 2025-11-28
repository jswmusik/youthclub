from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User
from rewards.models import Reward
from rewards.utils import grant_reward

class Command(BaseCommand):
    help = 'Grants rewards to users whose birthday is today'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        self.stdout.write(f"📅 Checking birthdays for Date: {today}")

        # 1. Find active Birthday Rewards
        birthday_rewards = []
        all_rewards = Reward.objects.filter(is_active=True)
        for r in all_rewards:
            triggers = r.active_triggers if isinstance(r.active_triggers, list) else []
            # Check for exact string match
            if "BIRTHDAY" in triggers:
                birthday_rewards.append(r)

        self.stdout.write(f"🎁 Found {len(birthday_rewards)} active Birthday Reward(s).")
        if not birthday_rewards:
            self.stdout.write(self.style.WARNING("   -> No rewards found. Check if Reward is Active and Trigger is 'BIRTHDAY'."))
            return

        # 2. Find Users with birthday today
        birthday_users = User.objects.filter(
            date_of_birth__month=today.month, 
            date_of_birth__day=today.day
        )
        
        self.stdout.write(f"🎂 Found {len(birthday_users)} User(s) with birthday today.")
        if not birthday_users:
            self.stdout.write(self.style.WARNING("   -> No users found. Check User 'Date of birth'."))

        # 3. Process
        count = 0
        for user in birthday_users:
            self.stdout.write(f"   Processing User: {user.email} (Role: {user.role})")
            for reward in birthday_rewards:
                self.stdout.write(f"      - Trying Reward: {reward.name}")
                
                # We attempt to grant. The utils.py already prints eligibility failures to console.
                if grant_reward(user, reward):
                    count += 1
                    self.stdout.write(self.style.SUCCESS(f"        -> GRANTED!"))
                else:
                    self.stdout.write(self.style.WARNING(f"        -> SKIPPED (See reason above)"))

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Total rewards granted: {count}"))