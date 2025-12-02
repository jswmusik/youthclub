from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Item, ItemCategory, InventoryTag, LendingSession, WaitingList
from .serializers import (
    ItemSerializer, BatchItemCreateSerializer, 
    LendingSessionSerializer, WaitingListSerializer,
    ItemCategorySerializer, InventoryTagSerializer
)
from organization.models import Club
from visits.models import CheckInSession

# --- Custom Permissions ---
class IsClubAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN']

class ItemViewSet(viewsets.ModelViewSet):
    """
    Main ViewSet for managing Inventory Items.
    """
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated, IsClubAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'tags__name', 'category__name']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        user = self.request.user
        queryset = Item.objects.select_related('club', 'category').prefetch_related('tags')

        # Role-based filtering
        if user.role == 'SUPER_ADMIN':
            # Super Admin sees all items
            pass
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Municipality Admin sees items from clubs in their municipality
            queryset = queryset.filter(club__municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Club Admin sees only items from their club
            queryset = queryset.filter(club=user.assigned_club)
        elif user.role == 'YOUTH_MEMBER':
            # Youth members see items from their preferred club (if any)
            if user.preferred_club:
                queryset = queryset.filter(club=user.preferred_club)
            else:
                queryset = queryset.none()
            # Hide hidden items from youth
            queryset = queryset.exclude(status__in=['HIDDEN', 'MISSING', 'MAINTENANCE'])
        else:
            # Default: no items for unauthenticated or other roles
            queryset = queryset.none()

        # Additional filter by Club (if query param provided) - only applies if user has permission
        club_id = self.request.query_params.get('club')
        if club_id:
            # Super Admin and Municipality Admin can filter by club
            if user.role == 'SUPER_ADMIN':
                queryset = queryset.filter(club_id=club_id)
            elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
                # Only allow filtering by clubs in their municipality
                queryset = queryset.filter(club_id=club_id, club__municipality=user.assigned_municipality)
            # Club Admin ignores this param as they can only see their own club
            
        return queryset

    def perform_create(self, serializer):
        # Auto-assign club if created by Club Admin
        if self.request.user.assigned_club:
            serializer.save(club=self.request.user.assigned_club)
        else:
            # Super Admin must provide club in POST data usually, 
            # but for safety we can handle it in the Batch View primarily.
            serializer.save()

    @action(detail=False, methods=['post'], url_path='batch-create')
    @transaction.atomic
    def batch_create(self, request):
        """
        Create multiple copies of an item at once.
        """
        serializer = BatchItemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": "Validation failed", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            quantity = data.pop('quantity')
            tags = data.pop('tags', [])
            
            # Determine Club
            club_id = request.data.get('club')
            if request.user.assigned_club:
                club = request.user.assigned_club
            elif club_id:
                try:
                    # Convert to int if it's a string
                    club_id_int = int(club_id) if isinstance(club_id, str) else club_id
                    club = get_object_or_404(Club, id=club_id_int)
                except (ValueError, TypeError):
                    return Response({"error": "Invalid Club ID"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Club ID required"}, status=status.HTTP_400_BAD_REQUEST)

            created_items = []
            base_title = data['title']
            # Extract image before loop - file objects can only be used once
            image_file = data.pop('image', None)
            image_content = None
            image_name = None
            
            # Read image content once if image is provided
            if image_file:
                image_file.open('rb')
                image_content = image_file.read()
                image_name = image_file.name
                image_file.close()
            
            for i in range(quantity):
                # If multiple, append number to title: "Racket #1"
                if quantity > 1:
                    title = f"{base_title} #{i+1}"
                else:
                    title = base_title
                
                # Create item data without title (we'll set it explicitly)
                item_data = {k: v for k, v in data.items() if k != 'title'}
                
                # Create the item
                item = Item.objects.create(club=club, title=title, **item_data)
                
                # Assign image to each item if provided (copy the content for each)
                if image_content and image_name:
                    from django.core.files.base import ContentFile
                    # Create a unique filename for each item to avoid conflicts
                    if quantity > 1:
                        name_parts = image_name.rsplit('.', 1)
                        unique_name = f"{name_parts[0]}_{i+1}.{name_parts[1]}" if len(name_parts) == 2 else f"{image_name}_{i+1}"
                    else:
                        unique_name = image_name
                    item.image.save(unique_name, ContentFile(image_content), save=True)
                
                if tags:
                    item.tags.set(tags)
                created_items.append(item)
            
            return Response(
                {"message": f"Successfully created {len(created_items)} items."}, 
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            return Response(
                {"error": f"Failed to create items: {str(e)}", "trace": error_trace}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def borrow(self, request, pk=None):
        """
        User action to borrow this item.
        """
        item = self.get_object()
        user = request.user

        # 1. Validation: Is item available?
        if item.status != 'AVAILABLE':
            return Response({"error": "Item is not available"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Validation: Is Active Loan?
        if item.lending_sessions.filter(status='ACTIVE').exists():
            return Response({"error": "Item is currently borrowed"}, status=status.HTTP_400_BAD_REQUEST)

        # 2.5. Validation: Check-in Required (if club setting enabled)
        if item.club.borrowing_requires_checkin:
            active_checkin = CheckInSession.objects.filter(
                user=user,
                club=item.club,
                check_out_at__isnull=True
            ).exists()
            if not active_checkin:
                return Response({"error": "You must be checked in to borrow items"}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Validation: Max Items per User (Check Club Settings)
        max_loans = item.club.max_active_loans_per_user
        active_loans = LendingSession.objects.filter(user=user, status='ACTIVE').count()
        if active_loans >= max_loans:
            return Response({"error": f"You have reached the maximum borrowing limit ({max_loans} items)"}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Create Session
        due_at = timezone.now() + timezone.timedelta(minutes=item.max_borrow_duration)
        session = LendingSession.objects.create(
            item=item,
            user=user,
            due_at=due_at
        )
        
        # Update Item Status
        item.status = 'BORROWED'
        item.save()

        # Remove from Queue if user was waiting
        WaitingList.objects.filter(item=item, user=user).delete()

        return Response(LendingSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def return_item(self, request, pk=None):
        """
        User/Admin action to return an item.
        """
        item = self.get_object()
        user = request.user

        # Find the active session
        session = LendingSession.objects.filter(item=item, status='ACTIVE').first()
        
        if not session:
            return Response({"error": "No active loan found for this item"}, status=status.HTTP_400_BAD_REQUEST)

        # Security: Ensure it's the borrower OR an Admin returning it
        is_admin = user.role in ['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN']
        if session.user != user and not is_admin:
            return Response({"error": "You cannot return an item you didn't borrow"}, status=status.HTTP_403_FORBIDDEN)

        # Process Return
        session.returned_at = timezone.now()
        session.status = 'RETURNED_ADMIN' if is_admin else 'RETURNED_USER'
        session.save()

        item.status = 'AVAILABLE'
        item.save()

        # TODO: Trigger Notification for next in Waiting List (Phase 1 Task 5)

        return Response({"message": "Item returned successfully"}, status=status.HTTP_200_OK)


class LendingSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View history of borrowing.
    """
    serializer_class = LendingSessionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-borrowed_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            # Super Admin sees all sessions
            return LendingSession.objects.all()
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Municipality Admin sees sessions from clubs in their municipality
            return LendingSession.objects.filter(item__club__municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Club Admin sees only sessions from their club
            return LendingSession.objects.filter(item__club=user.assigned_club)
        else:
            # Youth: see only own history
            return LendingSession.objects.filter(user=user)

class ItemCategoryViewSet(viewsets.ModelViewSet):
    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    permission_classes = [IsAuthenticated] # Read only for youth handled in permissions logic if needed

class InventoryTagViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryTagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Always include global tags (club=None)
        queryset = InventoryTag.objects.filter(club__isnull=True)
        
        if user.role == 'SUPER_ADMIN':
            # Super Admin sees all tags (global + all club-specific)
            return InventoryTag.objects.all()
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Municipality Admin sees global tags + tags from clubs in their municipality
            queryset = queryset | InventoryTag.objects.filter(club__municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Club Admin sees global tags + tags from their club
            queryset = queryset | InventoryTag.objects.filter(club=user.assigned_club)
        
        return queryset.distinct()

    def perform_create(self, serializer):
        # If club admin, force club assignment
        if self.request.user.role == 'CLUB_ADMIN':
             serializer.save(club=self.request.user.assigned_club)
        else:
             serializer.save()