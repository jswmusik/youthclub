# backend/posts/models.py

from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from organization.models import Municipality, Club, Interest
from groups.models import Group

# Validator for post images
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'webp'])

class Post(models.Model):
    # --- Enums ---
    class PostType(models.TextChoices):
        TEXT = 'TEXT', 'Text Post'
        IMAGE = 'IMAGE', 'Image Post'
        VIDEO = 'VIDEO', 'Video Post'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        PUBLISHED = 'PUBLISHED', 'Published'
        ARCHIVED = 'ARCHIVED', 'Archived/Expired'

    class OwnerRole(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        MUNICIPALITY_ADMIN = 'MUNICIPALITY_ADMIN', 'Municipality Admin'
        CLUB_ADMIN = 'CLUB_ADMIN', 'Club Admin'

    class TargetMemberType(models.TextChoices):
        YOUTH = 'YOUTH', 'Youth Only'
        GUARDIAN = 'GUARDIAN', 'Guardians Only'
        BOTH = 'BOTH', 'Both Youth and Guardians'

    # --- Basic Info (Section 3) ---
    title = models.CharField(max_length=200)
    content = models.TextField(help_text="Rich text content")
    post_type = models.CharField(max_length=20, choices=PostType.choices, default=PostType.TEXT)
    
    # Video Link (Only used if post_type is VIDEO)
    video_url = models.URLField(blank=True, null=True, help_text="YouTube link")

    # --- Ownership & Scope (Section 2) ---
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='authored_posts')
    owner_role = models.CharField(max_length=50, choices=OwnerRole.choices)
    
    # These fields now represent OWNERSHIP context, not necessarily the only viewers
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, null=True, blank=True, related_name='owned_posts')
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='owned_posts')

    # --- NEW: DISTRIBUTION SCOPE (Who SEES it) ---
    is_global = models.BooleanField(default=False, help_text="Visible to everyone (Super Admin only)")
    
    # Granular targeting
    target_municipalities = models.ManyToManyField(Municipality, blank=True, related_name='targeted_posts')
    target_clubs = models.ManyToManyField(Club, blank=True, related_name='targeted_posts')

    # --- Publishing & Visibility (Section 4, 5, 6, 8) ---
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    # Scheduling
    published_at = models.DateTimeField(null=True, blank=True, help_text="When the post goes live")
    
    # Visibility Window
    visibility_start_date = models.DateTimeField(null=True, blank=True)
    visibility_end_date = models.DateTimeField(null=True, blank=True, help_text="Auto-hide after this date")
    
    # Pinned Logic
    is_pinned = models.BooleanField(default=False)
    pinned_until = models.DateTimeField(null=True, blank=True)

    # --- Targeting (Section 7) ---
    # 1. Broad Roles
    target_member_type = models.CharField(max_length=20, choices=TargetMemberType.choices, default=TargetMemberType.BOTH)

    # 2. Specific Groups (Overrides other targeting if set)
    target_groups = models.ManyToManyField(Group, blank=True, related_name='targeted_posts')
    
    # 3. Attribute Targeting
    target_interests = models.ManyToManyField(Interest, blank=True, related_name='targeted_posts')
    target_genders = models.JSONField(default=list, blank=True, help_text='List of genders e.g. ["MALE", "FEMALE"]')
    target_grades = models.JSONField(default=list, blank=True, help_text='List of grades e.g. [7, 8, 9]')
    
    target_min_age = models.IntegerField(null=True, blank=True)
    target_max_age = models.IntegerField(null=True, blank=True)
    
    # Custom Fields: {"field_id": "value"}
    target_custom_fields = models.JSONField(default=dict, blank=True)

    # --- Comment Settings (Section 9) ---
    allow_comments = models.BooleanField(default=True)
    require_moderation = models.BooleanField(default=False, help_text="If true, comments must be approved")
    limit_comments_per_user = models.IntegerField(default=0, help_text="0 = Unlimited")
    allow_replies = models.BooleanField(default=True)
    
    # --- Push Notification Config (Section 10) ---
    send_push_notification = models.BooleanField(default=False)
    push_title = models.CharField(max_length=200, blank=True)
    push_message = models.CharField(max_length=200, blank=True)

    # --- Metrics ---
    view_count = models.IntegerField(default=0)
    
    # Template reference (optional - tracks which template was used to create this post)
    created_from_template = models.ForeignKey(
        'PostTemplate', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='posts_created',
        help_text="The template used to create this post (if any)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-published_at', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class PostImage(models.Model):
    """
    Allows multiple images per post (Section 3.B).
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='images')
    image = models.FileField(upload_to='posts/images/', validators=[image_validator])
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']


class PostComment(models.Model):
    """
    Comment system (Section 9).
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_comments')
    content = models.TextField(max_length=1000)
    
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    is_approved = models.BooleanField(default=True) # Defaults to true unless moderation is on
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment by {self.author} on {self.post}"


class PostReaction(models.Model):
    """
    Stores user reactions to posts.
    """
    class ReactionType(models.TextChoices):
        LIKE = 'LIKE', 'Like'
        LOVE = 'LOVE', 'Love'
        LAUGH = 'LAUGH', 'Laugh'
        WOW = 'WOW', 'Wow'
        SAD = 'SAD', 'Sad'
        ANGRY = 'ANGRY', 'Angry'
    
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_reactions')
    reaction_type = models.CharField(max_length=10, choices=ReactionType.choices, default=ReactionType.LIKE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user', 'reaction_type') # One reaction type per user per post

    def __str__(self):
        return f"{self.user} {self.get_reaction_type_display()} {self.post}"


class PostTemplate(models.Model):
    """
    Reusable templates for quick post creation.
    Stores all targeting and settings configurations.
    """
    class RoleScope(models.TextChoices):
        SUPER = 'SUPER', 'Super Admin'
        MUNICIPALITY = 'MUNICIPALITY', 'Municipality Admin'
        CLUB = 'CLUB', 'Club Admin'

    class TemplateIcon(models.TextChoices):
        MEGAPHONE = 'MEGAPHONE', '📢 Announcement'
        CALENDAR = 'CALENDAR', '📅 Event'
        STAR = 'STAR', '⭐ Featured'
        BELL = 'BELL', '🔔 Reminder'
        PARTY = 'PARTY', '🎉 Celebration'
        INFO = 'INFO', 'ℹ️ Information'
        WARNING = 'WARNING', '⚠️ Important'
        HEART = 'HEART', '❤️ Community'
        TROPHY = 'TROPHY', '🏆 Achievement'
        ROCKET = 'ROCKET', '🚀 Update'

    # Basic Info
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, help_text="Brief summary of what this template is for")
    icon = models.CharField(max_length=20, choices=TemplateIcon.choices, default=TemplateIcon.MEGAPHONE)
    
    # Creator & Scope
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_templates')
    role_scope = models.CharField(max_length=20, choices=RoleScope.choices)
    
    # Ownership context (for municipality/club admins)
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, null=True, blank=True, related_name='post_templates')
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='post_templates')
    
    # Distribution (pre-configured)
    is_global = models.BooleanField(default=False, help_text="Visible to everyone (Super Admin only)")
    target_municipalities = models.ManyToManyField(Municipality, blank=True, related_name='template_targets')
    target_clubs = models.ManyToManyField(Club, blank=True, related_name='template_targets')
    
    # Default Media Type
    default_post_type = models.CharField(max_length=20, choices=Post.PostType.choices, default=Post.PostType.TEXT)
    
    # Targeting (pre-configured)
    target_member_type = models.CharField(max_length=20, choices=Post.TargetMemberType.choices, default=Post.TargetMemberType.BOTH)
    target_groups = models.ManyToManyField(Group, blank=True, related_name='post_templates')
    target_min_age = models.IntegerField(null=True, blank=True)
    target_max_age = models.IntegerField(null=True, blank=True)
    target_grades = models.JSONField(default=list, blank=True)
    target_genders = models.JSONField(default=list, blank=True)
    target_interests = models.ManyToManyField(Interest, blank=True, related_name='post_templates')
    target_custom_fields = models.JSONField(default=dict, blank=True)
    
    # Settings (pre-configured)
    allow_comments = models.BooleanField(default=True)
    require_moderation = models.BooleanField(default=False)
    allow_replies = models.BooleanField(default=True)
    limit_comments_per_user = models.IntegerField(default=0)
    send_push_notification = models.BooleanField(default=False)
    default_push_title = models.CharField(max_length=200, blank=True)
    default_push_message = models.CharField(max_length=500, blank=True, help_text="Default push notification body text")
    
    # Pinned default
    is_pinned_default = models.BooleanField(default=False)
    
    # Metadata
    usage_count = models.IntegerField(default=0, help_text="Number of posts created using this template")
    is_active = models.BooleanField(default=True, help_text="Inactive templates are hidden from selection")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-usage_count', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_role_scope_display()})"
    
    def get_target_summary(self):
        """Generate a human-readable summary of the targeting configuration."""
        parts = []
        
        # Distribution
        if self.is_global:
            parts.append("Global (all users)")
        elif self.target_municipalities.exists():
            count = self.target_municipalities.count()
            parts.append(f"{count} municipalit{'ies' if count > 1 else 'y'}")
        elif self.target_clubs.exists():
            count = self.target_clubs.count()
            parts.append(f"{count} club{'s' if count > 1 else ''}")
        
        # Member type
        if self.target_member_type == 'YOUTH':
            parts.append("Youth only")
        elif self.target_member_type == 'GUARDIAN':
            parts.append("Guardians only")
        
        # Age range
        if self.target_min_age or self.target_max_age:
            if self.target_min_age and self.target_max_age:
                parts.append(f"Ages {self.target_min_age}-{self.target_max_age}")
            elif self.target_min_age:
                parts.append(f"Ages {self.target_min_age}+")
            else:
                parts.append(f"Ages up to {self.target_max_age}")
        
        # Grades
        if self.target_grades:
            grades = self.target_grades
            if len(grades) > 3:
                parts.append(f"Grades {min(grades)}-{max(grades)}")
            else:
                parts.append(f"Grade{'s' if len(grades) > 1 else ''} {', '.join(map(str, grades))}")
        
        # Groups
        if self.target_groups.exists():
            count = self.target_groups.count()
            parts.append(f"{count} group{'s' if count > 1 else ''}")
        
        return ", ".join(parts) if parts else "All members"
    
    def get_settings_summary(self):
        """Generate a human-readable summary of the settings configuration."""
        parts = []
        
        if self.allow_comments:
            parts.append("Comments on")
            if self.require_moderation:
                parts.append("moderated")
        else:
            parts.append("Comments off")
        
        if self.send_push_notification:
            parts.append("Push enabled")
        
        if self.is_pinned_default:
            parts.append("Pinned")
        
        return ", ".join(parts) if parts else "Default settings"
    
    def increment_usage(self):
        """Increment the usage counter when a post is created from this template."""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])