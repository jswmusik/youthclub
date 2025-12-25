# backend/marketing/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SiteSEOSettingsView, 
    TestimonialViewSet, 
    PublicKPIView,
    PublicTestimonialsView
)

router = DefaultRouter()
router.register(r'testimonials', TestimonialViewSet, basename='testimonials')

urlpatterns = [
    # Public endpoints (no auth required)
    path('public/seo-settings/', SiteSEOSettingsView.as_view(), name='public-seo-settings'),
    path('public/testimonials/', PublicTestimonialsView.as_view(), name='public-testimonials'),
    path('public/kpi/', PublicKPIView.as_view(), name='public-kpi'),
    
    # Admin endpoints (auth required)
    path('', include(router.urls)),
]

