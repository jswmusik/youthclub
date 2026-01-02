"""
Two-Factor Authentication (2FA) Models

Implements Email OTP-based 2FA with the following rules:
- Super Admins & Municipality Admins: Mandatory 2FA always
- Club Admins: Mandatory 2FA on first login, then every 30 days
- Guardians: Optional (opt-in), with "remember for 30 days" option
- Youth Members: No 2FA

All roles except Youth Members can use "remember this device for 30 days".
"""

import secrets
import hashlib
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class UserTwoFactorSettings(models.Model):
    """
    Stores 2FA settings and status for each user.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='two_factor_settings',
        verbose_name=_("User")
    )
    
    # Whether 2FA is enabled (relevant for Guardians who opt-in)
    is_enabled = models.BooleanField(
        default=False,
        verbose_name=_("2FA Enabled"),
        help_text=_("For Guardians: whether they've opted into 2FA")
    )
    
    # Track when 2FA was first completed (for Club Admins' 30-day cycle)
    first_2fa_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("First 2FA Completed"),
        help_text=_("When the user first completed 2FA verification")
    )
    
    # Track the last successful 2FA verification
    last_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Last 2FA Verification"),
        help_text=_("When the user last successfully verified 2FA")
    )
    
    # Count failed attempts (for rate limiting)
    failed_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Failed Attempts"),
        help_text=_("Number of consecutive failed OTP attempts")
    )
    
    # Lockout until (after too many failed attempts)
    locked_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Locked Until"),
        help_text=_("Account 2FA is locked until this time due to too many failed attempts")
    )
    
    # Admin bypass - allows skipping 2FA until this date (set by superadmin)
    bypass_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Bypass Until"),
        help_text=_("Admin-set bypass to skip 2FA until this date")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("User 2FA Settings")
        verbose_name_plural = _("User 2FA Settings")

    def __str__(self):
        return f"2FA Settings for {self.user.email}"
    
    def is_locked(self):
        """Check if the account is currently locked due to failed attempts."""
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False
    
    def record_failed_attempt(self):
        """Record a failed OTP attempt and potentially lock the account."""
        self.failed_attempts += 1
        # Lock after 5 failed attempts for 15 minutes
        if self.failed_attempts >= 5:
            self.locked_until = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=['failed_attempts', 'locked_until'])
    
    def reset_failed_attempts(self):
        """Reset failed attempts after successful verification."""
        self.failed_attempts = 0
        self.locked_until = None
        self.last_verified_at = timezone.now()
        self.save(update_fields=['failed_attempts', 'locked_until', 'last_verified_at'])
    
    @classmethod
    def get_or_create_for_user(cls, user):
        """Get or create 2FA settings for a user."""
        settings, created = cls.objects.get_or_create(user=user)
        return settings


class OTPCode(models.Model):
    """
    Stores temporary OTP codes sent to users for 2FA verification.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='otp_codes',
        verbose_name=_("User")
    )
    
    # The OTP code (stored hashed for security)
    code_hash = models.CharField(
        max_length=64,
        verbose_name=_("Code Hash"),
        help_text=_("SHA-256 hash of the OTP code")
    )
    
    # When the code expires
    expires_at = models.DateTimeField(
        verbose_name=_("Expires At")
    )
    
    # Track if the code has been used
    is_used = models.BooleanField(
        default=False,
        verbose_name=_("Is Used")
    )
    
    # What triggered this OTP (login, settings change, etc.)
    purpose = models.CharField(
        max_length=50,
        default='login',
        verbose_name=_("Purpose"),
        help_text=_("Why this OTP was generated")
    )
    
    # IP address that requested the OTP (for audit)
    requested_from_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("Requested From IP")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("OTP Code")
        verbose_name_plural = _("OTP Codes")
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.user.email} ({self.purpose})"
    
    @staticmethod
    def generate_code(length=6):
        """Generate a random numeric OTP code."""
        return ''.join([str(secrets.randbelow(10)) for _ in range(length)])
    
    @staticmethod
    def hash_code(code):
        """Hash an OTP code using SHA-256."""
        return hashlib.sha256(code.encode()).hexdigest()
    
    def is_valid(self):
        """Check if the OTP is still valid (not expired and not used)."""
        return not self.is_used and timezone.now() < self.expires_at
    
    def verify(self, code):
        """Verify an OTP code against this record."""
        if not self.is_valid():
            return False
        if self.hash_code(code) == self.code_hash:
            self.is_used = True
            self.save(update_fields=['is_used'])
            return True
        return False
    
    @classmethod
    def create_for_user(cls, user, purpose='login', ip_address=None, validity_minutes=10):
        """
        Create a new OTP code for a user.
        Invalidates any existing unused codes for the same purpose.
        """
        # Invalidate existing unused codes for this purpose
        cls.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False
        ).update(is_used=True)
        
        # Generate new code
        code = cls.generate_code()
        otp = cls.objects.create(
            user=user,
            code_hash=cls.hash_code(code),
            expires_at=timezone.now() + timedelta(minutes=validity_minutes),
            purpose=purpose,
            requested_from_ip=ip_address
        )
        
        # Return the plain code (will be sent via email) and the OTP object
        return code, otp


class TrustedDevice(models.Model):
    """
    Stores trusted devices that can skip 2FA for 30 days.
    Uses a secure token stored in a cookie.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trusted_devices',
        verbose_name=_("User")
    )
    
    # Secure token hash (stored hashed, plain token sent to client)
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        verbose_name=_("Token Hash"),
        help_text=_("SHA-256 hash of the device trust token")
    )
    
    # Device identification
    device_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Device Name"),
        help_text=_("User agent or friendly device name")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP Address"),
        help_text=_("IP address when device was trusted")
    )
    
    # When the trust expires
    expires_at = models.DateTimeField(
        verbose_name=_("Expires At")
    )
    
    # Track last use
    last_used_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Last Used At")
    )
    
    # Whether the device is still trusted
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Is Active")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Trusted Device")
        verbose_name_plural = _("Trusted Devices")
        ordering = ['-last_used_at']

    def __str__(self):
        return f"Trusted device for {self.user.email}: {self.device_name[:30]}..."
    
    @staticmethod
    def generate_token():
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token):
        """Hash a token using SHA-256."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def is_valid(self):
        """Check if the trusted device is still valid."""
        return self.is_active and timezone.now() < self.expires_at
    
    def revoke(self):
        """Revoke trust for this device."""
        self.is_active = False
        self.save(update_fields=['is_active'])
    
    @classmethod
    def create_for_user(cls, user, device_name='', ip_address=None, trust_days=30):
        """
        Create a new trusted device entry.
        Returns the plain token (to be stored in client cookie) and the TrustedDevice object.
        """
        token = cls.generate_token()
        device = cls.objects.create(
            user=user,
            token_hash=cls.hash_token(token),
            device_name=device_name[:200],
            ip_address=ip_address,
            expires_at=timezone.now() + timedelta(days=trust_days)
        )
        return token, device
    
    @classmethod
    def verify_token(cls, user, token):
        """
        Verify a trusted device token.
        Returns the TrustedDevice if valid, None otherwise.
        """
        token_hash = cls.hash_token(token)
        try:
            device = cls.objects.get(
                user=user,
                token_hash=token_hash,
                is_active=True
            )
            if device.is_valid():
                device.save()  # Update last_used_at
                return device
            return None
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired trusted devices (for maintenance)."""
        return cls.objects.filter(expires_at__lt=timezone.now()).delete()

