from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator
from organization.models import Municipality, Club, Interest
from datetime import date

# Define allowed file types for user avatars
user_avatar_validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'svg', 'gif'])

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
    notification_email_enabled = models.BooleanField(default=True)
    
    # --- Verification Field ---
    verification_status = models.CharField(
        max_length=20, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.UNVERIFIED,
        help_text="Status of identity verification"
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
    preferred_gender = models.CharField(max_length=50, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

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