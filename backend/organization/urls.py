from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountryViewSet, MunicipalityViewSet, ClubViewSet, InterestViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'municipalities', MunicipalityViewSet)
router.register(r'clubs', ClubViewSet)
router.register(r'interests', InterestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]