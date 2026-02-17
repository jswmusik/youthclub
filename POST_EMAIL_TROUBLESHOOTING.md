# Post Email Notification - Troubleshooting Guide

## 🔍 Issue: No Emails Being Sent for Posts

### Root Cause

The `send_push_notification` field on the `Post` model controls whether notifications and emails are sent. This field **defaults to `False`**.

### How to Fix

#### Option 1: Enable When Creating Post (Recommended)

When creating a post via the admin panel or API, **make sure to check/enable the "Send Push Notification" toggle**.

**In the Admin Panel**:
1. Go to Create Post page
2. Look for the "Push Notification Config" section
3. ✅ **Check the "Send push notification" checkbox**
4. Optionally set custom push title and message
5. Publish the post

**Via API**:
```json
{
  "title": "Test Post",
  "content": "This is a test",
  "status": "PUBLISHED",
  "send_push_notification": true,  // ← Must be true!
  "club": 1
}
```

#### Option 2: Change Default Behavior (Optional)

If you want ALL posts to send notifications by default:

**File**: `/backend/posts/models.py`

```python
# Line 97 - Change from:
send_push_notification = models.BooleanField(default=False)

# To:
send_push_notification = models.BooleanField(default=True)
```

Then run:
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py makemigrations posts
python manage.py migrate posts
```

**⚠️ Note**: Changing the default to `True` means admins must remember to uncheck it if they DON'T want notifications sent.

### How the System Works

The signal in `/backend/posts/signals.py` checks `send_push_notification` early:

```python
# Line 46-50
if not post.send_push_notification:
    print(f"[POST SIGNAL] Skipping: Post {post.id} has send_push_notification=False")
    return
```

This is **intentional behavior** - it gives admins control over which posts trigger notifications.

### Verification

When you create a post with notifications enabled, you should see in the Django console:

```
[POST SIGNAL] Post saved: id=178, title='Test Post', status=PUBLISHED, send_push=True, is_global=False
[POST SIGNAL] Post 178 passed initial checks, continuing...
[POST SIGNAL] Processing notifications for post 178
[POST SIGNAL] Post 178: Found 25 candidate users after filtering
[POST SIGNAL] Created 15 notifications for post 178
```

Plus email logs like:
```
2026-01-12 19:52:41,663 INFO     Email sent: new_post to user@example.com
```

### Testing Checklist

✅ **Create a post WITH notifications enabled**:
1. Login as admin
2. Go to Posts → Create New Post
3. Fill in title, content, select club/municipality
4. ✅ **Check "Send push notification"**
5. Set status to "PUBLISHED"
6. Click Save/Publish

✅ **What to expect**:
- Console shows `[POST SIGNAL]` messages
- Email logs show "Email sent: new_post to..."
- In-app notifications created for eligible users
- Users see notification in their notification panel

❌ **Create a post WITHOUT notifications** (control test):
1. Same as above
2. ❌ **Leave "Send push notification" unchecked**
3. Publish

❌ **What to expect**:
- Console shows: `[POST SIGNAL] Skipping: Post X has send_push_notification=False`
- No emails sent
- No in-app notifications created

### Your Test Results

Based on the terminal logs:

```
[POST SIGNAL] Post saved: id=177, title='Test - ej synligt', status=PUBLISHED, send_push=False, is_global=False
[POST SIGNAL] Skipping: Post 177 has send_push_notification=False
```

**Analysis**:
- ✅ Signal is working correctly
- ✅ Post was created and published
- ❌ `send_push=False` means notifications were intentionally skipped
- **Solution**: Create a new post with `send_push_notification=True`

### Quick Re-Test

**Via Django Shell**:
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py shell
```

```python
from posts.models import Post
from organization.models import Club

# Get a club
club = Club.objects.first()

# Create a post WITH notifications enabled
post = Post.objects.create(
    title="Test Post - WITH Notifications",
    content="<p>This should send emails!</p>",
    club=club,
    status=Post.Status.PUBLISHED,
    send_push_notification=True,  # ← KEY: Set to True!
)

print(f"Post {post.id} created. Check console for [POST SIGNAL] messages!")

# Check email logs
from emails.models import EmailLog
logs = EmailLog.objects.filter(template_type='new_post', created_at__gte=post.created_at)
print(f"Emails sent: {logs.count()}")
for log in logs[:5]:
    print(f"  - To: {log.recipient_email}, Status: {log.status}")
```

**Expected Output**:
```
[POST SIGNAL] Post saved: id=X, title='Test Post - WITH Notifications', status=PUBLISHED, send_push=True, is_global=False
[POST SIGNAL] Post X passed initial checks, continuing...
[POST SIGNAL] Processing notifications for post X
[POST SIGNAL] Post X: Found Y candidate users after filtering
[POST SIGNAL] Created Z notifications for post X
2026-01-12 XX:XX:XX,XXX INFO     Email sent: new_post to user1@example.com
2026-01-12 XX:XX:XX,XXX INFO     Email sent: new_post to user2@example.com
...
```

### Frontend Form Check

Check if the post creation form includes the `send_push_notification` toggle:

```bash
grep -r "send_push_notification" /Users/ungdomsappen/the-youth-app/frontend/app
```

If the toggle is missing from the UI, users won't be able to enable it easily.

### Related Settings

**Post Template Defaults** (`PostTemplate` model):
- Also has `send_push_notification` field
- If you create a post from a template, it inherits this value
- Templates also default to `False`

### Summary

🎯 **The system is working correctly!**

The issue is simply that the test post was created with `send_push_notification=False`.

**To fix**: Create a new post and make sure to enable the "Send Push Notification" option.

**To verify**: Look for `send_push=True` in the console logs when the post is saved.


