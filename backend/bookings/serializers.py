from rest_framework import serializers
from django.db import models
from django.db.models import Q
from .models import BookingResource, Booking, BookingParticipant, BookingSchedule
from .services import get_week_cycle_type
from users.serializers import UserListSerializer
from django.contrib.auth import get_user_model
from datetime import timedelta, datetime, date
from groups.models import GroupMembership

User = get_user_model()

class BookingScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingSchedule
        fields = '__all__'
    
    def validate(self, data):
        """
        Validate that the schedule slot doesn't overlap with existing slots.
        Two slots overlap if:
        1. Same weekday
        2. Same week_cycle OR one is 'ALL'
        3. Time ranges overlap
        """
        resource = data.get('resource')
        weekday = data.get('weekday')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        week_cycle = data.get('week_cycle', 'ALL')
        
        # Validate that end_time is after start_time
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        
        # Get the instance being updated (if any)
        instance = self.instance
        
        # Check for overlapping schedules
        if resource and weekday and start_time and end_time:
            overlapping = BookingSchedule.objects.filter(
                resource=resource,
                weekday=weekday
            ).exclude(
                id=instance.id if instance else None
            ).filter(
                # Check if week cycles overlap
                # Two cycles overlap if one is 'ALL' or both are the same
                Q(week_cycle='ALL') | 
                Q(week_cycle=week_cycle) |
                Q(week_cycle__isnull=True)  # Handle any null values
            ).filter(
                # Check for time overlap: startA < endB && endA > startB
                # This allows exact boundaries (e.g., 12:00-13:00 and 13:00-14:00)
                # but prevents any actual overlap (e.g., 12:00-13:00 and 12:59-14:00)
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            if overlapping.exists():
                overlapping_slot = overlapping.first()
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'This time slot overlaps with an existing slot ({overlapping_slot.start_time} - {overlapping_slot.end_time}, {overlapping_slot.get_week_cycle_display()}). '
                        'Please choose a different time or adjust the existing slot.'
                    ]
                })
        
        return data

class BookingResourceSerializer(serializers.ModelSerializer):
    club_name = serializers.CharField(source='club.name', read_only=True)
    group_name = serializers.CharField(source='allowed_group.name', read_only=True)
    qualification_group_name = serializers.CharField(source='qualification_group.name', read_only=True)
    # We can optionally include schedules here if we want to load them with the resource
    schedules = BookingScheduleSerializer(many=True, read_only=True)
    
    class Meta:
        model = BookingResource
        fields = '__all__'

class BookingParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingParticipant
        fields = ['id', 'name', 'user']

class BookingSerializer(serializers.ModelSerializer):
    participants = BookingParticipantSerializer(many=True, read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    club_name = serializers.CharField(source='resource.club.name', read_only=True)
    user_detail = UserListSerializer(source='user', read_only=True)
    parent_booking = serializers.IntegerField(source='parent_booking.id', read_only=True, allow_null=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'user', 'user_detail', 'resource', 'resource_name', 'club_name',
            'start_time', 'end_time', 'status', 
            'internal_notes', 'participants', 'created_at',
            'is_recurring', 'parent_booking', 'recurring_type', 'recurring_weeks', 'recurring_end_date'
        ]
        read_only_fields = ['user', 'status', 'created_at']

class CreateBookingSerializer(serializers.ModelSerializer):
    participants = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, write_only=True
    )
    # New field to allow admins to specify the target user
    target_user_id = serializers.IntegerField(write_only=True, required=False)
    # Recurring booking fields
    is_recurring = serializers.BooleanField(write_only=True, required=False, default=False)
    recurring_type = serializers.ChoiceField(
        choices=[('FOREVER', 'Forever'), ('WEEKS', 'For a specific number of weeks')],
        write_only=True,
        required=False,
        allow_null=True
    )
    recurring_weeks = serializers.IntegerField(write_only=True, required=False, allow_null=True, min_value=1)

    class Meta:
        model = Booking
        fields = [
            'resource', 'start_time', 'end_time', 'participants', 'target_user_id',
            'is_recurring', 'recurring_type', 'recurring_weeks'
        ]

    def to_representation(self, instance):
        # Use BookingSerializer to properly serialize the created instance
        return BookingSerializer(instance, context=self.context).data

    def create(self, validated_data):
        participants_data = validated_data.pop('participants', [])
        target_user_id = validated_data.pop('target_user_id', None)
        is_recurring = validated_data.pop('is_recurring', False)
        recurring_type = validated_data.pop('recurring_type', None)
        recurring_weeks = validated_data.pop('recurring_weeks', None)
        
        request_user = self.context['request'].user
        
        # Logic: If Admin provides a target_user_id, use it. Otherwise, assume self-booking.
        if target_user_id and request_user.role in ['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN']:
            try:
                user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"target_user_id": "User not found."})
        else:
            user = request_user

        resource = validated_data['resource']
        start_time = validated_data['start_time']
        end_time = validated_data['end_time']
        
        # Check if resource is restricted to a specific group
        if resource.allowed_user_scope == BookingResource.UserScope.GROUP and resource.allowed_group:
            # Verify user is a member of the required group
            is_member = GroupMembership.objects.filter(
                group=resource.allowed_group,
                user=user,
                status=GroupMembership.Status.APPROVED
            ).exists()
            
            if not is_member:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'This resource is restricted to members of "{resource.allowed_group.name}". '
                        'You must be an approved member of this group to make a booking.'
                    ]
                })
        
        # Check if resource requires qualification/training
        if resource.requires_training and resource.qualification_group:
            # Verify user is a member of the qualification group
            is_qualified = GroupMembership.objects.filter(
                group=resource.qualification_group,
                user=user,
                status=GroupMembership.Status.APPROVED
            ).exists()
            
            if not is_qualified:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'This resource requires qualification/training. '
                        f'You must be a member of "{resource.qualification_group.name}" to book this resource. '
                        'Please contact your club admin if you need access.'
                    ]
                })
        
        # Validate recurring fields
        if is_recurring:
            if not recurring_type:
                raise serializers.ValidationError({
                    'recurring_type': 'Recurring type is required when is_recurring is True.'
                })
            if recurring_type == 'WEEKS' and not recurring_weeks:
                raise serializers.ValidationError({
                    'recurring_weeks': 'Number of weeks is required when recurring_type is WEEKS.'
                })
        
        # Check for overlapping bookings (only check APPROVED bookings, as PENDING can be rejected)
        overlapping = Booking.objects.filter(
            resource=resource,
            status=Booking.Status.APPROVED
        ).filter(
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        
        if overlapping.exists():
            raise serializers.ValidationError({
                'non_field_errors': ['This time slot overlaps with an existing approved booking. Please select a different time.']
            })
        
        # Check weekly booking limit per user (0 means no limit)
        if resource.max_bookings_per_user_per_week and resource.max_bookings_per_user_per_week > 0:
            def get_week_start_end(check_date):
                """Get Monday and Sunday of the week containing check_date"""
                if isinstance(check_date, datetime):
                    check_date = check_date.date()
                days_since_monday = check_date.isoweekday() - 1
                week_start = check_date - timedelta(days=days_since_monday)
                week_end = week_start + timedelta(days=6)  # Sunday
                return week_start, week_end
            
            def check_weekly_limit(week_start, week_end):
                """Check if user has exceeded weekly limit for a specific week"""
                weekly_bookings = Booking.objects.filter(
                    user=user,
                    resource=resource,
                    status__in=[Booking.Status.APPROVED, Booking.Status.PENDING]
                ).filter(
                    start_time__date__gte=week_start,
                    start_time__date__lte=week_end
                )
                return weekly_bookings.count()
            
            # Check the week of the parent booking
            parent_week_start, parent_week_end = get_week_start_end(start_time)
            parent_week_count = check_weekly_limit(parent_week_start, parent_week_end)
            
            if parent_week_count >= resource.max_bookings_per_user_per_week:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'You have already reached your weekly booking limit for this resource. '
                        f'Maximum {resource.max_bookings_per_user_per_week} booking(s) per week allowed. '
                        f'You currently have {parent_week_count} booking(s) this week. '
                        f'Please try booking again next week.'
                    ]
                })
            
            # For recurring bookings, check all weeks that will have instances
            if is_recurring:
                if recurring_type == 'WEEKS' and recurring_weeks:
                    max_weeks = max(0, recurring_weeks - 1)  # Exclude parent week
                    for week_offset in range(1, max_weeks + 1):
                        instance_date = start_time + timedelta(weeks=week_offset)
                        instance_week_start, instance_week_end = get_week_start_end(instance_date)
                        instance_week_count = check_weekly_limit(instance_week_start, instance_week_end)
                        
                        if instance_week_count >= resource.max_bookings_per_user_per_week:
                            instance_week_str = instance_week_start.strftime('%B %d, %Y')
                            raise serializers.ValidationError({
                                'non_field_errors': [
                                    f'You have already reached your weekly booking limit for this resource. '
                                    f'This recurring booking would exceed the limit for the week of {instance_week_str}. '
                                    f'Maximum {resource.max_bookings_per_user_per_week} booking(s) per week allowed. '
                                    f'That week already has {instance_week_count} booking(s). '
                                    f'Please try booking again next week.'
                                ]
                            })
                elif recurring_type == 'FOREVER':
                    # For "forever" recurring bookings, we can't check all future weeks
                    # So we'll just check the next few weeks as a reasonable limit
                    # Check next 8 weeks (2 months)
                    for week_offset in range(1, 9):
                        instance_date = start_time + timedelta(weeks=week_offset)
                        instance_week_start, instance_week_end = get_week_start_end(instance_date)
                        instance_week_count = check_weekly_limit(instance_week_start, instance_week_end)
                        
                        if instance_week_count >= resource.max_bookings_per_user_per_week:
                            instance_week_str = instance_week_start.strftime('%B %d, %Y')
                            raise serializers.ValidationError({
                                'non_field_errors': [
                                    f'You have already reached your weekly booking limit for this resource. '
                                    f'This recurring booking would exceed the limit for the week of {instance_week_str}. '
                                    f'Maximum {resource.max_bookings_per_user_per_week} booking(s) per week allowed. '
                                    f'That week already has {instance_week_count} booking(s). '
                                    f'Please try booking again next week.'
                                ]
                            })
        
        # Determine initial status
        # If Admin is creating it, it is automatically APPROVED
        if request_user.role in ['CLUB_ADMIN', 'MUNICIPALITY_ADMIN', 'SUPER_ADMIN']:
            initial_status = Booking.Status.APPROVED
        else:
            initial_status = Booking.Status.APPROVED if resource.auto_approve else Booking.Status.PENDING
        
        # Create the parent booking
        booking_data = validated_data.copy()
        if is_recurring:
            booking_data['is_recurring'] = True
            booking_data['recurring_type'] = recurring_type
            if recurring_type == 'WEEKS':
                booking_data['recurring_weeks'] = recurring_weeks
                # Calculate end date: start_date + (recurring_weeks * 7 days)
                booking_data['recurring_end_date'] = start_time + timedelta(weeks=recurring_weeks)
            else:  # FOREVER
                # Set a far future date (e.g., 2 years from now) - can be extended
                booking_data['recurring_end_date'] = start_time + timedelta(days=730)
        
        parent_booking = Booking.objects.create(user=user, status=initial_status, **booking_data)
        
        # Create participants for parent booking
        for name in participants_data:
            BookingParticipant.objects.create(booking=parent_booking, name=name)
        
        # Generate recurring instances if needed
        if is_recurring:
            self._create_recurring_instances(
                parent_booking, 
                resource, 
                user, 
                initial_status, 
                start_time, 
                end_time,
                participants_data,
                recurring_type,
                recurring_weeks
            )
            
        return parent_booking
    
    def _create_recurring_instances(self, parent_booking, resource, user, status, start_time, end_time, participants_data, recurring_type, recurring_weeks):
        """
        Create recurring booking instances respecting even/odd week cycles.
        
        The logic:
        - Find the specific schedule that matches the selected time slot (weekday + start_time + end_time)
        - Use that schedule's week_cycle to determine which weeks to create bookings for
        - If schedule is 'ALL', create for all weeks
        - If schedule is 'ODD' or 'EVEN', only create for matching weeks
        """
        from .models import BookingSchedule
        from django.db.models import Q
        
        # Calculate duration
        duration = end_time - start_time
        
        # Get the weekday of the original booking
        weekday = start_time.isoweekday()  # 1=Monday, 7=Sunday
        
        # Get the time components (without date)
        start_time_only = start_time.time()
        end_time_only = end_time.time()
        
        # Find the specific schedule that matches this time slot
        # Match by: weekday, start_time, and end_time
        matching_schedule = BookingSchedule.objects.filter(
            resource=resource,
            weekday=weekday,
            start_time=start_time_only,
            end_time=end_time_only
        ).first()
        
        # Determine week filter based on the matching schedule
        week_filter = None  # Default: create for all weeks
        
        if matching_schedule:
            # Use the schedule's week_cycle to determine which weeks to create bookings for
            if matching_schedule.week_cycle == 'ALL':
                week_filter = None  # Create for all weeks
            else:
                # Only create for weeks matching the schedule's cycle (ODD or EVEN)
                week_filter = matching_schedule.week_cycle
        else:
            # No matching schedule found - check if there are any schedules for this weekday
            # This is a fallback in case the schedule doesn't match exactly
            weekday_schedules = BookingSchedule.objects.filter(
                resource=resource,
                weekday=weekday
            )
            
            if weekday_schedules.exists():
                # Get the week cycle type of the original booking date
                original_week_type = get_week_cycle_type(start_time.date())
                
                # Check if any schedule is 'ALL' - if so, create for all weeks
                has_all_week = weekday_schedules.filter(week_cycle='ALL').exists()
                if not has_all_week:
                    # No 'ALL' schedule exists, check if original booking matches a specific cycle
                    matching_cycle = weekday_schedules.filter(week_cycle=original_week_type).exists()
                    if matching_cycle:
                        # Only create for weeks matching the original week type (ODD or EVEN)
                        week_filter = original_week_type
        
        # Determine how many weeks to create bookings for
        # Note: recurring_weeks includes the parent booking, so we create (recurring_weeks - 1) instances
        # Example: recurring_weeks=4 means: parent (this week) + 3 instances (next 3 weeks) = 4 total bookings
        # If recurring_weeks=1, then max_weeks=0, meaning only the parent booking is created (no instances)
        if recurring_type == 'FOREVER':
            # Create bookings for 52 weeks (1 year) - can be extended later
            max_weeks = 52
        else:  # WEEKS
            # Subtract 1 because the parent booking counts as the first week
            # So if user wants 4 weeks total, we create parent + 3 instances
            max_weeks = max(0, recurring_weeks - 1)  # Ensure non-negative
        
        # Generate bookings for each week
        # Note: We iterate through calendar weeks, but only create bookings for weeks that match the schedule
        # For example, if recurring_weeks=4 and week_filter='ODD', we check the next 3 calendar weeks
        # but may only create 1-2 bookings (for the odd weeks within those 3 weeks)
        created_count = 0
        current_date = start_time.date()
        
        for week_offset in range(1, max_weeks + 1):  # Check the next max_weeks calendar weeks (excluding parent)
            next_date = current_date + timedelta(weeks=week_offset)
            
            # Check if we should create booking for this week based on even/odd cycle
            if week_filter:
                week_type = get_week_cycle_type(next_date)
                if week_type != week_filter:
                    continue  # Skip this week if it doesn't match the cycle (e.g., skip even weeks if filter is ODD)
            
            # Verify this date still matches the schedule (double-check)
            if matching_schedule:
                next_week_type = get_week_cycle_type(next_date)
                if matching_schedule.week_cycle != 'ALL' and next_week_type != matching_schedule.week_cycle:
                    continue  # Skip if week type doesn't match schedule
            
            # Check for overlaps before creating
            next_start = datetime.combine(next_date, start_time.time())
            if start_time.tzinfo:
                from django.utils.timezone import make_aware
                next_start = make_aware(next_start)
            next_end = next_start + duration
            
            # Check for overlapping APPROVED bookings
            overlapping = Booking.objects.filter(
                resource=resource,
                status=Booking.Status.APPROVED
            ).filter(
                start_time__lt=next_end,
                end_time__gt=next_start
            )
            
            if overlapping.exists():
                # Skip this week if there's an overlap
                continue
            
            # Create the recurring instance
            instance = Booking.objects.create(
                user=user,
                resource=resource,
                start_time=next_start,
                end_time=next_end,
                status=status,
                parent_booking=parent_booking,
                is_recurring=False,  # Instances are not marked as recurring, only parent is
                internal_notes=parent_booking.internal_notes
            )
            
            # Create participants for this instance
            for name in participants_data:
                BookingParticipant.objects.create(booking=instance, name=name)
            
            created_count += 1
        
        return created_count