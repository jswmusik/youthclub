from django.db.models import Count, Q, Avg, F, Func, IntegerField, Case, When
from django.db.models.functions import TruncHour, ExtractWeekDay, TruncDate
from django.utils import timezone
from datetime import timedelta
import statistics

# Import Models
from users.models import User
from visits.models import CheckInSession
from inventory.models import LendingSession, Item
from events.models import EventRegistration
from organization.models import Club

class AnalyticsService:
    def __init__(self, start_date, end_date, club_id=None, filters=None):
        self.start_date = start_date
        self.end_date = end_date
        self.club_id = club_id
        self.filters = filters or {}
        
        # 1. Resolve the "Universe of Users" based on filters first
        # This makes all subsequent queries much faster and cleaner
        self.target_users = self._get_filtered_users()

    def _get_filtered_users(self):
        """
        Applies demographic filters (Age, Grade, Gender, Group) to return a QuerySet of User IDs.
        """
        users = User.objects.filter(role='YOUTH_MEMBER')
        f = self.filters

        # A. Group Priority (If a group is selected, it overrides broad demographics)
        if f.get('group_id'):
            return users.filter(group_memberships__group_id=f['group_id'], group_memberships__status='APPROVED')

        # B. Demographic Filters
        if f.get('grades'):
            users = users.filter(grade__in=f['grades'])

        if f.get('genders'):
            users = users.filter(legal_gender__in=f['genders'])

        if f.get('interests'):
            users = users.filter(interests__id__in=f['interests'])

        # Age Calculation (Approximate by birth year for performance)
        current_year = timezone.now().year
        if f.get('age_min'):
            users = users.filter(date_of_birth__year__lte=current_year - f['age_min'])
        if f.get('age_max'):
            users = users.filter(date_of_birth__year__gte=current_year - f['age_max'])

        return users

    # ==========================================
    # CORE METRICS GENERATOR
    # ==========================================
    def get_dashboard_metrics(self):
        return {
            "traffic": self._calculate_traffic_metrics(),
            "heatmap": self._calculate_heatmap(),
            "inventory": self._calculate_inventory_metrics(),
            "events": self._calculate_event_metrics(),
            "network": self._calculate_network_metrics(), # Will be null if looking at single club
            # Municipality-level additions:
            "comparison": self.get_club_comparison(),
            "demographics": self.get_demographic_distribution()
        }

    # --- TRAFFIC ---
    def _calculate_traffic_metrics(self):
        # Base Visits Query
        qs = CheckInSession.objects.filter(
            check_in_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        if self.club_id:
            qs = qs.filter(club_id=self.club_id)

        total_visits = qs.count()
        unique_visitors = qs.values('user').distinct().count()

        # Retention Logic (Users from LAST period who are also in THIS period)
        # 1. Define "Previous Period" (Same length as current)
        period_length = self.end_date - self.start_date
        prev_start = self.start_date - period_length
        prev_end = self.start_date
        
        # 2. Get Users who visited in Previous Period
        prev_visitors = CheckInSession.objects.filter(
            check_in_at__range=(prev_start, prev_end),
            club_id=self.club_id if self.club_id else None
        ).values_list('user_id', flat=True).distinct()
        
        # 3. Count how many of THEM are in the Current Period
        retained_count = qs.filter(user_id__in=prev_visitors).values('user').distinct().count()
        retention_rate = (retained_count / len(prev_visitors) * 100) if prev_visitors else 0

        # Smart Duration (Median)
        # Fetch durations in minutes, filtering out > 480 mins (8 hours)
        # We do this in Python because Median is hard in standard SQL/Django ORM
        raw_durations = []
        valid_checkouts = qs.filter(check_out_at__isnull=False)
        
        for v in valid_checkouts:
            duration = (v.check_out_at - v.check_in_at).total_seconds() / 60
            if 5 < duration < 480: # Filter: >5 mins and <8 hours
                raw_durations.append(duration)
        
        median_duration = statistics.median(raw_durations) if raw_durations else 0

        return {
            "total_visits": total_visits,
            "unique_visitors": unique_visitors,
            "retention_rate": round(retention_rate, 1),
            "avg_duration_minutes": round(median_duration), # Labelled avg for UI, but is median
            "visits_per_member": round(total_visits / unique_visitors, 1) if unique_visitors else 0
        }

    # --- HEATMAP ---
    def _calculate_heatmap(self):
        qs = CheckInSession.objects.filter(
            check_in_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        if self.club_id:
            qs = qs.filter(club_id=self.club_id)
            
        # Group by Weekday (1=Sunday...7=Saturday) and Hour (0-23)
        data = qs.annotate(
            weekday=ExtractWeekDay('check_in_at'),
            hour=TruncHour('check_in_at')
        ).values('weekday', 'hour__hour').annotate(count=Count('id')).order_by('weekday', 'hour__hour')
        
        # Format for Recharts (Array of objects)
        return list(data)

    # --- INVENTORY ---
    def _calculate_inventory_metrics(self):
        qs = LendingSession.objects.filter(
            borrowed_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        if self.club_id:
            qs = qs.filter(item__club_id=self.club_id)

        total_loans = qs.count()
        unique_borrowers = qs.values('user').distinct().count()

        # Top 10 Items
        top_items = qs.values('item__title', 'item__category__name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # Top Categories
        categories = qs.values('item__category__name').annotate(
            count=Count('id')
        ).order_by('-count')

        return {
            "total_loans": total_loans,
            "unique_borrowers": unique_borrowers,
            "top_items": list(top_items),
            "category_distribution": list(categories)
        }

    # --- EVENTS ---
    def _calculate_event_metrics(self):
        qs = EventRegistration.objects.filter(
            event__start_date__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        if self.club_id:
            qs = qs.filter(event__club_id=self.club_id)

        # Status breakdown
        status_counts = qs.values('status').annotate(count=Count('id'))
        
        # Calculate Show-up Rate (Attended / (Approved + Attended))
        attended = qs.filter(status='ATTENDED').count()
        approved = qs.filter(status='APPROVED').count()
        total_valid = attended + approved
        show_up_rate = (attended / total_valid * 100) if total_valid > 0 else 0

        return {
            "total_registrations": qs.count(),
            "status_breakdown": list(status_counts),
            "show_up_rate": round(show_up_rate, 1)
        }

    # --- NETWORK (Municipality Only) ---
    def _calculate_network_metrics(self):
        # The Nomad Metric is irrelevant if we are looking at a single club
        if self.club_id:
            return None

        # "Nomad": A user who has visited >1 DISTINCT club in this period
        # We look at ALL checkins for the target users
        nomad_qs = CheckInSession.objects.filter(
            check_in_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        ).values('user').annotate(
            club_count=Count('club', distinct=True)
        ).filter(club_count__gt=1)

        nomad_count = nomad_qs.count()
        total_unique = CheckInSession.objects.filter(
            check_in_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        ).values('user').distinct().count()

        return {
            "nomad_count": nomad_count,
            "nomad_percentage": round((nomad_count / total_unique * 100), 1) if total_unique else 0,
            "explanation": "Percentage of youths visiting more than one club."
        }

    # --- CLUB COMPARISON (Municipality Only) ---
    def get_club_comparison(self):
        """
        Returns a list of clubs with their key metrics for the period.
        Used for the Municipality 'League Table'.
        """
        # If a specific club is selected, this is irrelevant
        if self.club_id:
            return []

        # Get all clubs in the scope (e.g. municipality)
        # Note: In a real app, filter by the admin's municipality. 
        # For now, we assume the View handles permission filtering or we look at all.
        clubs = Club.objects.all()

        comparison_data = []
        
        for club in clubs:
            # We reuse the logic but scoped to this club
            # Note: This is a simple loop. For production with 100+ clubs, 
            # you would optimize this into a single complex query using Annotate.
            
            # Traffic
            visits = CheckInSession.objects.filter(
                club=club,
                check_in_at__range=(self.start_date, self.end_date)
            ).count()
            
            unique_users = CheckInSession.objects.filter(
                club=club,
                check_in_at__range=(self.start_date, self.end_date)
            ).values('user').distinct().count()

            # New Members (Joined the platform in this period AND affiliated with this club)
            new_members = User.objects.filter(
                date_joined__range=(self.start_date, self.end_date),
                preferred_club=club
            ).count()

            comparison_data.append({
                "club_name": club.name,
                "visits": visits,
                "unique_users": unique_users,
                "new_members": new_members,
                "utilization": round(visits / unique_users, 1) if unique_users else 0
            })

        # Sort by Visits descending
        return sorted(comparison_data, key=lambda x: x['visits'], reverse=True)

    # --- DEMOGRAPHIC DISTRIBUTION ---
    def get_demographic_distribution(self):
        """
        Returns data for Gender Pie Chart and Age/Grade Bar Charts.
        """
        # 1. Gender Split
        gender_data = self.target_users.values('legal_gender').annotate(
            count=Count('id')
        ).order_by('legal_gender')
        
        # 2. Grade Distribution (Excluding null grades)
        grade_data = self.target_users.exclude(grade__isnull=True).values('grade').annotate(
            count=Count('id')
        ).order_by('grade')

        return {
            "gender_split": list(gender_data),
            "grade_distribution": list(grade_data)
        }