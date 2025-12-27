from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from organization.models import Municipality

class Feature(models.Model):
    """
    Represents a buyable module in the system (e.g., 'messenger', 'events').
    The slug must match the hardcoded permission checks in the code.
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, help_text="Key used in code check (e.g., 'inventory')")
    description = models.TextField(blank=True)
    monthly_price_sek = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Price if purchased as a standalone add-on"
    )

    def __str__(self):
        return f"{self.name} ({self.slug})"

class Plan(models.Model):
    """
    The Plan Builder. Allows creating tiers like 'Basic', 'Gold', 'Startup 2025'.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    features = models.ManyToManyField(Feature, related_name='plans', blank=True)
    monthly_price_sek = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    is_public = models.BooleanField(default=True, help_text="Visible in the upgrade menu")
    is_active = models.BooleanField(default=True, help_text="If False, no new licenses can use this plan")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.monthly_price_sek} SEK)"

class GlobalPricing(models.Model):
    """
    Singleton model to store global pricing variables.
    """
    price_per_extra_club_sek = models.DecimalField(
        max_digits=10, decimal_places=2, default=500.00,
        help_text="Monthly price per extra club slot"
    )
    analytics_package_price_sek = models.DecimalField(
        max_digits=10, decimal_places=2, default=1000.00,
        help_text="Monthly price for analytics package"
    )
    yearly_renewal_discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        help_text="Discount percentage for yearly renewals (e.g., 10 = 10% off)"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pk and GlobalPricing.objects.exists():
            raise ValidationError('There can be only one GlobalPricing instance')
        return super(GlobalPricing, self).save(*args, **kwargs)

    def __str__(self):
        return "Global Pricing Configuration"

    class Meta:
        verbose_name_plural = "Global Pricing"

class License(models.Model):
    """
    The master record linking a Municipality to what they own.
    """
    municipality = models.OneToOneField(Municipality, on_delete=models.CASCADE, related_name='license')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='licenses')
    
    # Add-ons purchased on top of the plan
    extra_features = models.ManyToManyField(Feature, blank=True, related_name='extra_licenses')
    
    # Limits & Add-ons
    max_clubs = models.PositiveIntegerField(default=3, help_text="Total number of clubs allowed")
    has_analytics = models.BooleanField(default=False, help_text="Has purchased the Analytics Suite")
    
    # Terms
    start_date = models.DateField()
    end_date = models.DateField()
    auto_renew = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    def get_active_features_slugs(self):
        """Returns a set of all feature slugs (Plan + Extra)"""
        if not self.is_active:
            return set()
            
        plan_features = set(self.plan.features.values_list('slug', flat=True))
        extra_features = set(self.extra_features.values_list('slug', flat=True))
        return plan_features.union(extra_features)

    def __str__(self):
        return f"License for {self.municipality.name} ({self.plan.name})"

class LicenseRequest(models.Model):
    """
    Requests from Municipality Admins to upgrade/change their deal.
    """
    class RequestType(models.TextChoices):
        NEW_CLUB_SLOT = 'NEW_CLUB', _('Buy Extra Club Slot')
        UPGRADE_PLAN = 'UPGRADE_PLAN', _('Upgrade Plan Tier')
        ADD_FEATURE = 'ADD_FEATURE', _('Buy Add-on Feature')
        ADD_ANALYTICS = 'ADD_ANALYTICS', _('Buy Analytics Package')
        RENEWAL = 'RENEWAL', _('License Renewal')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved & Invoiced')
        REJECTED = 'REJECTED', _('Rejected')

    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='license_requests')
    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Details of what they want
    requested_plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL)
    requested_feature = models.ForeignKey(Feature, null=True, blank=True, on_delete=models.SET_NULL)
    requested_club_count = models.PositiveIntegerField(null=True, blank=True)
    renewal_years = models.PositiveIntegerField(null=True, blank=True, help_text="Number of years for renewal request")
    
    created_at = models.DateTimeField(auto_now_add=True)
    admin_notes = models.TextField(blank=True, help_text="Internal notes for Super Admin (e.g. Invoice ID)")

    def __str__(self):
        return f"{self.municipality.name} - {self.get_request_type_display()}"