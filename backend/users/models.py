from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator
from organization.models import Municipality, Club, Interest
from datetime import date

# Define allowed file types for user avatars
user_avatar_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'svg', 'gif'])

# Define allowed file types for background images
background_image_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])

# Define allowed file types for ID documents
id_document_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'pdf'])

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPER_ADMIN')
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        MUNICIPALITY_ADMIN = 'MUNICIPALITY_ADMIN', 'Municipality Admin'
        CLUB_ADMIN = 'CLUB_ADMIN', 'Club Admin'
        YOUTH_MEMBER = 'YOUTH_MEMBER', 'Youth Member'
        GUARDIAN = 'GUARDIAN', 'Guardian'
        
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    # New Verification Status Enum
    class VerificationStatus(models.TextChoices):
        UNVERIFIED = 'UNVERIFIED', 'Unverified'
        PENDING = 'PENDING', 'Pending'
        VERIFIED = 'VERIFIED', 'Verified'

    # ID Document Type Enum
    class IdDocumentType(models.TextChoices):
        PASSPORT = 'PASSPORT', 'Passport'
        ID_CARD = 'ID_CARD', 'ID Card'
        DRIVERS_LICENSE = 'DRIVERS_LICENSE', 'Driver\'s License'
        OTHER = 'OTHER', 'Other'

    # ID Document Review Status Enum
    class IdDocumentReviewStatus(models.TextChoices):
        NOT_SUBMITTED = 'NOT_SUBMITTED', 'Not Submitted'
        PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    username = None
    email = models.EmailField(_('email address'), unique=True)

    # --- Base Profile Fields ---
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.YOUTH_MEMBER)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='sv')
    avatar = models.FileField(
        upload_to='users/avatars/',
        blank=True,
        null=True,
        validators=[user_avatar_validator]
    )
    
    # --- NEW FIELDS START ---
    background_image = models.FileField(
        upload_to='users/backgrounds/',
        blank=True,
        null=True,
        validators=[background_image_validator],
        help_text="Profile header background image"
    )
    
    mood_status = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Short status message, e.g. 'Playing FIFA' or 'Studying'"
    )
    # --- NEW FIELDS END ---
    
    notification_email_enabled = models.BooleanField(default=True)
    
    # --- Verification Field ---
    verification_status = models.CharField(
        max_length=20, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.UNVERIFIED,
        help_text="Status of identity verification"
    )

    # --- ID Document Verification Fields (for Guardians) ---
    id_document = models.FileField(
        upload_to='users/id_documents/',
        blank=True,
        null=True,
        validators=[id_document_validator],
        help_text="Scanned ID document (passport, ID card, driver's license)"
    )
    id_document_type = models.CharField(
        max_length=20,
        choices=IdDocumentType.choices,
        blank=True,
        help_text="Type of ID document uploaded"
    )
    id_document_uploaded_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When the ID document was uploaded"
    )
    id_document_review_status = models.CharField(
        max_length=20,
        choices=IdDocumentReviewStatus.choices,
        default=IdDocumentReviewStatus.NOT_SUBMITTED,
        help_text="Review status of the uploaded ID document"
    )
    id_document_reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When the ID document was reviewed"
    )
    id_document_reviewed_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_documents',
        help_text="Admin who reviewed the ID document"
    )
    id_document_rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejecting the ID document (if rejected)"
    )
    
    # Shared Fields
    nickname = models.CharField(max_length=50, blank=True)
    legal_gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)

    # Admin Assignments
    assigned_municipality = models.ForeignKey(
        Municipality, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='admins'
    )
    assigned_club = models.ForeignKey(
        Club, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='admins'
    )
    profession = models.CharField(max_length=100, blank=True)
    hide_contact_info = models.BooleanField(default=False)

    # Youth Fields
    grade = models.IntegerField(blank=True, null=True)
    interests = models.ManyToManyField(Interest, blank=True, related_name='users')
    preferred_club = models.ForeignKey(
        Club, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='members'
    )
    
    # --- NEW FIELD ---
    followed_clubs = models.ManyToManyField(
        Club, 
        blank=True, 
        related_name='followers',
        help_text="Clubs the youth follows in addition to their preferred club."
    )
    # -----------------
    
    preferred_gender = models.CharField(max_length=50, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    
    # --- DATA RETENTION / ACTIVITY TRACKING ---
    last_active_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Last meaningful activity (login, check-in, etc.). Used for data retention."
    )
    deletion_warning_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the first deletion warning was sent"
    )
    deletion_final_warning_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the final deletion warning was sent"
    )

    objects = CustomUserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))


class GuardianYouthLink(models.Model):
    """
    Links a Guardian to a Youth Member.
    """
    RELATIONSHIP_CHOICES = [
        ('MOTHER', 'Mother'),
        ('FATHER', 'Father'),
        ('GUARDIAN', 'Legal Guardian'),
        ('SIBLING', 'Sibling'),
        ('OTHER', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('ACTIVE', 'Active'),
        ('REJECTED', 'Rejected'),
    ]

    guardian = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='youth_links',
        limit_choices_to={'role': User.Role.GUARDIAN}
    )
    
    youth = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='guardian_links',
        limit_choices_to={'role': User.Role.YOUTH_MEMBER}
    )
    
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    is_primary_guardian = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('guardian', 'youth')

    def __str__(self):
        return f"{self.guardian.first_name} -> {self.youth.first_name}"


class UserLoginHistory(models.Model):
    """
    Stores a simple audit trail of user logins.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} @ {self.timestamp}"


class IdDocumentUpload(models.Model):
    """
    Tracks history of ID document uploads for guardians.
    Allows max 3 pending requests at a time.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        DELETED = 'DELETED', 'Deleted by Admin'

    guardian = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='id_document_uploads',
        limit_choices_to={'role': User.Role.GUARDIAN}
    )
    document = models.FileField(
        upload_to='users/id_documents/',
        validators=[id_document_validator],
        help_text="Scanned ID document"
    )
    document_type = models.CharField(
        max_length=20,
        choices=User.IdDocumentType.choices,
        help_text="Type of ID document"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_id_uploads',
        help_text="Admin who reviewed this document"
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection (if rejected)"
    )
    admin_notes = models.TextField(
        blank=True,
        help_text="Internal notes for admins"
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.guardian.email} - {self.document_type} ({self.status})"

    @classmethod
    def get_pending_count(cls, guardian):
        """Returns the count of pending uploads for a guardian."""
        return cls.objects.filter(guardian=guardian, status=cls.Status.PENDING).count()

    @classmethod
    def can_upload(cls, guardian, max_pending=3):
        """Check if guardian can upload more documents (max 3 pending)."""
        return cls.get_pending_count(guardian) < max_pending


# --- PROXY MODELS ---

class YouthMember(User):
    class Meta:
        proxy = True
        verbose_name = "Youth Member"
        verbose_name_plural = "Youth Members"

class Guardian(User):
    class Meta:
        proxy = True
        verbose_name = "Guardian"
        verbose_name_plural = "Guardians"

class ClubAdmin(User):
    class Meta:
        proxy = True
        verbose_name = "Club Staff"
        verbose_name_plural = "Club Staff"

class MunicipalityAdmin(User):
    class Meta:
        proxy = True
        verbose_name = "Municipality Admin"
        verbose_name_plural = "Municipality Admins"