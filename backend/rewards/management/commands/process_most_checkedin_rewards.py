from django.core.management.base import BaseCommand
from django.utils import timezone
from organization.models import Club
from rewards.models import Reward
from rewards.trigger_handlers import MostCheckedInHandler


class Command(BaseCommand):
    help = 'Grants rewards to top checked-in users per club (weekly or monthly)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--period',
            type=str,
            default='WEEKLY',
            choices=['WEEKLY', 'MONTHLY'],
            help='Period to calculate: WEEKLY or MONTHLY'
        )
        parser.add_argument(
            '--club-id',
            type=int,
            default=None,
            help='Optional: Process only a specific club ID'
        )

    def handle(self, *args, **options):
        period = options['period']
        club_id = options['club_id']
        
        today = timezone.now().date()
        self.stdout.write(f"🏆 Processing MOST_CHECKED_IN rewards for Date: {today} (Period: {period})")

        # 1. Find active Most Checked-In Rewards
        most_checkedin_rewards = []
        all_rewards = Reward.objects.filter(is_active=True)
        for r in all_rewards:
            triggers = r.active_triggers if isinstance(r.active_triggers, list) else []
            if "MOST_CHECKED_IN" in triggers:
                # Check if this reward matches the requested period
                config = r.trigger_config or {}
                reward_period = config.get('period', 'WEEKLY')
                if reward_period == period:
                    most_checkedin_rewards.append(r)

        self.stdout.write(f"🎁 Found {len(most_checkedin_rewards)} active MOST_CHECKED_IN Reward(s) for {period}.")
        if not most_checkedin_rewards:
            self.stdout.write(self.style.WARNING(f"   -> No rewards found. Check if Reward is Active with Trigger 'MOST_CHECKED_IN' and period '{period}'."))
            return

        # 2. Get clubs that have MOST_CHECKED_IN rewards
        # These rewards are club-scoped only
        club_ids_with_rewards = set()
        for reward in most_checkedin_rewards:
            if reward.club_id:
                club_ids_with_rewards.add(reward.club_id)
        
        if club_id:
            # Process only the specified club
            if club_id not in club_ids_with_rewards:
                self.stdout.write(self.style.WARNING(f"   -> Club {club_id} has no MOST_CHECKED_IN rewards configured."))
                return
            clubs_to_process = Club.objects.filter(id=club_id)
        else:
            # Process all clubs with rewards
            clubs_to_process = Club.objects.filter(id__in=club_ids_with_rewards)

        self.stdout.write(f"🏢 Processing {len(clubs_to_process)} club(s).")

        # 3. Process each club
        for club in clubs_to_process:
            self.stdout.write(f"\n   📍 Processing Club: {club.name} (ID: {club.id})")
            
            try:
                MostCheckedInHandler.process_for_club(club, period=period)
                self.stdout.write(self.style.SUCCESS(f"      -> Done processing {club.name}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      -> Error: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n✅ Done processing MOST_CHECKED_IN rewards for {period}."))








