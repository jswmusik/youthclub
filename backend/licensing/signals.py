from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from organization.models import Municipality
from .models import License, Plan


@receiver(post_save, sender=Municipality)
def create_default_license(sender, instance, created, **kwargs):
    """
    Automatically assigns a 'Basic' license to any newly created Municipality.
    Only creates if no license exists yet.
    """
    if created:
        # Check if license already exists (properly check the database)
        license_exists = License.objects.filter(municipality=instance).exists()
        
        if not license_exists:
            # 1. Try to find a plan named 'Basic Package' or just the cheapest active plan
            default_plan = Plan.objects.filter(name__icontains="Basic").first()
            
            if not default_plan:
                # Fallback: Get the first active plan available
                default_plan = Plan.objects.filter(is_active=True).order_by('monthly_price_sek').first()
                
            if default_plan:
                # 2. Create the license
                License.objects.create(
                    municipality=instance,
                    plan=default_plan,
                    max_clubs=3,  # Default starting limit
                    has_analytics=False,
                    start_date=timezone.now().date(),
                    end_date=timezone.now().date() + timedelta(days=365),  # 1 year trial/contract
                    auto_renew=True,
                    is_active=True
                )
                print(f"✅ Auto-assigned '{default_plan.name}' license to {instance.name}")
            else:
                print(f"⚠️ Could not assign license to {instance.name}: No Plans found in database.")

