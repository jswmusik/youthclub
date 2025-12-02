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
from notifications.models import Notification

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
            # Youth members can see items from any club
            # The check-in requirement in borrow/join_queue actions will enforce borrowing restrictions
            # If a specific club is requested via query param, filter to that club
            target_club_id = self.request.query_params.get('club')
            
            if target_club_id:
                queryset = queryset.filter(club_id=target_club_id)
            # Otherwise, show items from all clubs (they can browse, but can only borrow if checked in)
                
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
        
        # Filter by Category (if query param provided)
        category_id = self.request.query_params.get('category')
        if category_id:
            try:
                queryset = queryset.filter(category_id=category_id)
            except ValueError:
                # Invalid category_id, ignore
                pass
            
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
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

        # 2.5. Validation: Check-in Required (always enforced)
        active_checkin = CheckInSession.objects.filter(
            user=user,
            club=item.club,
            check_out_at__isnull=True
        ).exists()
        if not active_checkin:
            return Response({
                "error": "You must be checked in to this club to borrow items",
                "code": "CHECKIN_REQUIRED"
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Validation: Max Items per User (Hard limit: 5 items maximum, or club setting if lower)
        club_max_loans = item.club.max_active_loans_per_user
        global_max_loans = 5  # Hard limit: maximum 5 items per member
        max_loans = min(club_max_loans, global_max_loans)  # Use the lower of the two
        
        active_loans = LendingSession.objects.filter(user=user, status='ACTIVE').count()
        if active_loans >= max_loans:
            if max_loans == global_max_loans:
                return Response({
                    "error": f"You have reached the maximum borrowing limit (5 items)",
                    "code": "MAX_LOANS_REACHED"
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "error": f"You have reached the maximum borrowing limit ({max_loans} items)",
                    "code": "MAX_LOANS_REACHED"
                }, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
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

        # Notification for queue members is handled by the post_save signal in signals.py
        # This prevents duplicate notifications

        return Response({"message": "Item returned successfully"}, status=status.HTTP_200_OK)

    # --- NEW: Queue Actions ---
    @action(detail=True, methods=['post'], url_path='join-queue', permission_classes=[IsAuthenticated])
    def join_queue(self, request, pk=None):
        item = self.get_object()
        user = request.user
        
        # 0. Validation: Check-in Required (always enforced)
        active_checkin = CheckInSession.objects.filter(
            user=user,
            club=item.club,
            check_out_at__isnull=True
        ).exists()
        if not active_checkin:
            return Response({
                "error": "You must be checked in to this club to join the waiting list",
                "code": "CHECKIN_REQUIRED"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Check if item is actually borrowed
        if item.status == 'AVAILABLE':
            return Response({"error": "Item is available, you can borrow it directly."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Check if already in queue
        if WaitingList.objects.filter(item=item, user=user).exists():
            return Response({"error": "You are already in the queue."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 3. Check Queue Limit (Max 3)
        if WaitingList.objects.filter(item=item).count() >= 3:
            return Response({"error": "Queue is full (Max 3)."}, status=status.HTTP_400_BAD_REQUEST)
            
        WaitingList.objects.create(item=item, user=user)
        return Response({"message": "You have been added to the waiting list."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='leave-queue', permission_classes=[IsAuthenticated])
    def leave_queue(self, request, pk=None):
        item = self.get_object()
        user = request.user
        
        deleted, _ = WaitingList.objects.filter(item=item, user=user).delete()
        if deleted:
            return Response({"message": "You have left the queue."}, status=status.HTTP_200_OK)
        return Response({"error": "You are not in the queue for this item."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        """
        Returns inventory analytics for the admin's scope.
        For SUPER_ADMIN: if no club_id provided, returns aggregated results for all clubs.
        """
        user = request.user
        club = None
        aggregate_all = False
        
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            club = user.assigned_club
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # For municipality admin, we'd need a club_id param
            club_id = request.query_params.get('club_id')
            if club_id:
                try:
                    club = Club.objects.get(id=club_id, municipality=user.assigned_municipality)
                except Club.DoesNotExist:
                    return Response({"error": "Club not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                # No club_id provided - aggregate for all clubs in municipality
                aggregate_all = True
        elif user.role == 'SUPER_ADMIN':
            club_id = request.query_params.get('club_id')
            if club_id:
                try:
                    club = Club.objects.get(id=club_id)
                except Club.DoesNotExist:
                    return Response({"error": "Club not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                # No club_id provided - aggregate for all clubs
                aggregate_all = True
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        from datetime import timedelta
        now = timezone.now()
        
        if aggregate_all:
            # Aggregate analytics for all clubs (or all clubs in municipality for MUNICIPALITY_ADMIN)
            if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
                # Filter by municipality
                total_items = Item.objects.filter(club__municipality=user.assigned_municipality).count()
                
                seven_days_ago = now - timedelta(days=7)
                borrowings_7d = LendingSession.objects.filter(
                    item__club__municipality=user.assigned_municipality,
                    borrowed_at__gte=seven_days_ago
                ).count()
                
                thirty_days_ago = now - timedelta(days=30)
                borrowings_30d = LendingSession.objects.filter(
                    item__club__municipality=user.assigned_municipality,
                    borrowed_at__gte=thirty_days_ago
                ).count()
                
                borrowings_all_time = LendingSession.objects.filter(item__club__municipality=user.assigned_municipality).count()
            else:
                # SUPER_ADMIN: Aggregate for all clubs
                total_items = Item.objects.count()
                
                seven_days_ago = now - timedelta(days=7)
                borrowings_7d = LendingSession.objects.filter(
                    borrowed_at__gte=seven_days_ago
                ).count()
                
                thirty_days_ago = now - timedelta(days=30)
                borrowings_30d = LendingSession.objects.filter(
                    borrowed_at__gte=thirty_days_ago
                ).count()
                
                borrowings_all_time = LendingSession.objects.count()
        else:
            # Single club analytics
            total_items = Item.objects.filter(club=club).count()
            
            seven_days_ago = now - timedelta(days=7)
            borrowings_7d = LendingSession.objects.filter(
                item__club=club,
                borrowed_at__gte=seven_days_ago
            ).count()
            
            thirty_days_ago = now - timedelta(days=30)
            borrowings_30d = LendingSession.objects.filter(
                item__club=club,
                borrowed_at__gte=thirty_days_ago
            ).count()
            
            borrowings_all_time = LendingSession.objects.filter(item__club=club).count()
        
        return Response({
            "total_items": total_items,
            "borrowings_7d": borrowings_7d,
            "borrowings_30d": borrowings_30d,
            "borrowings_all_time": borrowings_all_time
        })


class LendingSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View history of borrowing.
    """
    serializer_class = LendingSessionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item__title', 'user__first_name', 'user__last_name', 'user__email']
    ordering = ['-borrowed_at']

    def get_queryset(self):
        user = self.request.user
        queryset = None
        
        if user.role == 'SUPER_ADMIN':
            # Super Admin sees all sessions
            queryset = LendingSession.objects.all()
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Municipality Admin sees sessions from clubs in their municipality
            queryset = LendingSession.objects.filter(item__club__municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Club Admin sees only sessions from their club
            queryset = LendingSession.objects.filter(item__club=user.assigned_club)
        else:
            # Youth: see only own history
            queryset = LendingSession.objects.filter(user=user)
        
        # Filter by item if query param provided
        item_id = self.request.query_params.get('item')
        if item_id:
            try:
                queryset = queryset.filter(item_id=item_id)
            except ValueError:
                # Invalid item_id, ignore
                pass
        
        # Filter by date range if query params provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                from django.utils.dateparse import parse_date
                parsed_start = parse_date(start_date)
                if parsed_start:
                    # Start of the day
                    queryset = queryset.filter(borrowed_at__date__gte=parsed_start)
            except (ValueError, TypeError):
                # Invalid date format, ignore
                pass
        
        if end_date:
            try:
                from django.utils.dateparse import parse_date
                parsed_end = parse_date(end_date)
                if parsed_end:
                    # End of the day
                    queryset = queryset.filter(borrowed_at__date__lte=parsed_end)
            except (ValueError, TypeError):
                # Invalid date format, ignore
                pass
        
        return queryset.select_related('item', 'user')

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        """
        Returns lending history analytics for the admin's scope.
        """
        from django.db.models import Count, Q
        
        user = request.user
        queryset = self.get_queryset()
        
        # Total items borrowed
        total_borrowed = queryset.count()
        
        # Borrowed by gender
        gender_counts = queryset.values('user__legal_gender').annotate(count=Count('id'))
        gender_data = {item['user__legal_gender']: item['count'] for item in gender_counts}
        
        borrowed_male = gender_data.get('MALE', 0)
        borrowed_female = gender_data.get('FEMALE', 0)
        borrowed_other = gender_data.get('OTHER', 0)
        
        # Returned (all return statuses)
        returned = queryset.filter(
            Q(status='RETURNED_USER') | 
            Q(status='RETURNED_ADMIN') | 
            Q(status='RETURNED_SYSTEM')
        ).count()
        
        # Active
        active = queryset.filter(status='ACTIVE').count()
        
        return Response({
            "total_borrowed": total_borrowed,
            "borrowed_male": borrowed_male,
            "borrowed_female": borrowed_female,
            "borrowed_other": borrowed_other,
            "returned": returned,
            "active": active,
        }, status=status.HTTP_200_OK)

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