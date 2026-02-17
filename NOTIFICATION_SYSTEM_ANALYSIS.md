# 🔔 Notification System Analysis

## Overview

Your notification system has **2 parts**:
1. **In-app notifications** - Sent via `send_notification()` or `Notification.objects.create()`
2. **Notification Templates** - Translatable templates in the admin panel (similar to email templates)

## ✅ Currently Implemented Notifications

### 📋 Template Types Defined (in `NotificationTemplate.Type`)

These are the **translatable templates** available in the admin panel:

#### Events (3 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `EVENT_REGISTRATION_CONFIRMED` | ✅ Defined | Event registration approved |
| `EVENT_WAITLIST_ADDED` | ✅ Defined | Added to event waitlist |
| `EVENT_GUARDIAN_APPROVAL_NEEDED` | ✅ Defined | Registration needs guardian approval |

#### Bookings (5 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `BOOKING_CONFIRMED` | ✅ Defined | Booking confirmed/auto-approved |
| `BOOKING_PENDING` | ✅ Defined | Booking awaiting approval |
| `BOOKING_APPROVED` | ✅ Defined | Booking manually approved |
| `BOOKING_DECLINED` | ✅ Defined | Booking declined |
| `BOOKING_CANCELLED` | ✅ Defined | Booking cancelled |

#### Groups (3 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `GROUP_APPLICATION_APPROVED` | ✅ Defined | Group application approved |
| `GROUP_APPLICATION_REJECTED` | ✅ Defined | Group application rejected |
| `GROUP_JOINED` | ✅ Defined | Joined a group |

#### Rewards (1 type)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `REWARD_EARNED` | ✅ Defined | Reward unlocked/earned |

#### System & News (2 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `SYSTEM_MESSAGE` | ✅ Defined | System-wide message |
| `NEWS_PUBLISHED` | ✅ Defined | News article published |

#### Questionnaires (3 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `QUESTIONNAIRE_AVAILABLE` | ✅ Defined | New questionnaire available |
| `SURVEY_REMINDER` | ✅ Defined | Reminder to complete survey |
| `QUESTIONNAIRE_REWARD_EARNED` | ✅ Defined | Earned reward from questionnaire |

#### Inventory (2 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `INVENTORY_OVERDUE` | ✅ Defined | Borrowed item is overdue |
| `INVENTORY_AVAILABLE` | ✅ Defined | Item available to borrow |

#### Messages (2 types)
| Template Type | Status | Description |
|---------------|--------|-------------|
| `MESSAGE_RECEIVED` | ✅ Defined | New message received |
| `MESSAGE_REACTION` | ✅ Defined | Someone reacted to message |

---

**Total Defined Templates**: **22 types**

## 🔍 Actually Used vs. Just Defined

Now let's check which ones are **actually being sent** in the code:

### ✅ ACTUALLY SENT (Hardcoded in signals/views)

These are sent directly without using templates:

#### Events
- ✅ **Event Registration Confirmed** - `events/signals.py:270`
  ```python
  send_notification(user, "Seat Confirmed! 🎉", body, ...)
  ```
- ✅ **Event Waitlist Added** - `events/signals.py:292`
  ```python
  send_notification(user, "Added to Waitlist", ...)
  ```
- ✅ **Guardian Approval Needed** - `events/signals.py:300`
  ```python
  send_notification(user, "Guardian Approval Needed", ...)
  ```
- ✅ **New Event Published** - `events/signals.py:150` (bulk create)
  ```python
  Notification(..., title=f"Nytt event: {event.title}")
  ```

#### Posts
- ✅ **New Post Published** - `posts/signals.py:180`
  ```python
  Notification(..., title=notification_title, body=display_title)
  ```

#### Groups
- ✅ **Group Application Approved** - `groups/signals.py:249`
  ```python
  Notification(..., title=f"Välkommen till {group.name}!")
  ```
- ✅ **Group Application Rejected** - `groups/signals.py:269`
  ```python
  Notification(..., title="Ansökan avslogs")
  ```
- ✅ **Added to Closed Group** - `groups/signals.py:285`
  ```python
  Notification(..., title="Du har lagts till i en grupp")
  ```

#### Rewards
- ✅ **Reward Earned** - `rewards/utils.py:148, 224`
  ```python
  Notification(..., title="🎁 New Reward Unlocked!")
  ```

#### Bookings
- ✅ **Booking Confirmed** - `bookings/views.py:276`
  ```python
  send_notification(user, "Booking Confirmed! ✅", ...)
  ```
- ✅ **Booking Pending** - `bookings/views.py:285`
  ```python
  send_notification(user, "Booking Request Received ⏳", ...)
  ```
- ✅ **Booking Approved** - `bookings/views.py:311`
  ```python
  send_notification(user, "Booking Approved! 🎉", ...)
  ```
- ✅ **Booking Declined** - `bookings/views.py:340`
  ```python
  send_notification(user, "Booking Declined ❌", ...)
  ```
- ✅ **Booking Cancelled** - `bookings/views.py:424, 453`
  ```python
  send_notification(user, "Booking Cancelled ⚠️", ...)
  ```

#### Messages
- ✅ **New Message Received** - `messenger/signals.py:120`
  ```python
  Notification(..., title="New message from {sender}", ...)
  ```

#### System Messages
- ✅ **System Message Broadcast** - `notifications/signals.py:63`
  ```python
  Notification(..., title=f"Message: {instance.title}", ...)
  ```

#### News
- ✅ **News Article Published** - `notifications/signals.py:80+`
  ```python
  Notification(..., title=f"📰 New: {instance.title}", ...)
  ```

---

### ❌ NOT BEING USED (Defined but not implemented)

These template types exist but **no code sends them**:

1. ❌ **SURVEY_REMINDER** - No code sends this
2. ❌ **QUESTIONNAIRE_REWARD_EARNED** - No code sends this  
3. ❌ **INVENTORY_OVERDUE** - No code sends this
4. ❌ **INVENTORY_AVAILABLE** - No code sends this
5. ❌ **MESSAGE_REACTION** - No code sends this
6. ❌ **QUESTIONNAIRE_AVAILABLE** - No code sends this

---

## ⚠️ Key Issue: Templates Not Being Used!

**Problem**: Most notifications are sent with **hardcoded text** instead of using the **translatable templates**.

### Current Approach (Hardcoded)
```python
send_notification(
    user, 
    "Booking Confirmed! ✅",  # Hardcoded English
    "Your booking is confirmed",  # Hardcoded English
    ...
)
```

### Better Approach (Template-based)
```python
send_templated_notification(
    user,
    template_type='BOOKING_CONFIRMED',
    context={'booking_date': date, 'resource_name': name},
    ...
)
```

**Benefits of templates**:
- ✅ Multi-language support
- ✅ Admins can edit wording
- ✅ Consistent messaging
- ✅ A/B testing possible

---

## 🚨 Missing Notification Types

Based on email templates, these notifications should also exist:

### Critical Missing Notifications

1. ❌ **EVENT_CANCELLED**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Event is deleted/cancelled
   - **Who**: All registered participants

2. ❌ **GUARDIAN_ACCOUNT_CREATED**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Guardian account created
   - **Who**: Guardian

3. ❌ **GUARDIAN_LINK_REQUEST**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Youth requests to link guardian
   - **Who**: Guardian

4. ❌ **GUARDIAN_APPROVAL_REQUEST_EVENT**
   - **Email**: ❌ Missing
   - **In-app**: ⚠️ Sends to youth, not guardian
   - **When**: Event registration needs guardian approval
   - **Who**: Should notify guardian!
   - **Current**: Only notifies youth (line 300 in events/signals.py)
   - **Fix**: Also notify guardian

5. ❌ **PASSWORD_RESET**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Password reset requested
   - **Who**: User who requested

6. ❌ **ACCOUNT_DELETED**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Account is deleted (GDPR)
   - **Who**: User (via email only)

7. ❌ **DELETION_WARNING**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Account will be deleted soon (inactive)
   - **Who**: Inactive users

8. ❌ **TRIAL_EXPIRING**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: Trial period ending soon
   - **Who**: Unverified youth members

9. ❌ **BIRTHDAY_GREETING**
   - **Email**: ✅ Exists
   - **In-app**: ❌ Missing
   - **When**: User's birthday
   - **Who**: User

10. ❌ **WELCOME**
    - **Email**: ✅ Exists
    - **In-app**: ❌ Missing
    - **When**: New user registers
    - **Who**: New user

---

## 📊 Summary

### By Category

| Category | Templates Defined | Actually Sent | Missing |
|----------|-------------------|---------------|---------|
| **Events** | 3 | 4 (hardcoded) | +1 (EVENT_CANCELLED) |
| **Bookings** | 5 | 5 (hardcoded) | 0 |
| **Groups** | 3 | 3 (hardcoded) | 0 |
| **Rewards** | 1 | 1 (hardcoded) | 0 |
| **Messages** | 2 | 1 (hardcoded) | 0 |
| **System** | 2 | 2 (hardcoded) | 0 |
| **Questionnaires** | 3 | 0 ❌ | All 3 |
| **Inventory** | 2 | 0 ❌ | All 2 |
| **User Lifecycle** | 0 | 0 | +5 (welcome, guardian, birthday, trial, deletion) |

### Key Findings

✅ **Good**: 
- 22 notification template types defined
- Most core features send notifications
- Notifications use proper categories

⚠️ **Issues**:
1. **Templates not being used** - All notifications hardcoded instead of using templates
2. **No multi-language** - All text is in English/Swedish mix
3. **Missing guardian notifications** - Guardian should be notified too
4. **Questionnaire notifications not implemented**
5. **Inventory notifications not implemented**
6. **User lifecycle notifications missing** (welcome, birthday, etc.)
7. **Event cancellation notification missing**

---

## 🎯 Recommendations

### Priority 1: High Impact (Should Implement Now)

1. **EVENT_CANCELLED** notification
   - Add to `events/signals.py` in `cleanup_event_notifications()`
   - Notify all registered participants when event is deleted

2. **GUARDIAN_APPROVAL_REQUEST** to guardian
   - Currently only notifies youth
   - Should also notify guardian with link to approve

3. **Convert existing notifications to use templates**
   - Replace hardcoded strings with `send_templated_notification()`
   - Enables multi-language support
   - Makes content editable by admins

### Priority 2: Medium Impact (Nice to Have)

4. **WELCOME** notification
   - Send when user first registers
   - Guide them through first steps

5. **BIRTHDAY_GREETING** notification
   - Make birthdays special
   - Increase engagement

6. **GUARDIAN_ACCOUNT_CREATED** notification
   - Notify guardian when account is created
   - Provide password setup link

### Priority 3: Lower Impact (Can Wait)

7. **Questionnaire notifications**
   - QUESTIONNAIRE_AVAILABLE
   - SURVEY_REMINDER
   - QUESTIONNAIRE_REWARD_EARNED

8. **Inventory notifications**
   - INVENTORY_OVERDUE
   - INVENTORY_AVAILABLE

9. **User lifecycle notifications**
   - TRIAL_EXPIRING
   - DELETION_WARNING
   - ACCOUNT_DELETED (maybe not needed in-app)

---

## 🛠️ Implementation Steps

### Step 1: Add Missing Template Types

Add these to `notifications/models.py` `NotificationTemplate.Type`:

```python
class Type(models.TextChoices):
    # ... existing types ...
    
    # User Lifecycle
    WELCOME = 'welcome', 'Welcome Message'
    BIRTHDAY_GREETING = 'birthday_greeting', 'Birthday Greeting'
    TRIAL_EXPIRING = 'trial_expiring', 'Trial Expiring Warning'
    DELETION_WARNING = 'deletion_warning', 'Account Deletion Warning'
    
    # Events (add)
    EVENT_CANCELLED = 'event_cancelled', 'Event Cancelled'
    
    # Guardian
    GUARDIAN_ACCOUNT_CREATED = 'guardian_account_created', 'Guardian Account Created'
    GUARDIAN_LINK_REQUEST = 'guardian_link_request', 'Guardian Link Request'
    GUARDIAN_APPROVAL_REQUEST_EVENT = 'guardian_approval_request_event', 'Guardian Approval Request (Event)'
```

### Step 2: Convert Hardcoded to Templated

Example for booking confirmed:

**Before** (`bookings/views.py:276`):
```python
send_notification(
    user=user,
    title="Booking Confirmed! ✅",
    body=f"Your booking for {resource.name} on {date_str} at {time_str} is confirmed.",
    category=Notification.Category.BOOKING,
    action_url=f"/dashboard/youth/bookings/{booking.id}"
)
```

**After**:
```python
from notifications.services import send_templated_notification

send_templated_notification(
    user=user,
    template_type='BOOKING_CONFIRMED',
    context={
        'resource_name': resource.name,
        'booking_date': date_str,
        'booking_time': time_str,
    },
    action_url=f"/dashboard/youth/bookings/{booking.id}"
)
```

### Step 3: Create Default Templates Command

Similar to `create_default_templates` for emails, create one for notifications.

---

## 📈 Expected Impact

After implementation:

- ✅ **Multi-language support** for all notifications
- ✅ **Admins can customize** notification text
- ✅ **Consistent messaging** across the platform
- ✅ **Better user experience** with complete notification coverage
- ✅ **Guardians properly notified** when action needed
- ✅ **No missing notifications** for any user action

---

**Would you like me to implement any of these missing notifications or convert existing ones to use templates?**


