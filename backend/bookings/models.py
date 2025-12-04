from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, FileExtensionValidator
from organization.models import Club
from groups.models import Group

# Validator for resource images
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

class BookingResource(models.Model):
    """
    Represents a bookable entity like a 'Music Studio' (Room) or 'VR Headset' (Equipment).
    """
    class ResourceType(models.TextChoices):
        ROOM = 'ROOM', 'Room'
        EQUIPMENT = 'EQUIPMENT', 'Equipment'

    class UserScope(models.TextChoices):
        CLUB = 'CLUB', 'Club Members Only'
        MUNICIPALITY = 'MUNICIPALITY', 'Municipality Members'
        GLOBAL = 'GLOBAL', 'All App Users'
        GROUP = 'GROUP', 'Specific Group Only'

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='booking_resources')
    
    # Basic Info
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.FileField(
        upload_to='bookings/resources/',
        null=True, 
        blank=True,
        validators=[image_validator]
    )
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices, default=ResourceType.ROOM)
    
    # Access Rules
    requires_training = models.BooleanField(
        default=False, 
        help_text="If True, user must be a member of the qualification_group to book."
    )
    qualification_group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qualification_resources',
        help_text="Group that contains qualified members. Only CLOSED groups can be selected."
    )
    max_participants = models.IntegerField(
        default=1, 
        validators=[MinValueValidator(1)],
        help_text="Max people allowed in the booking."
    )
    
    # Configuration / Limits
    allowed_user_scope = models.CharField(
        max_length=20, 
        choices=UserScope.choices, 
        default=UserScope.CLUB
    )
    allowed_group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_resources',
        help_text="If set, only members of this group can book this resource."
    )
    auto_approve = models.BooleanField(
        default=False,
        help_text="If True, bookings are automatically approved. Otherwise, they require admin approval."
    )
    booking_window_weeks = models.IntegerField(
        default=4, 
        help_text="How many weeks in advance this can be booked."
    )
    max_bookings_per_user_per_week = models.IntegerField(
        default=3, 
        help_text="Limit the number of active bookings per user for this resource."
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.club.name})"

class BookingSchedule(models.Model):
    """
    Defines when a resource is available.
    Uses the same logic as organization.RegularOpeningHour (Odd/Even weeks).
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

    resource = models.ForeignKey(BookingResource, on_delete=models.CASCADE, related_name='schedules')
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    week_cycle = models.CharField(max_length=10, choices=WEEK_CYCLE_CHOICES, default='ALL')
    
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    class Meta:
        ordering = ['weekday', 'start_time']
        verbose_name = "Availability Slot"

    def __str__(self):
        return f"{self.resource.name} - {self.get_weekday_display()} ({self.start_time}-{self.end_time})"

class ResourceQualification(models.Model):
    """
    Proof that a user is allowed to book a restricted resource (e.g. 'Studio License').
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resource_qualifications')
    resource = models.ForeignKey(BookingResource, on_delete=models.CASCADE, related_name='qualified_users')
    
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='granted_qualifications'
    )

    class Meta:
        unique_together = ('user', 'resource')

    def __str__(self):
        return f"{self.user} -> {self.resource}"

class Booking(models.Model):
    """
    The actual reservation record.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    resource = models.ForeignKey(BookingResource, on_delete=models.CASCADE, related_name='bookings')
    
    # We store full datetime for the specific instance
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    internal_notes = models.TextField(blank=True, help_text="Staff notes, reason for rejection etc.")
    
    # Recurring booking fields
    is_recurring = models.BooleanField(default=False, help_text="Whether this is a recurring booking")
    parent_booking = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='recurring_instances',
        help_text="The original booking if this is a recurring instance"
    )
    recurring_type = models.CharField(
        max_length=20,
        choices=[
            ('FOREVER', 'Forever'),
            ('WEEKS', 'For a specific number of weeks'),
        ],
        null=True,
        blank=True,
        help_text="Type of recurrence: FOREVER or WEEKS"
    )
    recurring_weeks = models.IntegerField(
        null=True,
        blank=True,
        help_text="Number of weeks to repeat (only used if recurring_type is WEEKS)"
    )
    recurring_end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End date for recurring bookings (calculated automatically)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['resource', 'start_time']),
            models.Index(fields=['user', 'start_time']),
            models.Index(fields=['resource', 'status']), # Helpful for "To Do" lists (club accessed via resource)
        ]

    # Helper to easily query bookings by club (via resource)
    @property
    def club(self):
        return self.resource.club

    def __str__(self):
        return f"{self.user} - {self.resource} ({self.start_time})"

class BookingParticipant(models.Model):
    """
    Friends added to the booking.
    """
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='participants')
    name = models.CharField(max_length=100)
    # Optional: link to actual user if they are on the app
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name