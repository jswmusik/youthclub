import time
from django.core.signing import Signer, BadSignature
from django.utils import timezone
from organization.models import RegularOpeningHour


class CheckInService:
    signer = Signer(salt='visits.kiosk.token')
    TOKEN_VALIDITY_SECONDS = 45

    @classmethod
    def generate_kiosk_token(cls, club_id):
        data = { 'club_id': club_id, 'timestamp': time.time() }
        return cls.signer.sign_object(data)

    @classmethod
    def validate_token(cls, token):
        try:
            data = cls.signer.unsign_object(token)
        except BadSignature:
            raise ValueError("Invalid QR Code")

        if time.time() - data['timestamp'] > cls.TOKEN_VALIDITY_SECONDS:
            raise ValueError("QR Code has expired. Please scan again.")

        return data['club_id']

    @classmethod
    def can_user_enter(cls, user, club):
        """
        Validates if the user can enter based on:
        1. Opening Hours (Is the club open right now?)
        2. Age/Grade Restrictions
        """
        # Admins can always enter
        if user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return True, ""

        now = timezone.localtime()
        current_weekday = now.isoweekday() # 1=Monday
        
        # 1. FIND ACTIVE OPENING HOUR
        active_hour = RegularOpeningHour.objects.filter(
            club=club,
            weekday=current_weekday,
            open_time__lte=now.time(),
            close_time__gte=now.time()
        ).first()

        # --- STRICT CLOSURE CHECK ---
        if not active_hour:
            return False, "Club is currently closed."

        # 2. CHECK RESTRICTIONS (Age/Grade)
        if active_hour.restriction_mode == 'AGE':
            if not user.date_of_birth:
                return False, "Birth date missing in profile."
            if active_hour.min_value is None or active_hour.max_value is None:
                return False, "Age restriction is not properly configured."
            if not (active_hour.min_value <= user.age <= active_hour.max_value):
                return False, f"Session restricted to ages {active_hour.min_value}-{active_hour.max_value}."
        
        elif active_hour.restriction_mode == 'GRADE':
             if user.grade is None:
                 return False, "Grade missing in profile."
             if active_hour.min_value is None or active_hour.max_value is None:
                 return False, "Grade restriction is not properly configured."
             if not (active_hour.min_value <= user.grade <= active_hour.max_value):
                return False, f"Session restricted to grades {active_hour.min_value}-{active_hour.max_value}."

        return True, ""
