"""
Two-Factor Authentication API Views

Provides endpoints for:
- Initiating 2FA (sending OTP)
- Verifying OTP
- Managing 2FA settings (for guardians)
- Managing trusted devices
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from .services_2fa import TwoFactorService

User = get_user_model()


class TwoFactorCheckView(APIView):
    """
    Check if 2FA is required for a user after initial credentials verification.
    Called after password validation but before issuing tokens.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Check if 2FA is required for the given email.
        This is called after credentials are validated to determine if 2FA is needed.
        
        Request body:
        {
            "email": "user@example.com",
            "trusted_device_token": "optional-token-from-cookie"
        }
        """
        email = request.data.get('email')
        trusted_device_token = request.data.get('trusted_device_token')
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if user exists
            return Response(
                {'requires_2fa': False},
                status=status.HTTP_200_OK
            )
        
        # Get client IP
        ip_address = self._get_client_ip(request)
        
        requires_2fa, reason = TwoFactorService.requires_2fa(
            user=user,
            trusted_device_token=trusted_device_token,
            ip_address=ip_address
        )
        
        return Response({
            'requires_2fa': requires_2fa,
            'reason': reason
        })
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class TwoFactorInitiateView(APIView):
    """
    Initiate 2FA by sending an OTP to the user's email.
    Can be called with either email (pre-login) or authenticated user (settings change).
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Send an OTP code to the user's email.
        
        Request body:
        {
            "email": "user@example.com" (for login flow)
        }
        
        Or with authenticated user, no email needed.
        """
        # Try to get user from authenticated request or email
        user = None
        if request.user.is_authenticated:
            user = request.user
        else:
            email = request.data.get('email')
            if not email:
                return Response(
                    {'error': 'Email is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Don't reveal if user exists - just pretend we sent the code
                return Response({
                    'success': True,
                    'message': 'If an account exists with this email, a verification code has been sent.',
                    'expires_in_minutes': 10
                })
        
        ip_address = self._get_client_ip(request)
        purpose = request.data.get('purpose', 'login')
        
        result = TwoFactorService.initiate_2fa(
            user=user,
            ip_address=ip_address,
            purpose=purpose
        )
        
        return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_429_TOO_MANY_REQUESTS)
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class TwoFactorVerifyView(APIView):
    """
    Verify an OTP code and optionally trust the device.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Verify the OTP code.
        
        Request body:
        {
            "email": "user@example.com",
            "code": "123456",
            "trust_device": true,
            "device_name": "Chrome on Windows" (optional)
        }
        """
        email = request.data.get('email')
        code = request.data.get('code')
        trust_device = request.data.get('trust_device', False)
        device_name = request.data.get('device_name', '')
        
        if not email or not code:
            return Response(
                {'error': 'Email and code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid credentials', 'error_code': 'invalid_user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get device name from user agent if not provided
        if not device_name:
            device_name = request.META.get('HTTP_USER_AGENT', 'Unknown Device')[:200]
        
        ip_address = self._get_client_ip(request)
        
        result = TwoFactorService.verify_otp(
            user=user,
            code=code,
            trust_device=trust_device,
            device_name=device_name,
            ip_address=ip_address
        )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class TwoFactorStatusView(APIView):
    """
    Get the current 2FA status and settings for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get 2FA status for the current user."""
        result = TwoFactorService.get_user_2fa_status(request.user)
        return Response(result)


class TwoFactorToggleView(APIView):
    """
    Enable or disable 2FA for guardians (opt-in/opt-out).
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Enable or disable 2FA.
        
        Request body:
        {
            "enable": true
        }
        """
        enable = request.data.get('enable', True)
        
        if enable:
            result = TwoFactorService.enable_2fa_for_guardian(request.user)
        else:
            result = TwoFactorService.disable_2fa_for_guardian(request.user)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class TrustedDevicesView(APIView):
    """
    List and manage trusted devices.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all trusted devices for the current user."""
        devices = TwoFactorService.get_trusted_devices(request.user)
        return Response({'devices': devices})
    
    def delete(self, request):
        """
        Revoke a specific device or all devices.
        
        Query params:
        - device_id: ID of specific device to revoke
        - all: Set to 'true' to revoke all devices
        """
        revoke_all = request.query_params.get('all', 'false').lower() == 'true'
        device_id = request.query_params.get('device_id')
        
        if revoke_all:
            result = TwoFactorService.revoke_all_trusted_devices(request.user)
        elif device_id:
            try:
                result = TwoFactorService.revoke_trusted_device(request.user, int(device_id))
            except ValueError:
                return Response(
                    {'error': 'Invalid device ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'Specify device_id or all=true'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

