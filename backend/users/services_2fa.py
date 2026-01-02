"""
Two-Factor Authentication (2FA) Service

Handles the business logic for 2FA:
- Determining if 2FA is required for a user
- Sending OTP codes via email
- Verifying OTP codes
- Managing trusted devices
"""

import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from emails.services import EmailService
from emails.models import EmailTemplate

logger = logging.getLogger(__name__)


class TwoFactorService:
    """
    Service for handling 2FA operations.
    """
    
    # Role-based 2FA requirements
    MANDATORY_ALWAYS = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN']
    MANDATORY_FIRST_LOGIN = ['CLUB_ADMIN']
    OPTIONAL_ROLES = ['GUARDIAN']
    NO_2FA_ROLES = ['YOUTH_MEMBER']
    
    # Time constants
    CLUB_ADMIN_2FA_CYCLE_DAYS = 30  # Club admins need 2FA every 30 days
    TRUST_DEVICE_DAYS = 30  # "Remember me" duration
    
    @classmethod
    def requires_2fa(cls, user, trusted_device_token=None, ip_address=None):
        """
        Determine if a user requires 2FA verification for the current login.
        
        Returns:
            tuple: (requires_2fa: bool, reason: str)
        """
        from .models_2fa import UserTwoFactorSettings, TrustedDevice
        
        # Youth members never require 2FA
        if user.role in cls.NO_2FA_ROLES:
            return False, 'no_2fa_required'
        
        # Get or create 2FA settings
        settings_2fa = UserTwoFactorSettings.get_or_create_for_user(user)
        
        # Check for admin bypass (temporary bypass set by superadmin)
        if settings_2fa.bypass_until and timezone.now() < settings_2fa.bypass_until:
            return False, 'admin_bypass'
        
        # Check if there's a valid trusted device token
        if trusted_device_token:
            trusted_device = TrustedDevice.verify_token(user, trusted_device_token)
            if trusted_device:
                return False, 'trusted_device'
        
        # Super Admins and Municipality Admins: Always require 2FA
        if user.role in cls.MANDATORY_ALWAYS:
            return True, 'mandatory_role'
        
        # Club Admins: Required on first login and every 30 days
        if user.role in cls.MANDATORY_FIRST_LOGIN:
            # First login - no 2FA completed yet
            if not settings_2fa.first_2fa_completed_at:
                return True, 'first_login'
            
            # Check if 30 days have passed since last verification
            if settings_2fa.last_verified_at:
                days_since_last = (timezone.now() - settings_2fa.last_verified_at).days
                if days_since_last >= cls.CLUB_ADMIN_2FA_CYCLE_DAYS:
                    return True, '30_day_cycle'
            else:
                # Has completed first 2FA but never verified since (shouldn't happen)
                return True, 'verification_needed'
            
            return False, 'within_30_days'
        
        # Guardians: Optional (only if they've opted in)
        if user.role in cls.OPTIONAL_ROLES:
            if settings_2fa.is_enabled:
                return True, 'opted_in'
            return False, 'not_opted_in'
        
        # Default: No 2FA required
        return False, 'no_2fa_required'
    
    @classmethod
    def initiate_2fa(cls, user, ip_address=None, purpose='login'):
        """
        Initiate the 2FA process by generating and sending an OTP.
        
        Returns:
            dict: {'success': bool, 'message': str, 'expires_in_minutes': int}
        """
        from .models_2fa import UserTwoFactorSettings, OTPCode
        
        settings_2fa = UserTwoFactorSettings.get_or_create_for_user(user)
        
        # Check if account is locked
        if settings_2fa.is_locked():
            remaining_minutes = int((settings_2fa.locked_until - timezone.now()).total_seconds() / 60)
            return {
                'success': False,
                'message': f'Account locked. Try again in {remaining_minutes} minutes.',
                'locked_until': settings_2fa.locked_until.isoformat(),
                'error_code': 'account_locked'
            }
        
        # Generate OTP
        validity_minutes = 10
        code, otp = OTPCode.create_for_user(
            user=user,
            purpose=purpose,
            ip_address=ip_address,
            validity_minutes=validity_minutes
        )
        
        # Send OTP via email
        try:
            email_sent = EmailService.send(
                template_type=EmailTemplate.Type.TWO_FACTOR_OTP,
                recipient=user,
                context={
                    'otp_code': code,
                    'validity_minutes': validity_minutes,
                }
            )
            
            if not email_sent:
                logger.error(f"Failed to send 2FA OTP email to {user.email}")
                return {
                    'success': False,
                    'message': 'Failed to send verification code. Please try again.',
                    'error_code': 'email_failed'
                }
            
            logger.info(f"2FA OTP sent to {user.email} for {purpose}")
            return {
                'success': True,
                'message': 'Verification code sent to your email.',
                'expires_in_minutes': validity_minutes,
                'masked_email': cls._mask_email(user.email)
            }
            
        except Exception as e:
            logger.exception(f"Error sending 2FA OTP to {user.email}: {e}")
            return {
                'success': False,
                'message': 'Failed to send verification code. Please try again.',
                'error_code': 'email_error'
            }
    
    @classmethod
    def verify_otp(cls, user, code, trust_device=False, device_name='', ip_address=None):
        """
        Verify an OTP code for a user.
        
        Returns:
            dict: {
                'success': bool, 
                'message': str, 
                'trust_token': str (if trust_device=True and success=True)
            }
        """
        from .models_2fa import UserTwoFactorSettings, OTPCode, TrustedDevice
        
        settings_2fa = UserTwoFactorSettings.get_or_create_for_user(user)
        
        # Check if account is locked
        if settings_2fa.is_locked():
            remaining_minutes = int((settings_2fa.locked_until - timezone.now()).total_seconds() / 60)
            return {
                'success': False,
                'message': f'Account locked. Try again in {remaining_minutes} minutes.',
                'error_code': 'account_locked'
            }
        
        # Find the most recent valid OTP for this user
        recent_otp = OTPCode.objects.filter(
            user=user,
            is_used=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()
        
        if not recent_otp:
            return {
                'success': False,
                'message': 'No valid verification code found. Please request a new one.',
                'error_code': 'no_valid_otp'
            }
        
        # Verify the code
        if recent_otp.verify(code):
            # Success! Reset failed attempts
            settings_2fa.reset_failed_attempts()
            
            # Mark first 2FA completion for Club Admins
            if not settings_2fa.first_2fa_completed_at:
                settings_2fa.first_2fa_completed_at = timezone.now()
                settings_2fa.save(update_fields=['first_2fa_completed_at'])
            
            result = {
                'success': True,
                'message': 'Verification successful.'
            }
            
            # Create trusted device if requested (not for youth, though they don't have 2FA)
            if trust_device and user.role not in cls.NO_2FA_ROLES:
                token, device = TrustedDevice.create_for_user(
                    user=user,
                    device_name=device_name,
                    ip_address=ip_address,
                    trust_days=cls.TRUST_DEVICE_DAYS
                )
                result['trust_token'] = token
                result['trust_expires_at'] = device.expires_at.isoformat()
            
            logger.info(f"2FA verification successful for {user.email}")
            return result
        else:
            # Failed verification
            settings_2fa.record_failed_attempt()
            
            if settings_2fa.is_locked():
                return {
                    'success': False,
                    'message': 'Too many failed attempts. Account locked for 15 minutes.',
                    'error_code': 'account_locked'
                }
            
            remaining_attempts = 5 - settings_2fa.failed_attempts
            return {
                'success': False,
                'message': f'Invalid verification code. {remaining_attempts} attempts remaining.',
                'error_code': 'invalid_code',
                'remaining_attempts': remaining_attempts
            }
    
    @classmethod
    def enable_2fa_for_guardian(cls, user):
        """
        Enable 2FA for a guardian (opt-in).
        """
        from .models_2fa import UserTwoFactorSettings
        
        if user.role != 'GUARDIAN':
            return {
                'success': False,
                'message': '2FA opt-in is only available for guardians.'
            }
        
        settings_2fa = UserTwoFactorSettings.get_or_create_for_user(user)
        settings_2fa.is_enabled = True
        settings_2fa.save(update_fields=['is_enabled'])
        
        return {
            'success': True,
            'message': '2FA has been enabled for your account.'
        }
    
    @classmethod
    def disable_2fa_for_guardian(cls, user):
        """
        Disable 2FA for a guardian.
        """
        from .models_2fa import UserTwoFactorSettings, TrustedDevice
        
        if user.role != 'GUARDIAN':
            return {
                'success': False,
                'message': '2FA settings can only be changed for guardians.'
            }
        
        settings_2fa = UserTwoFactorSettings.get_or_create_for_user(user)
        settings_2fa.is_enabled = False
        settings_2fa.save(update_fields=['is_enabled'])
        
        # Revoke all trusted devices when disabling 2FA
        TrustedDevice.objects.filter(user=user).update(is_active=False)
        
        return {
            'success': True,
            'message': '2FA has been disabled for your account.'
        }
    
    @classmethod
    def get_user_2fa_status(cls, user):
        """
        Get the 2FA status and settings for a user.
        """
        from .models_2fa import UserTwoFactorSettings, TrustedDevice
        
        settings_2fa = UserTwoFactorSettings.get_or_create_for_user(user)
        
        # Determine if 2FA is mandatory for this user's role
        if user.role in cls.MANDATORY_ALWAYS:
            requirement = 'mandatory_always'
        elif user.role in cls.MANDATORY_FIRST_LOGIN:
            requirement = 'mandatory_periodic'
        elif user.role in cls.OPTIONAL_ROLES:
            requirement = 'optional'
        else:
            requirement = 'not_available'
        
        # Get trusted devices count
        trusted_devices_count = TrustedDevice.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        ).count()
        
        return {
            'is_enabled': settings_2fa.is_enabled,
            'requirement': requirement,
            'can_toggle': user.role in cls.OPTIONAL_ROLES,
            'last_verified_at': settings_2fa.last_verified_at.isoformat() if settings_2fa.last_verified_at else None,
            'trusted_devices_count': trusted_devices_count,
            'is_locked': settings_2fa.is_locked(),
            'failed_attempts': settings_2fa.failed_attempts
        }
    
    @classmethod
    def get_trusted_devices(cls, user):
        """
        Get all active trusted devices for a user.
        """
        from .models_2fa import TrustedDevice
        
        devices = TrustedDevice.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        )
        
        return [{
            'id': device.id,
            'device_name': device.device_name,
            'ip_address': device.ip_address,
            'created_at': device.created_at.isoformat(),
            'last_used_at': device.last_used_at.isoformat(),
            'expires_at': device.expires_at.isoformat()
        } for device in devices]
    
    @classmethod
    def revoke_trusted_device(cls, user, device_id):
        """
        Revoke a specific trusted device.
        """
        from .models_2fa import TrustedDevice
        
        try:
            device = TrustedDevice.objects.get(id=device_id, user=user)
            device.revoke()
            return {
                'success': True,
                'message': 'Device trust has been revoked.'
            }
        except TrustedDevice.DoesNotExist:
            return {
                'success': False,
                'message': 'Device not found.'
            }
    
    @classmethod
    def revoke_all_trusted_devices(cls, user):
        """
        Revoke all trusted devices for a user.
        """
        from .models_2fa import TrustedDevice
        
        count = TrustedDevice.objects.filter(user=user, is_active=True).update(is_active=False)
        return {
            'success': True,
            'message': f'Revoked {count} trusted device(s).'
        }
    
    @staticmethod
    def _mask_email(email):
        """Mask an email address for display (e.g., j***n@example.com)."""
        if '@' not in email:
            return '***'
        
        local, domain = email.split('@')
        if len(local) <= 2:
            masked_local = local[0] + '***'
        else:
            masked_local = local[0] + '***' + local[-1]
        
        return f"{masked_local}@{domain}"

