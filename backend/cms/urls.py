from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PageViewSet, MenuItemViewSet, FeatureShowcaseViewSet, 
    CookieConsentViewSet, PricingPageContentViewSet, PricingFAQViewSet,
    ContactPageContentViewSet, ContactSubmissionViewSet, BoilerplateViewSet
)

router = DefaultRouter()
router.register(r'pages', PageViewSet)
router.register(r'menu', MenuItemViewSet)
router.register(r'features', FeatureShowcaseViewSet)
router.register(r'cookies', CookieConsentViewSet)
router.register(r'pricing-content', PricingPageContentViewSet, basename='pricing-content')
router.register(r'pricing-faqs', PricingFAQViewSet)
router.register(r'contact-content', ContactPageContentViewSet, basename='contact-content')
router.register(r'contact-submissions', ContactSubmissionViewSet)
router.register(r'boilerplates', BoilerplateViewSet)

urlpatterns = [
    path('', include(router.urls)),
]