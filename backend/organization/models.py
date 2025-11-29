from django.db import models
from django.core.validators import FileExtensionValidator

# Define allowed file types
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'svg', 'webp'])

class Country(models.Model):
    """
    Represents the highest organizational level.
    """
    name = models.CharField(max_length=100, unique=True)
    country_code = models.CharField(max_length=5, help_text="ISO Code, e.g., SE, NO")
    description = models.TextField()
    
    # Changed to FileField to support SVG
    avatar = models.FileField(
        upload_to='countries/avatars/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )

    currency_code = models.CharField(max_length=10, blank=True, null=True)
    default_language = models.CharField(max_length=10, blank=True, null=True)
    timezone = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Countries"

    def __str__(self):
        return self.name

class Municipality(models.Model):
    """
    Represents a local government area.
    """
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='municipalities')
    name = models.CharField(max_length=100)
    description = models.TextField()
    terms_and_conditions = models.TextField()
    
    # Changed to FileField
    avatar = models.FileField(
        upload_to='municipalities/avatars/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )
    hero_image = models.FileField(
        upload_to='municipalities/heroes/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )

    municipality_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    website_link = models.URLField(blank=True, null=True)
    social_media = models.JSONField(default=dict, blank=True)
    
    # --- REGISTRATION SETTINGS ---
    allow_self_registration = models.BooleanField(default=True)
    require_guardian_at_registration = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Municipalities"

    def __str__(self):
        return f"{self.name} ({self.country.country_code})"

class Club(models.Model):
    """
    Represents a physical youth center.
    """
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='clubs')
    name = models.CharField(max_length=100)
    description = models.TextField()
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    terms_and_conditions = models.TextField()
    club_policies = models.TextField()

    # Changed to FileField
    avatar = models.FileField(
        upload_to='clubs/avatars/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )
    hero_image = models.FileField(
        upload_to='clubs/heroes/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )

    address = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    allowed_age_groups = models.CharField(max_length=100, blank=True, null=True)
    club_categories = models.CharField(max_length=255, blank=True, null=True)

    # --- REGISTRATION SETTINGS (OVERRIDES) ---
    # Null = Use Municipality Default, True/False = Override
    allow_self_registration_override = models.BooleanField(null=True, blank=True)
    require_guardian_override = models.BooleanField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.municipality.name})"

    # Helper property to get the "Effective" setting easily in code
    @property
    def should_require_guardian(self):
        if self.require_guardian_override is not None:
            return self.require_guardian_override
        return self.municipality.require_guardian_at_registration

    @property
    def is_registration_allowed(self):
        if self.allow_self_registration_override is not None:
            return self.allow_self_registration_override
        return self.municipality.allow_self_registration

class RegularOpeningHour(models.Model):
    """
    Defines the standard weekly schedule.
    """
    WEEKDAY_CHOICES = [
        (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'), (4, 'Thursday'),
        (5, 'Friday'), (6, 'Saturday'), (7, 'Sunday'),
    ]
    
    WEEK_CYCLE_CHOICES = [
        ('ALL', 'Every Week'),
        ('ODD', 'Odd Weeks (1, 3, 5...)'),
        ('EVEN', 'Even Weeks (2, 4, 6...)'),
    ]

    GENDER_CHOICES = [
        ('ALL', 'All Genders'), ('BOYS', 'Boys Only'), 
        ('GIRLS', 'Girls Only'), ('OTHER', 'Other'),
    ]

    RESTRICTION_CHOICES = [
        ('NONE', 'No Restriction'),
        ('AGE', 'Age Range'),
        ('GRADE', 'Grade Range'),
    ]

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='regular_hours')
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    week_cycle = models.CharField(max_length=10, choices=WEEK_CYCLE_CHOICES, default='ALL')
    
    open_time = models.TimeField()
    close_time = models.TimeField()
    
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    
    # New Logic for Restrictions
    restriction_mode = models.CharField(max_length=10, choices=RESTRICTION_CHOICES, default='NONE')
    min_value = models.IntegerField(null=True, blank=True, help_text="Min Age or Grade")
    max_value = models.IntegerField(null=True, blank=True, help_text="Max Age or Grade")
    
    gender_restriction = models.CharField(max_length=10, choices=GENDER_CHOICES, default='ALL')

    class Meta:
        ordering = ['weekday', 'open_time']

    def __str__(self):
        return f"{self.club.name} - {self.get_weekday_display()}"


class ClubClosure(models.Model):
    """
    Dates when the club is completely closed (Section 6.5, 6.6).
    """
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='closures')
    start_date = models.DateField()
    end_date = models.DateField(help_text="If same as start_date, it's a one-day closure")
    description = models.CharField(max_length=255, help_text="Reason for closure (e.g. Christmas)")

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f"{self.club.name} Closed: {self.start_date}"


class DateOverride(models.Model):
    """
    Specific dates with special hours that replace the regular schedule (Section 6.4).
    """
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='date_overrides')
    date = models.DateField()
    
    open_time = models.TimeField()
    close_time = models.TimeField()
    
    title = models.CharField(max_length=100, blank=True, help_text="e.g., 'Summer Party'")
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['date', 'open_time']

    def __str__(self):
        return f"{self.club.name} Override: {self.date}"


class Interest(models.Model):
    """
    Global interests defined by Super Admin. 
    Used to categorize Users and Events.
    """
    name = models.CharField(max_length=50, unique=True)
    # Kept 'icon' as a fallback or for small UI elements (emoji)
    icon = models.CharField(max_length=50, blank=True, help_text="Emoji or Icon name (e.g. '⚽' or 'sports_soccer')")
    
    # New visual field supporting SVGs
    avatar = models.FileField(
        upload_to='interests/avatars/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )
    
    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.icon} {self.name}" if self.icon else self.name