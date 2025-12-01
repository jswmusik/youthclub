from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from organization.models import Municipality, Club, Interest

class Group(models.Model):
    class GroupType(models.TextChoices):
        OPEN = 'OPEN', 'Open (Join Freely)'
        APPLICATION = 'APPLICATION', 'Application Required'
        CLOSED = 'CLOSED', 'Closed (Invite Only)'

    class MemberType(models.TextChoices):
        YOUTH = 'YOUTH', 'Youth Only'
        GUARDIAN = 'GUARDIAN', 'Guardians Only'

    class SystemGroupType(models.TextChoices):
        NONE = 'NONE', 'Standard Group'
        REGISTERED = 'REGISTERED', 'All Registered'
        ACTIVE = 'ACTIVE', 'Active Members'
        VERIFIED = 'VERIFIED', 'Verified Members'

    # --- Basic Info ---
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # Using the same file validator you used in other apps
    avatar = models.FileField(upload_to='groups/avatars/', blank=True, null=True)
    background_image = models.FileField(upload_to='groups/backgrounds/', blank=True, null=True)
    
    # --- Scope & Ownership ---
    # If both are null, it's a Global Group (Super Admin only)
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, null=True, blank=True, related_name='groups')
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='groups')
    
    # --- Configuration ---
    group_type = models.CharField(max_length=20, choices=GroupType.choices, default=GroupType.OPEN)
    target_member_type = models.CharField(max_length=20, choices=MemberType.choices, default=MemberType.YOUTH)
    
    # System Groups are managed by code, not admins
    is_system_group = models.BooleanField(default=False)
    system_group_type = models.CharField(max_length=20, choices=SystemGroupType.choices, default=SystemGroupType.NONE)

    # --- Eligibility Rules (Criteria) ---
    # Age Range (Null means no limit)
    min_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    max_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Grades: stored as a list of integers, e.g., [7, 8, 9]
    grades = models.JSONField(default=list, blank=True, help_text="List of allowed grades")
    
    # Genders: stored as a list, e.g., ["FEMALE", "OTHER"]
    genders = models.JSONField(default=list, blank=True, help_text="List of allowed genders")
    
    # Interests: Users must match at least one (M2M)
    interests = models.ManyToManyField(Interest, blank=True, related_name='targeted_groups')
    
    # Custom Fields Rules: e.g. {"field_id_5": true, "field_id_10": "Option A"}
    custom_field_rules = models.JSONField(default=dict, blank=True, help_text="Rules based on custom field values")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_group_type_display()})"

class GroupMembership(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved (Active)'
        REJECTED = 'REJECTED', 'Rejected'
    
    class Role(models.TextChoices):
        MEMBER = 'MEMBER', 'Member'
        ADMIN = 'ADMIN', 'Group Admin'

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_memberships')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPROVED)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    
    # Track how many times the user has been rejected (allows re-applying up to 3 times)
    rejection_count = models.IntegerField(default=0)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('group', 'user')

    def __str__(self):
        return f"{self.user} in {self.group}"