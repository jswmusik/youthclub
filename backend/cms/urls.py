from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PageViewSet, MenuItemViewSet, FeatureShowcaseViewSet, CookieConsentViewSet

router = DefaultRouter()
router.register(r'pages', PageViewSet)
router.register(r'menu', MenuItemViewSet)
router.register(r'features', FeatureShowcaseViewSet)
router.register(r'cookies', CookieConsentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]