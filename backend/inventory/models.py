from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, FileExtensionValidator
from organization.models import Club

# Validator for item images
item_image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

class ItemCategory(models.Model):
    """
    Broad categories (e.g. Gaming, Sports, Music).
    Managed by Super Admin (Global).
    """
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Material Icon name or Emoji")
    
    class Meta:
        verbose_name_plural = "Item Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class InventoryTag(models.Model):
    """
    Tags for specific attributes (e.g. '#PS5', '#Outdoor', '#RequiresDeposit').
    Can be Global (Super Admin) or Club-Specific.
    """
    name = models.CharField(max_length=50)
    icon = models.CharField(max_length=50, blank=True, help_text="Material Icon name or Emoji")
    
    # If club is Null, it is a GLOBAL tag. If set, it is LOCAL to that club.
    club = models.ForeignKey(
        Club, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='inventory_tags'
    )

    class Meta:
        unique_together = ('name', 'club')
        ordering = ['name']

    def __str__(self):
        scope = "Global" if not self.club else self.club.name
        return f"{self.name} ({scope})"

class Item(models.Model):
    """
    A physical item available for borrowing.
    """
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        BORROWED = 'BORROWED', 'Borrowed'
        MAINTENANCE = 'MAINTENANCE', 'In Maintenance (Broken)'
        MISSING = 'MISSING', 'Missing / Lost'
        HIDDEN = 'HIDDEN', 'Hidden (Archived)'

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='inventory_items')
    category = models.ForeignKey(ItemCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    
    # Basic Info
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.FileField(
        upload_to='inventory/items/', 
        null=True, 
        blank=True,
        validators=[item_image_validator]
    )
    
    tags = models.ManyToManyField(InventoryTag, blank=True, related_name='items')
    
    # Borrowing Rules
    max_borrow_duration = models.IntegerField(
        default=60, 
        help_text="Maximum borrowing time in minutes. 0 = Until Close.",
        validators=[MinValueValidator(0)]
    )
    
    # State
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.AVAILABLE
    )
    
    # Internal Tracking (Useful for the 'Batch Create' feature)
    internal_note = models.CharField(max_length=255, blank=True, help_text="Admin note (e.g. 'Batch 2024')")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title', 'id']
        indexes = [
            models.Index(fields=['club', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

class LendingSession(models.Model):
    """
    Records a borrowing event.
    """
    class CompletionStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        RETURNED_USER = 'RETURNED_USER', 'Returned by User'
        RETURNED_SYSTEM = 'RETURNED_SYSTEM', 'Auto-Returned by System (Closing)'
        RETURNED_ADMIN = 'RETURNED_ADMIN', 'Force Returned by Admin'

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='lending_sessions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lending_sessions')
    
    # Timestamps
    borrowed_at = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField()
    returned_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20, 
        choices=CompletionStatus.choices, 
        default=CompletionStatus.ACTIVE
    )
    
    # Guest Tracking (Snapshot at time of borrow)
    is_guest = models.BooleanField(default=False, help_text="Was the user a guest at this club?")
    
    class Meta:
        ordering = ['-borrowed_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['item', 'status']),
        ]

    def __str__(self):
        return f"{self.user} borrowed {self.item}"

class WaitingList(models.Model):
    """
    Queue for items that are currently borrowed.
    """
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='waiting_list')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='waiting_entries')
    queued_at = models.DateTimeField(auto_now_add=True)
    
    notified_at = models.DateTimeField(null=True, blank=True, help_text="When user was told item is free")

    class Meta:
        ordering = ['queued_at']
        unique_together = ('item', 'user') # User can't queue twice for same item

    def __str__(self):
        return f"{self.user} waiting for {self.item}"