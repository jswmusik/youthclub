"""
Users app URL configuration.
Includes 2FA endpoints.
"""

from django.urls import path
from .views_2fa import (
    TwoFactorCheckView,
    TwoFactorInitiateView,
    TwoFactorVerifyView,
    TwoFactorStatusView,
    TwoFactorToggleView,
    TrustedDevicesView,
)

urlpatterns = [
    # 2FA endpoints
    path('2fa/check/', TwoFactorCheckView.as_view(), name='2fa-check'),
    path('2fa/initiate/', TwoFactorInitiateView.as_view(), name='2fa-initiate'),
    path('2fa/verify/', TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('2fa/status/', TwoFactorStatusView.as_view(), name='2fa-status'),
    path('2fa/toggle/', TwoFactorToggleView.as_view(), name='2fa-toggle'),
    path('2fa/devices/', TrustedDevicesView.as_view(), name='2fa-devices'),
]

