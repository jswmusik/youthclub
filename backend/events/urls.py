from django.urls import path, include
# from rest_framework_nested import routers # You might need `pip install drf-nested-routers` or use standard routers
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, EventRegistrationViewSet, EventImageViewSet, EventDocumentViewSet, PublicEventViewSet

# If you don't have drf-nested-routers, you can just register them flat:
# router.register(r'event-images', EventImageViewSet)
# But standard REST practice suggests nesting: events/{id}/images

router = DefaultRouter()
router.register(r'events', EventViewSet)
router.register(r'registrations', EventRegistrationViewSet)

# Simple flat routes for media handling if you prefer standard routers
router.register(r'event-images', EventImageViewSet)
router.register(r'event-documents', EventDocumentViewSet)

# Public events router (no auth required)
public_router = DefaultRouter()
public_router.register(r'public/events', PublicEventViewSet, basename='public-events')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(public_router.urls)),
]