from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountryViewSet, MunicipalityViewSet, ClubViewSet, InterestViewSet, PublicClubDetailView, PublicMunicipalityDetailView

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'municipalities', MunicipalityViewSet)
router.register(r'clubs', ClubViewSet)
router.register(r'interests', InterestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Public municipality page endpoint (list all clubs in a municipality)
    path('public/municipalities/<slug:municipality_slug>/', PublicMunicipalityDetailView.as_view(), name='public-municipality-detail'),
    # Public club page endpoint
    path('public/clubs/<slug:municipality_slug>/<slug:club_slug>/', PublicClubDetailView.as_view(), name='public-club-detail'),
]