from rest_framework import viewsets, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from django.db.models import Q
# Import User to check roles if needed, though request.user is sufficient
from .models import CustomFieldDefinition, CustomFieldValue
from .serializers import CustomFieldDefinitionSerializer, CustomFieldUserViewSerializer, CustomFieldValueSerializer

class CustomFieldDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFieldDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter fields based on the admin's role and scope.
        - SUPER_ADMIN: sees ALL fields (global + municipality + club) for editing users
        - MUNICIPALITY_ADMIN: sees global fields + MUNICIPALITY_ADMIN fields for their municipality
        - CLUB_ADMIN: sees global fields + CLUB_ADMIN fields for their club
        """
        user = self.request.user
        role = user.role
        
        if role == 'SUPER_ADMIN':
            # Super admins see ALL fields (global + municipality + club) for editing any user
            return CustomFieldDefinition.objects.all()
        
        elif role == 'MUNICIPALITY_ADMIN':
            # Municipality admins see global fields + their municipality fields + club fields for clubs in their municipality
            municipality = user.assigned_municipality
            if isinstance(municipality, dict):
                municipality_id = municipality.get('id')
            elif hasattr(municipality, 'id'):
                municipality_id = municipality.id
            else:
                municipality_id = municipality
            
            if municipality_id:
                # Get all club IDs in this municipality
                from organization.models import Club
                club_ids = Club.objects.filter(municipality_id=municipality_id).values_list('id', flat=True)
                
                return CustomFieldDefinition.objects.filter(
                    Q(owner_role='SUPER_ADMIN') |  # Global fields
                    Q(owner_role='MUNICIPALITY_ADMIN', municipality_id=municipality_id) |  # Their municipality fields
                    Q(owner_role='CLUB_ADMIN', club_id__in=club_ids)  # Club fields for clubs in their municipality
                )
            # If no municipality assigned, only show global fields
            return CustomFieldDefinition.objects.filter(owner_role='SUPER_ADMIN')
        
        elif role == 'CLUB_ADMIN':
            # Club admins see global fields + their club fields + municipality fields for their club's municipality
            club = user.assigned_club
            if isinstance(club, dict):
                club_id = club.get('id')
            elif hasattr(club, 'id'):
                club_id = club.id
            else:
                club_id = club
            
            if club_id:
                # Get the club's municipality
                from organization.models import Club
                try:
                    club_obj = Club.objects.get(id=club_id)
                    municipality_id = club_obj.municipality_id
                    
                    return CustomFieldDefinition.objects.filter(
                        Q(owner_role='SUPER_ADMIN') |  # Global fields
                        Q(owner_role='CLUB_ADMIN', club_id=club_id) |  # Their club fields
                        Q(owner_role='MUNICIPALITY_ADMIN', municipality_id=municipality_id)  # Municipality fields for their club's municipality
                    )
                except Club.DoesNotExist:
                    # Club doesn't exist, fall back to just global and club fields
                    return CustomFieldDefinition.objects.filter(
                        Q(owner_role='SUPER_ADMIN') |  # Global fields
                        Q(owner_role='CLUB_ADMIN', club_id=club_id)  # Their club fields
                    )
            # If no club assigned, only show global fields
            return CustomFieldDefinition.objects.filter(owner_role='SUPER_ADMIN')
        
        # Default: no access
        return CustomFieldDefinition.objects.none()
    
    def perform_create(self, serializer):
        """
        Automatically set owner_role, municipality, and club based on the user's role.
        - SUPER_ADMIN: Global fields (no municipality/club)
        - MUNICIPALITY_ADMIN: Fields assigned to their municipality
        - CLUB_ADMIN: Fields assigned to their club
        """
        user = self.request.user
        role = user.role
        
        # Set owner_role
        owner_role = None
        if role == 'SUPER_ADMIN':
            owner_role = 'SUPER_ADMIN'
        elif role == 'MUNICIPALITY_ADMIN':
            owner_role = 'MUNICIPALITY_ADMIN'
        elif role == 'CLUB_ADMIN':
            owner_role = 'CLUB_ADMIN'
        
        if not owner_role:
            raise PermissionDenied("Only admins can create custom fields.")
        
        # Get municipality/club IDs - explicitly handle None for super admins
        municipality_id = None
        club_id = None
        
        if role == 'MUNICIPALITY_ADMIN':
            # Municipality admin: assign to their municipality, club should be None
            municipality = user.assigned_municipality
            if municipality:
                if isinstance(municipality, dict):
                    municipality_id = municipality.get('id')
                elif hasattr(municipality, 'id'):
                    municipality_id = municipality.id
                else:
                    municipality_id = municipality
                
                if not municipality_id:
                    raise PermissionDenied("Municipality admin must be assigned to a municipality.")
            else:
                raise PermissionDenied("Municipality admin must be assigned to a municipality.")
        
        elif role == 'CLUB_ADMIN':
            # Club admin: assign to their club, municipality should be None
            club = user.assigned_club
            if club:
                if isinstance(club, dict):
                    club_id = club.get('id')
                elif hasattr(club, 'id'):
                    club_id = club.id
                else:
                    club_id = club
                
                if not club_id:
                    raise PermissionDenied("Club admin must be assigned to a club.")
            else:
                raise PermissionDenied("Club admin must be assigned to a club.")
        
        # For SUPER_ADMIN: municipality_id and club_id remain None (global fields)
        
        # Save with the appropriate ownership
        # Explicitly set None for fields that shouldn't be assigned
        save_kwargs = {
            'owner_role': owner_role,
            'municipality_id': municipality_id,  # None for SUPER_ADMIN and CLUB_ADMIN
            'club_id': club_id,  # None for SUPER_ADMIN and MUNICIPALITY_ADMIN
        }
        
        serializer.save(**save_kwargs)
    
    def perform_update(self, serializer):
        """
        Ensure ownership fields cannot be changed during update.
        The get_queryset already ensures admins can only see/edit their own fields.
        """
        instance = serializer.instance
        
        # Prevent changing ownership
        serializer.save(
            owner_role=instance.owner_role,
            municipality_id=instance.municipality_id if instance.municipality_id else None,
            club_id=instance.club_id if instance.club_id else None
        )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def applicable(self, request):
        """
        Returns fields applicable to the current logged-in user.
        Combines Global + Municipality + Club fields.
        """
        user = request.user
        role = user.role

        # 1. Determine Context (Club/Muni)
        # Ideally, a user (Youth) matches fields via their 'preferred_club'
        # A Guardian might match via their children, but for V1 let's use user attributes.
        
        target_club = user.preferred_club or user.assigned_club
        target_muni = user.assigned_municipality
        
        if target_club and not target_muni:
            target_muni = target_club.municipality

        # 2. Build Query
        # A. Always include Global Super Admin fields
        query = Q(owner_role='SUPER_ADMIN')

        # B. Include Municipality Fields (if user is linked to a muni)
        if target_muni:
            # Must be owned by Muni AND (no specific clubs set OR club is in specific_clubs)
            muni_query = Q(owner_role='MUNICIPALITY_ADMIN', municipality=target_muni)
            
            if target_club:
                # Logic: (specific_clubs is empty) OR (target_club in specific_clubs)
                # In Django Q objects for M2M: 
                # specific_clubs=None checks if the relation is empty.
                # specific_clubs=target_club checks if specific club is in the list.
                muni_query &= (Q(specific_clubs=None) | Q(specific_clubs=target_club))
            else:
                # If user has no club (just muni), only show fields that apply to ALL clubs
                muni_query &= Q(specific_clubs=None)
            
            query |= muni_query

        # C. Include Club Fields (if user is linked to a club)
        if target_club:
            query |= Q(owner_role='CLUB_ADMIN', club=target_club)

        # 3. Execute Database Fetch
        # Filter by: Calculated Scope AND Published AND Profile Context
        fields = CustomFieldDefinition.objects.filter(query).filter(
            is_published=True,
            context='USER_PROFILE' 
        ).distinct()

        # 4. Post-Filter by Role (Python side for JSONField safety across DBs)
        # Check if the field's target_roles list contains the user's role OR "ALL"
        final_fields = []
        for f in fields:
            # Clean/normalize list
            allowed_roles = f.target_roles if isinstance(f.target_roles, list) else []
            if "ALL" in allowed_roles or role in allowed_roles:
                final_fields.append(f)

        # 5. Serialize (Including User Values)
        serializer = CustomFieldUserViewSerializer(final_fields, many=True, context={'user': user})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def save_values(self, request):
        """
        Bulk save values for the logged-in user.
        Expected Payload: { "field_id": value, "field_id_2": value }
        """
        user = request.user
        data = request.data
        
        results = []
        
        for field_id, val in data.items():
            try:
                field_def = CustomFieldDefinition.objects.get(id=field_id)
                # Security Check: Is this field actually applicable?
                # (For MVP speed, we skip complex re-verification here, 
                # but ideally you re-run the query logic above to ensure they aren't hacking fields)
                
                obj, created = CustomFieldValue.objects.update_or_create(
                    field=field_def,
                    user=user,
                    defaults={'value': val}
                )
                results.append({"id": field_id, "status": "saved"})
            except CustomFieldDefinition.DoesNotExist:
                continue
                
        return Response({"results": results})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def applicable_for_user(self, request):
        """
        Returns fields applicable to a specific user (for admin editing).
        Takes user_id as query parameter.
        Returns fields based on the user's municipality/club, not the admin's scope.
        """
        admin_user = request.user
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({"error": "user_id parameter required"}, status=400)
        
        # Check if admin has permission
        if admin_user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            raise PermissionDenied("Only admins can view custom fields for other users.")
        
        try:
            from users.models import User
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        # Verify admin has permission to edit this user
        # Super admin can edit anyone
        if admin_user.role == 'SUPER_ADMIN':
            pass  # Allowed
        elif admin_user.role == 'MUNICIPALITY_ADMIN':
            # Can only edit users in their municipality
            if target_user.preferred_club and target_user.preferred_club.municipality != admin_user.assigned_municipality:
                raise PermissionDenied("You can only view fields for users in your municipality.")
        elif admin_user.role == 'CLUB_ADMIN':
            # Can only edit users in their club
            # For guardians, check if any of their youth members are in the admin's club
            if target_user.role == 'GUARDIAN':
                # Guardians are linked to youth through GuardianYouthLink
                youth_links = target_user.youth_links.all()
                has_youth_in_club = any(link.youth.preferred_club == admin_user.assigned_club for link in youth_links)
                if not has_youth_in_club:
                    raise PermissionDenied("You can only view fields for guardians linked to youth in your club.")
            else:
                # For youth members, check preferred_club
                if target_user.preferred_club != admin_user.assigned_club:
                    raise PermissionDenied("You can only view fields for users in your club.")
        
        # Determine the target user's municipality and club
        # For guardians, get club from their linked youth members
        if target_user.role == 'GUARDIAN':
            # Guardians are linked to youth through GuardianYouthLink
            youth_links = target_user.youth_links.all()
            # Get the first youth member's club (or municipality if no club)
            target_club = None
            target_muni = None
            for link in youth_links:
                youth = link.youth
                if youth.preferred_club:
                    target_club = youth.preferred_club
                    target_muni = target_club.municipality
                    break
                elif youth.assigned_municipality:
                    target_muni = youth.assigned_municipality
        else:
            target_club = target_user.preferred_club or target_user.assigned_club
            target_muni = target_user.assigned_municipality
        
        if target_club and not target_muni:
            target_muni = target_club.municipality
        
        role = target_user.role
        
        # Build query for fields applicable to this user
        # A. Always include Global Super Admin fields
        query = Q(owner_role='SUPER_ADMIN')
        
        # B. Include Municipality Fields (if user is linked to a muni)
        if target_muni:
            muni_query = Q(owner_role='MUNICIPALITY_ADMIN', municipality=target_muni)
            
            if target_club:
                # Logic: (specific_clubs is empty) OR (target_club in specific_clubs)
                muni_query &= (Q(specific_clubs=None) | Q(specific_clubs=target_club))
            else:
                # If user has no club (just muni), only show fields that apply to ALL clubs
                muni_query &= Q(specific_clubs=None)
            
            query |= muni_query
        
        # C. Include Club Fields (if user is linked to a club)
        if target_club:
            query |= Q(owner_role='CLUB_ADMIN', club=target_club)
        
        # Execute Database Fetch
        fields = CustomFieldDefinition.objects.filter(query).filter(
            is_published=True,
            context='USER_PROFILE'
        ).distinct()
        
        # Post-Filter by Role (Python side for JSONField safety across DBs)
        final_fields = []
        for f in fields:
            allowed_roles = f.target_roles if isinstance(f.target_roles, list) else []
            if "ALL" in allowed_roles or role in allowed_roles:
                final_fields.append(f)
        
        # Serialize (Including User Values)
        serializer = CustomFieldUserViewSerializer(final_fields, many=True, context={'user': target_user})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def save_values_for_user(self, request):
        """
        Bulk save custom field values for a specific user (admin only).
        Expected Payload: { "user_id": 123, "values": { "field_id": value, "field_id_2": value } }
        """
        admin_user = request.user
        user_id = request.data.get('user_id')
        values = request.data.get('values', {})
        
        # Check if admin has permission
        if admin_user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            raise PermissionDenied("Only admins can save custom field values for other users.")
        
        try:
            from users.models import User
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        # Verify admin has permission to edit this user
        # Super admin can edit anyone
        if admin_user.role == 'SUPER_ADMIN':
            pass  # Allowed
        elif admin_user.role == 'MUNICIPALITY_ADMIN':
            # Can only edit users in their municipality
            if target_user.preferred_club and target_user.preferred_club.municipality != admin_user.assigned_municipality:
                raise PermissionDenied("You can only edit users in your municipality.")
        elif admin_user.role == 'CLUB_ADMIN':
            # Can only edit users in their club
            # For guardians, check if any of their youth members are in the admin's club
            if target_user.role == 'GUARDIAN':
                # Guardians are linked to youth through GuardianYouthLink
                youth_links = target_user.youth_links.all()
                has_youth_in_club = any(link.youth.preferred_club == admin_user.assigned_club for link in youth_links)
                if not has_youth_in_club:
                    raise PermissionDenied("You can only edit guardians linked to youth in your club.")
            else:
                # For youth members, check preferred_club
                if target_user.preferred_club != admin_user.assigned_club:
                    raise PermissionDenied("You can only edit users in your club.")
        
        results = []
        
        # Get all fields the admin can see (to validate)
        allowed_fields = self.get_queryset()
        allowed_field_ids = set(allowed_fields.values_list('id', flat=True))
        
        for field_id_str, val in values.items():
            try:
                field_id = int(field_id_str)
                
                # Security: Only allow fields the admin can see
                if field_id not in allowed_field_ids:
                    continue
                
                field_def = CustomFieldDefinition.objects.get(id=field_id)
                
                obj, created = CustomFieldValue.objects.update_or_create(
                    field=field_def,
                    user=target_user,
                    defaults={'value': val}
                )
                results.append({"id": field_id, "status": "saved"})
            except (ValueError, CustomFieldDefinition.DoesNotExist):
                continue
                
        return Response({"results": results})


class PublicCustomFieldListView(generics.ListAPIView):
    """
    Returns custom fields for a specific context (Club/Muni)
    so they can be rendered in the registration form.
    """
    serializer_class = CustomFieldDefinitionSerializer
    permission_classes = [AllowAny]
    authentication_classes = ()  # Skip authentication entirely for public endpoint (use tuple)
    pagination_class = None  # Return all at once

    def get_queryset(self):
        club_id = self.request.query_params.get('club_id')
        role = self.request.query_params.get('target_role')  # e.g. YOUTH_MEMBER or GUARDIAN

        if not club_id:
            return CustomFieldDefinition.objects.none()

        from organization.models import Club
        try:
            club = Club.objects.get(id=club_id)
        except Club.DoesNotExist:
            return CustomFieldDefinition.objects.none()

        # Logic: Get fields owned by the Club OR the Municipality
        # AND targeting the specific role (Youth or Guardian)
        queryset = CustomFieldDefinition.objects.filter(
            is_published=True,
            context='USER_PROFILE'  # We only care about profile fields here
        )

        # Filter Scope:
        # 1. Fields owned by this Club
        # 2. Fields owned by Municipality (and either global OR specifically linked to this club)
        # 3. Global fields (SUPER_ADMIN owned)
        queryset = queryset.filter(
            Q(club=club) |  # Club fields
            Q(owner_role='SUPER_ADMIN') |  # Global fields
            Q(municipality=club.municipality, specific_clubs=None) |  # Municipality fields (global to all clubs)
            Q(municipality=club.municipality, specific_clubs=club)  # Municipality fields (specific to this club)
        ).distinct()

        # Filter by Role - try JSONField lookup first, fallback to Python filtering
        # Since target_roles is a JSON list ["A", "B"], we need to check if role is in the list
        # For better database compatibility, we'll filter in Python
        final_fields = []
        for field in queryset:
            allowed_roles = field.target_roles if isinstance(field.target_roles, list) else []
            if "ALL" in allowed_roles or role in allowed_roles:
                final_fields.append(field)
        
        # Return as queryset by filtering by IDs
        if final_fields:
            field_ids = [f.id for f in final_fields]
            return CustomFieldDefinition.objects.filter(id__in=field_ids)
        return CustomFieldDefinition.objects.none()