import time
import datetime
import hashlib
from django.conf import settings
from django.core.signing import Signer, BadSignature
from django.utils import timezone
from organization.models import RegularOpeningHour


class CheckInService:
    signer = Signer(salt='visits.kiosk.token')
    TOKEN_VALIDITY_SECONDS = 45
    PIN_VALIDITY_SECONDS = 3600  # 60 minutes

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
    def generate_pin_code(cls, club_id):
        """
        Generate a 6-digit PIN that changes every hour.
        Uses club_id + current hour timestamp to create a deterministic code.
        
        Returns:
            dict with 'pin' (6-digit string) and 'expires_in' (seconds until refresh)
        """
        # Get the current hour slot (changes every PIN_VALIDITY_SECONDS)
        current_slot = int(time.time() // cls.PIN_VALIDITY_SECONDS)
        
        # Create a hash from club_id + slot + secret key
        data = f"{club_id}:{current_slot}:{settings.SECRET_KEY}"
        hash_digest = hashlib.sha256(data.encode()).hexdigest()
        
        # Convert first 6 hex chars to a 6-digit number (0-999999)
        pin = int(hash_digest[:6], 16) % 1000000
        
        # Calculate seconds until next refresh
        next_refresh = (current_slot + 1) * cls.PIN_VALIDITY_SECONDS
        seconds_remaining = int(next_refresh - time.time())
        
        return {
            'pin': str(pin).zfill(6),  # Pad with zeros: "001234"
            'expires_in': seconds_remaining
        }

    @classmethod
    def validate_pin_code(cls, pin, club_id):
        """
        Validate a PIN code for a club.
        Also checks the previous hour's PIN to handle edge cases
        (e.g., user started typing just before PIN changed).
        
        Args:
            pin: The 6-digit PIN code entered by user
            club_id: The club ID to validate against
            
        Returns:
            club_id if valid
            
        Raises:
            ValueError if PIN is invalid
        """
        # Check current PIN
        current_pin_data = cls.generate_pin_code(club_id)
        if pin == current_pin_data['pin']:
            return club_id
        
        # Also check previous slot's PIN (grace period)
        previous_slot = int(time.time() // cls.PIN_VALIDITY_SECONDS) - 1
        data = f"{club_id}:{previous_slot}:{settings.SECRET_KEY}"
        hash_digest = hashlib.sha256(data.encode()).hexdigest()
        previous_pin = str(int(hash_digest[:6], 16) % 1000000).zfill(6)
        
        if pin == previous_pin:
            return club_id
        
        raise ValueError("Invalid PIN code. Please check the code on the kiosk screen.")

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
