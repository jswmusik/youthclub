from django.db import models
from django.utils.text import slugify

class Page(models.Model):
    PAGE_TYPES = (
        ('standard', 'Standard Page'),
        ('creative', 'Creative Showcase'),
    )

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255, blank=True)
    page_type = models.CharField(max_length=20, choices=PAGE_TYPES, default='standard')
    
    # Content
    content = models.TextField(blank=True, help_text="Rich text content")
    excerpt = models.TextField(blank=True, help_text="Short description shown in hero")
    hero_tagline = models.CharField(max_length=255, blank=True, help_text="Sub-hero tagline displayed below the title")
    hero_image = models.ImageField(upload_to='cms/hero/', blank=True, null=True)
    show_hero = models.BooleanField(default=True)
    
    # Table of Contents (JSON field for flexibility)
    table_of_contents = models.JSONField(
        blank=True, 
        null=True,
        help_text="Optional table of contents. Format: [{title: 'Section', anchor: 'section-id'}]"
    )
    show_toc = models.BooleanField(default=False, help_text="Show table of contents sidebar")
    
    # Author info
    author_name = models.CharField(max_length=255, blank=True)
    author_title = models.CharField(max_length=255, blank=True, help_text="e.g. 'Content Manager'")
    author_image = models.ImageField(upload_to='cms/authors/', blank=True, null=True)
    
    # Features for creative pages (ManyToMany relationship with ordering)
    features = models.ManyToManyField(
        'FeatureShowcase',
        through='PageFeature',
        blank=True,
        related_name='pages',
        help_text="Select features to display on creative pages"
    )
    
    # SEO & AI
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    og_title = models.CharField(max_length=255, blank=True)
    og_image = models.ImageField(upload_to='cms/seo/', blank=True, null=True)
    ai_description = models.TextField(
        blank=True, 
        help_text="A specific description optimized for AI search engines and LLMs."
    )

    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class PageFeature(models.Model):
    """Through model to maintain order of features on a page."""
    page = models.ForeignKey(Page, on_delete=models.CASCADE)
    feature = models.ForeignKey('FeatureShowcase', on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['page', 'feature']

    def __str__(self):
        return f"{self.page.title} - {self.feature.title} (order: {self.order})"


class MenuItem(models.Model):
    LOCATIONS = (
        ('header', 'Top Navigation'),
        ('footer', 'Public Footer'),
        ('community_footer', 'Community Footer (Logged-in Users)'),
        ('none', 'No Menu (Direct Link)'),
    )

    label = models.CharField(max_length=100)
    page = models.ForeignKey(Page, on_delete=models.SET_NULL, null=True, blank=True, related_name='menu_items')
    external_url = models.URLField(blank=True, help_text="Use this if linking to an external site")
    
    location = models.CharField(max_length=20, choices=LOCATIONS, default='none')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.label

class FeatureShowcase(models.Model):
    MEDIA_TYPES = (
        ('image', 'Image'),
        ('video', 'Video (WebM/MP4)'),
        ('lottie', 'Lottie Animation (JSON)'),
    )
    LAYOUTS = (
        ('left', 'Text Left, Media Right'),
        ('right', 'Text Right, Media Left'),
        ('grid', 'Grid Item'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    media = models.FileField(upload_to='cms/features/', blank=True, null=True)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES, default='image')
    alt_text = models.CharField(max_length=255, blank=True, help_text="Accessibility text")
    
    layout = models.CharField(max_length=20, choices=LAYOUTS, default='left')
    animation_type = models.CharField(max_length=50, default="fade-up", help_text="Frontend animation class")
    
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class CookieConsent(models.Model):
    version = models.CharField(max_length=20, help_text="e.g. 1.0. Incrementing this forces users to re-accept.")
    title = models.CharField(max_length=255, default="We use cookies")
    description = models.TextField(help_text="Main banner text")
    policy_text = models.TextField(help_text="Full rich text policy")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cookie Policy v{self.version}"
