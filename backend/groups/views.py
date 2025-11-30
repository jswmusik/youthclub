from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta, date
import json
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupMembershipSerializer
from .permissions import IsGroupAdminOrReadOnly, IsGroupMembershipAdmin
from users.models import User
from users.serializers import CustomUserSerializer

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsGroupAdminOrReadOnly]

    def get_queryset(self):
        """
        Filter groups based on visibility scope.
        """
        user = self.request.user
        
        # Unauthenticated or Swagger generation
        if not user.is_authenticated:
            return Group.objects.none()

        # 1. Admins see everything in their jurisdiction (No changes here)
        if user.role == 'SUPER_ADMIN':
            queryset = Group.objects.all().order_by('-created_at')

        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = Group.objects.filter(
                Q(municipality=user.assigned_municipality) |
                Q(club__municipality=user.assigned_municipality)
            ).distinct().order_by('-created_at')

        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            queryset = Group.objects.filter(club=user.assigned_club).order_by('-created_at')

        else:
            # 2. Youth / Guardians (The Search Logic)
            
            # Start with groups the user is ALREADY in (so they don't disappear)
            base_query = Q(memberships__user=user)

            # Add PUBLICLY visible groups based on Scope
            # Scope A: Global Groups
            scope_query = Q(municipality__isnull=True, club__isnull=True)
            
            # Scope B: My Municipality (Groups created directly by Muni)
            if user.assigned_municipality:
                scope_query |= Q(municipality=user.assigned_municipality, club__isnull=True)

            # Scope C: My Primary Club
            if user.assigned_club:
                scope_query |= Q(club=user.assigned_club)

            # Scope D: Followed Clubs (NEW)
            # We get the IDs of clubs the user follows
            if hasattr(user, 'followed_clubs'):
                scope_query |= Q(club__in=user.followed_clubs.all())

            # Combine: (Am Member) OR ((In Scope) AND (Is Open/App))
            # We filter for OPEN/APPLICATION because 'CLOSED' groups shouldn't show up in search unless you are already a member.
            final_query = base_query | (scope_query & Q(group_type__in=['OPEN', 'APPLICATION']))

            queryset = Group.objects.filter(final_query).distinct().order_by('-created_at')

        # --- Filter by specific Club (for Club Profile Page) ---
        club_param = self.request.query_params.get('club')
        if club_param:
            queryset = queryset.filter(club_id=club_param)

        return queryset.distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'MUNICIPALITY_ADMIN':
            serializer.save(municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN':
            serializer.save(club=user.assigned_club)
        else:
            serializer.save()

    # --- Actions for Members ---

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        group = self.get_object()
        user = request.user

        if GroupMembership.objects.filter(group=group, user=user).exists():
            return Response({"message": "Already a member or application pending."}, status=status.HTTP_400_BAD_REQUEST)

        if group.group_type == 'CLOSED':
            return Response({"message": "Cannot join a closed group."}, status=status.HTTP_403_FORBIDDEN)

        membership_status = 'APPROVED' if group.group_type == 'OPEN' else 'PENDING'
        
        GroupMembership.objects.create(
            group=group,
            user=user,
            status=membership_status,
            role='MEMBER'
        )
        
        msg = "Joined successfully" if membership_status == 'APPROVED' else "Application sent"
        return Response({"message": msg, "status": membership_status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        group = self.get_object()
        user = request.user
        
        if group.is_system_group:
             return Response({"message": "Cannot leave a system-managed group manually."}, status=status.HTTP_403_FORBIDDEN)

        deleted_count, _ = GroupMembership.objects.filter(group=group, user=user).delete()
        
        if deleted_count > 0:
            return Response({"message": "Left group successfully."})
        return Response({"message": "You are not in this group."}, status=status.HTTP_400_BAD_REQUEST)

    # --- Actions for Admins ---

    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        original = self.get_object()
        
        original.pk = None
        original.id = None
        original.name = f"{original.name} (Copy)"
        original.is_system_group = False 
        original.save()
        
        original.interests.set(self.get_object().interests.all())
        
        return Response(GroupSerializer(original).data)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """
        Get list of members. ADMIN ONLY.
        """
        if request.user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        group = self.get_object()
        status_param = request.query_params.get('status') # Optional: filter by PENDING/APPROVED
        
        queryset = group.memberships.select_related('user').order_by('-joined_at')
        
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = GroupMembershipSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = GroupMembershipSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """
        Get stats for the group. ADMIN ONLY.
        """
        if request.user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        group = self.get_object()
        memberships = group.memberships.filter(status='APPROVED')
        
        # 1. Total
        total = memberships.count()
        
        # 2. New this week
        week_ago = timezone.now() - timedelta(days=7)
        new_this_week = memberships.filter(joined_at__gte=week_ago).count()
        
        # 3. Gender Dist
        gender_dist = memberships.values('user__legal_gender').annotate(count=Count('id'))
        gender_data = {item['user__legal_gender']: item['count'] for item in gender_dist}
        
        # 4. Grade Dist (Youth only)
        grade_dist = memberships.exclude(user__grade__isnull=True).values('user__grade').annotate(count=Count('id'))
        grade_data = {item['user__grade']: item['count'] for item in grade_dist}
        
        return Response({
            "total_members": total,
            "new_this_week": new_this_week,
            "gender_distribution": gender_data,
            "grade_distribution": grade_data,
        })
    
    @action(detail=True, methods=['post'], url_path='approve_member')
    def approve_member(self, request, pk=None):
        """
        Approve a pending member. Payload: { "membership_id": 123 }
        """
        membership_id = request.data.get('membership_id')
        try:
            membership = GroupMembership.objects.get(id=membership_id, group_id=pk)
            membership.status = 'APPROVED'
            membership.save()
            return Response({"status": "approved"})
        except GroupMembership.DoesNotExist:
            return Response({"error": "Membership not found"}, status=404)

    @action(detail=True, methods=['post'], url_path='remove_member')
    def remove_member(self, request, pk=None):
        """
        Remove/Deny a member. Payload: { "membership_id": 123 }
        """
        membership_id = request.data.get('membership_id')
        try:
            GroupMembership.objects.get(id=membership_id, group_id=pk).delete()
            return Response({"status": "removed"})
        except GroupMembership.DoesNotExist:
            return Response({"error": "Membership not found"}, status=404)

    @action(detail=False, methods=['get'])
    def search_candidates(self, request):
        """
        Returns users who MATCH the provided criteria (age, grade, custom fields)
        AND fall within the Admin's scope.
        """
        user = request.user
        
        # 1. Base Scope: Filter by Admin Role
        queryset = User.objects.filter(is_active=True)
        
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = queryset.filter(
                Q(preferred_club__municipality=user.assigned_municipality) |
                Q(assigned_municipality=user.assigned_municipality)
            )
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            queryset = queryset.filter(preferred_club=user.assigned_club)
        
        # 2. Filter by Member Type
        member_type = request.query_params.get('target_member_type', 'YOUTH')
        if member_type == 'YOUTH':
            queryset = queryset.filter(role='YOUTH_MEMBER')
        elif member_type == 'GUARDIAN':
            queryset = queryset.filter(role='GUARDIAN')

        # 3. Filter by Grade
        grades_param = request.query_params.get('grades')
        if grades_param:
            try:
                grade_list = [int(g) for g in grades_param.split(',') if g.strip()]
                if grade_list:
                    queryset = queryset.filter(grade__in=grade_list)
            except ValueError:
                pass

        # 4. Filter by Gender
        genders_param = request.query_params.get('genders')
        if genders_param:
            gender_list = [g.strip() for g in genders_param.split(',') if g.strip()]
            if gender_list:
                queryset = queryset.filter(legal_gender__in=gender_list)

        # 5. Filter by Interests
        interests_param = request.query_params.get('interests')
        if interests_param:
            try:
                interest_ids = [int(i) for i in interests_param.split(',') if i.strip()]
                if interest_ids:
                    queryset = queryset.filter(interests__id__in=interest_ids).distinct()
            except ValueError:
                pass

        # 6. Filter by Age Range
        min_age = request.query_params.get('min_age')
        max_age = request.query_params.get('max_age')
        if min_age or max_age:
            today = date.today()
            if min_age:
                max_dob = today.replace(year=today.year - int(min_age))
                queryset = queryset.filter(date_of_birth__lte=max_dob)
            if max_age:
                min_dob = today.replace(year=today.year - int(max_age) - 1)
                queryset = queryset.filter(date_of_birth__gt=min_dob)

        # 7. Text Search
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) | 
                Q(last_name__icontains=search) | 
                Q(email__icontains=search)
            )

        # 8. Exclude existing
        group_id = request.query_params.get('exclude_group')
        if group_id:
            queryset = queryset.exclude(group_memberships__group_id=group_id)

        # 9. NEW: Filter by Custom Fields
        # Format: {"field_id": "value", "field_id": true}
        custom_rules_str = request.query_params.get('custom_field_rules')
        if custom_rules_str:
            try:
                custom_rules = json.loads(custom_rules_str)
                for field_id, value in custom_rules.items():
                    # We look for users who have a CustomFieldValue entry matching this field and value
                    # Note: 'value' is a JSONField in DB, so strict equality works for strings/bools
                    # For lists (Multi-Select), we might need logic changes, but let's assume single match for now.
                    if isinstance(value, bool):
                        # Handle booleans safely
                        queryset = queryset.filter(
                            custom_field_values__field_id=field_id,
                            custom_field_values__value=value
                        )
                    else:
                        # String matching
                        queryset = queryset.filter(
                            custom_field_values__field_id=field_id,
                            custom_field_values__value__icontains=str(value)
                        )
            except (ValueError, json.JSONDecodeError):
                pass

        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CustomUserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CustomUserSerializer(queryset, many=True)
        return Response(serializer.data)


class GroupMembershipViewSet(viewsets.ModelViewSet):
    """
    Dedicated endpoint for managing pending join requests across ALL groups.
    """
    serializer_class = GroupMembershipSerializer
    permission_classes = [IsGroupMembershipAdmin]

    def get_queryset(self):
        user = self.request.user
        
        # Base: Only return Pending requests
        queryset = GroupMembership.objects.filter(status='PENDING').select_related('group', 'user')

        # 1. Scope Filtering
        if user.role == 'SUPER_ADMIN':
            pass # See all
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = queryset.filter(
                Q(group__municipality=user.assigned_municipality) |
                Q(group__club__municipality=user.assigned_municipality)
            )
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            queryset = queryset.filter(group__club=user.assigned_club)
        else:
            return GroupMembership.objects.none()

        # 2. Filter by Group Name (Frontend Search)
        group_name = self.request.query_params.get('group_name')
        if group_name:
            queryset = queryset.filter(group__name__icontains=group_name)

        return queryset.order_by('-joined_at')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        membership = self.get_object()
        membership.status = 'APPROVED'
        membership.save()
        return Response({'status': 'approved', 'message': 'Request approved successfully.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        membership = self.get_object()
        membership.delete() # Or set status='REJECTED'
        return Response({'status': 'rejected', 'message': 'Request rejected.'})