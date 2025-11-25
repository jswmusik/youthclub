from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta, date

from .models import User, GuardianYouthLink
from .serializers import CustomUserSerializer, UserManagementSerializer
from .permissions import IsSuperAdmin

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Super Admins to CRUD all users.
    """
    permission_classes = [IsSuperAdmin] 
    lookup_field = 'id'
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        
        # Filters
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        municipality = self.request.query_params.get('assigned_municipality', None)
        if municipality:
            queryset = queryset.filter(assigned_municipality=municipality)
        
        club = self.request.query_params.get('assigned_club', None)
        if club:
            queryset = queryset.filter(assigned_club=club)
        
        gender = self.request.query_params.get('legal_gender', None)
        if gender:
            queryset = queryset.filter(legal_gender=gender)
        
        # Search by first name, last name, or email
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        # Grade filters (for youth members)
        grade_from = self.request.query_params.get('grade_from', None)
        if grade_from:
            try:
                queryset = queryset.filter(grade__gte=int(grade_from))
            except ValueError:
                pass
        
        grade_to = self.request.query_params.get('grade_to', None)
        if grade_to:
            try:
                queryset = queryset.filter(grade__lte=int(grade_to))
            except ValueError:
                pass
        
        # Age filters (for youth members) - calculate from date_of_birth
        age_from = self.request.query_params.get('age_from', None)
        if age_from:
            try:
                age_from_int = int(age_from)
                # If age_from is 10, user must be at least 10, so born on or before today - 10 years
                max_birth_date = date.today() - timedelta(days=365 * age_from_int)
                queryset = queryset.filter(date_of_birth__lte=max_birth_date)
            except (ValueError, TypeError):
                pass
        
        age_to = self.request.query_params.get('age_to', None)
        if age_to:
            try:
                age_to_int = int(age_to)
                # If age_to is 18, user must be at most 18, so born on or after today - 19 years
                min_birth_date = date.today() - timedelta(days=365 * (age_to_int + 1))
                queryset = queryset.filter(date_of_birth__gte=min_birth_date)
            except (ValueError, TypeError):
                pass
        
        # Verification status filter
        verification_status = self.request.query_params.get('verification_status', None)
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)
        
        # Preferred club filter (for youth members)
        preferred_club = self.request.query_params.get('preferred_club', None)
        if preferred_club:
            queryset = queryset.filter(preferred_club=preferred_club)
        
        # Country filter (through municipality or preferred_club)
        country = self.request.query_params.get('country', None)
        if country:
            # For youth members, filter by preferred_club's municipality's country
            # For admins, filter by assigned_municipality's country
            queryset = queryset.filter(
                Q(preferred_club__municipality__country=country) |
                Q(assigned_municipality__country=country)
            )
        
        # Municipality filter
        municipality = self.request.query_params.get('municipality', None)
        if municipality:
            # For youth members, filter by preferred_club's municipality
            # For admins, filter by assigned_municipality
            queryset = queryset.filter(
                Q(preferred_club__municipality=municipality) |
                Q(assigned_municipality=municipality)
            )
            
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserManagementSerializer
        return CustomUserSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns analytics data for the Admin Dashboard.
        Only counts Admins (excludes Youth/Guardians).
        """
        # Base query: Only Admins
        admin_roles = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']
        admins = User.objects.filter(role__in=admin_roles)

        # 1. Total Count
        total = admins.count()

        # 2. Breakdown by Role
        role_counts = admins.values('role').annotate(count=Count('id'))
        # Convert to dictionary { 'SUPER_ADMIN': 5, ... }
        roles_data = {item['role']: item['count'] for item in role_counts}

        # 3. Breakdown by Gender
        gender_counts = admins.values('legal_gender').annotate(count=Count('id'))
        gender_data = {item['legal_gender']: item['count'] for item in gender_counts}

        # 4. Activity (Last 7 Days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        active_recently = admins.filter(last_login__gte=seven_days_ago).count()

        # 5. New Admins (Last 30 Days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        new_recently = admins.filter(date_joined__gte=thirty_days_ago).count()

        return Response({
            "total_admins": total,
            "roles": {
                "super": roles_data.get('SUPER_ADMIN', 0),
                "municipality": roles_data.get('MUNICIPALITY_ADMIN', 0),
                "club": roles_data.get('CLUB_ADMIN', 0)
            },
            "gender": {
                "male": gender_data.get('MALE', 0),
                "female": gender_data.get('FEMALE', 0),
                "other": gender_data.get('OTHER', 0)
            },
            "activity": {
                "active_7_days": active_recently,
                "new_30_days": new_recently
            }
        })

    @action(detail=False, methods=['get'])
    def youth_stats(self, request):
        """
        Returns analytics data specifically for Youth Members.
        """
        youth = User.objects.filter(role='YOUTH_MEMBER')

        # 1. Total Count
        total = youth.count()

        # 2. Breakdown by Grade
        grade_counts = youth.values('grade').annotate(count=Count('id')).order_by('grade')
        grade_data = {str(item['grade']): item['count'] for item in grade_counts if item['grade'] is not None}

        # 3. Breakdown by Gender
        gender_counts = youth.values('legal_gender').annotate(count=Count('id'))
        gender_data = {item['legal_gender']: item['count'] for item in gender_counts}

        # 4. Activity (Last 7 Days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        active_recently = youth.filter(last_login__gte=seven_days_ago).count()

        return Response({
            "total_youth": total,
            "grades": grade_data,
            "gender": {
                "male": gender_data.get('MALE', 0),
                "female": gender_data.get('FEMALE', 0),
                "other": gender_data.get('OTHER', 0)
            },
            "activity": {
                "active_7_days": active_recently
            }
        })

    @action(detail=False, methods=['get'])
    def list_guardians(self, request):
        """
        Returns a simple list of all users with role GUARDIAN.
        Used for dropdowns.
        """
        guardians = User.objects.filter(role='GUARDIAN').values('id', 'first_name', 'last_name', 'email')
        return Response(list(guardians))

    @action(detail=False, methods=['get'])
    def guardian_stats(self, request):
        """
        Returns analytics data specifically for Guardians.
        """
        guardians = User.objects.filter(role='GUARDIAN')

        # 1. Total Count
        total = guardians.count()

        # 2. Verification Status Breakdown
        status_counts = guardians.values('verification_status').annotate(count=Count('id'))
        status_data = {item['verification_status']: item['count'] for item in status_counts}

        # 3. Activity (Last 7 Days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        active_recently = guardians.filter(last_login__gte=seven_days_ago).count()

        # 4. Connected Youth Count (Avg or Total links)
        # Just counting total links for simplicity here
        total_connections = GuardianYouthLink.objects.count()

        return Response({
            "total_guardians": total,
            "verification": {
                "verified": status_data.get('VERIFIED', 0),
                "pending": status_data.get('PENDING', 0),
                "unverified": status_data.get('UNVERIFIED', 0)
            },
            "activity": {
                "active_7_days": active_recently,
                "total_connections": total_connections
            }
        })

    @action(detail=False, methods=['get'])
    def list_youth(self, request):
        """
        Returns a simple list of all Youth Members.
        Used for dropdowns in Guardian management.
        """
        youth = User.objects.filter(role='YOUTH_MEMBER').values('id', 'first_name', 'last_name', 'email', 'grade')
        return Response(list(youth))