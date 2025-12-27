from django.core.management.base import BaseCommand
from licensing.models import Feature, Plan, GlobalPricing


class Command(BaseCommand):
    help = 'Initializes the standard Plans and Features for the licensing system'

    def handle(self, *args, **kwargs):
        self.stdout.write("Initializing Licensing Data...")

        # 1. Create Features (The Building Blocks)
        features_data = [
            # Core (Always included in Basic, but good to have as records)
            {'slug': 'posts', 'name': 'News & Posts', 'price': 0, 'description': 'Create and manage news posts and announcements.'},
            {'slug': 'groups', 'name': 'Interest Groups', 'price': 0, 'description': 'Organize members into interest-based groups.'},
            {'slug': 'learning', 'name': 'Learning Platform', 'price': 0, 'description': 'Educational content and courses.'},
            {'slug': 'custom_fields', 'name': 'Custom Data Fields', 'price': 0, 'description': 'Add custom registration fields.'},
            {'slug': 'visits', 'name': 'Check-in System', 'price': 0, 'description': 'Track member visits and attendance.'},
            
            # Add-ons
            {'slug': 'events', 'name': 'Events System', 'price': 500, 'description': 'Create and manage events with registration.'},
            {'slug': 'messenger', 'name': 'Messenger & Chat', 'price': 800, 'description': 'Direct messaging and broadcast communications.'},
            {'slug': 'inventory', 'name': 'Inventory & Lending', 'price': 600, 'description': 'Equipment lending and inventory management.'},
            {'slug': 'bookings', 'name': 'Facility Bookings', 'price': 1000, 'description': 'Room and resource booking system.'},
            {'slug': 'questionnaires', 'name': 'Questionnaires & Voting', 'price': 400, 'description': 'Surveys, polls, and questionnaires.'},
            {'slug': 'rewards', 'name': 'Rewards & Gamification', 'price': 400, 'description': 'Gamification with rewards and achievements.'},
            {'slug': 'analytics', 'name': 'Analytics Dashboard', 'price': 1200, 'description': 'Advanced analytics and AI-powered insights.'},
            {'slug': 'api', 'name': 'API Access', 'price': 2000, 'description': 'External API access for third-party integrations.'},
        ]

        feature_objs = {}
        for f in features_data:
            obj, created = Feature.objects.get_or_create(
                slug=f['slug'],
                defaults={
                    'name': f['name'], 
                    'monthly_price_sek': f['price'],
                    'description': f.get('description', '')
                }
            )
            feature_objs[f['slug']] = obj
            if created:
                self.stdout.write(f"  + Created Feature: {f['name']}")
            else:
                self.stdout.write(f"  - Feature exists: {f['name']}")

        # 2. Create Plans (The Tiers)
        
        # BASIC
        basic, created = Plan.objects.get_or_create(
            name="Basic Package",
            defaults={
                'monthly_price_sek': 1500, 
                'description': 'Digital foundation for youth clubs. Includes posts, groups, learning, and check-in system.',
                'is_public': True,
                'is_active': True
            }
        )
        basic.features.set([
            feature_objs['posts'], 
            feature_objs['groups'], 
            feature_objs['learning'],
            feature_objs['custom_fields'],
            feature_objs['visits']
        ])
        if created:
            self.stdout.write("  + Created Plan: Basic Package")
        else:
            self.stdout.write("  - Plan exists: Basic Package")
        
        # MEDIUM (Most Popular)
        medium, created = Plan.objects.get_or_create(
            name="Medium Package",
            defaults={
                'monthly_price_sek': 3500, 
                'description': 'For active clubs with events, messaging, and lending. Most popular choice.',
                'is_public': True,
                'is_active': True
            }
        )
        medium.features.set([
            feature_objs['posts'], 
            feature_objs['groups'], 
            feature_objs['learning'],
            feature_objs['custom_fields'],
            feature_objs['visits'],
            # + Adds
            feature_objs['events'],
            feature_objs['messenger'],
            feature_objs['inventory']
        ])
        if created:
            self.stdout.write("  + Created Plan: Medium Package")
        else:
            self.stdout.write("  - Plan exists: Medium Package")

        # PREMIUM
        premium, created = Plan.objects.get_or_create(
            name="Premium Package",
            defaults={
                'monthly_price_sek': 6500, 
                'description': 'Full suite with all features including bookings, questionnaires, rewards, and analytics.',
                'is_public': True,
                'is_active': True
            }
        )
        premium.features.set(feature_objs.values())  # Includes everything
        if created:
            self.stdout.write("  + Created Plan: Premium Package")
        else:
            self.stdout.write("  - Plan exists: Premium Package")

        # 3. Global Pricing
        pricing, created = GlobalPricing.objects.get_or_create(pk=1, defaults={
            'price_per_extra_club_sek': 500,
            'analytics_package_price_sek': 1200
        })
        if created:
            self.stdout.write("  + Created Global Pricing Configuration")
        else:
            self.stdout.write("  - Global Pricing exists")

        self.stdout.write(self.style.SUCCESS("\n✅ Successfully initialized Licensing System!"))
        self.stdout.write(self.style.SUCCESS(f"   Features: {Feature.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"   Plans: {Plan.objects.count()}"))

