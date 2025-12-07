from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.utils.text import slugify
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
    scheduled_publish_date = models.DateTimeField(null=True, blank=True, help_text="Optional: Schedule when to publish this event. If set and status is SCHEDULED, status will change to PUBLISHED automatically at this time.")

    # --- B. Date & Time ---
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=20, choices=Recurrence.choices, default=Recurrence.NONE)
    # NEW: Date to stop repeating
    recurrence_end_date = models.DateField(null=True, blank=True, help_text="Last date of the recurring series")
    # Used to query the "next" relevant date for recurring events without creating infinite db rows
    next_occurrence = models.DateTimeField(null=True, blank=True)
    
    # Optional: Link instances together (parent/child) if you want to edit them all at once later
    parent_event = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='recurring_instances')

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
    target_min_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(120)])
    target_max_age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(120)])
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

    # --- H. SEO Settings ---
    slug = models.SlugField(max_length=255, unique=True, help_text="URL-friendly version of the title (auto-generated if not provided)")
    meta_description = models.TextField(max_length=500, blank=True, help_text="Meta description for search engines")
    meta_tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated meta tags/keywords")
    page_title = models.CharField(max_length=255, blank=True, help_text="Custom page title (defaults to event title if not set)")
    
    # Social Media Meta Data (Open Graph)
    og_title = models.CharField(max_length=255, blank=True, help_text="Open Graph title for social media sharing")
    og_description = models.TextField(max_length=500, blank=True, help_text="Open Graph description for social media sharing")
    og_image = models.FileField(upload_to='events/og-images/', blank=True, null=True, validators=[image_validator], help_text="Open Graph image for social media sharing")
    
    # Twitter Card Meta Data
    twitter_card_type = models.CharField(
        max_length=20,
        choices=[
            ('summary', 'Summary'),
            ('summary_large_image', 'Summary Large Image'),
        ],
        default='summary_large_image',
        help_text="Twitter card type"
    )
    twitter_title = models.CharField(max_length=255, blank=True, help_text="Twitter card title")
    twitter_description = models.TextField(max_length=500, blank=True, help_text="Twitter card description")
    twitter_image = models.FileField(upload_to='events/twitter-images/', blank=True, null=True, validators=[image_validator], help_text="Twitter card image")

    # --- Metrics (Denormalized counters for performance) ---
    confirmed_participants_count = models.PositiveIntegerField(default=0)
    waitlist_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f"{self.title} ({self.start_date.date()})"
    
    def save(self, *args, **kwargs):
        """Auto-generate slug from title if not provided"""
        # Only generate slug if it's truly empty (None or empty string)
        if not self.slug or self.slug.strip() == '':
            base_slug = slugify(self.title)
            if not base_slug:  # If title doesn't slugify to anything, use a default
                base_slug = 'event'
            slug = base_slug
            counter = 1
            max_attempts = 100  # Prevent infinite loop
            attempts = 0
            # Ensure uniqueness - check with current pk excluded
            while Event.objects.filter(slug=slug).exclude(pk=self.pk).exists() and attempts < max_attempts:
                slug = f"{base_slug}-{counter}"
                counter += 1
                attempts += 1
            if attempts >= max_attempts:
                # Fallback to UUID-based slug if we can't find a unique one
                import uuid
                slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
            self.slug = slug
        super().save(*args, **kwargs)
        
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