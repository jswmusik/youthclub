from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from organization.models import Municipality, Club, Interest
from groups.models import Group

# Validator for reward images
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

class Reward(models.Model):
    # --- Enums (Choices) ---
    class OwnerRole(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        MUNICIPALITY_ADMIN = 'MUNICIPALITY_ADMIN', 'Municipality Admin'
        CLUB_ADMIN = 'CLUB_ADMIN', 'Club Admin'

    class MemberType(models.TextChoices):
        YOUTH = 'YOUTH', 'Youth Only'
        GUARDIAN = 'GUARDIAN', 'Guardians Only'

    class TriggerType(models.TextChoices):
        NONE = 'NONE', 'Manual / No Trigger'
        BIRTHDAY = 'BIRTHDAY', 'Birthday'
        WELCOME = 'WELCOME', 'Welcome (Registration)'
        VERIFIED = 'VERIFIED', 'Verified Account'
        MOST_ACTIVE = 'MOST_ACTIVE', 'Most Active (Logins)'
        # MOST_CHECKED_IN can be added later

    # --- Basic Info (Section 3) ---
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.FileField(
        upload_to='rewards/images/', 
        validators=[image_validator],
        blank=True, null=True
    )
    sponsor_name = models.CharField(max_length=200, blank=True)
    sponsor_link = models.URLField(blank=True, null=True)

    # --- Ownership & Scope (Section 2) ---
    owner_role = models.CharField(max_length=50, choices=OwnerRole.choices)
    
    # If owned by Municipality Admin:
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, null=True, blank=True, related_name='rewards')
    
    # If owned by Club Admin:
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='rewards')

    # --- Targeting Options (Section 4) ---
    # A. Target Specific Groups
    target_groups = models.ManyToManyField(Group, blank=True, related_name='targeted_rewards')
    
    # B. Target Interests
    target_interests = models.ManyToManyField(Interest, blank=True, related_name='targeted_rewards')
    
    # C. Gender (Stored as list ["MALE", "FEMALE"])
    target_genders = models.JSONField(default=list, blank=True)
    
    # D. Grade (Stored as list [7, 8, 9])
    target_grades = models.JSONField(default=list, blank=True)
    
    # E. Age Range
    min_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    max_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # F. Member Type
    target_member_type = models.CharField(max_length=20, choices=MemberType.choices, default=MemberType.YOUTH)

    # --- Constraints (Section 5) ---
    expiration_date = models.DateField(null=True, blank=True)
    usage_limit = models.IntegerField(null=True, blank=True, help_text="Total times this reward can be claimed. Null = Unlimited.")

    # --- Triggers (Section 6) ---
    # We allow multiple triggers, but for simplicity in SQL, we can store primary trigger type
    # or use a ManyToMany if you want complex combinations. 
    # Based on your doc, "Admins can choose one or several triggers".
    # For now, let's use a JSON list to store multiple trigger types e.g. ["BIRTHDAY", "VERIFIED"]
    active_triggers = models.JSONField(default=list, blank=True, help_text="List of active trigger codes")
    
    # Configuration for complex triggers (like Most Active)
    # Example: { "logins_per_day": 3, "top_n": 10, "period": "WEEKLY" }
    trigger_config = models.JSONField(default=dict, blank=True)

    # --- System Fields ---
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_owner_role_display()})"


class RewardUsage(models.Model):
    """
    Tracks who used a reward and when (Section 9).
    """
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reward_usages')
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-used_at']

    def __str__(self):
        return f"{self.user} used {self.reward}"