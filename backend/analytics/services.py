from django.db.models import Count, Q, Avg, F, Func, IntegerField, Case, When
from django.db.models.functions import TruncHour, ExtractWeekDay, ExtractHour, TruncDate
from django.utils import timezone
from datetime import timedelta
import statistics

# Import Models
from users.models import User
from visits.models import CheckInSession
from inventory.models import LendingSession, Item
from events.models import EventRegistration, Event
from organization.models import Club
from custom_fields.models import CustomFieldValue
from groups.models import Group
from questionnaires.models import Questionnaire, QuestionnaireResponse
from bookings.models import Booking, BookingResource

class AnalyticsService:
    def __init__(self, start_date, end_date, club_id=None, municipality_id=None, filters=None):
        self.start_date = start_date
        self.end_date = end_date
        self.club_id = club_id
        self.municipality_id = municipality_id  # NEW: Scope to municipality
        self.filters = filters or {}
        
        # 1. Resolve the "Universe of Users" based on filters first
        # This makes all subsequent queries much faster and cleaner
        self.target_users = self._get_filtered_users()

    def _get_filtered_users(self):
        """
        Applies demographic filters to return a QuerySet of Youth Members.
        Groups take precedence over all other demographic filters.
        Always scoped to club or municipality.
        """
        f = self.filters

        # STEP 1: Get user IDs that belong to this club/municipality
        # This is the MOST IMPORTANT step - we MUST scope first
        scoped_user_ids = self._get_scoped_user_ids()
        
        # Start with youth members in scope
        users = User.objects.filter(role='YOUTH_MEMBER', id__in=scoped_user_ids)

        # STEP 2: Group Priority (If a group is selected, it overrides all other demographic filters)
        if f.get('group_id'):
            return users.filter(
                group_memberships__group_id=f['group_id'], 
                group_memberships__status='APPROVED'
            ).distinct()

        # STEP 3: Demographic Filters (Only applied if no group is selected)
        
        # Grade filter - supports multiple grades
        if f.get('grades') and len(f['grades']) > 0:
            users = users.filter(grade__in=f['grades'])

        # Gender filter - supports multiple genders
        if f.get('genders') and len(f['genders']) > 0:
            users = users.filter(legal_gender__in=f['genders'])

        # Interests filter - supports multiple interests (ANY match)
        if f.get('interests') and len(f['interests']) > 0:
            users = users.filter(interests__id__in=f['interests']).distinct()

        # Age Calculation (Approximate by birth year for performance)
        current_year = timezone.now().year
        if f.get('age_min') is not None:
            users = users.filter(date_of_birth__year__lte=current_year - f['age_min'])
        if f.get('age_max') is not None:
            users = users.filter(date_of_birth__year__gte=current_year - f['age_max'])

        # STEP 4: Custom Fields Filter
        custom_fields = f.get('custom_fields', {})
        if custom_fields:
            for field_id, value in custom_fields.items():
                if value is not None and value != '' and value != []:
                    if isinstance(value, list):
                        field_users = CustomFieldValue.objects.filter(
                            field_id=field_id
                        ).filter(
                            Q(value__in=value) | Q(value__contains=value)
                        ).values_list('user_id', flat=True)
                    else:
                        field_users = CustomFieldValue.objects.filter(
                            field_id=field_id,
                            value=value
                        ).values_list('user_id', flat=True)
                    
                    users = users.filter(id__in=field_users)

        return users
    
    def _get_scoped_user_ids(self):
        """
        Returns a set of user IDs that belong to this club or municipality.
        A user belongs if:
        - Their preferred_club is in scope, OR
        - They are an approved member of a group in scope
        """
        from groups.models import GroupMembership
        
        user_ids = set()
        
        if self.club_id:
            # Users with this club as preferred
            preferred_users = User.objects.filter(
                role='YOUTH_MEMBER',
                preferred_club_id=self.club_id
            ).values_list('id', flat=True)
            user_ids.update(preferred_users)
            
            # Users in groups belonging to this club
            group_users = GroupMembership.objects.filter(
                group__club_id=self.club_id,
                status='APPROVED',
                user__role='YOUTH_MEMBER'
            ).values_list('user_id', flat=True)
            user_ids.update(group_users)
            
        elif self.municipality_id:
            # Users with preferred_club in this municipality
            preferred_users = User.objects.filter(
                role='YOUTH_MEMBER',
                preferred_club__municipality_id=self.municipality_id
            ).values_list('id', flat=True)
            user_ids.update(preferred_users)
            
            # Users in groups belonging to this municipality
            group_users = GroupMembership.objects.filter(
                group__municipality_id=self.municipality_id,
                status='APPROVED',
                user__role='YOUTH_MEMBER'
            ).values_list('user_id', flat=True)
            user_ids.update(group_users)
        else:
            # No scope - return all youth members (for super admin without scope)
            all_users = User.objects.filter(role='YOUTH_MEMBER').values_list('id', flat=True)
            user_ids.update(all_users)
        
        return user_ids

    # ==========================================
    # CORE METRICS GENERATOR
    # ==========================================
    def get_dashboard_metrics(self):
        return {
            "total_members": self._calculate_total_members(),  # NEW: Total members based on filters
            "traffic": self._calculate_traffic_metrics(),
            "heatmap": self._calculate_heatmap(),
            "inventory": self._calculate_inventory_metrics(),
            "events": self._calculate_event_metrics(),
            "network": self._calculate_network_metrics(),  # Will be null if looking at single club
            # Municipality-level additions:
            "comparison": self.get_club_comparison(),
            "group_comparison": self.get_group_comparison(),  # NEW: Group metrics
            "demographics": self.get_demographic_distribution(),
            "top_interests": self.get_top_interests(),
            # NEW: Questionnaire and Booking Analytics
            "questionnaires": self._calculate_questionnaire_metrics(),
            "bookings": self._calculate_booking_metrics(),
        }

    # --- TOTAL MEMBERS ---
    def _calculate_total_members(self):
        """
        Returns total member count based on current filters.
        target_users is already scoped to club/municipality and filtered.
        """
        # Use distinct count to avoid duplicates from joins
        return self.target_users.distinct().count()

    # --- TRAFFIC ---
    def _calculate_traffic_metrics(self):
        # Base Visits Query
        qs = CheckInSession.objects.filter(
            check_in_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        if self.club_id:
            qs = qs.filter(club_id=self.club_id)
        elif self.municipality_id:
            qs = qs.filter(club__municipality_id=self.municipality_id)

        total_visits = qs.count()
        unique_visitors = qs.values('user').distinct().count()

        # Retention Logic (Users from LAST period who are also in THIS period)
        # 1. Define "Previous Period" (Same length as current)
        period_length = self.end_date - self.start_date
        prev_start = self.start_date - period_length
        prev_end = self.start_date
        
        # 2. Get Users who visited in Previous Period
        prev_qs = CheckInSession.objects.filter(
            check_in_at__range=(prev_start, prev_end)
        )
        if self.club_id:
            prev_qs = prev_qs.filter(club_id=self.club_id)
        elif self.municipality_id:
            prev_qs = prev_qs.filter(club__municipality_id=self.municipality_id)
            
        prev_visitors = prev_qs.values_list('user_id', flat=True).distinct()
        
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
        elif self.municipality_id:
            qs = qs.filter(club__municipality_id=self.municipality_id)
            
        # Group by Weekday (1=Sunday...7=Saturday) and Hour (0-23)
        data = qs.annotate(
            weekday=ExtractWeekDay('check_in_at'),
            hour=ExtractHour('check_in_at')
        ).values('weekday', 'hour').annotate(count=Count('id')).order_by('weekday', 'hour')
        
        # Format for Recharts (Array of objects)
        return list(data)

    # --- UPGRADED INVENTORY ---
    def _calculate_inventory_metrics(self):
        qs = LendingSession.objects.filter(
            borrowed_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        if self.club_id:
            qs = qs.filter(item__club_id=self.club_id)
        elif self.municipality_id:
            qs = qs.filter(item__club__municipality_id=self.municipality_id)

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

        # NEW: Dust Collectors (Items with 0 loans in this period)
        # We look for items belonging to the club (or municipality) that are NOT in the loans list
        all_items = Item.objects.filter(status='AVAILABLE')
        if self.club_id:
            all_items = all_items.filter(club_id=self.club_id)
        elif self.municipality_id:
            all_items = all_items.filter(club__municipality_id=self.municipality_id)
        
        # Exclude items that appear in the loan list
        loaned_item_ids = qs.values_list('item_id', flat=True).distinct()
        dust_collectors = all_items.exclude(id__in=loaned_item_ids).count()

        return {
            "total_loans": total_loans,
            "unique_borrowers": unique_borrowers,
            "top_items": list(top_items),
            "category_distribution": list(categories),
            "dust_collectors": dust_collectors  # NEW METRIC
        }

    # --- UPGRADED EVENTS ---
    def _calculate_event_metrics(self):
        # Registrations in period from target users
        qs_reg = EventRegistration.objects.filter(
            event__start_date__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )

        if self.club_id:
            qs_reg = qs_reg.filter(event__club_id=self.club_id)
        elif self.municipality_id:
            qs_reg = qs_reg.filter(event__club__municipality_id=self.municipality_id)

        # Get events that have registrations from target users
        # This ensures that when a group is selected, we only show events relevant to that group
        event_ids_with_target_registrations = qs_reg.values_list('event_id', flat=True).distinct()
        
        # Events that have at least one registration from target users
        qs_events = Event.objects.filter(
            id__in=event_ids_with_target_registrations,
            start_date__range=(self.start_date, self.end_date)
        )

        # Status breakdown (already filtered by target users)
        status_counts = qs_reg.values('status').annotate(count=Count('id'))
        
        # Show-up Rate (from target users only)
        attended = qs_reg.filter(status='ATTENDED').count()
        approved = qs_reg.filter(status='APPROVED').count()
        total_valid = attended + approved
        show_up_rate = (attended / total_valid * 100) if total_valid > 0 else 0

        # Capacity Utilization - Calculate based on target users' registrations per event
        # For each event, calculate what % of capacity is filled by target users
        events_with_limit = qs_events.filter(max_seats__gt=0)
        total_capacity_pct = 0
        count_limited_events = 0
        
        for evt in events_with_limit:
            # Count registrations from target users for this specific event
            target_registrations = qs_reg.filter(
                event=evt,
                status__in=['APPROVED', 'ATTENDED']
            ).count()
            
            if evt.max_seats > 0:
                pct = (target_registrations / evt.max_seats) * 100
                total_capacity_pct += pct
                count_limited_events += 1
        
        avg_capacity = (total_capacity_pct / count_limited_events) if count_limited_events > 0 else 0

        # Top events by registration count FROM TARGET USERS
        # We need to count registrations per event from target users only
        top_events_data = []
        for evt in qs_events:
            target_reg_count = qs_reg.filter(event=evt).count()
            if target_reg_count > 0:
                top_events_data.append({
                    'id': evt.id,
                    'title': evt.title,
                    'start_date': evt.start_date.isoformat() if evt.start_date else None,
                    'registration_count': target_reg_count,
                    'max_seats': evt.max_seats
                })
        
        # Sort by registration count and take top 5
        top_events = sorted(top_events_data, key=lambda x: x['registration_count'], reverse=True)[:5]

        return {
            "total_events": qs_events.count(),
            "total_registrations": qs_reg.count(),
            "status_breakdown": list(status_counts),
            "show_up_rate": round(show_up_rate, 1),
            "avg_capacity_utilization": round(avg_capacity, 1),
            "top_events": list(top_events)  # NEW: Top events by registrations
        }

    # --- NETWORK (Municipality Only) ---
    def _calculate_network_metrics(self):
        # The Nomad Metric is irrelevant if we are looking at a single club
        if self.club_id:
            return None

        # Base query for check-ins
        base_qs = CheckInSession.objects.filter(
            check_in_at__range=(self.start_date, self.end_date),
            user__in=self.target_users
        )
        
        # Scope to municipality if set
        if self.municipality_id:
            base_qs = base_qs.filter(club__municipality_id=self.municipality_id)

        # "Nomad": A user who has visited >1 DISTINCT club in this period
        nomad_qs = base_qs.values('user').annotate(
            club_count=Count('club', distinct=True)
        ).filter(club_count__gt=1)

        nomad_count = nomad_qs.count()
        total_unique = base_qs.values('user').distinct().count()

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
        Only shows clubs within the same municipality.
        """
        # If a specific club is selected, this is irrelevant
        if self.club_id:
            return []

        # Get clubs scoped to the municipality
        clubs = Club.objects.all()
        if self.municipality_id:
            clubs = clubs.filter(municipality_id=self.municipality_id)
        
        # If no municipality scope and not super admin, return empty
        if not self.municipality_id:
            return []

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
            
            # Events count for this club
            events_count = Event.objects.filter(
                club=club,
                start_date__range=(self.start_date, self.end_date)
            ).count()

            comparison_data.append({
                "club_id": club.id,
                "club_name": club.name,
                "visits": visits,
                "unique_users": unique_users,
                "new_members": new_members,
                "events_count": events_count,
                "utilization": round(visits / unique_users, 1) if unique_users else 0
            })

        # Sort by Visits descending
        return sorted(comparison_data, key=lambda x: x['visits'], reverse=True)

    # --- DEMOGRAPHIC DISTRIBUTION ---
    def get_demographic_distribution(self):
        """
        Returns data for Gender Pie Chart and Age/Grade Bar Charts.
        target_users is already scoped to club/municipality and filtered.
        """
        # Get user IDs from target_users queryset to ensure correct scoping
        user_ids = list(self.target_users.values_list('id', flat=True))
        
        if not user_ids:
            return {
                "gender_split": [],
                "grade_distribution": []
            }
        
        # Query from fresh User objects using the IDs
        scoped_users = User.objects.filter(id__in=user_ids)
        
        # 1. Gender Split
        gender_data = scoped_users.values('legal_gender').annotate(
            count=Count('id')
        ).order_by('legal_gender')
        
        # 2. Grade Distribution (Excluding null grades)
        grade_data = scoped_users.exclude(grade__isnull=True).values('grade').annotate(
            count=Count('id')
        ).order_by('grade')

        return {
            "gender_split": list(gender_data),
            "grade_distribution": list(grade_data)
        }

    # --- NEW: TOP INTERESTS ---
    def get_top_interests(self):
        """
        Returns the top 5 interests among the filtered users.
        target_users is already scoped to club/municipality and filtered.
        """
        # Get user IDs from target_users queryset
        user_ids = list(self.target_users.values_list('id', flat=True))
        
        if not user_ids:
            return []
        
        # Get interests with counts from target users only
        interest_counts = User.objects.filter(
            id__in=user_ids
        ).exclude(
            interests__isnull=True
        ).values(
            'interests__id', 'interests__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return list(interest_counts)

    # --- GROUP COMPARISON ---
    def get_group_comparison(self):
        """
        Returns a comparison of groups with key metrics:
        - Total members
        - Check-ins in period
        - Gender breakdown
        - New members in period
        """
        # Get groups scoped to municipality/club
        groups = Group.objects.all()
        
        if self.club_id:
            # For club view: show ONLY club-specific groups (not municipality-wide)
            groups = groups.filter(club_id=self.club_id)
        elif self.municipality_id:
            # For municipality view: show all groups in municipality (including municipality-wide)
            groups = groups.filter(municipality_id=self.municipality_id)
        else:
            # No scope - return empty
            return []

        comparison_data = []
        
        for group in groups:
            # Get approved members of this group (youth only)
            group_members = User.objects.filter(
                role='YOUTH_MEMBER',
                group_memberships__group=group,
                group_memberships__status='APPROVED'
            )
            
            total_members = group_members.count()
            
            if total_members == 0:
                continue  # Skip groups with no members
            
            # Check-ins from group members in this period
            checkins_qs = CheckInSession.objects.filter(
                check_in_at__range=(self.start_date, self.end_date),
                user__in=group_members
            )
            if self.club_id:
                checkins_qs = checkins_qs.filter(club_id=self.club_id)
            elif self.municipality_id:
                checkins_qs = checkins_qs.filter(club__municipality_id=self.municipality_id)
            
            total_checkins = checkins_qs.count()
            
            # Gender breakdown
            gender_counts = group_members.values('legal_gender').annotate(
                count=Count('id')
            )
            male_count = 0
            female_count = 0
            other_count = 0
            for g in gender_counts:
                if g['legal_gender'] == 'MALE':
                    male_count = g['count']
                elif g['legal_gender'] == 'FEMALE':
                    female_count = g['count']
                else:
                    other_count += g['count']
            
            # New members (joined group in this period)
            from groups.models import GroupMembership
            new_members = GroupMembership.objects.filter(
                group=group,
                status='APPROVED',
                joined_at__range=(self.start_date, self.end_date),
                user__role='YOUTH_MEMBER'
            ).count()
            
            comparison_data.append({
                "group_id": group.id,
                "group_name": group.name,
                "club_name": group.club.name if group.club else None,
                "is_municipality_wide": group.club is None,
                "total_members": total_members,
                "total_checkins": total_checkins,
                "male_count": male_count,
                "female_count": female_count,
                "other_count": other_count,
                "new_members": new_members,
            })

        # Sort by total members descending
        return sorted(comparison_data, key=lambda x: x['total_members'], reverse=True)

    # --- QUESTIONNAIRE ANALYTICS ---
    def _calculate_questionnaire_metrics(self):
        """
        Returns questionnaire analytics:
        - Total questionnaires created in period
        - Participation rates (started, completed, not participated %)
        - Gender breakdown of participants
        """
        # Get questionnaires created in the period, scoped to club/municipality
        questionnaires_qs = Questionnaire.objects.filter(
            created_at__range=(self.start_date, self.end_date),
            status__in=['PUBLISHED', 'ARCHIVED']  # Only count published/archived ones
        )
        
        if self.club_id:
            questionnaires_qs = questionnaires_qs.filter(club_id=self.club_id)
        elif self.municipality_id:
            # Include questionnaires from clubs in this municipality OR municipality-level questionnaires
            questionnaires_qs = questionnaires_qs.filter(
                Q(club__municipality_id=self.municipality_id) | 
                Q(municipality_id=self.municipality_id)
            )
        
        total_questionnaires = questionnaires_qs.count()
        
        if total_questionnaires == 0:
            return {
                "total_questionnaires": 0,
                "participation": {
                    "started_count": 0,
                    "completed_count": 0,
                    "not_participated_count": 0,
                    "started_pct": 0,
                    "completed_pct": 0,
                    "not_participated_pct": 0,
                },
                "gender_breakdown": {
                    "male_pct": 0,
                    "female_pct": 0,
                    "other_pct": 0,
                    "male_count": 0,
                    "female_count": 0,
                    "other_count": 0,
                },
                "total_eligible": 0,
                "total_responses": 0,
            }
        
        # Get all questionnaire IDs for filtering responses
        questionnaire_ids = list(questionnaires_qs.values_list('id', flat=True))
        
        # Get responses for these questionnaires from target users
        responses_qs = QuestionnaireResponse.objects.filter(
            questionnaire_id__in=questionnaire_ids,
            user__in=self.target_users
        )
        
        # Count by status
        started_count = responses_qs.filter(status='STARTED').count()
        completed_count = responses_qs.filter(status='COMPLETED').count()
        total_responses = started_count + completed_count
        
        # Calculate eligible users (target users who could have participated)
        # For simplicity, we use total_members as the eligible pool
        total_eligible = self.target_users.distinct().count()
        not_participated_count = max(0, total_eligible - total_responses)
        
        # Calculate percentages
        if total_eligible > 0:
            started_pct = round((started_count / total_eligible) * 100, 1)
            completed_pct = round((completed_count / total_eligible) * 100, 1)
            not_participated_pct = round((not_participated_count / total_eligible) * 100, 1)
        else:
            started_pct = completed_pct = not_participated_pct = 0
        
        # Gender breakdown of participants (those who started or completed)
        participant_user_ids = responses_qs.values_list('user_id', flat=True).distinct()
        participants = User.objects.filter(id__in=participant_user_ids)
        
        gender_counts = participants.values('legal_gender').annotate(count=Count('id'))
        
        male_count = 0
        female_count = 0
        other_count = 0
        
        for g in gender_counts:
            if g['legal_gender'] == 'MALE':
                male_count = g['count']
            elif g['legal_gender'] == 'FEMALE':
                female_count = g['count']
            else:
                other_count += g['count']
        
        total_participants = male_count + female_count + other_count
        
        if total_participants > 0:
            male_pct = round((male_count / total_participants) * 100, 1)
            female_pct = round((female_count / total_participants) * 100, 1)
            other_pct = round((other_count / total_participants) * 100, 1)
        else:
            male_pct = female_pct = other_pct = 0
        
        return {
            "total_questionnaires": total_questionnaires,
            "participation": {
                "started_count": started_count,
                "completed_count": completed_count,
                "not_participated_count": not_participated_count,
                "started_pct": started_pct,
                "completed_pct": completed_pct,
                "not_participated_pct": not_participated_pct,
            },
            "gender_breakdown": {
                "male_pct": male_pct,
                "female_pct": female_pct,
                "other_pct": other_pct,
                "male_count": male_count,
                "female_count": female_count,
                "other_count": other_count,
            },
            "total_eligible": total_eligible,
            "total_responses": total_responses,
        }

    # --- BOOKING ANALYTICS ---
    def _calculate_booking_metrics(self):
        """
        Returns booking analytics:
        - Total bookings in period
        - Gender breakdown of who booked
        - Top 8 most booked resources (rooms/equipment)
        """
        # Get bookings in the period, scoped to club/municipality
        bookings_qs = Booking.objects.filter(
            created_at__range=(self.start_date, self.end_date),
            user__in=self.target_users,
            status__in=['PENDING', 'APPROVED']  # Only count valid bookings
        )
        
        if self.club_id:
            bookings_qs = bookings_qs.filter(resource__club_id=self.club_id)
        elif self.municipality_id:
            bookings_qs = bookings_qs.filter(resource__club__municipality_id=self.municipality_id)
        
        total_bookings = bookings_qs.count()
        
        if total_bookings == 0:
            return {
                "total_bookings": 0,
                "gender_breakdown": {
                    "male_pct": 0,
                    "female_pct": 0,
                    "other_pct": 0,
                    "male_count": 0,
                    "female_count": 0,
                    "other_count": 0,
                },
                "top_resources": [],
                "unique_bookers": 0,
            }
        
        # Gender breakdown of bookers
        booker_user_ids = bookings_qs.values_list('user_id', flat=True).distinct()
        bookers = User.objects.filter(id__in=booker_user_ids)
        
        gender_counts = bookers.values('legal_gender').annotate(count=Count('id'))
        
        male_count = 0
        female_count = 0
        other_count = 0
        
        for g in gender_counts:
            if g['legal_gender'] == 'MALE':
                male_count = g['count']
            elif g['legal_gender'] == 'FEMALE':
                female_count = g['count']
            else:
                other_count += g['count']
        
        total_bookers = male_count + female_count + other_count
        
        if total_bookers > 0:
            male_pct = round((male_count / total_bookers) * 100, 1)
            female_pct = round((female_count / total_bookers) * 100, 1)
            other_pct = round((other_count / total_bookers) * 100, 1)
        else:
            male_pct = female_pct = other_pct = 0
        
        # Top 8 most booked resources
        top_resources = bookings_qs.values(
            'resource__id',
            'resource__name',
            'resource__resource_type'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:8]
        
        # Format for frontend
        top_resources_list = [
            {
                "resource_id": r['resource__id'],
                "resource_name": r['resource__name'],
                "resource_type": r['resource__resource_type'],
                "count": r['count'],
            }
            for r in top_resources
        ]
        
        return {
            "total_bookings": total_bookings,
            "gender_breakdown": {
                "male_pct": male_pct,
                "female_pct": female_pct,
                "other_pct": other_pct,
                "male_count": male_count,
                "female_count": female_count,
                "other_count": other_count,
            },
            "top_resources": top_resources_list,
            "unique_bookers": total_bookers,
        }