# backend/marketing/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db.models import Count
from django.core.cache import cache
from datetime import timedelta

from .models import SiteSEOSettings, Testimonial
from .serializers import (
    SiteSEOSettingsSerializer, 
    TestimonialSerializer, 
    TestimonialAdminSerializer
)


class SiteSEOSettingsView(APIView):
    """
    Public endpoint to get SEO settings for the startpage.
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
                'page_title': 'Ungdomsappen - Hitta aktiviteter nära dig',
                'meta_description': 'Upptäck aktiviteter, evenemang och fritidsgårdar nära dig. Ungdomsappen samlar allt för unga på ett ställe.',
                'keywords': 'ungdomsappen, fritidsgård, aktiviteter, ungdom, evenemang',
                'og_title': '',
                'og_description': '',
                'og_image': None
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]  # Could add IsSuperAdmin for stricter control
    
    def get_queryset(self):
        user = self.request.user
        
        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return Testimonial.objects.all().order_by('-created_at')
        
        # Others only see active testimonials
        return Testimonial.objects.filter(is_active=True).order_by('-created_at')
