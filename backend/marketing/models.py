# backend/marketing/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator

# Define allowed file types for images
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])


class SiteSEOSettings(models.Model):
    """
    Singleton model to manage Frontpage SEO and Hero content.
    """
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
        help_text="High res background image (recommended: 1920x1080px)"
    )
    
    # --- Open Graph / Social ---
    og_title = models.CharField(max_length=255, blank=True)
    og_description = models.TextField(blank=True)
    og_image = models.ImageField(upload_to="seo/", blank=True, null=True)

    class Meta:
        verbose_name = "Startpage SEO Settings"
        verbose_name_plural = "Startpage SEO Settings"

    def __str__(self):
        return "Site SEO & Hero Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and SiteSEOSettings.objects.exists():
            # Update existing instead of creating new
            existing = SiteSEOSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)


class Testimonial(models.Model):
    """
    Quotes from members, managed by Super Admin.
    """
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
        return f"{self.author_name} - {self.rating}★"


class Customer(models.Model):
    """
    Customer/Partner logos for the homepage carousel.
    Managed by Super Admin.
    """
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
        return self.name
