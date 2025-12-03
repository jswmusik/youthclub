from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from organization.models import Municipality, Club
from groups.models import Group
from rewards.models import Reward

# Allowed image types for questions
image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

class Questionnaire(models.Model):
    class AdminLevel(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        MUNICIPALITY_ADMIN = 'MUNICIPALITY_ADMIN', 'Municipality Admin'
        CLUB_ADMIN = 'CLUB_ADMIN', 'Club Admin'

    class TargetAudience(models.TextChoices):
        YOUTH = 'YOUTH', 'Youth Members'
        GUARDIAN = 'GUARDIAN', 'Guardians'
        BOTH = 'BOTH', 'Both (via Groups)'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        ARCHIVED = 'ARCHIVED', 'Archived'

    # --- Basic Info ---
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # --- Scope & Ownership ---
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_questionnaires')
    admin_level = models.CharField(max_length=50, choices=AdminLevel.choices)
    
    # Context (Where does this belong?)
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, null=True, blank=True, related_name='questionnaires')
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, related_name='questionnaires')
    
    # --- Targeting ---
    # If a group is selected, it overrides target_audience logic
    visibility_group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='questionnaires')
    target_audience = models.CharField(max_length=20, choices=TargetAudience.choices, default=TargetAudience.YOUTH)
    
    # --- Configuration ---
    is_anonymous = models.BooleanField(default=False, help_text="If True, admins cannot see who gave which answer.")
    start_date = models.DateTimeField(null=True, blank=True, help_text="When the survey becomes available. Auto-set to now when published.")
    scheduled_publish_date = models.DateTimeField(null=True, blank=True, help_text="Optional: Schedule when to publish this questionnaire. If set, status will change to PUBLISHED automatically at this time.")
    expiration_date = models.DateTimeField(help_text="When the survey closes.")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # --- Rewards / Benefits ---
    rewards = models.ManyToManyField(Reward, blank=True, related_name='questionnaires', help_text="Rewards granted upon completion.")
    benefit_limit = models.IntegerField(null=True, blank=True, help_text="Max number of users who can claim the reward (e.g. First 10).")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class Question(models.Model):
    class QuestionType(models.TextChoices):
        FREE_TEXT = 'FREE_TEXT', 'Free Text'
        RATING = 'RATING', 'Star Rating (1-5)'
        SINGLE_CHOICE = 'SINGLE_CHOICE', 'Single Choice'
        MULTI_CHOICE = 'MULTI_CHOICE', 'Multiple Choice'

    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='questions')
    
    text = models.TextField()
    description = models.TextField(blank=True, help_text="Optional helper text for the user.")
    image = models.FileField(upload_to='questions/images/', blank=True, null=True, validators=[image_validator])
    
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.FREE_TEXT)
    order = models.IntegerField(default=0, help_text="Display order")

    # --- Logic / Branching ---
    # "Show this question ONLY IF parent_question was answered with trigger_option"
    parent_question = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='child_questions')
    trigger_option = models.ForeignKey('QuestionOption', on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_questions')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.order}. {self.text[:50]}"


class QuestionOption(models.Model):
    """
    Options for Single/Multi choice questions.
    """
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=255)
    value = models.CharField(max_length=255, help_text="Value stored in DB for analytics", blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text
        
    def save(self, *args, **kwargs):
        if not self.value:
            self.value = self.text
        super().save(*args, **kwargs)


class QuestionnaireResponse(models.Model):
    """
    Represents a user's session of taking a questionnaire.
    """
    class Status(models.TextChoices):
        STARTED = 'STARTED', 'Started'
        COMPLETED = 'COMPLETED', 'Completed'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='questionnaire_responses')
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='responses')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.STARTED)
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Benefit tracking
    is_benefit_claimed = models.BooleanField(default=False, help_text="True if the user successfully claimed the attached reward.")
    
    # Reminder tracking
    last_reminded_at = models.DateTimeField(null=True, blank=True, help_text="When the last reminder notification was sent.")

    class Meta:
        unique_together = ('user', 'questionnaire') # A user can only answer once per questionnaire

    def __str__(self):
        return f"{self.user} - {self.questionnaire.title}"


class Answer(models.Model):
    """
    Individual answers within a response.
    """
    response = models.ForeignKey(QuestionnaireResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    
    # 1. Free Text Answer
    text_answer = models.TextField(blank=True, null=True)
    
    # 2. Rating Answer (Integer)
    rating_answer = models.IntegerField(
        blank=True, null=True, 
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    # 3. Choice Answers (Single or Multi)
    selected_options = models.ManyToManyField(QuestionOption, blank=True, related_name='selected_in_answers')

    def __str__(self):
        return f"Answer to {self.question.id} by {self.response.user.id}"