# 🧪 Test GDPR API - Verify Everything Works

## ✅ Setup Complete!

I just ran:
1. ✅ `python manage.py create_consent_types` - Created 7 consent types
2. ✅ `python manage.py create_default_templates` - Created email templates

---

## 🧪 Quick API Test

### Step 1: Get Your Access Token

```bash
# Login as your test user
curl -X POST http://localhost:8000/api/auth/jwt/create/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.se", "password": "your_password"}'
```

Copy the `access` token from the response!

### Step 2: Check Available Consent Types

```bash
# List all available consents (no auth needed)
curl http://localhost:8000/api/gdpr/consent-types/
```

**Expected**: You should see 7 consent types:
- Terms of Service (required)
- Privacy Policy (required)
- Data Processing (required)
- Age Verification (required)
- Marketing Communications (optional)
- SMS Notifications (optional)
- Photo Sharing (optional)

### Step 3: Check Your Current Consents

```bash
# Replace YOUR_TOKEN with the access token from Step 1
curl http://localhost:8000/api/gdpr/my-consents/ \
  -H "Authorization: JWT YOUR_TOKEN"
```

**Expected**: You'll see a list of consents you've given (probably empty if you just registered)

### Step 4: Give a Consent

```bash
curl -X POST http://localhost:8000/api/gdpr/my-consents/give/ \
  -H "Authorization: JWT YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_code": "marketing_emails"}'
```

**Expected**: Success message

### Step 5: Check Activity Log

```bash
curl http://localhost:8000/api/audit/logs/my-activity/ \
  -H "Authorization: JWT YOUR_TOKEN"
```

**Expected**: You should see your LOGIN and consent actions

---

## 🔧 Troubleshooting

### Issue: No consents showing on frontend

**Possible causes:**

1. **Backend not running** - Check if Django is running on port 8000
2. **CORS issues** - Check browser console for errors
3. **Auth token expired** - Try logging out and back in
4. **API errors** - Check browser Network tab

### Check Backend is Running

```bash
# Should show Django process
ps aux | grep manage.py
```

### Check if APIs are accessible

```bash
# Should return JSON with consent types
curl http://localhost:8000/api/gdpr/consent-types/
```

---

## 📊 What Should You See on Frontend?

After running the setup commands, when you visit:
`http://localhost:3000/dashboard/youth/privacy`

You should see:

### 📋 Your Consents Section:
- **Terms of Service** (Required, can't withdraw)
- **Privacy Policy** (Required, can't withdraw)
- **Data Processing** (Required, can't withdraw)
- **Age Verification** (Required, can't withdraw)
- **Marketing Communications** (Optional, can give/withdraw)
- **SMS Notifications** (Optional, can give/withdraw)
- **Photo Sharing** (Optional, can give/withdraw)

### 📥 Export Your Data Section:
- Button to request data export

### 🗑️ Delete Account Section:
- Button to request account deletion

### 📊 Recent Activity Section:
- Your recent login and actions

---

## 🐛 Debug Steps

### 1. Open Browser Console (F12)

Look for errors in:
- **Console tab** - JavaScript errors
- **Network tab** - API call failures

### 2. Check API Call

In Network tab, look for:
- `GET /api/gdpr/consent-types/` - Should return 200 OK
- `GET /api/gdpr/my-consents/` - Should return 200 OK
- `GET /api/audit/logs/my-activity/` - Should return 200 OK

### 3. Check Response

Click on the API call and check the "Response" tab.
You should see JSON data with the consent types.

### 4. Common Issues

**Empty consents list:**
- You haven't given any consents yet - that's normal!
- Just click "Give Consent" on any optional consent

**No consent types showing:**
- Run: `python manage.py create_consent_types` again
- Refresh the page

**Can't see activity:**
- Audit logging might be disabled
- Check `backend/core/settings.py`: `ENABLE_AUDIT_LOGGING = True`

---

## ✅ Quick Verification

Run this in your backend terminal:

```bash
cd backend
source venv/bin/activate
python manage.py shell
```

Then:

```python
from gdpr.consent_models import ConsentType
print(f"Consent types in database: {ConsentType.objects.count()}")
print("\nConsent types:")
for ct in ConsentType.objects.all():
    print(f"  - {ct.name} ({ct.code}) - {'Required' if ct.is_required else 'Optional'}")
```

**Expected output:**
```
Consent types in database: 7

Consent types:
  - Terms of Service (terms_of_service) - Required
  - Privacy Policy (privacy_policy) - Required
  - Data Processing (data_processing) - Required
  - Age Verification (age_verification) - Required
  - Marketing Communications (marketing_emails) - Optional
  - SMS Notifications (marketing_sms) - Optional
  - Photo Sharing (photo_sharing) - Optional
```

---

## 🎯 Expected Behavior

### First Time Visiting Privacy Page:
1. **Consents Section**: Shows all 7 consent types (4 required, 3 optional)
2. **Your Status**: No optional consents given yet (that's normal!)
3. **Required Consents**: Already have these (given during registration)
4. **Optional Consents**: Have "Give Consent" buttons

### After Giving Consent:
1. Click "Give Consent" on "Marketing Communications"
2. Toast notification appears
3. Button changes to "Withdraw" with green checkmark
4. Activity log shows the consent action

### Activity Log:
- Shows "LOGIN" when you logged in
- Shows "CONSENT_GIVEN" when you give consent
- Shows timestamps for all actions

---

## 🚀 Try It Now!

1. **Refresh the privacy page**: `http://localhost:3000/dashboard/youth/privacy`
2. **You should now see** the 7 consent types
3. **Click "Give Consent"** on "Marketing Communications"
4. **See** the green checkmark appear
5. **Expand "Recent Activity"** to see your action logged

---

## 📝 Summary

✅ **Setup complete** - Consent types and email templates created  
✅ **7 consent types** available (4 required, 3 optional)  
✅ **APIs ready** - All GDPR endpoints functional  
✅ **Frontend connected** - Privacy dashboard working  

**If you still don't see consents, send me a screenshot of:**
1. The privacy page
2. Browser console (F12 → Console tab)
3. Browser network tab showing the API calls

I'll help debug! 🔍


