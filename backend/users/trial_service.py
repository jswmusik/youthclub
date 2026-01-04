"""
Trial Period Service

Handles trial period logic for unverified youth members.
Municipalities can set a trial period (in days) that allows new youth members
to access the platform before being verified by club staff.
Clubs can override the municipality setting.
"""

from django.utils import timezone


def get_user_trial_info(user):
    """
    Returns trial period information for a user.
    
    Returns dict with:
    - has_access: bool - Can user access the platform?
    - is_verified: bool - Is user verified?
    - is_in_trial: bool - Is user in active trial?
    - trial_days_remaining: int | None - Days left in trial (None if no trial)
    - trial_expired: bool - Has trial expired?
    - should_start_trial: bool - Should we start the trial now?
    - club_info: dict | None - Contact info for their club
    """
    # Verified users always have access
    if user.verification_status == 'VERIFIED':
        return {
            'has_access': True,
            'is_verified': True,
            'is_in_trial': False,
            'trial_days_remaining': None,
            'trial_expired': False,
            'should_start_trial': False,
            'club_info': None,
        }
    
    # Only youth members have trial periods
    if user.role != 'YOUTH_MEMBER':
        return {
            'has_access': user.verification_status == 'VERIFIED',
            'is_verified': False,
            'is_in_trial': False,
            'trial_days_remaining': None,
            'trial_expired': False,
            'should_start_trial': False,
            'club_info': _get_club_info(user),
        }
    
    # Get effective trial days from club/municipality
    club = user.preferred_club
    if not club:
        # No club = no trial, must be verified
        return {
            'has_access': False,
            'is_verified': False,
            'is_in_trial': False,
            'trial_days_remaining': None,
            'trial_expired': False,
            'should_start_trial': False,
            'club_info': None,
        }
    
    trial_days = club.effective_trial_period_days
    
    # Trial disabled (0 days)
    if trial_days == 0:
        return {
            'has_access': False,
            'is_verified': False,
            'is_in_trial': False,
            'trial_days_remaining': None,
            'trial_expired': False,
            'should_start_trial': False,
            'club_info': _get_club_info(user),
        }
    
    # Trial not started yet - this is their first login
    if not user.trial_started_at:
        return {
            'has_access': True,  # Will start trial
            'is_verified': False,
            'is_in_trial': True,
            'trial_days_remaining': trial_days,
            'trial_expired': False,
            'should_start_trial': True,  # Signal to start trial
            'club_info': _get_club_info(user),
        }
    
    # Calculate remaining trial days
    elapsed = timezone.now() - user.trial_started_at
    days_used = elapsed.days
    days_remaining = max(0, trial_days - days_used)
    
    if days_remaining > 0:
        return {
            'has_access': True,
            'is_verified': False,
            'is_in_trial': True,
            'trial_days_remaining': days_remaining,
            'trial_expired': False,
            'should_start_trial': False,
            'club_info': _get_club_info(user),
        }
    else:
        return {
            'has_access': False,
            'is_verified': False,
            'is_in_trial': False,
            'trial_days_remaining': 0,
            'trial_expired': True,
            'should_start_trial': False,
            'club_info': _get_club_info(user),
        }


def _get_club_info(user):
    """Get club contact info for the modal"""
    club = user.preferred_club
    if not club:
        return None
    return {
        'id': club.id,
        'name': club.name,
        'email': club.email,
        'phone': club.phone,
        'address': club.address,
        'municipality_name': club.municipality.name if club.municipality else None,
    }


def start_user_trial(user):
    """
    Start the trial period for a user.
    Only starts if not already started.
    """
    if not user.trial_started_at:
        user.trial_started_at = timezone.now()
        user.save(update_fields=['trial_started_at'])
        return True
    return False


def get_trial_days_for_club(club):
    """
    Helper to get the effective trial days for a club.
    Useful for admin displays.
    """
    if not club:
        return 0
    return club.effective_trial_period_days


def reset_user_trial(user):
    """
    Reset a user's trial period (admin action).
    This allows them to start a new trial.
    """
    user.trial_started_at = None
    user.save(update_fields=['trial_started_at'])



