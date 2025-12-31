# backend/marketing/views.py
import csv
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import AnonRateThrottle
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Count, Q
from django.core.cache import cache
from django.http import HttpResponse
from datetime import timedelta, datetime

from .models import SiteSEOSettings, Testimonial, Customer, NewsletterSubscriber
from .serializers import (
    SiteSEOSettingsSerializer, 
    SiteSEOSettingsAdminSerializer,
    TestimonialSerializer, 
    TestimonialAdminSerializer,
    CustomerSerializer,
    CustomerAdminSerializer,
    NewsletterSubscribeSerializer,
    NewsletterSubscriberSerializer,
    NewsletterSubscriberAdminSerializer,
    NewsletterExportSerializer
)


class SiteSEOSettingsView(APIView):
    """
    Public endpoint to get SEO and Hero settings for the startpage.
    Returns the singleton SEO settings or defaults.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            settings = SiteSEOSettings.objects.first()
            if settings:
                serializer = SiteSEOSettingsSerializer(settings)
                return Response(serializer.data)
            
            # Return defaults if no settings exist
            return Response({
                'id': None,
                'page_title': 'Ungdomsappen - Hitta aktiviteter nära dig',
                'meta_description': 'Upptäck aktiviteter, evenemang och fritidsgårdar nära dig. Ungdomsappen samlar allt för unga på ett ställe.',
                'keywords': 'ungdomsappen, fritidsgård, aktiviteter, ungdom, evenemang',
                'hero_title': 'Hitta din grej!',
                'hero_subtitle': 'Samlade aktiviteter och evenemang för unga.',
                'hero_cta_text': 'Sök aktiviteter',
                'hero_background': None,
                'og_title': '',
                'og_description': '',
                'og_image': None
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SiteSEOSettingsAdminView(APIView):
    """
    Admin endpoint to get and update SEO/Hero settings.
    Only Super Admins can modify.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request):
        """Get current settings for admin editing"""
        settings, created = SiteSEOSettings.objects.get_or_create(pk=1)
        serializer = SiteSEOSettingsAdminSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        """Update settings (Super Admin only)"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can modify site settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings, created = SiteSEOSettings.objects.get_or_create(pk=1)
        serializer = SiteSEOSettingsAdminSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        """Partial update (same as PUT but more explicit)"""
        return self.put(request)


class PublicTestimonialsView(APIView):
    """
    Public endpoint to get active testimonials.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        testimonials = Testimonial.objects.filter(is_active=True).order_by('-created_at')[:10]
        serializer = TestimonialSerializer(testimonials, many=True)
        return Response(serializer.data)


class PublicKPIView(APIView):
    """
    Public endpoint for platform KPIs.
    Uses caching to avoid expensive queries on every request.
    Cache is refreshed every 5 minutes.
    """
    permission_classes = [AllowAny]
    CACHE_KEY = 'public_kpi_stats'
    CACHE_TIMEOUT = 300  # 5 minutes
    
    def get(self, request):
        # Try to get from cache first
        cached_stats = cache.get(self.CACHE_KEY)
        if cached_stats:
            return Response(cached_stats)
        
        # Calculate fresh stats
        stats = self._calculate_stats()
        
        # Cache the result
        cache.set(self.CACHE_KEY, stats, self.CACHE_TIMEOUT)
        
        return Response(stats)
    
    def _calculate_stats(self):
        """Calculate platform-wide statistics"""
        from users.models import User
        from events.models import Event
        from visits.models import CheckInSession
        from inventory.models import LendingSession
        from organization.models import Club
        
        one_year_ago = timezone.now() - timedelta(days=365)
        
        # Active youth members
        total_members = User.objects.filter(
            role=User.Role.YOUTH_MEMBER,
            is_active=True
        ).count()
        
        # Events created in the last year
        total_events = Event.objects.filter(
            created_at__gte=one_year_ago,
            status__in=[Event.Status.PUBLISHED, Event.Status.ARCHIVED]
        ).count()
        
        # Check-ins in the last year
        total_checkins = CheckInSession.objects.filter(
            check_in_at__gte=one_year_ago
        ).count()
        
        # Items borrowed in the last year
        total_borrowed = LendingSession.objects.filter(
            borrowed_at__gte=one_year_ago
        ).count()
        
        # Active clubs
        total_clubs = Club.objects.count()
        
        return {
            'members': total_members,
            'events': total_events,
            'checkins': total_checkins,
            'borrowed': total_borrowed,
            'clubs': total_clubs,
            'calculated_at': timezone.now().isoformat()
        }


class TestimonialViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing testimonials.
    Only Super Admins can create/update/delete.
    """
    queryset = Testimonial.objects.all().order_by('-created_at')
    serializer_class = TestimonialAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        user = self.request.user
        
        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return Testimonial.objects.all().order_by('-created_at')
        
        # Others only see active testimonials
        return Testimonial.objects.filter(is_active=True).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Only Super Admins can create testimonials"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can create testimonials'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Only Super Admins can update testimonials"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can update testimonials'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only Super Admins can delete testimonials"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can delete testimonials'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class PublicCustomersView(APIView):
    """
    Public endpoint to get active customer logos for the homepage carousel.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        customers = Customer.objects.filter(is_active=True).order_by('display_order', 'name')
        serializer = CustomerSerializer(customers, many=True, context={'request': request})
        return Response(serializer.data)


class CustomerViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing customer logos.
    Only Super Admins can create/update/delete.
    """
    queryset = Customer.objects.all().order_by('display_order', 'name')
    serializer_class = CustomerAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        user = self.request.user
        
        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return Customer.objects.all().order_by('display_order', 'name')
        
        # Others only see active customers
        return Customer.objects.filter(is_active=True).order_by('display_order', 'name')
    
    def create(self, request, *args, **kwargs):
        """Only Super Admins can create customers"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can manage customers'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Only Super Admins can update customers"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can manage customers'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only Super Admins can delete customers"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can manage customers'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


# ============================================================================
# NEWSLETTER VIEWS
# ============================================================================

class NewsletterSubscribeThrottle(AnonRateThrottle):
    """
    Custom throttle for newsletter subscriptions.
    Limits to 5 subscription attempts per hour per IP.
    """
    rate = '5/hour'
    scope = 'newsletter_subscribe'


class NewsletterSubscribeView(APIView):
    """
    Public endpoint for newsletter subscription.
    Includes rate limiting, honeypot detection, and input sanitization.
    """
    permission_classes = [AllowAny]
    throttle_classes = [NewsletterSubscribeThrottle]
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        """Handle newsletter subscription"""
        serializer = NewsletterSubscribeSerializer(data=request.data)
        
        # Check for honeypot trigger (bot detection)
        if request.data.get('website'):
            # Silently accept to not alert bots
            return Response({
                'success': True,
                'message': 'Thank you for subscribing!'
            })
        
        if not serializer.is_valid():
            # Check if honeypot was triggered in validation
            if 'website' in serializer.errors:
                error_msg = serializer.errors['website']
                if error_msg and 'honeypot_triggered' in str(error_msg):
                    return Response({
                        'success': True,
                        'message': 'Thank you for subscribing!'
                    })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create subscriber with audit data
        subscriber = serializer.save(
            consent_ip=self.get_client_ip(request),
            consent_user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            consent_date=timezone.now()
        )
        
        return Response({
            'success': True,
            'message': 'Thank you for subscribing to our newsletter!'
        }, status=status.HTTP_201_CREATED)


class NewsletterAnalyticsView(APIView):
    """
    Admin endpoint for newsletter analytics.
    Returns subscriber statistics.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can view newsletter analytics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        now = timezone.now()
        
        # Calculate date ranges
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        one_year_ago = now - timedelta(days=365)
        
        # Get active subscribers only
        active_subscribers = NewsletterSubscriber.objects.filter(is_active=True)
        
        analytics = {
            'total_subscribers': active_subscribers.count(),
            'new_last_7_days': active_subscribers.filter(created_at__gte=seven_days_ago).count(),
            'new_last_30_days': active_subscribers.filter(created_at__gte=thirty_days_ago).count(),
            'new_last_365_days': active_subscribers.filter(created_at__gte=one_year_ago).count(),
            'total_unsubscribed': NewsletterSubscriber.objects.filter(is_active=False).count(),
            'calculated_at': now.isoformat()
        }
        
        return Response(analytics)


class NewsletterSubscriberViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing newsletter subscribers.
    Only Super Admins can access.
    """
    queryset = NewsletterSubscriber.objects.all().order_by('-created_at')
    serializer_class = NewsletterSubscriberSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'SUPER_ADMIN':
            return NewsletterSubscriber.objects.none()
        
        queryset = NewsletterSubscriber.objects.all()
        
        # Search filter
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Status filter
        status_filter = self.request.query_params.get('status', '')
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        # Date range filters
        date_from = self.request.query_params.get('date_from', '')
        date_to = self.request.query_params.get('date_to', '')
        
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                queryset = queryset.filter(created_at__gte=from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                # Add one day to include the entire end date
                to_date = to_date + timedelta(days=1)
                queryset = queryset.filter(created_at__lt=to_date)
            except ValueError:
                pass
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return NewsletterSubscriberAdminSerializer
        return NewsletterSubscriberSerializer
    
    def list(self, request, *args, **kwargs):
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can view newsletter subscribers'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete subscriber - supports both soft delete (unsubscribe) and hard delete (permanent).
        Use ?permanent=true query param for permanent deletion.
        """
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can manage subscribers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        permanent = request.query_params.get('permanent', '').lower() == 'true'
        
        if permanent:
            # Hard delete - permanently remove from database
            instance.delete()
            return Response({'message': 'Subscriber permanently deleted'})
        else:
            # Soft delete - mark as inactive
            instance.is_active = False
            instance.unsubscribed_at = timezone.now()
            instance.save()
            return Response({'message': 'Subscriber marked as inactive'})
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export subscribers as CSV (Mailchimp compatible)"""
        if request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'Only Super Admins can export subscribers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get filtered queryset
        queryset = self.get_queryset()
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="newsletter_subscribers_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        # Mailchimp compatible headers
        writer.writerow(['Email Address', 'First Name', 'Last Name', 'SUBSCRIBE_DATE', 'STATUS'])
        
        for subscriber in queryset:
            writer.writerow([
                subscriber.email,
                subscriber.first_name,
                subscriber.last_name,
                subscriber.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'subscribed' if subscriber.is_active else 'unsubscribed'
            ])
        
        return response
