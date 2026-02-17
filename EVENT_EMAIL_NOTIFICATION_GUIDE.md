# Event Email Notification System

## Overview

The system automatically sends email notifications to eligible users when a new event is published. This ensures that users only receive notifications for events they can actually attend based on targeting criteria.

## How It Works

### 1. Event Publishing Trigger

When an event's status changes to `PUBLISHED`, a signal (`notify_users_of_new_event`) is triggered in `/backend/events/signals.py`.

### 2. Candidate User Selection

The system first identifies potential recipients based on the event's scope:

- **Club-specific events**: Notify youth members whose `preferred_club` matches the event's club
- **Municipality-wide events**: Notify youth members in clubs within the event's municipality
- **Global events**: Notify all youth members

### 3. Targeting Filter Application

Each candidate user is then validated against the event's targeting criteria using the `filter_events_by_targeting()` function from `/backend/events/services.py`.

#### Targeting Criteria

The following criteria are checked (all specified criteria must match):

1. **Target Audience** (applies to all events):
   - `YOUTH`: Only youth members can see the event
   - `GUARDIAN`: Only guardians can see the event
   - `BOTH`: Both youth members and guardians can see the event

2. **Group Targeting** (overrides other filters if set):
   - If the event has target groups, ONLY users who are approved members of those groups will be notified
   - This is an exclusive filter - group-targeted events are only visible to group members

3. **Interest Targeting**:
   - User must have at least one of the event's target interests
   - Only checked if no group targeting is set

4. **Gender Targeting**:
   - User's `legal_gender` must match one of the event's `target_genders`
   - Only checked if no group targeting is set

5. **Age Targeting**:
   - User must be within the event's `target_min_age` and `target_max_age` range
   - User must have a `date_of_birth` set to be considered
   - Only checked if no group targeting is set

6. **Grade Targeting**:
   - User's `grade` must match one of the event's `target_grades`
   - Only checked if no group targeting is set

### 4. Notification Delivery

For each eligible user:

1. **In-app Notification**: Created via `Notification.objects.bulk_create()`
   - Category: `EVENT`
   - Title: "Nytt event: {event_title}"
   - Body: "{source_name} har publicerat ett nytt event. Registrera dig nu!"
   - Action URL: `/dashboard/youth/events/{event.id}`

2. **Email Notification**: Sent via `EmailService.send()`
   - Template Type: `NEW_EVENT`
   - Context includes:
     - `event_title`: The event title
     - `event_description`: First 200 characters of the description
     - `event_date`: Formatted start date
     - `event_location`: Event location or 'TBD'
     - `source_name`: Club name, municipality name, or "Ungdomsappen"
     - `registration_required`: Boolean indicating if registration is needed

## Example Scenarios

### Scenario 1: Club-Specific Event with No Additional Targeting

```python
Event:
  club: "Göteborg Norra Fritidsgård"
  municipality: None
  is_global: False
  target_groups: []
  target_interests: []
  target_genders: []
  target_min_age: None
  target_max_age: None
  target_grades: []
  target_audience: YOUTH

Result: All youth members with preferred_club = "Göteborg Norra Fritidsgård" receive notification
```

### Scenario 2: Municipality-Wide Event for Specific Age Group

```python
Event:
  club: None
  municipality: "Göteborg"
  is_global: False
  target_min_age: 13
  target_max_age: 16
  target_audience: YOUTH

Result: Only youth members aged 13-16 in Göteborg clubs receive notification
```

### Scenario 3: Group-Targeted Event

```python
Event:
  club: "Göteborg Norra Fritidsgård"
  target_groups: ["Fotbollslag A", "Fotbollslag B"]
  # All other targeting criteria are IGNORED when groups are set

Result: Only approved members of "Fotbollslag A" or "Fotbollslag B" receive notification
```

### Scenario 4: Global Event with Multiple Criteria

```python
Event:
  is_global: True
  target_genders: ["FEMALE"]
  target_interests: ["Sports", "Music"]
  target_min_age: 15
  target_audience: YOUTH

Result: Only female youth members aged 15+, who have either "Sports" OR "Music" 
        as an interest, receive notification (from ALL clubs)
```

## Key Files

### Signal Handler
- **File**: `/backend/events/signals.py`
- **Function**: `notify_users_of_new_event()`
- **Trigger**: `post_save` signal on `Event` model when status becomes `PUBLISHED`

### Targeting Logic
- **File**: `/backend/events/services.py`
- **Function**: `filter_events_by_targeting(events_queryset, user)`
- **Purpose**: Validates if a user matches event targeting criteria

### Email Template
- **Type**: `EmailTemplate.Type.NEW_EVENT`
- **Location**: Database model in `/backend/emails/models.py`
- **Creation**: Use `python manage.py create_default_templates` to generate

## Testing

### Manual Testing

1. **Activate virtual environment**:
   ```bash
   cd /Users/ungdomsappen/the-youth-app/backend
   source venv/bin/activate
   ```

2. **Create or update an event** via Django admin or API:
   ```python
   from events.models import Event
   from organization.models import Club
   
   event = Event.objects.create(
       title="Test Event",
       description="This is a test event",
       club=Club.objects.first(),
       status=Event.Status.PUBLISHED,
       start_date=timezone.now() + timedelta(days=7)
   )
   ```

3. **Check email logs**:
   ```python
   from emails.models import EmailLog
   EmailLog.objects.filter(template_type='new_event').order_by('-created_at')
   ```

4. **Check console output** (if using console email backend):
   - Look for email output in the terminal where Django server is running

### Automated Testing

Create test cases in `/backend/events/tests.py`:

```python
def test_event_notification_with_age_targeting(self):
    """Test that only users within age range receive notifications"""
    # Create users of different ages
    young_user = create_youth_user(age=12)
    target_user = create_youth_user(age=15)
    old_user = create_youth_user(age=19)
    
    # Create event with age targeting
    event = Event.objects.create(
        club=self.club,
        status=Event.Status.PUBLISHED,
        target_min_age=13,
        target_max_age=17
    )
    
    # Check notifications
    assert Notification.objects.filter(recipient=young_user).count() == 0
    assert Notification.objects.filter(recipient=target_user).count() == 1
    assert Notification.objects.filter(recipient=old_user).count() == 0
```

## Troubleshooting

### No Emails Being Sent

1. **Check if email template exists**:
   ```bash
   python manage.py shell
   from emails.models import EmailTemplate
   EmailTemplate.objects.filter(type='new_event').exists()
   ```

2. **Check email backend configuration** in `/backend/core/settings.py`:
   ```python
   EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # For development
   ```

3. **Check email logs for errors**:
   ```python
   from emails.models import EmailLog
   EmailLog.objects.filter(template_type='new_event', status='failed')
   ```

### Users Not Receiving Notifications

1. **Check if user matches event scope**:
   - Club events: User's `preferred_club` must match
   - Municipality events: User's club must be in that municipality
   - Global events: All youth members should match

2. **Check targeting criteria**:
   - Verify user has required age, gender, grade, interests, or group membership
   - Remember: Group targeting is EXCLUSIVE

3. **Check signal logs**:
   - Look for `[EVENT SIGNAL]` log entries in Django console
   - Shows candidate count and final eligible count

### Testing Specific Scenarios

Use Django shell to simulate different scenarios:

```python
from events.models import Event
from events.services import filter_events_by_targeting
from users.models import User

# Get a specific user and event
user = User.objects.get(email='test@example.com')
event = Event.objects.get(id=123)

# Check if user would see the event
event_qs = Event.objects.filter(id=event.id)
matching_ids = filter_events_by_targeting(event_qs, user)

if event.id in matching_ids:
    print(f"✓ User {user.email} WOULD receive notification")
else:
    print(f"✗ User {user.email} WOULD NOT receive notification")
    # Debug why:
    print(f"  - User role: {user.role}")
    print(f"  - User age: {user.age if hasattr(user, 'age') else 'N/A'}")
    print(f"  - User gender: {user.legal_gender}")
    print(f"  - User grade: {user.grade}")
    print(f"  - User interests: {list(user.interests.values_list('name', flat=True))}")
```

## Performance Considerations

- **Bulk Operations**: Notifications are created using `bulk_create()` for efficiency
- **Prefetching**: User relationships are prefetched to minimize database queries
- **Logging**: Extensive logging helps track performance and debug issues
- **Async Consideration**: For large user bases, consider moving email sending to a background task queue (Celery)

## Future Enhancements

1. **Email Preferences**: Allow users to opt out of event notifications
2. **Digest Emails**: Bundle multiple event notifications into a daily/weekly digest
3. **Custom Field Targeting**: Extend targeting to include custom fields
4. **A/B Testing**: Test different email templates for engagement
5. **Analytics**: Track email open rates and click-through rates

## Configuration

### Email Settings (settings.py)

```python
# Development (console output)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Production (SMTP - to be configured)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@example.com'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'noreply@ungdomsappen.se'
```

### Template Creation

Run this command to create default email templates:

```bash
python manage.py create_default_templates
```

This creates the `NEW_EVENT` template with default Swedish content.

## Related Documentation

- [Email Implementation Summary](./EMAIL_IMPLEMENTATION_SUMMARY.md)
- [Email Testing Guide](./EMAIL_TESTING_GUIDE.md)
- [Post Email Notification](./NEW_POST_EMAIL_DETAILS.md)


