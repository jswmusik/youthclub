from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django.db.models import Q
from users.permissions import IsSuperAdmin
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
    Read: Public
    Write: Super Admin Only
    """
    queryset = Municipality.objects.all()
    serializer_class = MunicipalitySerializer

    def get_queryset(self):
        queryset = Municipality.objects.all().order_by('name')
        
        # Filter by country
        country = self.request.query_params.get('country', None)
        if country:
            queryset = queryset.filter(country=country)
        
        # Search by municipality name, code, email, or description
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(municipality_code__icontains=search) |
                Q(email__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsSuperAdmin()]

class ClubViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Clubs to be viewed and managed.
    Read: Public
    Write: Super Admin Only
    """
    queryset = Club.objects.all()
    serializer_class = ClubSerializer

    def get_queryset(self):
        queryset = Club.objects.all().order_by('name')
        
        # Filter by municipality
        municipality = self.request.query_params.get('municipality', None)
        if municipality:
            queryset = queryset.filter(municipality=municipality)
        
        # Search by club name
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
        return [IsSuperAdmin()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ClubManagementSerializer
        return ClubSerializer

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