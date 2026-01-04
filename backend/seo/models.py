# backend/seo/models.py
"""
SEO & Marketing Content Models

This module handles:
- Keyword tracking and management
- Swedish location data for local SEO
- AI-generated local landing pages
- SEO-optimized articles
- Internal linking strategy
"""

from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator

# Validators
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])


# =============================================================================
# KEYWORD MANAGEMENT
# =============================================================================

class Keyword(models.Model):
    """
    Keywords we want to rank for in search engines.
    Can be added manually or imported via SEO tool APIs.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('ARCHIVED', 'Archived'),
    ]
    
    INTENT_CHOICES = [
        ('INFORMATIONAL', 'Informational'),   # "what is a youth club"
        ('NAVIGATIONAL', 'Navigational'),     # "ungdomsappen login"
        ('TRANSACTIONAL', 'Transactional'),   # "register youth club"
        ('LOCAL', 'Local'),                   # "fritidsgård stockholm"
    ]
    
    AUDIENCE_CHOICES = [
        ('YOUTH', 'Youth Members'),
        ('GUARDIAN', 'Guardians/Parents'),
        ('MUNICIPALITY', 'Municipality Decision Makers'),
        ('GENERAL', 'General Public'),
    ]
    
    SOURCE_CHOICES = [
        ('manual', 'Manual Entry'),
        ('semrush', 'SEMrush'),
        ('ahrefs', 'Ahrefs'),
        ('google_search_console', 'Google Search Console'),
        ('serpapi', 'SERPapi'),
    ]
    
    # Core fields
    keyword = models.CharField(max_length=255, unique=True, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    
    # SEO metrics
    search_volume = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Monthly search volume (from SEO tools)"
    )
    difficulty = models.PositiveIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Keyword difficulty score (0-100)"
    )
    cpc = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Cost per click in SEK"
    )
    
    # Classification
    intent = models.CharField(
        max_length=20, 
        choices=INTENT_CHOICES, 
        default='INFORMATIONAL'
    )
    target_audience = models.CharField(
        max_length=20, 
        choices=AUDIENCE_CHOICES, 
        default='GENERAL'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='ACTIVE'
    )
    
    # Ranking tracking
    current_ranking = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Current Google ranking position"
    )
    best_ranking = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Best ranking ever achieved"
    )
    last_rank_check = models.DateTimeField(null=True, blank=True)
    
    # Source tracking (for API imports)
    source = models.CharField(
        max_length=50, 
        choices=SOURCE_CHOICES,
        default='manual'
    )
    external_id = models.CharField(
        max_length=100, 
        blank=True,
        help_text="ID from external SEO tool"
    )
    
    # Notes
    notes = models.TextField(blank=True, help_text="Internal notes about this keyword")
    
    # Auto-detected location from keyword text
    detected_location = models.ForeignKey(
        'SwedishLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detected_keywords',
        help_text="Auto-detected location from keyword text"
    )
    
    # Link to generated content (set after page/article is created)
    generated_page = models.OneToOneField(
        'LocalLandingPage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_keyword_link',
        help_text="Landing page generated from this keyword"
    )
    generated_article = models.OneToOneField(
        'SEOArticle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_keyword_link',
        help_text="Article generated from this keyword"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-search_volume', 'keyword']
        verbose_name = "Keyword"
        verbose_name_plural = "Keywords"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.keyword)
        super().save(*args, **kwargs)
    
    def __str__(self):
        vol = f" ({self.search_volume}/mo)" if self.search_volume else ""
        return f"{self.keyword}{vol}"
    
    @property
    def has_content(self):
        """Check if content has been generated for this keyword."""
        return self.generated_page is not None or self.generated_article is not None
    
    @property
    def content_status(self):
        """Get the status of generated content."""
        if self.generated_page:
            return f"Page: {self.generated_page.get_status_display()}"
        if self.generated_article:
            return f"Article: {self.generated_article.get_status_display()}"
        return "No content"


# =============================================================================
# SWEDISH LOCATION DATA
# =============================================================================

class SwedishLocation(models.Model):
    """
    All Swedish municipalities and major cities.
    Pre-populated for local SEO targeting.
    Sweden has 290 municipalities (kommuner).
    """
    TYPE_CHOICES = [
        ('MUNICIPALITY', 'Kommun'),
        ('CITY', 'Stad/Ort'),
        ('REGION', 'Region/Län'),
    ]
    
    # Core fields
    name = models.CharField(max_length=100, db_index=True)
    name_genitive = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Genitive form, e.g., 'Stockholms' for 'Stockholm'"
    )
    slug = models.SlugField(max_length=100, unique=True)
    location_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Official codes
    scb_code = models.CharField(
        max_length=10, 
        blank=True, 
        db_index=True,
        help_text="SCB municipality code (e.g., '0180' for Stockholm)"
    )
    
    # Geo data
    latitude = models.FloatField()
    longitude = models.FloatField()
    population = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Population count"
    )
    
    # Region grouping
    region = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Län/Region name"
    )
    region_code = models.CharField(
        max_length=10, 
        blank=True,
        help_text="Region code"
    )
    
    # Link to our platform's municipality (if they're a customer)
    linked_municipality = models.OneToOneField(
        'organization.Municipality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seo_location',
        help_text="Link to our platform's municipality if active"
    )
    
    # SEO priority
    priority = models.PositiveIntegerField(
        default=0,
        help_text="Higher = more important for SEO (0-100)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-population', 'name']
        verbose_name = "Swedish Location"
        verbose_name_plural = "Swedish Locations"
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['location_type', 'region']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        if not self.name_genitive:
            # Simple Swedish genitive - add 's' unless ending in s/x/z
            if self.name[-1].lower() in ['s', 'x', 'z']:
                self.name_genitive = self.name
            else:
                self.name_genitive = f"{self.name}s"
        super().save(*args, **kwargs)
    
    @property
    def is_customer(self):
        """Check if this location has an active municipality in our platform."""
        return self.linked_municipality is not None
    
    def __str__(self):
        return f"{self.name} ({self.get_location_type_display()})"


# =============================================================================
# LOCAL LANDING PAGES
# =============================================================================

class LocalLandingPage(models.Model):
    """
    AI-generated local SEO landing pages for Swedish locations.
    Each page targets a specific location + keyword combination.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft - AI Generated'),
        ('REVIEW', 'Ready for Review'),
        ('APPROVED', 'Approved'),
        ('PUBLISHED', 'Published'),
        ('ARCHIVED', 'Archived'),
    ]
    
    PAGE_TYPE_CHOICES = [
        ('EVENTS', 'Events/Activities'),
        ('CLUBS', 'Youth Clubs'),
        ('GENERAL', 'General Information'),
    ]
    
    # Targeting
    location = models.ForeignKey(
        SwedishLocation, 
        on_delete=models.CASCADE, 
        related_name='landing_pages'
    )
    page_type = models.CharField(
        max_length=20, 
        choices=PAGE_TYPE_CHOICES, 
        default='GENERAL'
    )
    target_audience = models.CharField(
        max_length=20, 
        choices=Keyword.AUDIENCE_CHOICES, 
        default='GENERAL'
    )
    
    # Keywords
    primary_keyword = models.ForeignKey(
        Keyword, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='primary_pages'
    )
    secondary_keywords = models.ManyToManyField(
        Keyword, 
        blank=True, 
        related_name='secondary_pages'
    )
    
    # URL
    slug = models.SlugField(max_length=200, unique=True)
    
    # SEO Meta
    title = models.CharField(
        max_length=70,
        help_text="Page title (max 70 chars for SERP)"
    )
    meta_description = models.TextField(
        max_length=160,
        help_text="Meta description (max 160 chars for SERP)"
    )
    
    # Focus Keyphrase (for SEO optimization tracking)
    focus_keyphrase = models.CharField(
        max_length=100,
        blank=True,
        help_text="Primary keyword/phrase this page targets (auto-set from keyword)"
    )
    
    # Hero Image (for page banner)
    hero_image = models.ImageField(
        upload_to='seo/local-pages/hero/',
        blank=True,
        null=True,
        validators=[image_validator],
        help_text="Hero image for page banner (1200x630 recommended)"
    )
    hero_image_alt = models.CharField(
        max_length=200,
        blank=True,
        help_text="Alt text for hero image (important for SEO)"
    )
    
    # Open Graph
    og_title = models.CharField(max_length=100, blank=True)
    og_description = models.TextField(max_length=200, blank=True)
    og_image = models.ImageField(
        upload_to='seo/local-pages/og/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )
    
    # Twitter Card
    twitter_card = models.CharField(
        max_length=50,
        default='summary_large_image',
        choices=[
            ('summary', 'Summary'),
            ('summary_large_image', 'Summary Large Image'),
        ],
        help_text="Twitter card type"
    )
    twitter_title = models.CharField(
        max_length=70,
        blank=True,
        help_text="Twitter title (defaults to og_title or title)"
    )
    twitter_description = models.TextField(
        max_length=200,
        blank=True,
        help_text="Twitter description (defaults to og_description)"
    )
    twitter_image = models.ImageField(
        upload_to='seo/local-pages/twitter/',
        blank=True,
        null=True,
        validators=[image_validator],
        help_text="Twitter image (defaults to og_image)"
    )
    
    # Content sections
    h1_title = models.CharField(
        max_length=100,
        help_text="Main H1 heading on page"
    )
    hero_tagline = models.TextField(
        max_length=200,
        blank=True,
        help_text="Short tagline below H1"
    )
    intro_content = models.TextField(
        help_text="Opening paragraph with local hook"
    )
    main_content = models.TextField(
        help_text="Main body content (markdown supported)"
    )
    cta_content = models.TextField(
        blank=True,
        help_text="Call-to-action section"
    )
    
    # Dynamic content flags
    show_nearby_clubs = models.BooleanField(
        default=True,
        help_text="Show nearby clubs section"
    )
    show_nearby_events = models.BooleanField(
        default=True,
        help_text="Show upcoming events section"
    )
    show_platform_stats = models.BooleanField(
        default=True,
        help_text="Show aggregated platform statistics"
    )
    show_testimonials = models.BooleanField(
        default=True,
        help_text="Show testimonials section"
    )
    nearby_radius_km = models.PositiveIntegerField(
        default=50,
        help_text="Radius for nearby content in km"
    )
    
    # Canonical & indexing
    canonical_url = models.URLField(
        blank=True,
        help_text="Canonical URL if different from page URL"
    )
    noindex = models.BooleanField(
        default=False,
        help_text="Set noindex if page should not be indexed"
    )
    
    # FAQ Schema (for rich snippets in Google)
    faq_items = models.JSONField(
        default=list,
        blank=True,
        help_text="FAQ items: [{'question': '...', 'answer': '...'}, ...]"
    )
    
    # Content Metrics (auto-calculated on save)
    word_count = models.PositiveIntegerField(
        default=0,
        help_text="Total word count of content"
    )
    reading_time_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Estimated reading time in minutes"
    )
    
    # Publishing
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='DRAFT'
    )
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='published_local_pages'
    )
    
    # AI Generation tracking
    ai_generated_at = models.DateTimeField(null=True, blank=True)
    ai_model_used = models.CharField(max_length=50, blank=True)
    ai_persona_used = models.CharField(
        max_length=20, 
        blank=True,
        help_text="Which AI persona generated this"
    )
    generation_prompt_hash = models.CharField(
        max_length=64, 
        blank=True,
        help_text="Hash of generation prompt (for detecting changes)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Local Landing Page"
        verbose_name_plural = "Local Landing Pages"
        unique_together = ['location', 'page_type', 'target_audience']
    
    def save(self, *args, **kwargs):
        # Generate slug from keyword (SEO best practice) or fallback to location
        if not self.slug:
            if self.primary_keyword and self.primary_keyword.slug:
                # Use keyword slug for best SEO (e.g., "fritidsgard-stockholm")
                self.slug = self.primary_keyword.slug
            else:
                # Fallback: Generate from page type + location
                type_prefix = {
                    'EVENTS': 'evenemang',
                    'CLUBS': 'fritidsgard',
                    'GENERAL': 'ungdomsverksamhet',
                }.get(self.page_type, 'ungdom')
                self.slug = slugify(f"{type_prefix}-{self.location.name}")
        
        # Auto-set focus keyphrase from keyword
        if self.primary_keyword and not self.focus_keyphrase:
            self.focus_keyphrase = self.primary_keyword.keyword
        
        # Calculate content metrics
        all_content = f"{self.intro_content or ''} {self.main_content or ''} {self.cta_content or ''}"
        words = all_content.split()
        self.word_count = len(words)
        self.reading_time_minutes = max(1, self.word_count // 200)  # ~200 words per minute
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.h1_title} ({self.get_status_display()})"


# =============================================================================
# SEO ARTICLES
# =============================================================================

class SEOArticle(models.Model):
    """
    AI-assisted articles targeting specific keywords.
    More editorial control than landing pages - for informational content.
    """
    STATUS_CHOICES = [
        ('IDEA', 'Idea/Backlog'),
        ('OUTLINE', 'Outline Created'),
        ('DRAFTING', 'AI Drafting'),
        ('REVIEW', 'Ready for Review'),
        ('APPROVED', 'Approved'),
        ('PUBLISHED', 'Published'),
        ('ARCHIVED', 'Archived'),
    ]
    
    # Targeting
    target_keyword = models.ForeignKey(
        Keyword, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='articles'
    )
    secondary_keywords = models.ManyToManyField(
        Keyword, 
        blank=True, 
        related_name='secondary_articles'
    )
    target_audience = models.CharField(
        max_length=20, 
        choices=Keyword.AUDIENCE_CHOICES,
        default='GENERAL'
    )
    
    # URL
    slug = models.SlugField(max_length=200, unique=True)
    
    # SEO Meta
    title = models.CharField(
        max_length=70,
        help_text="Article title (max 70 chars for SERP)"
    )
    meta_description = models.TextField(
        max_length=160,
        blank=True,
        default='',
        help_text="Meta description (max 160 chars)"
    )
    
    # Open Graph
    og_title = models.CharField(max_length=100, blank=True)
    og_description = models.TextField(max_length=200, blank=True)
    
    # Content
    h1_title = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="H1 title (can differ from SEO title)"
    )
    excerpt = models.TextField(
        max_length=300,
        blank=True,
        default='',
        help_text="Short excerpt for previews"
    )
    content = models.TextField(
        blank=True,
        default='',
        help_text="Full article content (markdown supported)"
    )
    
    # Outline for AI generation
    outline = models.JSONField(
        default=list,
        blank=True,
        help_text="Article outline for AI generation"
    )
    
    # Media
    featured_image = models.ImageField(
        upload_to='seo/articles/', 
        blank=True, 
        null=True,
        validators=[image_validator]
    )
    featured_image_alt = models.CharField(
        max_length=200, 
        blank=True,
        help_text="Alt text for featured image"
    )
    
    # Internal linking
    related_articles = models.ManyToManyField(
        'self', 
        blank=True, 
        symmetrical=False,
        related_name='linked_from'
    )
    related_local_pages = models.ManyToManyField(
        LocalLandingPage,
        blank=True,
        related_name='linked_articles'
    )
    
    # Schema
    schema_type = models.CharField(
        max_length=50, 
        default='Article',
        help_text="Schema.org type (Article, HowTo, FAQ, etc.)"
    )
    
    # Publishing
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='IDEA'
    )
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='published_articles'
    )
    
    # Author display (for front-end)
    author_name = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Display author name"
    )
    author_title = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Author title/role"
    )
    
    # AI tracking
    ai_draft = models.TextField(
        blank=True,
        help_text="Original AI draft before human editing"
    )
    ai_model_used = models.CharField(max_length=50, blank=True)
    ai_persona_used = models.CharField(max_length=20, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-published_at', '-created_at']
        verbose_name = "SEO Article"
        verbose_name_plural = "SEO Articles"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


# =============================================================================
# INTERNAL LINKING
# =============================================================================

class InternalLink(models.Model):
    """
    Tracks internal linking strategy between pages.
    Can be auto-generated by AI or manually created.
    """
    LINK_TYPE_CHOICES = [
        ('CONTEXTUAL', 'Contextual (in content)'),
        ('RELATED', 'Related content section'),
        ('NAVIGATION', 'Navigation/menu'),
        ('FOOTER', 'Footer links'),
        ('BREADCRUMB', 'Breadcrumb'),
    ]
    
    # Source (where the link appears)
    source_url = models.CharField(
        max_length=500,
        db_index=True,
        help_text="URL path where link appears"
    )
    source_page_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Type of source page (article, local_page, etc.)"
    )
    
    # Target (where link points to)
    target_url = models.CharField(
        max_length=500,
        db_index=True,
        help_text="URL path link points to"
    )
    target_page_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Type of target page"
    )
    
    # Link details
    anchor_text = models.CharField(
        max_length=200,
        help_text="The clickable text"
    )
    link_type = models.CharField(
        max_length=20,
        choices=LINK_TYPE_CHOICES,
        default='CONTEXTUAL'
    )
    
    # Importance
    link_strength = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Importance 1-10 (higher = more important)"
    )
    
    # Context
    is_auto_generated = models.BooleanField(
        default=True,
        help_text="Was this link auto-generated by the system?"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Is this link currently active?"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-link_strength', '-created_at']
        verbose_name = "Internal Link"
        verbose_name_plural = "Internal Links"
        unique_together = ['source_url', 'target_url', 'anchor_text']
        indexes = [
            models.Index(fields=['source_url']),
            models.Index(fields=['target_url']),
        ]
    
    def __str__(self):
        return f"{self.anchor_text}: {self.source_url} → {self.target_url}"


# =============================================================================
# SEO CAMPAIGN (for tracking initiatives)
# =============================================================================

class SEOCampaign(models.Model):
    """
    Groups related keywords and content for tracking SEO initiatives.
    E.g., "Local SEO Push Q1 2026" or "Guardian Content Series"
    """
    STATUS_CHOICES = [
        ('PLANNING', 'Planning'),
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('COMPLETED', 'Completed'),
    ]
    
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    
    # Targeting
    target_audience = models.CharField(
        max_length=20, 
        choices=Keyword.AUDIENCE_CHOICES,
        default='GENERAL'
    )
    
    # Related content
    keywords = models.ManyToManyField(
        Keyword, 
        blank=True, 
        related_name='campaigns'
    )
    local_pages = models.ManyToManyField(
        LocalLandingPage, 
        blank=True, 
        related_name='campaigns'
    )
    articles = models.ManyToManyField(
        SEOArticle, 
        blank=True, 
        related_name='campaigns'
    )
    
    # Status & timing
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='PLANNING'
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Goals
    target_traffic_increase = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Target % traffic increase"
    )
    target_keywords_ranked = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Target number of keywords in top 10"
    )
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "SEO Campaign"
        verbose_name_plural = "SEO Campaigns"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
