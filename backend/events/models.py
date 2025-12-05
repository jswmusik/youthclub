from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

# Import dependencies from your existing apps
from organization.models import Municipality, Club, Interest
from groups.models import Group

# Validators
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
doc_validator = FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'])

class Event(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        PUBLISHED = 'PUBLISHED', 'Published'
        CANCELLED = 'CANCELLED', 'Cancelled'
        ARCHIVED = 'ARCHIVED', 'Archived'

    class Recurrence(models.TextChoices):
        NONE = 'NONE', 'Does not repeat'
        DAILY = 'DAILY', 'Daily'
        WEEKLY = 'WEEKLY', 'Weekly'
        MONTHLY = 'MONTHLY', 'Monthly'

    # --- NEW: Reusing the logic from Posts for consistency ---
    class TargetAudience(models.TextChoices):
        YOUTH = 'YOUTH', 'Youth Only'
        GUARDIAN = 'GUARDIAN', 'Guardians Only'
        BOTH = 'BOTH', 'Both Youth and Guardians'

    # --- A. Basic Info ---
    title = models.CharField(max_length=255)
    description = models.TextField(help_text="Rich text description of the event")
    
    # Primary media (Cover is used for lists/cards)
    cover_image = models.FileField(upload_to='events/covers/', blank=True, null=True, validators=[image_validator])
    
    # Video (Mutually exclusive with Gallery in UI, but model supports data)
    video_url = models.URLField(blank=True, null=True, help_text="Optional YouTube/Vimeo embed link")
    
    # Cost (Null = Free)
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Leave empty for free events")
    
    # Ownership
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='events')
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='events')
    organizer_name = models.CharField(max_length=100, blank=True, help_text="Override name if different from Club")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # --- B. Date & Time ---
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=20, choices=Recurrence.choices, default=Recurrence.NONE)
    # Used to query the "next" relevant date for recurring events without creating infinite db rows
    next_occurrence = models.DateTimeField(null=True, blank=True)

    # --- C. Location ---
    location_name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_map_visible = models.BooleanField(default=True, help_text="Show map on event page")
    
    # --- D. Audience & Visibility (The Filter Engine) ---
    is_global = models.BooleanField(default=False, help_text="Visible to everyone in the system (Super Admin)")
    
    # 1. Target Audience Type (The new requirement)
    target_audience = models.CharField(
        max_length=20, 
        choices=TargetAudience.choices, 
        default=TargetAudience.YOUTH
    )

    # 2. Priority Group (Overrides other filters if set)
    target_groups = models.ManyToManyField(Group, blank=True, related_name='targeted_events')

    # 3. Demographic Filters (Only apply if no group is selected)
    target_genders = models.JSONField(default=list, blank=True, help_text='List of genders e.g. ["MALE", "FEMALE"]')
    target_min_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    target_max_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(100)])
    target_grades = models.JSONField(default=list, blank=True, help_text='List of grades e.g. [7, 8, 9]')
    target_interests = models.ManyToManyField(Interest, blank=True, related_name='targeted_events')

    # --- E. Registration Rules ---
    allow_registration = models.BooleanField(default=True)
    requires_verified_account = models.BooleanField(default=False)
    requires_guardian_approval = models.BooleanField(default=False)
    requires_admin_approval = models.BooleanField(default=False)
    
    registration_open_date = models.DateTimeField(null=True, blank=True)
    registration_close_date = models.DateTimeField(null=True, blank=True)

    # --- F. Capacity & Inventory ---
    max_seats = models.PositiveIntegerField(default=0, help_text="0 = Unlimited")
    max_waitlist = models.PositiveIntegerField(default=0, help_text="0 = No waitlist")
    
    enable_tickets = models.BooleanField(default=True, help_text="Generate QR code tickets upon confirmed seat")

    # --- G. Notifications ---
    send_reminders = models.BooleanField(default=True, help_text="Send automated 24h and 2h reminders")
    custom_welcome_message = models.TextField(blank=True, help_text="Message sent in notification when seat is confirmed")

    # --- Metrics (Denormalized counters for performance) ---
    confirmed_participants_count = models.PositiveIntegerField(default=0)
    waitlist_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f"{self.title} ({self.start_date.date()})"
        
    @property
    def is_full(self):
        if self.max_seats == 0:
            return False
        return self.confirmed_participants_count >= self.max_seats


class EventImage(models.Model):
    """
    Gallery images for the slideshow.
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='images')
    image = models.FileField(upload_to='events/gallery/', validators=[image_validator])
    caption = models.CharField(max_length=200, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']


class EventDocument(models.Model):
    """
    Attachments (PDFs, packing lists, etc).
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='events/docs/', validators=[doc_validator])
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.title


class EventRegistration(models.Model):
    class Status(models.TextChoices):
        PENDING_GUARDIAN = 'PENDING_GUARDIAN', 'Waiting for Guardian'
        PENDING_ADMIN = 'PENDING_ADMIN', 'Waiting for Admin'
        APPROVED = 'APPROVED', 'Confirmed Seat'
        WAITLIST = 'WAITLIST', 'On Waitlist'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled by User'
        ATTENDED = 'ATTENDED', 'Checked In'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_registrations')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPROVED)
    
    # Audit trail for approvals
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='approved_event_registrations'
    )
    approval_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('event', 'user')
        ordering = ['created_at'] # Critical for Waitlist priority (First come, first served)

    def __str__(self):
        return f"{self.user} - {self.event}"


class EventTicket(models.Model):
    """
    Separating Ticket logic allows us to handle things like 
    regenerating codes or invalidating tickets without deleting the registration history.
    """
    registration = models.OneToOneField(EventRegistration, on_delete=models.CASCADE, related_name='ticket')
    ticket_code = models.CharField(max_length=100, unique=True, editable=False)
    
    is_active = models.BooleanField(default=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='scanned_tickets'
    )

    def save(self, *args, **kwargs):
        if not self.ticket_code:
            self.ticket_code = str(uuid.uuid4()).split('-')[0].upper() # Simple unique short code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ticket {self.ticket_code} for {self.registration}"