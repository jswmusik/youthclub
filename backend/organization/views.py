from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
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

    def get_queryset(self):
        queryset = Country.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(country_code__icontains=search) |
                Q(currency_code__icontains=search) |
                Q(default_language__icontains=search)
            )
        
        return queryset.order_by('name')

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
        if self.action in ['follow', 'unfollow']:
            return [IsAuthenticated()]
        if self.action in ['followers', 'remove_follower']:
            return [IsAuthenticated()]
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, pk=None):
        """
        Allows a youth member to follow a club.
        """
        club = self.get_object()
        user = request.user

        if user.role != 'YOUTH_MEMBER':
            return Response({"error": "Only youth members can follow clubs."}, status=status.HTTP_403_FORBIDDEN)

        if user.preferred_club and user.preferred_club.id == club.id:
            return Response({"message": "You cannot follow your home club (you are already a member)."}, status=status.HTTP_400_BAD_REQUEST)

        user.followed_clubs.add(club)
        return Response({"status": "followed", "club": club.name})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unfollow(self, request, pk=None):
        """
        Allows a youth member to unfollow a club.
        """
        club = self.get_object()
        user = request.user

        user.followed_clubs.remove(club)
        return Response({"status": "unfollowed", "club": club.name})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def followers(self, request, pk=None):
        """
        Admin endpoint to view followers of a specific club.
        """
        club = self.get_object()
        user = request.user

        # Permission Logic: Who can see followers?
        allow = False
        if user.role == 'SUPER_ADMIN':
            allow = True
        elif user.role == 'MUNICIPALITY_ADMIN':
            if user.assigned_municipality == club.municipality:
                allow = True
        elif user.role == 'CLUB_ADMIN':
            if user.assigned_club == club:
                allow = True

        if not allow:
            return Response({"error": "You do not have permission to view followers for this club."}, status=status.HTTP_403_FORBIDDEN)

        # Fetch followers (excluding home members, as they are technically 'members' not just 'followers')
        followers = club.followers.all()
        
        # Use a simple serializer to return basic user info
        from users.serializers import CustomUserSerializer
        serializer = CustomUserSerializer(followers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def remove_follower(self, request, pk=None):
        """
        Admin endpoint to remove a user from the club's followers.
        """
        club = self.get_object()
        user = request.user

        # Permission Logic: Who can remove followers?
        allow = False
        if user.role == 'SUPER_ADMIN':
            allow = True
        elif user.role == 'MUNICIPALITY_ADMIN':
            if user.assigned_municipality == club.municipality:
                allow = True
        elif user.role == 'CLUB_ADMIN':
            if user.assigned_club == club:
                allow = True

        if not allow:
            return Response({"error": "You do not have permission to remove followers from this club."}, status=status.HTTP_403_FORBIDDEN)

        # Get the user_id from request data
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from users.models import User
            follower_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Remove the user from followers
        club.followers.remove(follower_user)
        return Response({"status": "removed", "user": f"{follower_user.first_name} {follower_user.last_name}", "club": club.name})

class InterestViewSet(viewsets.ModelViewSet):
    """
    Interests management.
    Read: Public
    Write: Super Admin Only
    """
    queryset = Interest.objects.all()
    serializer_class = InterestSerializer

    def get_queryset(self):
        queryset = Interest.objects.all()
        
        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(icon__icontains=search)
            )
        
        return queryset.order_by('name')

    def get_permissions(self):
        # Allow anyone to read the list (needed for registration forms)
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # Only Super Admins can create, update, or delete
        return [IsSuperAdmin()]