from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils.text import slugify

# Reusing the validator logic you use elsewhere, but adding document types
# Allowed: Images, PDF, Word, Excel
learning_file_validator = FileExtensionValidator(
    allowed_extensions=['jpg', 'jpeg', 'png', 'svg', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
)

class LearningCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    
    class Meta:
        verbose_name_plural = "Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Course(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        PUBLISHED = 'PUBLISHED', 'Published'

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField()
    
    cover_image = models.FileField(
        upload_to='courses/covers/',
        validators=[learning_file_validator],
        blank=True, null=True
    )
    
    # Organization & SEO
    category = models.ForeignKey(LearningCategory, on_delete=models.SET_NULL, null=True, related_name='courses')
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    
    # Access Control (JSON List of Roles, e.g. ["MUNICIPALITY_ADMIN", "CLUB_ADMIN"])
    visible_to_roles = models.JSONField(default=list, help_text="List of user roles allowed to view this course")
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class CourseChapter(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class ContentItem(models.Model):
    class ContentType(models.TextChoices):
        VIDEO = 'VIDEO', 'Video'
        TEXT = 'TEXT', 'Text Article'
        FILE = 'FILE', 'Downloadable File'

    chapter = models.ForeignKey(CourseChapter, on_delete=models.CASCADE, related_name='items')
    type = models.CharField(max_length=10, choices=ContentType.choices)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    
    # Duration in minutes (manual entry to help users plan time)
    estimated_duration = models.PositiveIntegerField(default=5, help_text="Estimated time in minutes")

    # Content Fields
    video_url = models.URLField(blank=True, null=True, help_text="YouTube URL")
    text_content = models.TextField(blank=True, null=True, help_text="Rich HTML content")
    file_upload = models.FileField(
        upload_to='courses/resources/',
        validators=[learning_file_validator],
        blank=True, null=True
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"

# --- USER PROGRESS & INTERACTION ---

class UserCourseProgress(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Not Started'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='user_progress')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    percent_completed = models.PositiveIntegerField(default=0)
    last_accessed_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'course')

    def __str__(self):
        return f"{self.user.email} - {self.course.title} ({self.percent_completed}%)"

class UserItemProgress(models.Model):
    """Tracks completion of individual items (videos/articles)"""
    user_progress = models.ForeignKey(UserCourseProgress, on_delete=models.CASCADE, related_name='item_progress')
    content_item = models.ForeignKey(ContentItem, on_delete=models.CASCADE)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user_progress', 'content_item')

class CourseRating(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_ratings')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='ratings')
    score = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now=True)