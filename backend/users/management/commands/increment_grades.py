from django.core.management.base import BaseCommand
from django.db.models import F
from users.models import User
from django.utils import timezone

class Command(BaseCommand):
    help = 'Increments the grade of all youth members by 1. Should be run on July 1st.'

    def handle(self, *args, **options):
        # 1. Identify users who have a grade (Youth Members)
        youth_with_grades = User.objects.filter(role='YOUTH_MEMBER', grade__isnull=False)
        
        count = youth_with_grades.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING('No youth members with grades found.'))
            return

        self.stdout.write(f"Found {count} youth members. Incrementing grades...")

        # 2. Increment grade by 1 efficiently in the database
        # F('grade') + 1 tells the database to take the existing value and add 1
        youth_with_grades.update(grade=F('grade') + 1)

        self.stdout.write(self.style.SUCCESS(f'Successfully incremented grades for {count} users.'))
        self.stdout.write(f"Operation completed on {timezone.now().date()}")