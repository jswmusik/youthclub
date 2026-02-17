# Testing Event Email Notifications

## Quick Test Script

### 1. Setup
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
```

### 2. Create the NEW_EVENT Email Template
```bash
python manage.py create_default_templates
```

This will create the NEW_EVENT template along with all other templates.

### 3. Test with Django Shell

```bash
python manage.py shell
```

#### Scenario A: Simple Club Event (No Targeting)
```python
from events.models import Event
from organization.models import Club
from django.utils import timezone
from datetime import timedelta

# Get a club
club = Club.objects.first()
print(f"Testing with club: {club.name}")

# Create a published event
event = Event.objects.create(
    title="Test Event - Filmkväll",
    description="En mysig filmkväll för alla medlemmar",
    club=club,
    status=Event.Status.PUBLISHED,
    start_date=timezone.now() + timedelta(days=7),
    location="Klubbens lokal",
    target_audience=Event.TargetAudience.YOUTH
)

print(f"Event created: {event.title} (ID: {event.id})")
print("Check your console for email output!")
print("Check in-app notifications in the app")

# Check email logs
from emails.models import EmailLog
logs = EmailLog.objects.filter(template_type='new_event').order_by('-created_at')[:5]
print(f"\nLast 5 NEW_EVENT email logs:")
for log in logs:
    print(f"  - To: {log.recipient_email} | Status: {log.status} | Created: {log.created_at}")

# Check how many notifications were created
from notifications.models import Notification
notifications = Notification.objects.filter(
    category=Notification.Category.EVENT,
    action_url__contains=str(event.id)
)
print(f"\n{notifications.count()} in-app notifications created")
```

#### Scenario B: Event with Age Targeting
```python
from events.models import Event
from organization.models import Club
from users.models import User
from django.utils import timezone
from datetime import timedelta

club = Club.objects.first()

# Create an event for teenagers (13-16 years old)
event = Event.objects.create(
    title="Teen Gaming Tournament",
    description="Gaming tournament för tonåringar",
    club=club,
    status=Event.Status.PUBLISHED,
    start_date=timezone.now() + timedelta(days=14),
    location="Klubbens spelrum",
    target_audience=Event.TargetAudience.YOUTH,
    target_min_age=13,
    target_max_age=16
)

print(f"Event created with age targeting: 13-16 years")

# Check who got notified
from notifications.models import Notification
from datetime import date

notifications = Notification.objects.filter(
    category=Notification.Category.EVENT,
    action_url__contains=str(event.id)
).select_related('recipient')

print(f"\n{notifications.count()} users were notified")

# Show age distribution of notified users
for notif in notifications[:10]:
    user = notif.recipient
    if user.date_of_birth:
        age = (date.today() - user.date_of_birth).days // 365
        print(f"  - {user.email}: Age {age}")
    else:
        print(f"  - {user.email}: Age unknown")
```

#### Scenario C: Group-Targeted Event
```python
from events.models import Event
from organization.models import Club
from groups.models import Group
from django.utils import timezone
from datetime import timedelta

club = Club.objects.first()

# Get a group or create one
try:
    group = Group.objects.first()
    if not group:
        group = Group.objects.create(
            name="Fotbollslag A",
            club=club,
            is_active=True
        )
    print(f"Using group: {group.name}")
except Exception as e:
    print(f"Error getting group: {e}")
    print("Skipping this test")
    exit()

# Create group-targeted event
event = Event.objects.create(
    title="Team Practice Session",
    description="Träningspass för teamet",
    club=club,
    status=Event.Status.PUBLISHED,
    start_date=timezone.now() + timedelta(days=3),
    location="Fotbollsplanen",
    target_audience=Event.TargetAudience.YOUTH
)
event.target_groups.add(group)

print(f"Event created for group: {group.name}")

# Check notifications
from notifications.models import Notification
notifications = Notification.objects.filter(
    category=Notification.Category.EVENT,
    action_url__contains=str(event.id)
)

print(f"{notifications.count()} users were notified (all should be group members)")

# Verify all are group members
from groups.models import GroupMembership
for notif in notifications:
    is_member = GroupMembership.objects.filter(
        user=notif.recipient,
        group=group,
        status=GroupMembership.Status.APPROVED
    ).exists()
    print(f"  - {notif.recipient.email}: {'✓ Member' if is_member else '✗ NOT MEMBER (ERROR!)'}")
```

#### Scenario D: Verify User Doesn't Get Wrong Event
```python
from events.models import Event
from organization.models import Club
from users.models import User
from django.utils import timezone
from datetime import timedelta

# Get two different clubs
clubs = list(Club.objects.all()[:2])
if len(clubs) < 2:
    print("Need at least 2 clubs for this test")
    exit()

club_a = clubs[0]
club_b = clubs[1]

print(f"Club A: {club_a.name}")
print(f"Club B: {club_b.name}")

# Create event for Club A
event = Event.objects.create(
    title="Club A Exclusive Event",
    description="Only for Club A members",
    club=club_a,
    status=Event.Status.PUBLISHED,
    start_date=timezone.now() + timedelta(days=5),
    location="Club A premises",
    target_audience=Event.TargetAudience.YOUTH
)

# Check who got notified
from notifications.models import Notification
notifications = Notification.objects.filter(
    category=Notification.Category.EVENT,
    action_url__contains=str(event.id)
).select_related('recipient__preferred_club')

print(f"\n{notifications.count()} users notified")

# Verify all are from Club A
club_a_members = 0
club_b_members = 0

for notif in notifications:
    if notif.recipient.preferred_club == club_a:
        club_a_members += 1
    elif notif.recipient.preferred_club == club_b:
        club_b_members += 1
        print(f"  ⚠️ ERROR: User {notif.recipient.email} from Club B got notification!")

print(f"\n✓ Club A members notified: {club_a_members}")
print(f"✓ Club B members notified: {club_b_members} (should be 0)")

if club_b_members == 0:
    print("\n✅ PASS: Targeting working correctly!")
else:
    print("\n❌ FAIL: Users from wrong club were notified!")
```

### 4. Check Email Console Output

If you're using the console email backend (development), you should see email output in the terminal where your Django server is running.

Look for something like:

```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: =?utf-8?q?=F0=9F=8E=89_Nytt_event=3A_Test_Event_-_Filmkv=C3=A4ll?=
From: noreply@example.com
To: user@example.com
Date: Mon, 12 Jan 2026 10:30:00 -0000
Message-ID: <...>

Nytt event från Göteborg Norra Fritidsgård: Test Event - Filmkväll
...
```

### 5. Check In-App Notifications

Log in to the app as a youth member and check the notifications panel. You should see:

- Title: "Nytt event: {event_title}"
- Body: "{source_name} har publicerat ett nytt event. Registrera dig nu!"
- Clicking should take you to the event detail page

### 6. Verify in Admin Panel

1. Go to http://localhost:8000/admin/emails/emaillog/
2. Filter by "Template type" = "new_event"
3. Check the status, recipient, and context for each email

### 7. Test Different Targeting Combinations

```python
# Female-only event
event = Event.objects.create(
    title="Girls Gaming Night",
    club=club,
    status=Event.Status.PUBLISHED,
    start_date=timezone.now() + timedelta(days=7),
    target_audience=Event.TargetAudience.YOUTH,
    target_genders=['FEMALE']
)

# Event with interest targeting
from custom_fields.models import Interest
sports_interest = Interest.objects.filter(name__icontains='sport').first()
if sports_interest:
    event = Event.objects.create(
        title="Sports Tournament",
        club=club,
        status=Event.Status.PUBLISHED,
        start_date=timezone.now() + timedelta(days=10)
    )
    event.target_interests.add(sports_interest)
    print(f"Created event targeting '{sports_interest.name}' interest")
```

## Expected Behavior

✅ **Correct**:
- Users who match ALL targeting criteria receive both email AND in-app notification
- Users who don't match ANY criterion receive NOTHING
- Group-targeted events ONLY notify group members (groups override other filters)
- Club events ONLY notify members of that club
- Municipality events notify all youth in that municipality

❌ **Incorrect** (Report as bug):
- Users from different clubs getting notifications for club-specific events
- Users outside age range getting notifications
- Users without required interests getting notifications
- Non-group members getting group-targeted event notifications

## Troubleshooting

### No Emails Sent
1. Check email backend in settings.py
2. Verify EmailTemplate for 'new_event' exists: `EmailTemplate.objects.filter(type='new_event')`
3. Check EmailLog for errors: `EmailLog.objects.filter(status='failed')`

### No In-App Notifications
1. Check signal logs in Django console for `[EVENT SIGNAL]` messages
2. Verify users have `preferred_club` set
3. Check Notification model: `Notification.objects.filter(category='EVENT')`

### Wrong Users Notified
1. Check event scope (club, municipality, is_global)
2. Verify targeting criteria on the event
3. Check user attributes (age, gender, grade, interests, groups)
4. Use the Scenario D test above to verify isolation

## Performance Notes

- For large user bases, consider limiting bulk operations or moving to background tasks
- Check logs for candidate count vs. final eligible count
- Monitor database query count in Django Debug Toolbar if available


