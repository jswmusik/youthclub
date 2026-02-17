# Email System - Quick Start Guide

## 🚀 Getting Started (5 Steps)

### Step 1: Run Migration
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py migrate emails
```

### Step 2: Setup Email Service (For Testing)

Add to `/Users/ungdomsappen/the-youth-app/backend/.env`:

```env
# Option 1: Mailtrap (Recommended for testing - free fake inbox)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_HOST_USER=your-mailtrap-username
EMAIL_HOST_PASSWORD=your-mailtrap-password

# Option 2: Console (prints to terminal)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**Get Mailtrap credentials:** Sign up at https://mailtrap.io (free)

### Step 3: Create Email Templates

1. Start your Django server
2. Login to admin: http://localhost:8000/admin
3. Navigate to **Emails > Email Templates**
4. For each template type, click to edit
5. Add translations (at least Swedish):
   - Click "Translations" tab
   - Add Swedish (sv) translation
   - Fill in: Subject, Body HTML, Body Text (optional)

**Minimum Required Templates:**
- Welcome Email
- Guardian Account Created
- Password Reset (already exists)
- Two-Factor OTP (already exists)

### Step 4: Test Email Sending

```bash
# Test basic email configuration
python manage.py test_email --to your-email@example.com

# Test birthday emails (won't send unless today is someone's birthday)
python manage.py send_birthday_emails

# Test trial expiring emails
python manage.py send_trial_expiring_emails --days-before=3
```

### Step 5: Verify It's Working

1. Register a new youth account
2. Check your email/Mailtrap inbox
3. You should receive a welcome email!
4. Check admin panel: **Emails > Email Logs** to see sent emails

---

## 📧 Email Template Quick Example

### Welcome Email Template (Swedish)

**Subject:**
```
Välkommen till {{app_name}}, {{user.first_name}}! 🎉
```

**Body HTML:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center;">
        <h1>Välkommen {{user.first_name}}! 🎉</h1>
    </div>
    
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p>Hej {{user.first_name}},</p>
        
        <p>Tack för att du registrerade dig på {{app_name}}!</p>
        
        <p><strong>Din klubb:</strong> {{club_name}}</p>
        
        <h3>Nästa steg:</h3>
        <ul>
            <li>Utforska evenemang</li>
            <li>Chatta med andra medlemmar</li>
            <li>Tjäna belöningar</li>
        </ul>
        
        <p style="margin-top: 30px;">
            Med vänliga hälsningar,<br>
            <strong>{{app_name}} teamet</strong>
        </p>
    </div>
    
    <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
        <p>{{app_name}} | {{support_email}}</p>
        <p>&copy; {{current_year}} Alla rättigheter förbehållna</p>
    </div>
</body>
</html>
```

---

## 🔍 Troubleshooting

### "Email template not found"
- Go to admin panel > Email Templates
- Create the template type that's missing
- Add at least one translation (Swedish recommended)

### "Failed to send email"
- Check your EMAIL_* settings in .env
- Verify SMTP credentials are correct
- Check email logs in admin panel for error messages
- Try console backend for testing: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`

### "Emails not being sent on registration"
- Check that migration was run: `python manage.py migrate emails`
- Verify template exists in admin panel
- Check terminal/logs for error messages
- Look in Email Logs admin panel

### "Scheduled emails not sending"
- Make sure scheduler is running: `python manage.py run_scheduler`
- Check scheduler logs for errors
- Verify templates exist for birthday/trial_expiring types

---

## 📋 Testing Checklist

- [ ] Migration applied successfully
- [ ] Email service configured (Mailtrap/Console)
- [ ] At least 4 core templates created in admin
- [ ] Test email command works
- [ ] Register new user → receive welcome email
- [ ] Add guardian → guardian receives email
- [ ] Register for event → receive confirmation
- [ ] Check Email Logs in admin panel

---

## 🎯 Production Checklist

- [ ] All 18 email templates created
- [ ] All templates translated to 8 languages
- [ ] Production SMTP service configured (SendGrid/AWS SES)
- [ ] FRONTEND_URL set to production domain
- [ ] Scheduler running as separate process
- [ ] Email monitoring setup
- [ ] Test all email flows in staging
- [ ] Verify deliverability (check spam folders)

---

## 📞 Quick Help

**View all sent emails:**
Admin Panel > Emails > Email Logs

**Test specific template:**
Admin Panel > Email Templates > [Select Template] > "Send Test Email" button

**Email statistics:**
GET `/api/email-logs/stats/` (Super Admin only)

**Manual commands:**
```bash
python manage.py send_birthday_emails
python manage.py send_trial_expiring_emails
python manage.py process_inactive_users --send-warnings
```

---

## 🎨 Available Template Variables

All templates have access to:
- `{{user.first_name}}`, `{{user.last_name}}`, `{{user.nickname}}`
- `{{user.email}}`, `{{user.full_name}}`
- `{{app_name}}` - "Ungdomsappen"
- `{{support_email}}` - "support@ungdomsappen.se"
- `{{current_year}}` - Current year
- `{{club.name}}`, `{{municipality.name}}` (if available)
- Plus template-specific variables (see full docs)

---

**Need more help?** Check `EMAIL_IMPLEMENTATION_SUMMARY.md` for complete details.

**Last updated:** January 12, 2026


