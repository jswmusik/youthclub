from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator

# Reusing your existing validator for consistency
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

class NewsTag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, help_text="URL-friendly version of the name")

    def __str__(self):
        return self.name

class NewsArticle(models.Model):
    # Role choices for targeting (Reusing logic from User model for consistency)
    class TargetRole(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        MUNICIPALITY_ADMIN = 'MUNICIPALITY_ADMIN', 'Municipality Admin'
        CLUB_ADMIN = 'CLUB_ADMIN', 'Club Admin'
        YOUTH_MEMBER = 'YOUTH_MEMBER', 'Youth Member'
        GUARDIAN = 'GUARDIAN', 'Guardian'

    title = models.CharField(max_length=200)
    # Excerpt is the short summary shown on the card
    excerpt = models.TextField(max_length=300, help_text="Short summary for the card view")
    # Content will store the HTML from the WYSIWYG editor
    content = models.TextField()
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='news_articles'
    )
    
    hero_image = models.FileField(
        upload_to='news/heroes/', 
        validators=[image_validator],
        null=True,
        blank=True
    )
    
    # Relationships
    tags = models.ManyToManyField(NewsTag, blank=True, related_name='articles')
    
    # Configuration
    # Using JSONField for target roles like we did in SystemMessages
    target_roles = models.JSONField(default=list, help_text='List of roles or ["ALL"]')
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # The Hero Logic
    is_hero = models.BooleanField(
        default=False, 
        help_text="If checked, this becomes the main featured news. Previous hero will be unset."
    )

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        """
        Custom save method to ensure only one article is marked as Hero at a time.
        """
        if self.is_hero:
            # Set all other articles' is_hero to False
            NewsArticle.objects.filter(is_hero=True).exclude(id=self.id).update(is_hero=False)
        
        super().save(*args, **kwargs)