# Email Testing Guide

## 🧪 What You Can Test Right Now

### Prerequisites
1. ✅ Migration must be run first (see below)
2. ✅ Email templates must exist (can test without content)
3. ✅ Email backend configured (console or Mailtrap)

---

## 📋 Step-by-Step Testing

### **STEP 0: Setup Email Backend (Do This First!)**

Edit `/Users/ungdomsappen/the-youth-app/backend/.env` and add:

```env
# Option 1: See emails in terminal (easiest for quick testing)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Option 2: Use Mailtrap (better for testing actual emails)
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=sandbox.smtp.mailtrap.io
# EMAIL_PORT=2525
# EMAIL_HOST_USER=your-username
# EMAIL_HOST_PASSWORD=your-password
```

**Restart your Django server after changing .env!**

---

## 🧪 **TEST 1: Registration Welcome Email** ⭐ EASIEST TO TEST

**How to trigger:**
1. Go to your frontend: http://localhost:3000
2. Click "Sign Up" or "Register"
3. Fill in youth registration form
4. Submit registration

**What happens:**
- New user account is created
- Welcome email is sent to the user's email
- If guardian email provided → guardian also gets email

**Where to see the email:**
- **Console backend:** Check your Django terminal
- **Mailtrap:** Check your Mailtrap inbox
- **Email logs:** Admin panel → Emails → Email Logs

**Expected output in terminal (console backend):**
```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Welcome to Ungdomsappen!
From: Ungdomsappen <noreply@ungdomsappen.se>
To: newuser@example.com
Date: ...

[Email content here]
```

---

## 🧪 **TEST 2: Guardian Email** ⭐ EASIEST TO TEST

### Option A: During Registration
**How to trigger:**
1. Register a new youth account (see TEST 1)
2. In the registration form, fill in guardian email/details
3. Submit

**What happens:**
- Shadow guardian account is created
- Guardian receives "Guardian Account Created" email with password setup link

### Option B: Add Guardian Later
**How to trigger:**
1. Login as a youth member
2. Go to Profile → Guardians tab
3. Click "Add Guardian"
4. Fill in guardian email (use a NEW email, not existing user)
5. Submit

**What happens:**
- New shadow guardian created
- Guardian receives creation email

### Option C: Existing Guardian
**How to trigger:**
1. Login as a youth member
2. Add guardian using an EXISTING user's email
3. Submit

**What happens:**
- Guardian receives "Guardian Link Request" email (not creation email)

**Where to check:**
- Console/Mailtrap for email
- Admin panel → Email Logs
- Admin panel → Users → find the guardian user

---

## 🧪 **TEST 3: New Message Email** ⚠️ MORE COMPLEX

**How to trigger:**
1. Have 2 user accounts (create second one if needed)
2. Login as User A
3. Go to Messages/Messenger
4. Start conversation or send message to User B
5. User B receives email

**What happens:**
- Message is saved to database
- MessageRecipient is created
- Signal triggers email to recipient

**Where to check:**
- Console/Mailtrap
- Admin panel → Email Logs
- Check that User B is NOT the sender (won't send to yourself)

---

## 🧪 **TEST 4: Event Registration Confirmation** 

**Prerequisites:**
- Need an existing published event
- Event must have registration enabled

**How to trigger:**
1. Login as youth member
2. Browse events
3. Register for an event
4. If event is first-come-first-served → registration auto-approved → email sent
5. If manual approval → admin must approve → then email sent

**To approve manually (if needed):**
1. Login as admin
2. Go to Events → [Your Event] → Registrations
3. Approve a pending registration
4. Email is sent

**What happens:**
- Registration status changes to APPROVED
- Signal triggers confirmation email

---

## 🧪 **TEST 5: Password Reset** ✅ ALREADY WORKING

**How to trigger:**
1. Go to login page
2. Click "Forgot Password"
3. Enter email address
4. Check email for reset link

**This already works!** Just testing it now includes your template system.

---

## 🧪 **TEST 6: Two-Factor Authentication** ✅ ALREADY WORKING

**How to trigger:**
1. Login with account that has 2FA enabled
2. Or: Try logging in from new device/IP
3. System sends OTP code via email

**This already works!**

---

## 🛠️ **Before Testing: Run Migration & Create Templates**

### Step 1: Run Migration
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py migrate emails
```

### Step 2: Create Minimal Templates (Required!)

You need at least basic templates for testing. Here's the quickest way:

**Option A: Via Django Shell (Fastest)**
```bash
python manage.py shell
```

Then run:
```python
from emails.models import EmailTemplate, EmailTemplateTranslation

# Create Welcome Email Template
welcome = EmailTemplate.objects.get_or_create(
    type='welcome',
    defaults={
        'name': 'Welcome Email',
        'description': 'Sent when user registers',
        'is_active': True
    }
)[0]

# Add Swedish translation
EmailTemplateTranslation.objects.get_or_create(
    template=welcome,
    language='sv',
    defaults={
        'subject': 'Välkommen till {{app_name}}, {{user.first_name}}!',
        'body_html': '''
            <h1>Hej {{user.first_name}}!</h1>
            <p>Tack för att du registrerade dig på {{app_name}}!</p>
            <p>Din klubb: {{club_name}}</p>
            <p>Mvh, {{app_name}}</p>
        ''',
        'body_text': 'Hej {{user.first_name}}! Tack för att du registrerade dig!'
    }
)

# Create Guardian Created Template
guardian = EmailTemplate.objects.get_or_create(
    type='guardian_created',
    defaults={
        'name': 'Guardian Account Created',
        'description': 'Sent when guardian account is created',
        'is_active': True
    }
)[0]

EmailTemplateTranslation.objects.get_or_create(
    template=guardian,
    language='sv',
    defaults={
        'subject': 'Ditt konto på {{app_name}} har skapats',
        'body_html': '''
            <h1>Hej {{user.first_name}}!</h1>
            <p>{{youth_name}} har lagt till dig som målsman på {{app_name}}.</p>
            <p>Klicka här för att sätta ditt lösenord och aktivera ditt konto:</p>
            <p><a href="{{set_password_url}}">Sätt lösenord</a></p>
            <p>Mvh, {{app_name}}</p>
        ''',
        'body_text': 'Klicka på länken för att sätta ditt lösenord: {{set_password_url}}'
    }
)

# Create New Message Template
message = EmailTemplate.objects.get_or_create(
    type='new_message',
    defaults={
        'name': 'New Message Received',
        'description': 'Sent when user receives a message',
        'is_active': True
    }
)[0]

EmailTemplateTranslation.objects.get_or_create(
    template=message,
    language='sv',
    defaults={
        'subject': 'Nytt meddelande från {{sender_name}}',
        'body_html': '''
            <h1>Nytt meddelande!</h1>
            <p>{{sender_name}} har skickat dig ett meddelande:</p>
            <p>"{{message_preview}}"</p>
            <p><a href="{{app_name}}/messages">Läs meddelandet</a></p>
        ''',
        'body_text': 'Nytt meddelande från {{sender_name}}: {{message_preview}}'
    }
)

# Create Event Registration Confirmed Template
event = EmailTemplate.objects.get_or_create(
    type='event_registration_confirmed',
    defaults={
        'name': 'Event Registration Confirmed',
        'description': 'Sent when event registration is approved',
        'is_active': True
    }
)[0]

EmailTemplateTranslation.objects.get_or_create(
    template=event,
    language='sv',
    defaults={
        'subject': 'Din plats är bokad: {{event_title}}',
        'body_html': '''
            <h1>Plats bekräftad! 🎉</h1>
            <p>Du har fått en plats på eventet: {{event_title}}</p>
            <p>Datum: {{event_date}}</p>
            <p>Plats: {{event_location}}</p>
            <p>Vi ses där!</p>
        ''',
        'body_text': 'Din plats är bokad för {{event_title}} den {{event_date}}'
    }
)

print("✅ Templates created successfully!")
exit()
```

**Option B: Via Admin Panel (More Control)**
1. Login to admin: http://localhost:8000/admin
2. Go to "Email Templates"
3. Click on each template type
4. Add Swedish translation with subject and body

---

## 🔍 **How to Verify Emails Were Sent**

### Method 1: Check Terminal (Console Backend)
Look for output like:
```
Content-Type: multipart/alternative;
 boundary="===============1234567890=="
MIME-Version: 1.0
Subject: Welcome to Ungdomsappen!
From: Ungdomsappen <noreply@ungdomsappen.se>
To: user@example.com
```

### Method 2: Check Email Logs (Admin Panel)
1. Go to http://localhost:8000/admin
2. Navigate to **Emails → Email Logs**
3. See all sent emails with:
   - Status (sent/failed)
   - Recipient
   - Template type
   - Date/time
   - Error messages (if failed)

### Method 3: Check Mailtrap (If Using)
1. Login to https://mailtrap.io
2. Go to your inbox
3. See the actual rendered email

### Method 4: API (For Developers)
```bash
# Get email statistics
curl http://localhost:8000/api/email-logs/stats/ \
  -H "Authorization: JWT your-token"

# List recent emails
curl http://localhost:8000/api/email-logs/ \
  -H "Authorization: JWT your-token"
```

---

## ⚠️ **Common Issues & Solutions**

### "Email template not found"
**Solution:** Create the template in admin panel or via shell (see Step 2 above)

### "Failed to send email" (SMTP error)
**Solution:** 
- Use console backend for testing: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`
- Check your SMTP credentials if using Mailtrap/other service
- Restart Django server after changing .env

### "No email received" (Console backend)
**Solution:** Check your Django terminal where you ran `python manage.py runserver` or `daphne`

### Email sent but template is empty/broken
**Solution:** Check that translation exists for the language (Swedish = 'sv')

### "ImportError" or "ModuleNotFoundError"
**Solution:** Migration not run yet. Run `python manage.py migrate emails`

---

## 📊 **Expected Test Results**

| Test | Expected Outcome | Where to Check |
|------|------------------|----------------|
| Registration | Welcome email sent | Terminal/Mailtrap + Email Logs |
| Guardian (new) | Creation email with password link | Terminal/Mailtrap + Email Logs |
| Guardian (existing) | Link request email | Terminal/Mailtrap + Email Logs |
| New Message | Message notification email | Terminal/Mailtrap + Email Logs |
| Event Registration | Confirmation email | Terminal/Mailtrap + Email Logs |
| Password Reset | Reset link email | Terminal/Mailtrap (already works) |

---

## 🎯 **Quick Test Commands**

```bash
# Test basic email configuration
python manage.py test_email --to test@example.com

# Check if migration is applied
python manage.py showmigrations emails

# Open Django shell to check templates
python manage.py shell
>>> from emails.models import EmailTemplate
>>> EmailTemplate.objects.all()
>>> EmailTemplate.objects.get(type='welcome').translations.all()

# Check email logs
python manage.py shell
>>> from emails.models import EmailLog
>>> EmailLog.objects.all().order_by('-created_at')[:5]
```

---

## 🚦 **Testing Priority**

**Start with these (easiest):**
1. ✅ Password Reset (already works, just test it)
2. ✅ Registration Welcome Email (very easy to trigger)
3. ✅ Guardian Email (part of registration)

**Then test these:**
4. ⚠️ New Message (need 2 accounts)
5. ⚠️ Event Registration (need existing event)

**Later (scheduled jobs):**
6. Birthday Email (need user with today's birthday)
7. Trial Expiring (need user with expiring trial)

---

## 📝 **Testing Checklist**

- [ ] Migration run: `python manage.py migrate emails`
- [ ] Email backend configured in .env
- [ ] Django server restarted
- [ ] At least 4 templates created (welcome, guardian_created, new_message, event_registration_confirmed)
- [ ] Test basic email: `python manage.py test_email`
- [ ] Register new user → check for welcome email
- [ ] Register with guardian → check for guardian email
- [ ] Send message → check for message email
- [ ] Check Email Logs in admin panel

---

**Ready to test?** Start with Step 0 (email backend setup) and Step 2 (create templates), then try registering a new user!


