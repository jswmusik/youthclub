from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django.db.models import Q
from users.permissions import IsSuperAdmin, IsMunicipalityAdmin, IsClubOrMunicipalityAdmin
from .models import Country, Municipality, Club, Interest
from .serializers import (
    CountrySerializer,
    MunicipalitySerializer,
    ClubSerializer,
    InterestSerializer,
    ClubManagementSerializer,
)

class CountryViewSet(viewsets.ModelViewSet):
    """
    Country management.
    Read: Public
    Write: Super Admin Only
    """
    queryset = Country.objects.all()
    serializer_class = CountrySerializer

    def get_permissions(self):
        # Allow anyone to read the list (needed for login/registration dropdowns)
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # Only Super Admins can create, update, or delete
        return [IsSuperAdmin()]

class MunicipalityViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Municipalities to be viewed and managed.
    """
    queryset = Municipality.objects.all()
    serializer_class = MunicipalitySerializer

    def get_queryset(self):
        base_queryset = Municipality.objects.all()
        user = self.request.user

        if not user.is_authenticated:
            queryset = base_queryset
        elif getattr(user, 'role', None) == 'SUPER_ADMIN':
            queryset = base_queryset
        elif getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = base_queryset.filter(id=user.assigned_municipality.id)
        else:
            queryset = base_queryset

        # Additional query param filters (country/search)
        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(country=country)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(municipality_code__icontains=search) |
                Q(email__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset.order_by('name')

    def get_permissions(self):
        # Public Read Access
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        
        # Municipality Admin can ONLY Edit (Update/Partial Update)
        if self.action in ['update', 'partial_update']:
            return [IsMunicipalityAdmin()]
        
        # Only Super Admin can Create or Delete
        return [IsSuperAdmin()]

class ClubViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Clubs to be viewed and managed.
    Read: Public
    Write: Super Admin OR Municipality Admin (for their own clubs)
    """
    queryset = Club.objects.all()
    serializer_class = ClubSerializer

    def get_queryset(self):
        base_queryset = Club.objects.all().order_by('name')
        user = self.request.user

        if not user.is_authenticated:
            queryset = base_queryset
        elif getattr(user, 'role', None) == 'SUPER_ADMIN':
            queryset = base_queryset
        elif getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = base_queryset.filter(municipality=user.assigned_municipality)
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            queryset = base_queryset.filter(id=user.assigned_club.id)
        else:
            queryset = base_queryset

        municipality = self.request.query_params.get('municipality', None)
        if municipality:
            queryset = queryset.filter(municipality=municipality)

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        if self.action in ['create', 'destroy']:
            return [IsMunicipalityAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsClubOrMunicipalityAdmin()]
        return [IsMunicipalityAdmin()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ClubManagementSerializer
        return ClubSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            serializer.save(municipality=user.assigned_municipality)
        else:
            serializer.save()

class InterestViewSet(viewsets.ModelViewSet):
    """
    Interests management.
    Read: Public
    Write: Super Admin Only
    """
    queryset = Interest.objects.all()
    serializer_class = InterestSerializer

    def get_permissions(self):
        # Allow anyone to read the list (needed for registration forms)
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # Only Super Admins can create, update, or delete
        return [IsSuperAdmin()]