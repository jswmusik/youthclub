from django.db import models
from django.conf import settings
from organization.models import Municipality, Club

class CustomFieldDefinition(models.Model):
    """
    Defines the schema for a custom field.
    """
    class FieldType(models.TextChoices):
        TEXT = 'TEXT', 'Text Field'
        SINGLE_SELECT = 'SINGLE_SELECT', 'Single Select'
        MULTI_SELECT = 'MULTI_SELECT', 'Multi Select'
        BOOLEAN = 'BOOLEAN', 'Boolean (Checkbox)'

    class OwnerRole(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        MUNICIPALITY_ADMIN = 'MUNICIPALITY_ADMIN', 'Municipality Admin'
        CLUB_ADMIN = 'CLUB_ADMIN', 'Club Admin'

    class Context(models.TextChoices):
        USER_PROFILE = 'USER_PROFILE', 'User Profile'
        EVENT = 'EVENT', 'Event'

    # --- Basic Configuration ---
    name = models.CharField(max_length=255, help_text="Label for the field")
    help_text = models.CharField(max_length=255, blank=True, null=True, help_text="Hint text displayed to user")
    field_type = models.CharField(max_length=20, choices=FieldType.choices, default=FieldType.TEXT)
    
    # Stores options for Single/Multi select as a JSON list ["Option A", "Option B"]
    options = models.JSONField(default=list, blank=True, help_text="List of options for select fields")
    
    required = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)

    # --- Scoping & Permissions ---
    context = models.CharField(max_length=20, choices=Context.choices, default=Context.USER_PROFILE)
    
    # Target Roles: e.g. ["YOUTH_MEMBER", "GUARDIAN"]
    target_roles = models.JSONField(default=list)

    # --- Ownership Logic ---
    owner_role = models.CharField(max_length=50, choices=OwnerRole.choices)
    
    # If owned by Municipality:
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, null=True, blank=True, related_name='custom_fields')
    # Optional: Limit to specific clubs within that municipality
    specific_clubs = models.ManyToManyField(Club, blank=True, related_name='specific_custom_fields', help_text="If set, only applies to these clubs within the municipality")

    # If owned by Club:
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='custom_fields')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_field_type_display()})"


class CustomFieldValue(models.Model):
    """
    Stores the actual data entered by a user for a specific field.
    """
    field = models.ForeignKey(CustomFieldDefinition, on_delete=models.CASCADE, related_name='values')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='custom_field_values')
    
    # Using JSONField allows us to store Strings, Booleans, or Lists (for Multi Select) easily
    value = models.JSONField(null=True, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('field', 'user')

    def __str__(self):
        return f"{self.user} - {self.field.name}: {self.value}"