from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FeatureViewSet, PlanViewSet, LicenseViewSet, 
    LicenseRequestViewSet, GlobalPricingViewSet, GlobalDataRetentionSettingsViewSet
)

router = DefaultRouter()
router.register(r'features', FeatureViewSet)
router.register(r'plans', PlanViewSet)
router.register(r'licenses', LicenseViewSet, basename='license')
router.register(r'requests', LicenseRequestViewSet, basename='licenserequest')
# Pricing is a singleton, so we use a ViewSet with list/create
router.register(r'pricing', GlobalPricingViewSet, basename='pricing')
# Data retention settings (GDPR compliance)
router.register(r'data-retention', GlobalDataRetentionSettingsViewSet, basename='data-retention')

urlpatterns = [
    path('', include(router.urls)),
]
