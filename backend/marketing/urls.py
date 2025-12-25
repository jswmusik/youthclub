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
    PublicCustomersView
)

router = DefaultRouter()
router.register(r'testimonials', TestimonialViewSet, basename='testimonials')
router.register(r'customers', CustomerViewSet, basename='customers')

urlpatterns = [
    # Public endpoints (no auth required)
    path('public/seo-settings/', SiteSEOSettingsView.as_view(), name='public-seo-settings'),
    path('public/testimonials/', PublicTestimonialsView.as_view(), name='public-testimonials'),
    path('public/customers/', PublicCustomersView.as_view(), name='public-customers'),
    path('public/kpi/', PublicKPIView.as_view(), name='public-kpi'),
    
    # Admin endpoints (auth required)
    path('admin/seo-settings/', SiteSEOSettingsAdminView.as_view(), name='admin-seo-settings'),
    path('', include(router.urls)),
]
