from rest_framework import viewsets, filters, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta, date

from .models import User, GuardianYouthLink, UserLoginHistory
from .serializers import (
    CustomUserSerializer, UserManagementSerializer, YouthRegistrationSerializer,
    GuardianYouthLinkSerializer, GuardianLinkCreateSerializer
)
from .permissions import IsSuperAdmin, IsMunicipalityAdmin, IsClubOrMunicipalityAdmin

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Admins to CRUD users based on their scope.
    """
    permission_classes = [IsClubOrMunicipalityAdmin]
    lookup_field = 'id'
    
    def update(self, request, *args, **kwargs):
        """
        Override to add better error handling and logging.
        """
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            import traceback
            print(f"Error updating user: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            print(f"Request data: {request.data}")
            print(f"Request user: {request.user}")
            raise

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
        instance = serializer.instance
        
        if getattr(user, 'role', None) == 'CLUB_ADMIN' and user.assigned_club:
            role = instance.role
            if role == 'YOUTH_MEMBER':
                serializer.save(preferred_club=user.assigned_club)
            elif role == 'GUARDIAN':
                # Guardians don't have assigned_club - save without it
                serializer.save()
            else:
                serializer.save(assigned_club=user.assigned_club)
        elif getattr(user, 'role', None) == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Only set municipality for non-guardian roles (guardians don't have assigned_municipality)
            if instance.role != 'GUARDIAN':
                serializer.save(assigned_municipality=user.assigned_municipality)
            else:
                serializer.save()
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
    authentication_classes = ()  # Skip authentication entirely for public endpoint (use tuple)


class YouthGuardiansViewSet(viewsets.ModelViewSet):
    """
    API endpoint for youth members to manage their guardians.
    GET: Returns list of GuardianYouthLink objects for the current user
    POST: Creates a new guardian link (with search vs. create logic)
    DELETE: Removes a guardian link
    """
    serializer_class = GuardianYouthLinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return only GuardianYouthLink objects where the current user is the youth.
        """
        user = self.request.user
        if user.role != User.Role.YOUTH_MEMBER:
            return GuardianYouthLink.objects.none()
        return GuardianYouthLink.objects.filter(youth=user).select_related('guardian').order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """
        POST /api/youth/guardians/
        Creates a guardian link. If guardian exists, links them. If not, creates a shadow guardian.
        """
        user = request.user
        
        # Only youth members can add guardians
        if user.role != User.Role.YOUTH_MEMBER:
            return Response(
                {"error": "Only youth members can add guardians."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = GuardianLinkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email'].lower().strip()
        first_name = serializer.validated_data['first_name']
        last_name = serializer.validated_data['last_name']
        relationship_type = serializer.validated_data.get('relationship_type', 'GUARDIAN')
        is_primary_guardian = serializer.validated_data.get('is_primary_guardian', False)
        phone_number = serializer.validated_data.get('phone_number', '')
        legal_gender = serializer.validated_data.get('legal_gender', 'MALE')  # Default to MALE if not provided
        
        # Check if link already exists
        existing_link = GuardianYouthLink.objects.filter(
            youth=user,
            guardian__email=email
        ).first()
        
        if existing_link:
            return Response(
                {"error": "This guardian is already linked to your account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Search for existing guardian by email
        guardian_user = User.objects.filter(email=email).first()
        guardian_existed = guardian_user is not None
        
        if not guardian_user:
            # CREATE SHADOW GUARDIAN
            # Create an inactive user with a random unusable password
            from django.utils.crypto import get_random_string
            random_password = get_random_string(50)
            guardian_user = User.objects.create_user(
                email=email,
                password=random_password,
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                legal_gender=legal_gender,
                role=User.Role.GUARDIAN,
                is_active=False,  # Inactive until they claim account
                verification_status=User.VerificationStatus.UNVERIFIED
            )
        
        # Create the link
        link = GuardianYouthLink.objects.create(
            youth=user,
            guardian=guardian_user,
            relationship_type=relationship_type,
            is_primary_guardian=is_primary_guardian,
            status='PENDING'  # Default to pending for youth-added guardians
        )
        
        # If this is set as primary, unset others
        if is_primary_guardian:
            GuardianYouthLink.objects.filter(
                youth=user,
                is_primary_guardian=True
            ).exclude(id=link.id).update(is_primary_guardian=False)
        
        response_serializer = GuardianYouthLinkSerializer(link)
        response_data = response_serializer.data
        # Add metadata about whether guardian existed
        response_data['guardian_existed'] = guardian_existed
        response_data['guardian_is_active'] = guardian_user.is_active if guardian_existed else False
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/youth/guardians/{id}/
        Removes a guardian link.
        """
        user = request.user
        
        # Only youth members can remove their own guardian links
        if user.role != User.Role.YOUTH_MEMBER:
            return Response(
                {"error": "Only youth members can remove guardian links."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        link = self.get_object()
        
        # Verify the link belongs to the current user
        if link.youth != user:
            return Response(
                {"error": "You can only remove your own guardian links."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GuardianRelationshipViewSet(viewsets.ModelViewSet):
    """
    API endpoint for admins to manage guardian-youth relationships.
    Allows admins to verify, reject, or view relationships.
    """
    serializer_class = GuardianYouthLinkSerializer
    permission_classes = [IsClubOrMunicipalityAdmin]
    
    def get_queryset(self):
        """
        Return GuardianYouthLink objects based on admin scope and query parameters.
        """
        user = self.request.user
        queryset = GuardianYouthLink.objects.select_related('guardian', 'youth').all()
        
        # Filter by guardian_id if provided
        guardian_id = self.request.query_params.get('guardian')
        if guardian_id:
            try:
                queryset = queryset.filter(guardian_id=int(guardian_id))
            except (ValueError, TypeError):
                pass
        
        # Filter by youth_id if provided
        youth_id = self.request.query_params.get('youth')
        if youth_id:
            try:
                queryset = queryset.filter(youth_id=int(youth_id))
            except (ValueError, TypeError):
                pass
        
        # Filter by status if provided
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Apply admin scope filtering
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Municipality admin sees relationships for youth in their municipality
            queryset = queryset.filter(
                youth__preferred_club__municipality=user.assigned_municipality
            )
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Club admin sees relationships for youth in their club
            queryset = queryset.filter(
                youth__preferred_club=user.assigned_club
            )
        # Super admin sees all relationships
        
        return queryset.distinct().order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        POST /api/admin/guardian-relationships/{id}/verify/
        Verify a guardian-youth relationship.
        Sets status to ACTIVE and records verification timestamp.
        """
        link = self.get_object()
        
        link.status = 'ACTIVE'
        link.verified_at = timezone.now()
        link.save()
        
        serializer = self.get_serializer(link)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        POST /api/admin/guardian-relationships/{id}/reject/
        Reject a guardian-youth relationship.
        Sets status to REJECTED.
        """
        link = self.get_object()
        
        link.status = 'REJECTED'
        link.save()
        
        serializer = self.get_serializer(link)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reset(self, request, pk=None):
        """
        POST /api/admin/guardian-relationships/{id}/reset/
        Reset a relationship back to PENDING status.
        """
        link = self.get_object()
        
        link.status = 'PENDING'
        link.verified_at = None
        link.save()
        
        serializer = self.get_serializer(link)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CheckEmailView(APIView):
    """
    Checks if an email is already registered (for Youth Registration Step 2).
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = ()

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({"exists": False})
        
        exists = User.objects.filter(email=email).exists()
        return Response({"exists": exists})


class CheckGuardianView(APIView):
    """
    Checks if a guardian email exists.
    Returns { "exists": true/false }
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = ()  # Skip authentication entirely for public endpoint (use tuple)

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({"exists": False})
        
        # Check if a user with this email exists (any role, but usually guardians)
        exists = User.objects.filter(email=email).exists()
        return Response({"exists": exists})