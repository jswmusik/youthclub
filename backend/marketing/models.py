# backend/marketing/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from core.languages import LANGUAGE_CHOICES, DEFAULT_LANGUAGE

# Define allowed file types for images
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

# Define allowed file types for videos
video_validator = FileExtensionValidator(allowed_extensions=['mp4', 'webm', 'mov'])


class SiteSEOSettings(models.Model):
    """
    Per-language model to manage Frontpage SEO and Hero content.
    One instance per language (e.g., Swedish, Danish, Norwegian).
    """
    # --- Language ---
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        unique=True,
        db_index=True,
        help_text="Language for this content"
    )
    
    # --- SEO Fields ---
    page_title = models.CharField(max_length=255, default="Ungdomsappen - Hitta aktiviteter nära dig")
    meta_description = models.TextField(
        help_text="Global meta description for the start page",
        default="Upptäck aktiviteter, evenemang och fritidsgårdar nära dig. Ungdomsappen samlar allt för unga på ett ställe."
    )
    keywords = models.CharField(
        max_length=500, 
        help_text="Comma separated keywords",
        default="ungdomsappen, fritidsgård, aktiviteter, ungdom, evenemang"
    )
    
    # --- Hero Section Content ---
    hero_title = models.CharField(
        max_length=100, 
        default="Hitta din grej!", 
        help_text="Main headline on start page"
    )
    hero_subtitle = models.CharField(
        max_length=255, 
        default="Samlade aktiviteter och evenemang för unga.", 
        help_text="Subtext under headline"
    )
    hero_cta_text = models.CharField(
        max_length=50, 
        default="Sök aktiviteter", 
        help_text="Text on the main search button"
    )
    hero_background = models.FileField(
        upload_to='marketing/hero/', 
        null=True, 
        blank=True,
        validators=[image_validator],
        help_text="Fallback background image if no video (recommended: 1920x1080px)"
    )
    hero_video = models.FileField(
        upload_to='marketing/hero/videos/', 
        null=True, 
        blank=True,
        validators=[video_validator],
        help_text="Background video for hero section (recommended: MP4, max 30MB, 1920x1080px)"
    )
    
    # --- Open Graph / Social ---
    og_title = models.CharField(max_length=255, blank=True)
    og_description = models.TextField(blank=True)
    og_image = models.ImageField(upload_to="seo/", blank=True, null=True)

    class Meta:
        verbose_name = "Startpage SEO Settings"
        verbose_name_plural = "Startpage SEO Settings"

    def __str__(self):
        return f"Site SEO & Hero Settings ({self.get_language_display()})"

    def save(self, *args, **kwargs):
        # Ensure only one instance per language (per-language singleton pattern)
        if not self.pk:
            existing = SiteSEOSettings.objects.filter(language=self.language).first()
            if existing:
                self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_for_language(cls, language=DEFAULT_LANGUAGE):
        """Get or create settings for a specific language."""
        instance, _ = cls.objects.get_or_create(language=language)
        return instance


class Testimonial(models.Model):
    """
    Quotes from members, managed by Super Admin.
    Each testimonial belongs to a specific language.
    """
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        db_index=True,
        help_text="Language for this testimonial"
    )
    
    author_name = models.CharField(max_length=100)
    author_role = models.CharField(
        max_length=100, 
        default="Ungdom", 
        help_text="e.g. Youth Member, Parent"
    )
    author_avatar = models.FileField(
        upload_to='marketing/testimonials/', 
        null=True, 
        blank=True,
        validators=[image_validator],
        help_text="Optional avatar image for the author"
    )
    
    quote = models.TextField()
    rating = models.IntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.author_name} - {self.rating}★ ({self.get_language_display()})"


class Customer(models.Model):
    """
    Customer/Partner logos for the homepage carousel.
    Managed by Super Admin.
    Can be language-specific (e.g., Swedish municipalities vs Danish municipalities)
    or shared across all languages (language=None means show for all).
    """
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        blank=True,
        null=True,
        db_index=True,
        help_text="Language for this customer (leave empty to show for all languages)"
    )
    
    name = models.CharField(max_length=100, help_text="Customer/Partner name")
    logo = models.FileField(
        upload_to='marketing/customers/',
        validators=[image_validator],
        help_text="Customer logo (recommended: PNG with transparent background)"
    )
    website_url = models.URLField(
        blank=True, 
        null=True,
        help_text="Link to customer's website (optional)"
    )
    is_active = models.BooleanField(default=True, help_text="Show on homepage")
    display_order = models.IntegerField(
        default=0, 
        help_text="Lower numbers appear first"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = "Customer"
        verbose_name_plural = "Customers"

    def __str__(self):
        lang = f" ({self.get_language_display()})" if self.language else " (All languages)"
        return f"{self.name}{lang}"


class NewsletterSubscriber(models.Model):
    """
    Newsletter subscribers collected from the footer form.
    Not linked to User accounts - for external visitors.
    Includes GDPR-compliant consent tracking.
    """
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    
    # Consent tracking (GDPR compliance)
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    consent_ip = models.GenericIPAddressField(null=True, blank=True)
    consent_user_agent = models.TextField(blank=True, default='')
    
    # Status management
    is_active = models.BooleanField(default=True)  # For soft unsubscribe
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    source = models.CharField(
        max_length=50, 
        default='footer',
        help_text="Where the subscription came from (footer, popup, etc.)"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Newsletter Subscriber"
        verbose_name_plural = "Newsletter Subscribers"
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
