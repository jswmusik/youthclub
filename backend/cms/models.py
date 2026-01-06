from django.db import models
from django.utils.text import slugify
from core.languages import LANGUAGE_CHOICES, DEFAULT_LANGUAGE

class Page(models.Model):
    PAGE_TYPES = (
        ('standard', 'Standard Page'),
        ('creative', 'Creative Showcase'),
    )

    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        db_index=True,
        help_text="Language for this page"
    )
    
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)  # Removed unique=True, now unique per language
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

    class Meta:
        # Slug must be unique per language
        unique_together = ['slug', 'language']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.get_language_display()})"


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

    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        db_index=True,
        help_text="Language for this menu item"
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
        return f"{self.label} ({self.get_language_display()})"

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

    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        db_index=True,
        help_text="Language for this feature"
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
        return f"{self.title} ({self.get_language_display()})"

class CookieConsent(models.Model):
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        db_index=True,
        help_text="Language for this cookie consent"
    )
    
    version = models.CharField(max_length=20, help_text="e.g. 1.0. Incrementing this forces users to re-accept.")
    title = models.CharField(max_length=255, default="We use cookies")
    description = models.TextField(help_text="Main banner text")
    policy_text = models.TextField(help_text="Full rich text policy")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Only one active cookie consent per language
        unique_together = ['language', 'version']

    def __str__(self):
        return f"Cookie Policy v{self.version} ({self.get_language_display()})"


class Boilerplate(models.Model):
    """
    Reusable text templates that can be inserted into various forms.
    Used for legal documents, terms and conditions, club policies, etc.
    """
    USAGE_CHOICES = (
        ('terms_and_conditions', 'Villkor'),
        ('club_policies', 'Klubbregler'),
        ('privacy_policy', 'Integritetspolicy'),
        ('general', 'Allmän'),
    )

    name = models.CharField(max_length=255, help_text="Internal name for the template")
    usage = models.CharField(max_length=50, choices=USAGE_CHOICES, default='general', help_text="Where this template can be used")
    content = models.TextField(blank=True, default='', help_text="The template content (supports HTML)")
    description = models.TextField(blank=True, help_text="Description of what this template is for")
    
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = "Boilerplate"
        verbose_name_plural = "Boilerplates"

    def __str__(self):
        return f"{self.name} ({self.get_usage_display()})"


class PricingPageContent(models.Model):
    """
    Per-language model for managing pricing page content.
    One instance per language.
    """
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        unique=True,
        db_index=True,
        help_text="Language for this pricing page content"
    )
    
    # Hero Section
    hero_title = models.CharField(max_length=255, default="Choose Your Plan")
    hero_subtitle = models.TextField(blank=True, help_text="Short description below the title")
    hero_tagline = models.CharField(max_length=255, blank=True, help_text="Small text above the title (e.g., 'Simple Pricing')")
    
    # CTA Section
    cta_title = models.CharField(max_length=255, blank=True, default="Ready to Get Started?")
    cta_description = models.TextField(blank=True)
    cta_button_text = models.CharField(max_length=100, blank=True, default="Contact Us")
    cta_button_url = models.URLField(blank=True, help_text="Link for the CTA button")
    
    # Trust/Social Proof Section
    trust_section_title = models.CharField(max_length=255, blank=True, default="Trusted by Municipalities")
    trust_section_description = models.TextField(blank=True)
    
    # Trust Stats (the numbers shown in the trust section)
    trust_stat_municipalities = models.CharField(max_length=50, blank=True, default="50+", help_text="Number of municipalities (e.g., '50+')")
    trust_stat_active_users = models.CharField(max_length=50, blank=True, default="100K+", help_text="Number of active users (e.g., '100K+')")
    trust_stat_satisfaction = models.CharField(max_length=50, blank=True, default="4.9/5", help_text="Satisfaction rating (e.g., '4.9/5')")
    trust_stat_uptime = models.CharField(max_length=50, blank=True, default="99.9%", help_text="Uptime percentage (e.g., '99.9%')")
    
    # SEO Fields
    meta_title = models.CharField(max_length=255, blank=True, help_text="Page title for SEO")
    meta_description = models.TextField(blank=True, help_text="Meta description for search engines")
    og_title = models.CharField(max_length=255, blank=True, help_text="Open Graph title for social sharing")
    og_description = models.TextField(blank=True, help_text="Open Graph description")
    og_image = models.ImageField(upload_to='cms/seo/', blank=True, null=True, help_text="Image for social sharing")
    ai_description = models.TextField(blank=True, help_text="Description optimized for AI search engines")
    
    # Timestamps
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Pricing Page Content"
        verbose_name_plural = "Pricing Page Content"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance per language (per-language singleton pattern)
        if not self.pk:
            existing = PricingPageContent.objects.filter(language=self.language).first()
            if existing:
                self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_for_language(cls, language=DEFAULT_LANGUAGE):
        """Get or create the instance for a specific language."""
        instance, _ = cls.objects.get_or_create(language=language)
        return instance
    
    def __str__(self):
        return f"Pricing Page Content ({self.get_language_display()})"


class PricingFAQ(models.Model):
    """
    FAQ items displayed on the pricing page.
    Each FAQ belongs to a specific language.
    """
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        db_index=True,
        help_text="Language for this FAQ"
    )
    
    question = models.CharField(max_length=500)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
        verbose_name = "Pricing FAQ"
        verbose_name_plural = "Pricing FAQs"
    
    def __str__(self):
        return f"{self.question[:50]} ({self.get_language_display()})"


class ContactPageContent(models.Model):
    """
    Per-language model for managing contact page content.
    One instance per language.
    """
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default=DEFAULT_LANGUAGE,
        unique=True,
        db_index=True,
        help_text="Language for this contact page content"
    )
    
    # Hero Section
    hero_title = models.CharField(max_length=255, default="Kontakta oss")
    hero_subtitle = models.TextField(blank=True, default="Vi hjälper dig gärna med frågor om Ungdomsappen")
    
    # Contact Info
    contact_email = models.EmailField(default="support@ungdomsappen.se")
    response_time_text = models.CharField(max_length=255, blank=True, default="Vi svarar vanligtvis inom 24 timmar")
    
    # Form Section
    form_title = models.CharField(max_length=255, blank=True, default="Skicka ett meddelande")
    form_description = models.TextField(blank=True, default="Fyll i formuläret nedan så återkommer vi så snart som möjligt")
    
    # Success Message
    success_title = models.CharField(max_length=255, blank=True, default="Tack för ditt meddelande!")
    success_message = models.TextField(blank=True, default="Vi har tagit emot ditt meddelande och återkommer så snart som möjligt.")
    
    # Additional Info Section
    info_title = models.CharField(max_length=255, blank=True, default="Annan information")
    info_content = models.TextField(blank=True, help_text="Additional information shown on the contact page (supports markdown)")
    
    # SEO Fields
    meta_title = models.CharField(max_length=255, blank=True, default="Kontakt - Ungdomsappen")
    meta_description = models.TextField(blank=True, default="Kontakta Ungdomsappen för frågor om vår plattform för ungdomsverksamhet.")
    
    # Timestamps
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contact Page Content"
        verbose_name_plural = "Contact Page Content"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance per language (per-language singleton pattern)
        if not self.pk:
            existing = ContactPageContent.objects.filter(language=self.language).first()
            if existing:
                self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_for_language(cls, language=DEFAULT_LANGUAGE):
        """Get or create the instance for a specific language."""
        instance, _ = cls.objects.get_or_create(language=language)
        return instance
    
    def __str__(self):
        return f"Contact Page Content ({self.get_language_display()})"


class ContactSubmission(models.Model):
    """
    Stores contact form submissions.
    """
    name = models.CharField(max_length=255)
    email = models.EmailField()
    organization = models.CharField(max_length=255, blank=True)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    is_replied = models.BooleanField(default=False)
    replied_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Contact Submission"
        verbose_name_plural = "Contact Submissions"
    
    def __str__(self):
        return f"{self.name} - {self.subject[:30]}"
