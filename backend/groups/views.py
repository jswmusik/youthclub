from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta, date
import json
import random
from django_filters.rest_framework import DjangoFilterBackend
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupMembershipSerializer
from .permissions import IsGroupAdminOrReadOnly, IsGroupMembershipAdmin
from users.models import User
from users.serializers import CustomUserSerializer
from custom_fields.models import CustomFieldValue

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsGroupAdminOrReadOnly]
    
    # --- ADDED SEARCH CAPABILITY ---
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'municipality__name']

    def get_object(self):
        """
        Override to allow access to groups by ID even if they're not in the queryset.
        This ensures users can access groups they're eligible for, even if scope filtering
        would normally exclude them from the list view.
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        try:
            # Try to get the group directly by ID
            group = Group.objects.get(pk=lookup_value)
            
            # Check if user has permission to view this group
            user = self.request.user
            
            # Admins can see any group
            if user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
                return group
            
            # For youth/guardians, check if they're a member OR if the group is visible to them
            # (OPEN/APPLICATION and matches their scope)
            is_member = GroupMembership.objects.filter(group=group, user=user).exists()
            
            if is_member:
                return group
            
            # Check if group is visible (OPEN/APPLICATION and in scope)
            if group.group_type in ['OPEN', 'APPLICATION']:
                # Check scope
                scope_match = False
                
                # Global groups
                if not group.municipality and not group.club:
                    scope_match = True
                
                # User's municipality
                if not scope_match and user.assigned_municipality and group.municipality == user.assigned_municipality:
                    scope_match = True
                
                # User's preferred club
                if not scope_match and user.preferred_club and group.club == user.preferred_club:
                    scope_match = True
                
                # Followed clubs
                if not scope_match and hasattr(user, 'followed_clubs') and group.club in user.followed_clubs.all():
                    scope_match = True
                
                if scope_match:
                    return group
            
            # If none of the above, raise 404
            from rest_framework.exceptions import NotFound
            raise NotFound("Group not found")
            
        except Group.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Group not found")

    def get_queryset(self):
        """
        Filter groups based on visibility scope.
        """
        user = self.request.user
        
        # Unauthenticated or Swagger generation
        if not user.is_authenticated:
            return Group.objects.none()

        # Exclude system groups from regular list view (they're managed automatically)
        base_queryset = Group.objects.exclude(is_system_group=True)
        
        # 1. Admins see everything in their jurisdiction (No changes here)
        if user.role == 'SUPER_ADMIN':
            queryset = base_queryset.order_by('-created_at')

        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = base_queryset.filter(
                Q(municipality=user.assigned_municipality) |
                Q(club__municipality=user.assigned_municipality)
            ).distinct().order_by('-created_at')

        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            queryset = base_queryset.filter(club=user.assigned_club).order_by('-created_at')

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

            # Scope C: My Primary Club (use preferred_club for youth members)
            if user.preferred_club:
                scope_query |= Q(club=user.preferred_club)

            # Scope D: Followed Clubs (NEW)
            # We get the IDs of clubs the user follows
            if hasattr(user, 'followed_clubs'):
                scope_query |= Q(club__in=user.followed_clubs.all())

            # Combine: (Am Member) OR ((In Scope) AND (Is Open/App))
            # We filter for OPEN/APPLICATION because 'CLOSED' groups shouldn't show up in search unless you are already a member.
            final_query = base_query | (scope_query & Q(group_type__in=['OPEN', 'APPLICATION']))

            queryset = base_queryset.filter(final_query).distinct().order_by('-created_at')

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

        # Check for existing membership
        existing_membership = GroupMembership.objects.filter(group=group, user=user).first()
        
        if existing_membership:
            # If approved, they're already a member
            if existing_membership.status == GroupMembership.Status.APPROVED:
                return Response({"message": "Already a member."}, status=status.HTTP_400_BAD_REQUEST)
            
            # If pending, they already have an application
            if existing_membership.status == GroupMembership.Status.PENDING:
                return Response({"message": "Application pending."}, status=status.HTTP_400_BAD_REQUEST)
            
            # If rejected, check if they can re-apply (max 3 rejections)
            if existing_membership.status == GroupMembership.Status.REJECTED:
                if existing_membership.rejection_count >= 3:
                    return Response({
                        "message": "Maximum application attempts reached. You cannot apply again.",
                        "rejection_count": existing_membership.rejection_count
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Allow re-applying: reset status to PENDING (keep rejection_count)
                membership_status = 'APPROVED' if group.group_type == 'OPEN' else 'PENDING'
                existing_membership.status = membership_status
                existing_membership.save(update_fields=['status', 'updated_at'])
                
                msg = "Joined successfully" if membership_status == 'APPROVED' else "Application sent"
                return Response({
                    "message": msg,
                    "status": membership_status,
                    "rejection_count": existing_membership.rejection_count
                })

        if group.group_type == 'CLOSED':
            return Response({"message": "Cannot join a closed group."}, status=status.HTTP_403_FORBIDDEN)

        # Create new membership
        membership_status = 'APPROVED' if group.group_type == 'OPEN' else 'PENDING'
        
        GroupMembership.objects.create(
            group=group,
            user=user,
            status=membership_status,
            role='MEMBER',
            rejection_count=0
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

    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """
        Returns a list of groups recommended for the current user.
        Logic parallels PostEngine:
        1. Scope: Global, My Muni, My Club, Followed Clubs.
        2. Status: Not 'CLOSED', Not already a member.
        3. Eligibility: Strict checks on Age, Grade, Gender, Interests, Custom Fields.
        """
        user = request.user
        if not user.is_authenticated:
            return Response([])

        # --- 1. Base Scope Candidate Generation ---
        
        # Start with groups user is NOT in
        queryset = Group.objects.exclude(memberships__user=user)
        
        # Filter for OPEN or APPLICATION types only (Closed groups are invite-only)
        queryset = queryset.filter(group_type__in=['OPEN', 'APPLICATION'])
        
        # Build Scope Query
        scope_query = Q(municipality__isnull=True, club__isnull=True) # Global
        
        if user.assigned_municipality:
            scope_query |= Q(municipality=user.assigned_municipality)
            
        if user.preferred_club:
            scope_query |= Q(club=user.preferred_club)
            
        # Add Followed Clubs (Both Open and Application groups as requested)
        if hasattr(user, 'followed_clubs'):
            scope_query |= Q(club__in=user.followed_clubs.all())
            
        queryset = queryset.filter(scope_query).distinct().prefetch_related('interests')

        # --- 2. Python-Side Eligibility Filtering (Strict) ---
        # We process this in Python to handle JSON fields (grades, genders, custom rules) 
        # consistent with PostEngine and SQLite limitations.

        # Pre-fetch user data for comparisons
        user_grade = user.grade
        user_gender = user.legal_gender
        user_age = user.age
        user_interest_ids = set(user.interests.values_list('id', flat=True))
        
        # Get user custom fields for rule matching
        user_custom_fields = CustomFieldValue.objects.filter(user=user).select_related('field')
        user_cf_dict = {cfv.field_id: cfv.value for cfv in user_custom_fields}

        valid_group_ids = []

        for group in queryset:
            # A. Member Type Check
            if group.target_member_type == 'YOUTH' and user.role != 'YOUTH_MEMBER':
                continue
            if group.target_member_type == 'GUARDIAN' and user.role != 'GUARDIAN':
                continue

            # B. Age Check
            if group.min_age is not None and user_age is not None and user_age < group.min_age:
                continue
            if group.max_age is not None and user_age is not None and user_age > group.max_age:
                continue

            # C. Gender Check
            # If group has restricted genders, user MUST match one
            if group.genders:
                if not user_gender or user_gender not in group.genders:
                    continue

            # D. Grade Check
            # If group has restricted grades, user MUST match one
            if group.grades:
                if user_grade is None or user_grade not in group.grades:
                    continue

            # E. Interest Check (Strict)
            # If group requires interests, user MUST have at least one of them
            group_interest_ids = set(group.interests.values_list('id', flat=True))
            if group_interest_ids:
                if not user_interest_ids.intersection(group_interest_ids):
                    continue

            # F. Custom Field Rules Check
            # Rules format: {"field_id_5": true, "field_id_10": "Option A"}
            if group.custom_field_rules:
                matches_custom = True
                for field_id_str, required_value in group.custom_field_rules.items():
                    try:
                        field_id = int(field_id_str)
                        user_value = user_cf_dict.get(field_id)
                        
                        # Strict equality check
                        if user_value is None or user_value != required_value:
                            matches_custom = False
                            break
                    except (ValueError, TypeError):
                        continue
                
                if not matches_custom:
                    continue

            # If we passed all checks, it's a valid recommendation
            valid_group_ids.append(group.id)

        # --- 3. Final Selection ---
        # Return random selection of valid groups
        if not valid_group_ids:
            return Response([])

        # Shuffle list
        random.shuffle(valid_group_ids)
        
        # We fetch the full objects again to serialize them properly
        # We limit to 10 candidates to allow the frontend to scroll through a few
        final_groups = Group.objects.filter(id__in=valid_group_ids[:10])
        
        serializer = GroupSerializer(final_groups, many=True, context={'request': request})
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
        # CHANGED: We now mark it as rejected instead of deleting it.
        # This allows us to trigger the signal for the notification.
        # Increment rejection count when rejecting
        membership.status = 'REJECTED'
        membership.rejection_count += 1
        membership.save(update_fields=['status', 'rejection_count', 'updated_at'])
        return Response({
            'status': 'rejected',
            'message': 'Request rejected.',
            'rejection_count': membership.rejection_count
        })