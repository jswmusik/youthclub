from rest_framework import viewsets, filters, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta, date

from .models import User, GuardianYouthLink, UserLoginHistory
from .serializers import CustomUserSerializer, UserManagementSerializer, YouthRegistrationSerializer
from .permissions import IsSuperAdmin, IsMunicipalityAdmin, IsClubOrMunicipalityAdmin

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Admins to CRUD users based on their scope.
    """
    permission_classes = [IsClubOrMunicipalityAdmin]
    lookup_field = 'id'

    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        user = self.request.user

        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = queryset.filter(
                Q(assigned_municipality=user.assigned_municipality) |
                Q(assigned_club__municipality=user.assigned_municipality) |
                Q(preferred_club__municipality=user.assigned_municipality) |
                Q(guardian_links__youth__preferred_club__municipality=user.assigned_municipality) |
                Q(youth_links__youth__preferred_club__municipality=user.assigned_municipality)
            ).exclude(role='SUPER_ADMIN').distinct()
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            queryset = queryset.filter(
                Q(assigned_club=user.assigned_club) |
                Q(preferred_club=user.assigned_club) |
                Q(guardian_links__youth__preferred_club=user.assigned_club) |
                Q(youth_links__youth__preferred_club=user.assigned_club)
            ).exclude(role__in=['SUPER_ADMIN', 'MUNICIPALITY_ADMIN']).distinct()

        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)

        municipality = self.request.query_params.get('assigned_municipality')
        if municipality:
            queryset = queryset.filter(assigned_municipality=municipality)

        club = self.request.query_params.get('assigned_club')
        if club:
            queryset = queryset.filter(assigned_club=club)

        gender = self.request.query_params.get('legal_gender')
        if gender:
            queryset = queryset.filter(legal_gender=gender)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        grade_from = self.request.query_params.get('grade_from')
        if grade_from:
            try:
                queryset = queryset.filter(grade__gte=int(grade_from))
            except ValueError:
                pass

        grade_to = self.request.query_params.get('grade_to')
        if grade_to:
            try:
                queryset = queryset.filter(grade__lte=int(grade_to))
            except ValueError:
                pass

        age_from = self.request.query_params.get('age_from')
        if age_from:
            try:
                age_from_int = int(age_from)
                max_birth_date = date.today() - timedelta(days=365 * age_from_int)
                queryset = queryset.filter(date_of_birth__lte=max_birth_date)
            except (ValueError, TypeError):
                pass

        age_to = self.request.query_params.get('age_to')
        if age_to:
            try:
                age_to_int = int(age_to)
                min_birth_date = date.today() - timedelta(days=365 * (age_to_int + 1))
                queryset = queryset.filter(date_of_birth__gte=min_birth_date)
            except (ValueError, TypeError):
                pass

        verification_status = self.request.query_params.get('verification_status')
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)

        preferred_club = self.request.query_params.get('preferred_club')
        if preferred_club:
            queryset = queryset.filter(preferred_club=preferred_club)

        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(
                Q(preferred_club__municipality__country=country) |
                Q(assigned_municipality__country=country)
            )

        municipality_filter = self.request.query_params.get('municipality')
        if municipality_filter:
            queryset = queryset.filter(
                Q(preferred_club__municipality=municipality_filter) |
                Q(assigned_municipality=municipality_filter)
            )

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserManagementSerializer
        return CustomUserSerializer

    def perform_create(self, serializer):
        user = self.request.user

        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            serializer.save(assigned_municipality=user.assigned_municipality)
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            role = serializer.validated_data.get('role', 'YOUTH_MEMBER')
            if role == 'YOUTH_MEMBER':
                serializer.save(preferred_club=user.assigned_club)
            elif role == 'GUARDIAN':
                # Guardians don't have assigned_club, they're linked via youth members
                serializer.save()
            else:
                # For other roles (like CLUB_ADMIN), assign to club
                serializer.save(
                    assigned_club=user.assigned_club,
                    assigned_municipality=user.assigned_municipality,
                    role='CLUB_ADMIN'
                )
        else:
            serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            role = serializer.instance.role
            if role == 'YOUTH_MEMBER':
                serializer.save(preferred_club=user.assigned_club)
            else:
                serializer.save(assigned_club=user.assigned_club)
        elif getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            serializer.save(assigned_municipality=user.assigned_municipality)
        else:
            serializer.save()

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
        Scoped by Municipality if the user is a Municipality Admin.
        """
        user = request.user
        youth = User.objects.filter(role='YOUTH_MEMBER')

        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            youth = youth.filter(preferred_club__municipality=user.assigned_municipality)
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            youth = youth.filter(preferred_club=user.assigned_club)

        total = youth.count()

        grade_counts = youth.values('grade').annotate(count=Count('id')).order_by('grade')
        grade_data = {str(item['grade']): item['count'] for item in grade_counts if item['grade'] is not None}

        gender_counts = youth.values('legal_gender').annotate(count=Count('id'))
        gender_data = {item['legal_gender']: item['count'] for item in gender_counts}

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
        Returns a list of guardians.
        Super Admin: All guardians.
        Muni Admin: Only guardians linked to youth within their municipality.
        """
        user = request.user
        guardians = User.objects.filter(role='GUARDIAN')
        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            guardians = guardians.filter(
                youth_links__youth__preferred_club__municipality=user.assigned_municipality
            ).distinct()
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            guardians = guardians.filter(
                youth_links__youth__preferred_club=user.assigned_club
            ).distinct()

        values = guardians.values('id', 'first_name', 'last_name', 'email')
        return Response(list(values))

    @action(detail=False, methods=['get'])
    def guardian_stats(self, request):
        """
        Returns analytics data specifically for Guardians.
        Scoped by Municipality/Club if the user is an Admin.
        """
        user = request.user
        guardians = User.objects.filter(role='GUARDIAN')

        # Filter by scope
        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            guardians = guardians.filter(
                youth_links__youth__preferred_club__municipality=user.assigned_municipality
            ).distinct()
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            guardians = guardians.filter(
                youth_links__youth__preferred_club=user.assigned_club
            ).distinct()

        # 1. Total Count
        total = guardians.count()

        # 2. Verification Status Breakdown
        status_counts = guardians.values('verification_status').annotate(count=Count('id'))
        status_data = {item['verification_status']: item['count'] for item in status_counts}

        # 3. Activity (Last 7 Days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        active_recently = guardians.filter(last_login__gte=seven_days_ago).count()

        # 4. Connected Youth Count (scoped to this admin's youth)
        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            youth_ids = User.objects.filter(
                role='YOUTH_MEMBER',
                preferred_club__municipality=user.assigned_municipality
            ).values_list('id', flat=True)
            total_connections = GuardianYouthLink.objects.filter(youth_id__in=youth_ids).count()
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            youth_ids = User.objects.filter(
                role='YOUTH_MEMBER',
                preferred_club=user.assigned_club
            ).values_list('id', flat=True)
            total_connections = GuardianYouthLink.objects.filter(youth_id__in=youth_ids).count()
        else:
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
        user = request.user
        youth = User.objects.filter(role='YOUTH_MEMBER')
        if getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            youth = youth.filter(preferred_club__municipality=user.assigned_municipality)
        elif getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            youth = youth.filter(preferred_club=user.assigned_club)

        youth = youth.values('id', 'first_name', 'last_name', 'email', 'grade')
        return Response(list(youth))

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='login_history')
    def login_history(self, request):
        """
        Returns the latest 10 login events for the authenticated user.
        """
        history = UserLoginHistory.objects.filter(user=request.user).order_by('-timestamp')[:10]
        data = [
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
            }
            for log in history
        ]
        return Response(data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='log_login')
    def log_login(self, request):
        """
        Stores a login entry for the authenticated user.
        Useful for keeping a lightweight audit trail when tokens are issued.
        """
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR')
        if ip_address:
            ip_address = ip_address.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        user_agent = request.META.get('HTTP_USER_AGENT', '') or ''

        UserLoginHistory.objects.create(
            user=request.user,
            ip_address=ip_address,
            user_agent=user_agent[:512],
        )

        return Response({"status": "logged"})


class PublicRegistrationView(generics.CreateAPIView):
    """
    Public endpoint for new Youth Members to register.
    Permission: AllowAny (No login required)
    """
    queryset = User.objects.all()
    serializer_class = YouthRegistrationSerializer
    permission_classes = [permissions.AllowAny]