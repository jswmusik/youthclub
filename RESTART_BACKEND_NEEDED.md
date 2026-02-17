# 🔄 Backend Server Restart Required

## Issue

The event email notifications aren't working because **the backend server was started BEFORE we added the new event signal code**.

## Why This Happens

Django loads signal handlers when the server starts. The new event notification signals we added to `/backend/events/signals.py` won't be active until the server is restarted.

## How to Fix

### Option 1: Restart in Terminal 1

1. Go to **Terminal 1** (where Django server is running)
2. Press **Ctrl+C** to stop the server
3. Restart with:
   ```bash
   source venv/bin/activate
   daphne -b 0.0.0.0 -p 8000 core.asgi:application
   ```

### Option 2: Use the Command Below

Stop and restart the backend server:

```bash
# In Terminal 1 - press Ctrl+C first, then run:
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

## What Was Added (Needs Server Restart)

### 1. Event Notification Signals (`/backend/events/signals.py`)

**New Pre-Save Signal**:
- `track_event_status_change()` - Tracks when events are published

**New Post-Save Signal**:
- `notify_users_of_new_event()` - Sends emails and notifications to eligible users

These signals are currently **NOT active** because the server loaded before they existed.

### 2. Email Templates (Already Active ✅)

- ✅ NEW_POST template - Created in database
- ✅ NEW_EVENT template - Created in database

Templates don't require restart since they're in the database.

## After Restart - What to Expect

When you publish a new event, you should see in the Django console:

```
[EVENT SIGNAL] Event X 'Event Title' was newly published, preparing notifications...
[EVENT SIGNAL] Found Y candidate users, applying targeting filters...
[EVENT SIGNAL] Z users passed targeting criteria
[EVENT SIGNAL] Created Z notifications and sent emails for event X
2026-01-12 XX:XX:XX,XXX INFO     Email sent: new_event to user@example.com
```

## Testing After Restart

### Quick Test

1. **Restart backend server**
2. **Login as admin**
3. **Create a new event**:
   - Fill in title, description
   - Select club or municipality
   - Set status to **PUBLISHED**
   - Set start date (future date)
   - Save

4. **Check Django console** for `[EVENT SIGNAL]` messages

5. **Check as a youth user**:
   - Login as a youth member
   - Check notifications panel
   - Look for email in console (if using console backend)

### Verify Signals Are Loaded

After restarting, you can verify signals are loaded:

```bash
cd /Users/ungdomsappen/the-youth-app/backend
/Users/ungdomsappen/the-youth-app/backend/venv/bin/python manage.py shell
```

```python
from django.db.models.signals import post_save, pre_save
from events.models import Event

# Check if our signals are registered
pre_save_receivers = pre_save._live_receivers(Event)
post_save_receivers = post_save._live_receivers(Event)

print(f"Pre-save signals for Event: {len(pre_save_receivers)}")
print(f"Post-save signals for Event: {len(post_save_receivers)}")

# Should see our new signal functions
for receiver in post_save_receivers:
    print(f"  - {receiver.__name__ if hasattr(receiver, '__name__') else receiver}")
```

You should see `notify_users_of_new_event` in the list.

## Why Post Emails Worked But Event Emails Didn't

- ✅ **Post signals** - Were already in the code before the server started
- ❌ **Event signals** - Were added AFTER the server started (just now)

The post email signal was already active, which is why post emails worked once we created the template.

## Summary

**Problem**: Event notification code exists but isn't loaded  
**Solution**: Restart Django backend server  
**Time**: Takes ~30 seconds  
**Risk**: None - just a restart  

After restart, both post and event email notifications will work! 🎉


