import time
import datetime
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
    def get_next_opening(cls, club):
        """
        Finds the next available opening slot for the club.
        Returns a string like "Tuesday at 14:00" or None.
        """
        now = timezone.localtime()
        today_weekday = now.isoweekday()
        
        # 1. Check later today
        later_today = RegularOpeningHour.objects.filter(
            club=club,
            weekday=today_weekday,
            open_time__gt=now.time()
        ).order_by('open_time').first()
        
        if later_today:
            return f"Today at {later_today.open_time.strftime('%H:%M')}"

        # 2. Check upcoming days (Wrapping around the week)
        for i in range(1, 8):
            # (Current + i) wrapped to 1-7
            next_day_num = (today_weekday + i - 1) % 7 + 1 
            
            next_opening = RegularOpeningHour.objects.filter(
                club=club,
                weekday=next_day_num
            ).order_by('open_time').first()
            
            if next_opening:
                day_name = next_opening.get_weekday_display()
                return f"{day_name} at {next_opening.open_time.strftime('%H:%M')}"

        return "Unknown"

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
            # We return a specific keyword in the message so the View can detect it
            return False, "CLOSED"

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
