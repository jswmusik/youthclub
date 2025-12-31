# backend/marketing/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SiteSEOSettingsView, 
    SiteSEOSettingsAdminView,
    TestimonialViewSet, 
    CustomerViewSet,
    PublicKPIView,
    PublicTestimonialsView,
    PublicCustomersView,
    NewsletterSubscribeView,
    NewsletterAnalyticsView,
    NewsletterSubscriberViewSet
)

router = DefaultRouter()
router.register(r'testimonials', TestimonialViewSet, basename='testimonials')
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'newsletter/subscribers', NewsletterSubscriberViewSet, basename='newsletter-subscribers')

urlpatterns = [
    # Public endpoints (no auth required)
    path('public/seo-settings/', SiteSEOSettingsView.as_view(), name='public-seo-settings'),
    path('public/testimonials/', PublicTestimonialsView.as_view(), name='public-testimonials'),
    path('public/customers/', PublicCustomersView.as_view(), name='public-customers'),
    path('public/kpi/', PublicKPIView.as_view(), name='public-kpi'),
    path('public/newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='public-newsletter-subscribe'),
    
    # Admin endpoints (auth required)
    path('admin/seo-settings/', SiteSEOSettingsAdminView.as_view(), name='admin-seo-settings'),
    path('admin/newsletter/analytics/', NewsletterAnalyticsView.as_view(), name='admin-newsletter-analytics'),
    path('', include(router.urls)),
]
