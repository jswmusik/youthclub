from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from .models import Page, MenuItem, FeatureShowcase, CookieConsent, PageFeature, PricingPageContent, PricingFAQ, ContactPageContent, ContactSubmission, Boilerplate
from .serializers import (
    PageSerializer, MenuItemSerializer, 
    FeatureShowcaseSerializer, CookieConsentSerializer,
    PricingPageContentSerializer, PricingFAQSerializer,
    ContactPageContentSerializer, ContactSubmissionSerializer, ContactSubmissionCreateSerializer,
    BoilerplateSerializer, BoilerplateListSerializer
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
        """Get menu items organized by location, excluding items linked to unpublished pages."""
        from django.db.models import Q
        
        # Get all menu items, but exclude those linked to unpublished pages
        # Include items with no linked page (external links) or linked to published pages
        items = MenuItem.objects.select_related('page').filter(
            Q(page__isnull=True) | Q(page__is_published=True)
        ).order_by('order')
        
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


class PricingPageContentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pricing page content.
    Uses singleton pattern - always returns/updates the same instance.
    """
    queryset = PricingPageContent.objects.all()
    serializer_class = PricingPageContentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        """Always return the singleton instance."""
        return PricingPageContent.get_instance()

    def list(self, request):
        """Return the singleton instance."""
        instance = PricingPageContent.get_instance()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def public(self, request):
        """
        Public endpoint to get pricing page content.
        No authentication required.
        """
        instance = PricingPageContent.get_instance()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['patch', 'put'])
    def update_content(self, request):
        """Update the pricing page content."""
        instance = PricingPageContent.get_instance()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PricingFAQViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pricing page FAQs.
    """
    queryset = PricingFAQ.objects.all()
    serializer_class = PricingFAQSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """Admin sees all, public sees only active."""
        if self.request.user.is_authenticated:
            return PricingFAQ.objects.all().order_by('order')
        return PricingFAQ.objects.filter(is_active=True).order_by('order')

    @action(detail=False, methods=['get'])
    def public(self, request):
        """
        Public endpoint to get active FAQs.
        No authentication required.
        """
        faqs = PricingFAQ.objects.filter(is_active=True).order_by('order')
        serializer = self.get_serializer(faqs, many=True)
        return Response(serializer.data)


class ContactPageContentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contact page content.
    Uses singleton pattern - always returns/updates the same instance.
    """
    queryset = ContactPageContent.objects.all()
    serializer_class = ContactPageContentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_object(self):
        """Always return the singleton instance."""
        return ContactPageContent.get_instance()

    def list(self, request):
        """Return the singleton instance."""
        instance = ContactPageContent.get_instance()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request):
        """
        Public endpoint to get contact page content.
        No authentication required.
        """
        instance = ContactPageContent.get_instance()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['patch', 'put'])
    def update_content(self, request):
        """Update the contact page content."""
        instance = ContactPageContent.get_instance()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactSubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contact form submissions.
    """
    queryset = ContactSubmission.objects.all()
    serializer_class = ContactSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'submit':
            return ContactSubmissionCreateSerializer
        return ContactSubmissionSerializer

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def submit(self, request):
        """
        Public endpoint to submit a contact form.
        Sends email notification to support.
        """
        serializer = ContactSubmissionCreateSerializer(data=request.data)
        if serializer.is_valid():
            submission = serializer.save()
            
            # Get contact page content for email address
            contact_content = ContactPageContent.get_instance()
            to_email = contact_content.contact_email or 'support@ungdomsappen.se'
            
            # Send email notification
            try:
                email_subject = f"[Kontaktformulär] {submission.subject}"
                email_body = f"""
Nytt meddelande från kontaktformuläret:

Namn: {submission.name}
E-post: {submission.email}
Organisation: {submission.organization or 'Ej angiven'}
Ämne: {submission.subject}

Meddelande:
{submission.message}

---
Detta meddelande skickades via kontaktformuläret på Ungdomsappen.
                """.strip()
                
                send_mail(
                    subject=email_subject,
                    message=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[to_email],
                    fail_silently=True,  # Don't crash if email fails
                )
                logger.info(f"Contact form email sent to {to_email}")
            except Exception as e:
                logger.error(f"Failed to send contact form email: {e}")
            
            return Response({
                'success': True,
                'message': 'Your message has been sent successfully.'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a submission as read."""
        submission = self.get_object()
        submission.is_read = True
        submission.save()
        return Response({'status': 'marked as read'})

    @action(detail=True, methods=['post'])
    def mark_replied(self, request, pk=None):
        """Mark a submission as replied."""
        from django.utils import timezone
        submission = self.get_object()
        submission.is_replied = True
        submission.replied_at = timezone.now()
        submission.save()
        return Response({'status': 'marked as replied'})


class BoilerplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing boilerplate templates.
    Used for reusable text templates like terms, policies, etc.
    """
    queryset = Boilerplate.objects.all()
    serializer_class = BoilerplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return BoilerplateListSerializer
        return BoilerplateSerializer

    def get_queryset(self):
        """Filter by usage if specified."""
        queryset = Boilerplate.objects.all().order_by('order', 'name')
        usage = self.request.query_params.get('usage', None)
        if usage:
            queryset = queryset.filter(usage=usage)
        
        # Filter by active status if specified
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset

    @action(detail=False, methods=['get'])
    def by_usage(self, request):
        """
        Get active boilerplates grouped by usage type.
        Useful for populating template dropdowns.
        """
        boilerplates = Boilerplate.objects.filter(is_active=True).order_by('order', 'name')
        
        # Group by usage
        grouped = {}
        for bp in boilerplates:
            usage = bp.usage
            if usage not in grouped:
                grouped[usage] = []
            grouped[usage].append(BoilerplateListSerializer(bp).data)
        
        return Response(grouped)

    @action(detail=False, methods=['get'], url_path='for-field/(?P<usage>[^/.]+)')
    def for_field(self, request, usage=None):
        """
        Get active boilerplates for a specific field/usage.
        Used by the ClubForm to populate template options.
        """
        boilerplates = Boilerplate.objects.filter(
            is_active=True,
            usage=usage
        ).order_by('order', 'name')
        
        serializer = BoilerplateListSerializer(boilerplates, many=True)
        return Response(serializer.data)
