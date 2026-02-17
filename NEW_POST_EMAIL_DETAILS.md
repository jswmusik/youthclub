# New Post Email - Implementation Details

## ✅ Feature Complete

Users will now receive email notifications when new posts are published!

---

## 🎯 Smart Targeting Rules

### **Users WILL receive emails from:**
✅ Their **preferred club** (home club)  
✅ Their **municipality** (generic municipality announcements)  
✅ **Clubs they follow** (clubs they chose to follow)

### **Users will NOT receive emails from:**
❌ Other clubs they don't follow  
❌ Other municipalities  
❌ Posts they don't meet targeting criteria for

---

## 🔒 How Targeting Works

The email system uses the same **PostEngine.user_can_see_post()** logic that determines which posts users see in the app. This ensures:

### 1. **Club & Municipality Filtering**
```python
# User's allowed clubs:
- user.preferred_club (home club)
- user.followed_clubs (all clubs they follow)

# Email is sent ONLY if:
- Post targets user's home club, OR
- Post targets user's municipality (generic post), OR  
- Post targets a club the user follows

# Email is NOT sent if:
- Post targets a different club user doesn't follow
```

### 2. **Additional Targeting Criteria**
All these criteria are also respected:
- **Age Range:** Min/max age targeting
- **Gender:** Male, Female, Non-binary, Other
- **Grade:** School grade targeting
- **Member Type:** Youth vs Guardian
- **Groups:** Only if user is in targeted groups
- **Interests:** Only if user has matching interests
- **Custom Fields:** Municipality-specific custom field matching

### 3. **Post Settings**
Email is sent only when:
- Post status is **PUBLISHED**
- Post has `send_push_notification` enabled
- Post is within visibility date window

---

## 📧 Email Template Variables

When creating the email template, you can use:

```django
{{user.first_name}}          - Recipient's first name
{{user.nickname}}             - Recipient's nickname
{{post_title}}                - Post title
{{post_preview}}              - Short preview of post content
{{source_name}}               - Name of club/municipality that posted
{{is_group_announcement}}     - Boolean (true for group posts)
{{app_name}}                  - "Ungdomsappen"
{{support_email}}             - Support email
```

---

## 🚀 How to Enable

### Step 1: Run Migration (If Not Already Done)
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py migrate emails
```

### Step 2: Create Email Template
```bash
# This will create the template with Swedish content
python manage.py create_default_templates
```

Or create manually in admin panel:
1. Go to **Email Templates**
2. Find **"New Post Published"** template
3. Add Swedish translation with:
   - Subject: `Nytt inlägg från {{source_name}}`
   - Body: HTML template (see example below)

### Step 3: Test!
1. Login as admin
2. Create a new post
3. Enable **"Send push notification"** checkbox
4. Publish the post
5. Check email logs to see who received emails

---

## 📝 Example Email Template (Swedish)

**Subject:**
```
Nytt inlägg från {{source_name}}
```

**Body HTML:**
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #6366f1; color: white; padding: 30px; border-radius: 12px;">
        <h1>📢 Nytt inlägg!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p>Hej {{user.first_name}},</p>
        <p><strong>{{source_name}}</strong> har publicerat ett nytt inlägg:</p>
        <div style="background: white; padding: 20px; border-left: 4px solid #6366f1; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #6366f1;">{{post_title}}</h3>
            <p style="color: #6b7280;">{{post_preview}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboard/youth" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Läs hela inlägget
            </a>
        </div>
        <p style="margin-top: 30px;">Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>
```

---

## 🧪 Testing Scenarios

### Scenario 1: Home Club Post
**Setup:**
- Youth member at "Stockholm Youth Club"
- Club admin posts to "Stockholm Youth Club"

**Result:** ✅ Youth receives email (home club)

---

### Scenario 2: Followed Club Post
**Setup:**
- Youth member at "Stockholm Youth Club"
- Youth follows "Gothenburg Youth Club"
- Gothenburg admin posts to "Gothenburg Youth Club"

**Result:** ✅ Youth receives email (followed club)

---

### Scenario 3: Other Club Post
**Setup:**
- Youth member at "Stockholm Youth Club"
- Youth does NOT follow "Malmö Youth Club"
- Malmö admin posts to "Malmö Youth Club"

**Result:** ❌ Youth does NOT receive email (not followed)

---

### Scenario 4: Municipality Post
**Setup:**
- Youth member at "Stockholm Youth Club" (in Stockholm Municipality)
- Municipality admin posts generic municipality announcement
- Post has NO specific club targeting

**Result:** ✅ Youth receives email (municipality post)

---

### Scenario 5: Age-Restricted Post
**Setup:**
- Youth member age 14
- Club posts targeting ages 16-18 only

**Result:** ❌ Youth does NOT receive email (age restriction)

---

## 📊 Email Logs & Monitoring

### View Email Logs
**Admin Panel:** Email Logs section shows:
- Who received the email
- Delivery status (sent/failed)
- Template used
- Timestamp
- Any error messages

### API Access
```bash
GET /api/email-logs/?template_type=new_post
```

### Check in Terminal
If using console backend, emails print to Django terminal.

---

## ⚙️ Post Settings That Affect Emails

When creating/editing a post in admin panel:

### **"Send Push Notification" Checkbox**
- ✅ **Checked:** In-app notifications AND emails are sent
- ❌ **Unchecked:** No notifications or emails (silent post)

### **Post Status**
- **PUBLISHED:** Triggers notifications and emails
- **DRAFT:** No notifications
- **SCHEDULED:** No notifications until published

### **Target Clubs**
- Emails sent only to members of selected clubs (and those who follow them)

### **Target Municipality**
- If no specific clubs selected, emails sent to all members in municipality

---

## 🔧 Technical Implementation

### Files Modified:
1. `/backend/emails/models.py` - Added `NEW_POST` type
2. `/backend/posts/signals.py` - Added email sending in `create_post_notification()`
3. `/backend/emails/migrations/0007_add_new_email_types.py` - Updated migration
4. `/backend/emails/management/commands/create_default_templates.py` - Added template

### How It Works:
1. Admin publishes a post with "send push notification" enabled
2. Signal `post_save` triggers `create_post_notification()`
3. System finds all candidate users (based on club/municipality)
4. For each user, `PostEngine.user_can_see_post()` checks detailed targeting
5. If user passes all checks:
   - In-app notification created
   - Email sent via `EmailService.send()`
6. Email logs stored in database

### Performance:
- Notifications created in bulk (single DB query)
- Emails sent individually (proper error handling per user)
- PostEngine caching minimizes database queries

---

## 🚨 Important Notes

1. **No Spam:** Users can't be spammed by clubs they don't follow
2. **Respects User Choices:** If user unfollows a club, no more emails from that club
3. **Fail-Safe:** If email sending fails, it doesn't break the post publication
4. **Logged:** All email attempts (success/failure) are logged
5. **Same Rules:** Uses exact same targeting as in-app posts (PostEngine)

---

## 📞 Troubleshooting

### "Users not receiving post emails"

**Check:**
1. Is "Send push notification" enabled on the post?
2. Is post status PUBLISHED?
3. Does user's club match post's target clubs?
4. Check email logs in admin panel for delivery status
5. Is email template created and active?

### "Users receiving emails from wrong clubs"

**This shouldn't happen!** PostEngine enforces strict rules.

If it does:
1. Check user's `preferred_club`
2. Check user's `followed_clubs`
3. Check post's `target_clubs`
4. Verify PostEngine logic in `backend/posts/engine.py`

### "Emails not sent at all"

**Check:**
1. Email backend configured in `.env`
2. Email template exists for `new_post` type
3. Template has Swedish (sv) translation
4. Check Django logs for errors
5. Check email logs in admin panel

---

## ✅ Summary

**What we built:**
- Smart email notifications for new posts
- Strict club/municipality targeting
- No spam from unfollowed clubs
- Same rules as in-app post visibility
- Performance-optimized with PostEngine
- Full error logging and monitoring

**Ready to use:**
- Template included in `create_default_templates`
- Works with existing post system
- No changes needed to frontend
- Admin controls via "send push notification" toggle

**Next steps:**
1. Run migration: `python manage.py migrate emails`
2. Create template: `python manage.py create_default_templates`
3. Test by publishing a post!

---

**Added:** January 12, 2026  
**Status:** ✅ Complete and ready to use


