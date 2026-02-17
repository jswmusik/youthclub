# 🧪 GDPR User Testing Guide

Complete guide to test all GDPR features as different user types.

---

## 🚀 Quick Setup

### 1. Start the Backend Server

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### 2. Create Test Users

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from organization.models import Club, Municipality

User = get_user_model()

# Create test municipality
muni = Municipality.objects.create(
    name="Test Municipality",
    slug="test-muni",
    contact_email="test@test.se"
)

# Create test club
club = Club.objects.create(
    name="Test Youth Club",
    slug="test-club",
    municipality=muni,
    contact_email="club@test.se"
)

# 1. Youth Member
youth = User.objects.create_user(
    email='youth@test.se',
    password='youth123',
    first_name='Test',
    last_name='Youth',
    date_of_birth='2010-01-01',
    assigned_club=club
)

# 2. Guardian
guardian = User.objects.create_user(
    email='guardian@test.se',
    password='guardian123',
    first_name='Test',
    last_name='Guardian'
)

# 3. Admin
admin = User.objects.create_superuser(
    email='admin@test.se',
    password='admin123',
    first_name='Admin',
    last_name='User'
)

print("✅ Test users created!")
print("Youth: youth@test.se / youth123")
print("Guardian: guardian@test.se / guardian123")
print("Admin: admin@test.se / admin123")
```

### 3. Enable All GDPR Features

Check `backend/core/settings.py` - all should be enabled by default:
```python
ENABLE_AUDIT_LOGGING = True
ENABLE_DATA_EXPORT = True
ENABLE_CONSENT_TRACKING = True
ENABLE_ACCOUNT_DELETION = True
```

### 4. Create Default Consent Types

```bash
python manage.py create_consent_types
```

---

## 📱 Testing Tools

### Option 1: Using curl (Command Line)

All examples below use curl with JWT authentication.

### Option 2: Using Browser/Postman

1. Go to `http://localhost:8000/api/` in your browser
2. Use Postman or similar API client
3. Login to get JWT token first

### Option 3: Django Admin Panel

Navigate to `http://localhost:8000/admin/`

---

## 🎯 Test Scenarios

---

## 👤 TEST AS YOUTH MEMBER

### Scenario 1: Login & View Audit Logs

**1.1 - Login (creates audit log)**

```bash
# Login
curl -X POST http://localhost:8000/api/auth/jwt/create/ \
  -H "Content-Type: application/json" \
  -d '{"email": "youth@test.se", "password": "youth123"}'

# Save the access token from response
export TOKEN="your_access_token_here"
```

**Expected**: You receive an access token.

**1.2 - View Your Audit Logs**

```bash
curl http://localhost:8000/api/audit/logs/my-activity/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: You see a LOGIN event with your IP address and timestamp.

---

### Scenario 2: Manage Consents

**2.1 - View Available Consent Types**

```bash
# List all consent types
curl http://localhost:8000/api/gdpr/consent-types/
```

**Expected**: You see 7 consent types (4 required, 3 optional).

**2.2 - View Required Consents (for registration)**

```bash
curl http://localhost:8000/api/gdpr/consent-types/required/
```

**Expected**: 
```json
{
  "count": 4,
  "results": [
    {"code": "terms_of_service", "name": "Terms of Service", "is_required": true},
    {"code": "privacy_policy", "name": "Privacy Policy", "is_required": true},
    {"code": "data_processing", "name": "Data Processing", "is_required": true},
    {"code": "age_verification", "name": "Age Verification", "is_required": true}
  ]
}
```

**2.3 - Give Consent (Marketing Emails)**

```bash
curl -X POST http://localhost:8000/api/gdpr/my-consents/give/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_code": "marketing_emails"}'
```

**Expected**: 
```json
{
  "message": "Consent recorded successfully",
  "consent": {
    "id": 1,
    "consent_type_name": "Marketing Communications",
    "is_active": true,
    "consented_at": "2026-01-15T..."
  }
}
```

**2.4 - Check Consent Status**

```bash
curl "http://localhost:8000/api/gdpr/my-consents/check/?codes=marketing_emails" \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "consents": {
    "marketing_emails": true
  },
  "all_given": true
}
```

**2.5 - View All Your Consents**

```bash
curl http://localhost:8000/api/gdpr/my-consents/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: List of all consents you've given.

**2.6 - Withdraw Consent**

```bash
curl -X POST http://localhost:8000/api/gdpr/my-consents/withdraw/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_code": "marketing_emails", "reason": "Too many emails"}'
```

**Expected**:
```json
{
  "message": "Consent withdrawn successfully",
  "consent_code": "marketing_emails"
}
```

**2.7 - Verify Consent Was Withdrawn**

```bash
curl "http://localhost:8000/api/gdpr/my-consents/check/?codes=marketing_emails" \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "consents": {
    "marketing_emails": false
  }
}
```

---

### Scenario 3: Request Data Export

**3.1 - Request Data Export**

```bash
curl -X POST http://localhost:8000/api/gdpr/exports/request-export/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "message": "Data export request created successfully...",
  "export_request": {
    "id": 1,
    "status": "pending",
    "requested_at": "2026-01-15T..."
  }
}
```

**3.2 - Check Export Status**

```bash
curl http://localhost:8000/api/gdpr/exports/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: See your export request with status "processing" or "completed".

**Note**: If using Celery, the export will be processed asynchronously. If not, it processes immediately but may take a few seconds.

**3.3 - Download Export (when completed)**

```bash
# First, get the export request ID from step 3.2
curl http://localhost:8000/api/gdpr/exports/1/download/ \
  -H "Authorization: JWT $TOKEN" \
  -o my_data.json
```

**Expected**: Download a JSON file with all your data.

**3.4 - View Export File**

```bash
cat my_data.json | python -m json.tool | head -50
```

**Expected**: See your profile data, consents, audit logs, etc. in JSON format.

**3.5 - Try Rate Limiting (should fail)**

```bash
# Try to request another export immediately
curl -X POST http://localhost:8000/api/gdpr/exports/request-export/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "detail": "You can only request one data export every 24 hours."
}
```

---

### Scenario 4: Request Account Deletion

**4.1 - Check Current Deletion Status**

```bash
curl http://localhost:8000/api/gdpr/deletion-requests/my-request/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "has_request": false,
  "message": "No pending deletion request"
}
```

**4.2 - Request Account Deletion (Anonymization)**

```bash
curl -X POST http://localhost:8000/api/gdpr/deletion-requests/request-deletion/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "I no longer use the service",
    "deletion_type": "anonymize",
    "confirm": true
  }'
```

**Expected**:
```json
{
  "message": "Account deletion request submitted successfully. Your account will be deleted on 2026-02-14. You can cancel this request before that date.",
  "deletion_request": {
    "id": 1,
    "status": "pending",
    "deletion_type": "anonymize",
    "scheduled_deletion_date": "2026-02-14T...",
    "days_until_deletion": 30,
    "can_be_cancelled": true
  }
}
```

**4.3 - Check Deletion Status Again**

```bash
curl http://localhost:8000/api/gdpr/deletion-requests/my-request/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: See your pending deletion request with countdown.

**4.4 - Cancel Deletion Request**

```bash
curl -X POST http://localhost:8000/api/gdpr/deletion-requests/cancel-deletion/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Changed my mind"}'
```

**Expected**:
```json
{
  "message": "Account deletion request cancelled successfully. Your account is safe."
}
```

**4.5 - Verify Cancellation**

```bash
curl http://localhost:8000/api/gdpr/deletion-requests/my-request/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "has_request": false
}
```

---

### Scenario 5: Verify Audit Trail

**5.1 - View All Your Activity**

```bash
curl http://localhost:8000/api/audit/logs/my-activity/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: See all your actions:
- LOGIN
- ACCOUNT_DELETION_REQUESTED
- ACCOUNT_DELETION_CANCELLED
- HTTP_POST (for API requests)
- etc.

**5.2 - Filter by Action**

```bash
curl "http://localhost:8000/api/audit/logs/?action=LOGIN" \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: Only see LOGIN events.

---

## 👨‍👩‍👧 TEST AS GUARDIAN

### Scenario 6: Guardian Views Their Child's Data

**6.1 - Login as Guardian**

```bash
curl -X POST http://localhost:8000/api/auth/jwt/create/ \
  -H "Content-Type: application/json" \
  -d '{"email": "guardian@test.se", "password": "guardian123"}'

export GUARDIAN_TOKEN="guardian_access_token_here"
```

**6.2 - Link Guardian to Youth (if not already linked)**

This would typically be done through your app's UI or admin panel. For testing, you can do it in the Django shell:

```python
python manage.py shell
```

```python
from users.models import User

youth = User.objects.get(email='youth@test.se')
guardian = User.objects.get(email='guardian@test.se')

# Link guardian (your app should have this relationship)
# This depends on your user model structure
print("Guardian linked to youth member")
```

**6.3 - Request Youth's Data Export (as Guardian)**

```bash
curl -X POST http://localhost:8000/api/gdpr/exports/request-export/ \
  -H "Authorization: JWT $GUARDIAN_TOKEN"
```

**Expected**: Guardian can export their own data (and potentially linked children's data based on your permissions).

**6.4 - View Guardian's Own Consents**

```bash
curl http://localhost:8000/api/gdpr/my-consents/ \
  -H "Authorization: JWT $GUARDIAN_TOKEN"
```

**Expected**: See guardian's consents (separate from youth's consents).

---

## 👑 TEST AS ADMIN

### Scenario 7: Admin Views All Audit Logs

**7.1 - Login as Admin**

```bash
curl -X POST http://localhost:8000/api/auth/jwt/create/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.se", "password": "admin123"}'

export ADMIN_TOKEN="admin_access_token_here"
```

**7.2 - View All Audit Logs**

```bash
curl http://localhost:8000/api/audit/logs/ \
  -H "Authorization: JWT $ADMIN_TOKEN"
```

**Expected**: See logs from ALL users (youth, guardian, admin).

**7.3 - View Audit Log Summary**

```bash
curl http://localhost:8000/api/audit/logs/summary/ \
  -H "Authorization: JWT $ADMIN_TOKEN"
```

**Expected**:
```json
[
  {"action": "LOGIN", "count": 3},
  {"action": "HTTP_POST", "count": 10},
  {"action": "ACCOUNT_DELETION_REQUESTED", "count": 1},
  ...
]
```

**7.4 - View All Data Export Requests**

```bash
curl http://localhost:8000/api/gdpr/exports/ \
  -H "Authorization: JWT $ADMIN_TOKEN"
```

**Expected**: See export requests from all users.

**7.5 - View All Deletion Requests**

```bash
curl http://localhost:8000/api/gdpr/deletion-requests/ \
  -H "Authorization: JWT $ADMIN_TOKEN"
```

**Expected**: See deletion requests from all users.

---

### Scenario 8: Admin Panel Testing

**8.1 - Open Django Admin**

```
http://localhost:8000/admin/
```

Login with: `admin@test.se` / `admin123`

**8.2 - View Audit Logs**

Navigate to: **Audit Logging → Audit Log Entries**

**Expected**:
- See all audit logs with filters
- Color-coded action types
- Search by user, action, model
- Date hierarchy

**8.3 - View Data Export Requests**

Navigate to: **GDPR Compliance → Data Export Requests**

**Expected**:
- See all export requests
- Status badges (pending/completed/failed)
- Processing time information
- Export logs inline

**8.4 - View Consent Types**

Navigate to: **GDPR Compliance → Consent Types**

**Expected**:
- See 7 consent types
- Required/Optional badges
- Active/Inactive status
- Edit capabilities

**8.5 - View User Consents**

Navigate to: **GDPR Compliance → User Consents**

**Expected**:
- See all user consents
- Filter by active/withdrawn
- Search by user
- View consent logs

**8.6 - View Account Deletion Requests**

Navigate to: **GDPR Compliance → Account Deletion Requests**

**Expected**:
- See all deletion requests
- Status (pending/processing/completed)
- Days until deletion
- Deletion logs

**8.7 - View Deleted User Records**

Navigate to: **GDPR Compliance → Deleted User Records**

**Expected**:
- See historical records of deleted accounts
- Email hash (for preventing re-registration)
- Deletion date and type
- Retention period

---

## 🧪 Advanced Testing Scenarios

### Scenario 9: Test Consent Version Updates

**9.1 - Update Consent Version (Admin)**

```python
python manage.py shell
```

```python
from gdpr.consent_models import ConsentType

# Update privacy policy version
privacy = ConsentType.objects.get(code='privacy_policy')
privacy.version = '2.0'
privacy.consent_text = 'NEW: Updated privacy policy text...'
privacy.save()

print("✅ Privacy policy updated to v2.0")
```

**9.2 - Check for Outdated Consents (Youth)**

```bash
curl http://localhost:8000/api/gdpr/my-consents/outdated/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**:
```json
{
  "count": 1,
  "consents": [
    {
      "consent_type_name": "Privacy Policy",
      "version_snapshot": "1.0",
      "needs_update": true
    }
  ]
}
```

**9.3 - Re-consent to New Version**

```bash
curl -X POST http://localhost:8000/api/gdpr/my-consents/give/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_code": "privacy_policy"}'
```

**Expected**: Old v1.0 consent withdrawn, new v2.0 consent recorded.

---

### Scenario 10: Test Rate Limiting

**10.1 - Request Multiple Exports Quickly**

```bash
# Request 1
curl -X POST http://localhost:8000/api/gdpr/exports/request-export/ \
  -H "Authorization: JWT $TOKEN"

# Request 2 (immediate - should fail)
curl -X POST http://localhost:8000/api/gdpr/exports/request-export/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: Second request returns 429 Too Many Requests.

---

### Scenario 11: Test Feature Flags

**11.1 - Disable Audit Logging**

Edit `.env` or `settings.py`:
```bash
ENABLE_AUDIT_LOGGING=False
```

Restart server:
```bash
python manage.py runserver
```

**11.2 - Verify Audit Disabled**

```bash
curl http://localhost:8000/api/audit/logs/ \
  -H "Authorization: JWT $TOKEN"
```

**Expected**: Empty results or feature disabled message.

**11.3 - Re-enable and Verify**

```bash
ENABLE_AUDIT_LOGGING=True
# Restart server
```

---

## ✅ Testing Checklist

### Youth Member
- [ ] Can login (creates audit log)
- [ ] Can view their own audit logs
- [ ] Can see available consent types
- [ ] Can give consent
- [ ] Can withdraw consent
- [ ] Can check consent status
- [ ] Can request data export
- [ ] Can download export when ready
- [ ] Rate limited (1 export per 24h)
- [ ] Can request account deletion
- [ ] Can cancel deletion
- [ ] Can see days until deletion

### Guardian
- [ ] Can login
- [ ] Can manage their own consents
- [ ] Can request their own data export
- [ ] Can view their own audit logs
- [ ] (If implemented) Can manage child's consents
- [ ] (If implemented) Can export child's data

### Admin
- [ ] Can view all audit logs
- [ ] Can see audit log summary
- [ ] Can view all export requests
- [ ] Can view all deletion requests
- [ ] Can access Django admin panel
- [ ] Can view/manage consent types
- [ ] Can view user consents
- [ ] Can view deleted user records
- [ ] Can filter and search all data

### System Features
- [ ] Audit logs created automatically
- [ ] Consent version tracking works
- [ ] Data export includes all models
- [ ] Deletion grace period works
- [ ] Email notifications sent (check console)
- [ ] Feature flags work (can disable features)
- [ ] No breaking changes to existing features

---

## 📧 Email Testing

Since you're using console backend for development, check your terminal where Django is running to see emails:

```bash
# You should see emails like:
[EMAIL] Subject: Account Deletion Requested
To: youth@test.se
Body: Your account deletion has been scheduled for...

[EMAIL] Subject: Data Export Ready
To: youth@test.se
Body: Your data export is ready for download...
```

---

## 🐛 Troubleshooting

### "Authentication credentials were not provided"
- Make sure you're including the JWT token: `-H "Authorization: JWT $TOKEN"`
- Token might have expired, login again

### "Feature is currently disabled"
- Check your environment variables
- Ensure feature flags are set to `True`

### "No consent types found"
- Run: `python manage.py create_consent_types`

### Export never completes
- If using Celery, ensure workers are running
- If not using Celery, export runs synchronously - just wait a few seconds

### Can't access admin panel
- Ensure you created a superuser
- Check credentials
- Navigate to `/admin/` not `/api/admin/`

---

## 🎯 Expected Test Results Summary

After completing all scenarios, you should have:

**Audit Logs**:
- Multiple LOGIN events
- HTTP_POST events for API calls
- CONSENT_GIVEN and CONSENT_WITHDRAWN events
- ACCOUNT_DELETION_REQUESTED and CANCELLED events

**Consents**:
- Active consent for marketing_emails (or withdrawn if tested)
- Version history showing v1.0 → v2.0 update
- Full audit trail in consent logs

**Data Exports**:
- At least 1 completed export request
- Downloaded JSON file with all user data
- Export logs showing what data was collected

**Account Deletion**:
- Cancelled deletion request
- Audit trail of request and cancellation
- Confirmation that account is still active

---

## 📝 Notes

- All these tests use the REST API - you can build a frontend UI for better UX
- Console email backend shows emails in terminal (use SMTP in production)
- Celery is optional but recommended for production
- Feature flags allow gradual rollout
- All user data is isolated (users can only see their own data)

---

**Happy Testing!** 🎉

If you encounter any issues, check the logs and verify feature flags are enabled.


