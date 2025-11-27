from django.core.management.base import BaseCommand
from groups.models import Group

class Command(BaseCommand):
    help = 'Creates default system groups'

    def handle(self, *args, **kwargs):
        system_groups = [
            {
                'name': 'All Registered Members', 
                'type': 'REGISTERED', 
                'desc': 'Automatically populated with all new users.'
            },
            {
                'name': 'Active Members', 
                'type': 'ACTIVE', 
                'desc': 'Users who have logged in at least once.'
            },
            {
                'name': 'Verified Members', 
                'type': 'VERIFIED', 
                'desc': 'Users who have completed identity verification.'
            },
        ]

        for data in system_groups:
            group, created = Group.objects.get_or_create(
                system_group_type=data['type'],
                defaults={
                    'name': data['name'],
                    'description': data['desc'],
                    'is_system_group': True,
                    'group_type': 'CLOSED', # Hidden/System controlled
                    'target_member_type': 'YOUTH' # Default, can be changed
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created group: {data['name']}"))
            else:
                self.stdout.write(f"ℹ️ Group already exists: {data['name']}")