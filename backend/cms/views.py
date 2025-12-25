from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from .models import Page, MenuItem, FeatureShowcase, CookieConsent, PageFeature
from .serializers import (
    PageSerializer, MenuItemSerializer, 
    FeatureShowcaseSerializer, CookieConsentSerializer
)
import logging

logger = logging.getLogger(__name__)


class PageViewSet(viewsets.ModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_feature_ids(self, request):
        """Extract feature_ids from request data."""
        # Handle feature_ids - FormData sends multiple values for same key
        if hasattr(request.data, 'getlist'):
            feature_ids = request.data.getlist('feature_ids', [])
        else:
            feature_ids = request.data.get('feature_ids', [])
            if not isinstance(feature_ids, list):
                feature_ids = [feature_ids] if feature_ids else []
        
        # Convert to integers, filter out empty strings
        return [int(fid) for fid in feature_ids if fid and str(fid).strip()]

    def _set_features(self, page, feature_ids):
        """Set features with proper ordering using the through model."""
        # Clear existing features
        PageFeature.objects.filter(page=page).delete()
        
        # Add features in order
        for order, feature_id in enumerate(feature_ids):
            try:
                feature = FeatureShowcase.objects.get(id=feature_id)
                PageFeature.objects.create(page=page, feature=feature, order=order)
            except FeatureShowcase.DoesNotExist:
                pass  # Skip invalid feature IDs

    def _prepare_data(self, request):
        """Prepare data, removing feature_ids (handled separately)."""
        # Make a mutable copy of the data
        if hasattr(request.data, 'copy'):
            data = request.data.copy()
        else:
            data = dict(request.data)
        
        # Remove feature_ids from serializer data (we handle it separately)
        if 'feature_ids' in data:
            if hasattr(data, 'pop'):
                data.pop('feature_ids', None)
            elif isinstance(data, dict):
                data.pop('feature_ids', None)
        
        # Also try to remove from getlist if it's a QueryDict
        if hasattr(data, 'getlist'):
            try:
                data.setlist('feature_ids', [])
            except:
                pass
        
        return data

    def create(self, request, *args, **kwargs):
        """Override create to handle feature_ids from FormData."""
        feature_ids = self._get_feature_ids(request)
        data = self._prepare_data(request)
        
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            logger.error(f"Create - Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        page = serializer.save()
        
        # Set features after page is created
        if feature_ids:
            self._set_features(page, feature_ids)
        
        headers = self.get_success_headers(serializer.data)
        # Re-serialize to include features_data
        return Response(self.get_serializer(page).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Override update to handle feature_ids from FormData."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        feature_ids = self._get_feature_ids(request)
        data = self._prepare_data(request)
        
        logger.info(f"Update - Received data keys: {list(data.keys()) if hasattr(data, 'keys') else data}")
        logger.info(f"Update - Feature IDs: {feature_ids}")
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        if not serializer.is_valid():
            logger.error(f"Update - Validation errors: {serializer.errors}")
            logger.error(f"Update - Data received: {dict(data) if hasattr(data, 'items') else data}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        page = serializer.save()
        
        # Set features (even if empty, to clear them)
        self._set_features(page, feature_ids)
        
        # Re-serialize to include updated features_data
        return Response(self.get_serializer(page).data)

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to handle feature_ids from FormData."""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='public/(?P<slug>[^/.]+)')
    def public_page(self, request, slug=None):
        """Retrieve a published page by slug for the public frontend."""
        page = get_object_or_404(Page, slug=slug, is_published=True)
        serializer = self.get_serializer(page)
        return Response(serializer.data)


class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'])
    def public_menu(self, request):
        """Get menu items organized by location."""
        items = MenuItem.objects.select_related('page').order_by('order')
        header = items.filter(location='header')
        footer = items.filter(location='footer')
        community_footer = items.filter(location='community_footer')
        return Response({
            'header': MenuItemSerializer(header, many=True).data,
            'footer': MenuItemSerializer(footer, many=True).data,
            'community_footer': MenuItemSerializer(community_footer, many=True).data
        })


class FeatureShowcaseViewSet(viewsets.ModelViewSet):
    queryset = FeatureShowcase.objects.filter(is_active=True)
    serializer_class = FeatureShowcaseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CookieConsentViewSet(viewsets.ModelViewSet):
    queryset = CookieConsent.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = CookieConsentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get the latest active cookie policy."""
        policy = self.queryset.first()
        if policy:
            return Response(self.get_serializer(policy).data)
        return Response({})
