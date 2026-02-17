"""
Service functions for consent management.

Provides utilities for managing user consents in compliance with GDPR.
"""

import logging
from typing import List, Dict, Optional
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from .consent_models import ConsentType, UserConsent, ConsentLog

User = get_user_model()
logger = logging.getLogger(__name__)


class ConsentService:
    """
    Service for managing user consents.
    
    Provides GDPR-compliant consent management including:
    - Recording consents with full audit trail
    - Withdrawing consents
    - Checking consent status
    - Handling consent version updates
    """
    
    @staticmethod
    def record_consent(
        user: User,
        consent_code: str,
        consent_method: str = 'REGISTRATION',
        ip_address: Optional[str] = None,
        user_agent: str = ''
    ) -> Optional[UserConsent]:
        """
        Record a user's consent.
        
        Args:
            user: User giving consent
            consent_code: Code of the consent type
            consent_method: How consent was obtained
            ip_address: IP address of user
            user_agent: Browser user agent
        
        Returns:
            UserConsent instance or None if consent type not found
        """
        try:
            consent_type = ConsentType.objects.get(
                code=consent_code,
                is_active=True
            )
            
            # Check if user already has active consent
            existing = UserConsent.objects.filter(
                user=user,
                consent_type=consent_type,
                is_active=True
            ).first()
            
            if existing:
                # Check if version changed
                if existing.version_snapshot != consent_type.version:
                    # Withdraw old consent
                    existing.withdraw(
                        reason=f"Updated to version {consent_type.version}",
                        ip_address=ip_address
                    )
                    
                    # Create log
                    ConsentLog.objects.create(
                        user_consent=existing,
                        event_type='WITHDRAWN',
                        ip_address=ip_address,
                        details={'reason': 'version_update'}
                    )
                else:
                    # Already have current consent
                    return existing
            
            # Create new consent
            with transaction.atomic():
                user_consent = UserConsent.objects.create(
                    user=user,
                    consent_type=consent_type,
                    consent_method=consent_method,
                    ip_address=ip_address,
                    user_agent=user_agent[:500] if user_agent else '',
                    consent_text_snapshot=consent_type.consent_text,
                    version_snapshot=consent_type.version,
                    is_active=True
                )
                
                # Create log entry
                ConsentLog.objects.create(
                    user_consent=user_consent,
                    event_type='GIVEN',
                    ip_address=ip_address,
                    details={
                        'method': consent_method,
                        'version': consent_type.version
                    }
                )
                
                # Log to audit system if available
                try:
                    from audit.services import log_audit_event
                    from audit.models import AuditLog
                    
                    log_audit_event(
                        action=AuditLog.Action.CONSENT_GIVEN,
                        user=user,
                        model_name='UserConsent',
                        object_id=user_consent.id,
                        object_repr=str(consent_type),
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                except:
                    pass
                
                logger.info(f"Recorded consent for user {user.id}: {consent_code} v{consent_type.version}")
                return user_consent
                
        except ConsentType.DoesNotExist:
            logger.error(f"Consent type not found: {consent_code}")
            return None
        except Exception as e:
            logger.error(f"Failed to record consent: {e}")
            return None
    
    @staticmethod
    def withdraw_consent(
        user: User,
        consent_code: str,
        reason: str = '',
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Withdraw a user's consent.
        
        GDPR Article 7(3): Users must be able to withdraw consent easily.
        
        Args:
            user: User withdrawing consent
            consent_code: Code of the consent type
            reason: Optional reason for withdrawal
            ip_address: IP address of user
        
        Returns:
            True if consent was withdrawn, False otherwise
        """
        try:
            consent_type = ConsentType.objects.get(code=consent_code)
            
            user_consent = UserConsent.objects.filter(
                user=user,
                consent_type=consent_type,
                is_active=True
            ).first()
            
            if not user_consent:
                logger.warning(f"No active consent found for user {user.id}: {consent_code}")
                return False
            
            with transaction.atomic():
                # Withdraw consent
                user_consent.withdraw(reason=reason, ip_address=ip_address)
                
                # Create log entry
                ConsentLog.objects.create(
                    user_consent=user_consent,
                    event_type='WITHDRAWN',
                    ip_address=ip_address,
                    details={'reason': reason} if reason else None
                )
                
                # Log to audit system
                try:
                    from audit.services import log_audit_event
                    from audit.models import AuditLog
                    
                    log_audit_event(
                        action=AuditLog.Action.CONSENT_WITHDRAWN,
                        user=user,
                        model_name='UserConsent',
                        object_id=user_consent.id,
                        object_repr=str(consent_type),
                        reason=reason,
                        ip_address=ip_address
                    )
                except:
                    pass
                
                logger.info(f"Withdrew consent for user {user.id}: {consent_code}")
                return True
                
        except ConsentType.DoesNotExist:
            logger.error(f"Consent type not found: {consent_code}")
            return False
        except Exception as e:
            logger.error(f"Failed to withdraw consent: {e}")
            return False
    
    @staticmethod
    def has_consent(user: User, consent_code: str) -> bool:
        """
        Check if user has given consent for a specific purpose.
        
        Args:
            user: User to check
            consent_code: Code of the consent type
        
        Returns:
            True if user has active consent, False otherwise
        """
        try:
            consent_type = ConsentType.objects.get(
                code=consent_code,
                is_active=True
            )
            
            return UserConsent.objects.filter(
                user=user,
                consent_type=consent_type,
                is_active=True
            ).exists()
            
        except ConsentType.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Failed to check consent: {e}")
            return False
    
    @staticmethod
    def get_user_consents(user: User, active_only: bool = True) -> List[UserConsent]:
        """
        Get all consents for a user.
        
        Args:
            user: User to get consents for
            active_only: Whether to only return active consents
        
        Returns:
            List of UserConsent objects
        """
        queryset = UserConsent.objects.filter(user=user).select_related('consent_type')
        
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        return list(queryset)
    
    @staticmethod
    def get_consents_needing_update(user: User) -> List[UserConsent]:
        """
        Get consents that need to be updated due to version changes.
        
        Args:
            user: User to check
        
        Returns:
            List of UserConsent objects that need updating
        """
        active_consents = UserConsent.objects.filter(
            user=user,
            is_active=True
        ).select_related('consent_type')
        
        outdated = []
        for consent in active_consents:
            if consent.needs_update:
                outdated.append(consent)
        
        return outdated
    
    @staticmethod
    def get_required_consents() -> List[ConsentType]:
        """
        Get all required consent types.
        
        These must be obtained before user can use the service.
        
        Returns:
            List of required ConsentType objects
        """
        return list(ConsentType.objects.filter(
            is_required=True,
            is_active=True
        ).order_by('display_order'))
    
    @staticmethod
    def get_optional_consents() -> List[ConsentType]:
        """
        Get all optional consent types.
        
        Users can choose whether to give these consents.
        
        Returns:
            List of optional ConsentType objects
        """
        return list(ConsentType.objects.filter(
            is_required=False,
            is_active=True
        ).order_by('display_order'))
    
    @staticmethod
    def get_all_active_consents() -> List[ConsentType]:
        """
        Get all active consent types.
        
        Returns:
            List of all active ConsentType objects
        """
        return list(ConsentType.objects.filter(
            is_active=True
        ).order_by('display_order'))
    
    @staticmethod
    def record_bulk_consents(
        user: User,
        consent_codes: List[str],
        consent_method: str = 'REGISTRATION',
        ip_address: Optional[str] = None,
        user_agent: str = ''
    ) -> Dict[str, bool]:
        """
        Record multiple consents at once (e.g., during registration).
        
        Args:
            user: User giving consents
            consent_codes: List of consent type codes
            consent_method: How consents were obtained
            ip_address: IP address of user
            user_agent: Browser user agent
        
        Returns:
            Dictionary mapping consent codes to success status
        """
        results = {}
        
        for code in consent_codes:
            consent = ConsentService.record_consent(
                user=user,
                consent_code=code,
                consent_method=consent_method,
                ip_address=ip_address,
                user_agent=user_agent
            )
            results[code] = consent is not None
        
        return results
    
    @staticmethod
    def check_registration_consents(consent_codes: List[str]) -> Dict[str, any]:
        """
        Check if all required consents are included for registration.
        
        Args:
            consent_codes: List of consent codes being provided
        
        Returns:
            Dictionary with validation results
        """
        required = ConsentService.get_required_consents()
        required_codes = {c.code for c in required}
        provided_codes = set(consent_codes)
        
        missing = required_codes - provided_codes
        invalid = provided_codes - {c.code for c in ConsentService.get_all_active_consents()}
        
        return {
            'valid': len(missing) == 0 and len(invalid) == 0,
            'missing_required': list(missing),
            'invalid_codes': list(invalid),
            'all_required_provided': len(missing) == 0
        }


