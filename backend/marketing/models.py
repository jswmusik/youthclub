# backend/marketing/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from organization.models import Municipality, Club

class SiteSEOSettings(models.Model):
    """
    Singleton model to manage Frontpage SEO.
    """
    page_title = models.CharField(max_length=255, default="Ungdomsappen - Hitta aktiviteter nära dig")
    meta_description = models.TextField(help_text="Global meta description for the start page")
    keywords = models.CharField(max_length=500, help_text="Comma separated keywords")
    
    # Open Graph / Social
    og_title = models.CharField(max_length=255, blank=True)
    og_description = models.TextField(blank=True)
    og_image = models.ImageField(upload_to="seo/", blank=True, null=True)

    class Meta:
        verbose_name = "Startpage SEO Settings"
        verbose_name_plural = "Startpage SEO Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and SiteSEOSettings.objects.exists():
            return
        super().save(*args, **kwargs)

class Testimonial(models.Model):
    """
    Quotes from members, managed by Super Admin.
    """
    author_name = models.CharField(max_length=100)
    author_role = models.CharField(max_length=100, default="Ungdom", help_text="e.g. Youth Member, Parent")
    # Optional: Link to actual user if you want to pull their avatar dynamically
    # user = models.ForeignKey(User, null=True, blank=True, ...) 
    
    quote = models.TextField()
    rating = models.IntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author_name} - {self.rating}*"