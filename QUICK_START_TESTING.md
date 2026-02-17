# 🚀 Quick Start - Test GDPR Features Now!

**5-Minute Quick Start Guide**

---

## Step 1: Setup (2 minutes)

```bash
# Terminal 1: Start server
cd backend
source venv/bin/activate
python manage.py runserver
```

```bash
# Terminal 2: Create test data
cd backend
source venv/bin/activate
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Create test user
user = User.objects.create_user(
    email='test@test.se',
    password='test123',
    first_name='Test',
    last_name='User'
)

# Create admin
admin = User.objects.create_superuser(
    email='admin@test.se',
    password='admin123',
    first_name='Admin',
    last_name='User'
)

print("✅ Users created!")
print("User: test@test.se / test123")
print("Admin: admin@test.se / admin123")
exit()
```

```bash
# Create consent types
python manage.py create_consent_types
```

---

## Step 2: Test as User (3 minutes)

### 2.1 - Login

```bash
curl -X POST http://localhost:8000/api/auth/jwt/create/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.se", "password": "test123"}'
```

**Copy the `access` token from response!**

```bash
# Save token
export TOKEN="paste_your_token_here"
```

### 2.2 - Give Marketing Consent

```bash
curl -X POST http://localhost:8000/api/gdpr/my-consents/give/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_code": "marketing_emails"}'
```

**✅ Expected**: "Consent recorded successfully"

### 2.3 - Check Your Consent

```bash
curl "http://localhost:8000/api/gdpr/my-consents/check/?codes=marketing_emails" \
  -H "Authorization: JWT $TOKEN"
```

**✅ Expected**: `{"consents": {"marketing_emails": true}}`

### 2.4 - Withdraw Consent

```bash
curl -X POST http://localhost:8000/api/gdpr/my-consents/withdraw/ \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_code": "marketing_emails", "reason": "Testing"}'
```

**✅ Expected**: "Consent withdrawn successfully"

### 2.5 - Request Data Export

```bash
curl -X POST http://localhost:8000/api/gdpr/exports/request-export/ \
  -H "Authorization: JWT $TOKEN"
```

**✅ Expected**: Export request created (will process in background)

### 2.6 - View Audit Logs

```bash
curl http://localhost:8000/api/audit/logs/my-activity/ \
  -H "Authorization: JWT $TOKEN"
```

**✅ Expected**: See your LOGIN, consent actions, etc.

---

## Step 3: Test Admin Panel (2 minutes)

### 3.1 - Open Admin

Navigate to: **http://localhost:8000/admin/**

Login: `admin@test.se` / `admin123`

### 3.2 - View Audit Logs

Click: **Audit Logging → Audit Log Entries**

**✅ You should see**: All test user's actions with timestamps and IP addresses

### 3.3 - View Consents

Click: **GDPR Compliance → User Consents**

**✅ You should see**: Test user's consent for marketing_emails (withdrawn)

### 3.4 - View Consent Types

Click: **GDPR Compliance → Consent Types**

**✅ You should see**: 7 consent types with required/optional badges

### 3.5 - View Data Exports

Click: **GDPR Compliance → Data Export Requests**

**✅ You should see**: Test user's export request (pending or completed)

---

## 🎉 Success!

If you got through all steps successfully, your GDPR system is working perfectly!

### What You Just Tested:
- ✅ User registration and login (creates audit log)
- ✅ Consent management (give, check, withdraw)
- ✅ Data export requests
- ✅ Audit logging
- ✅ Admin panel access to all GDPR data

---

## 📋 Quick Verification Checklist

Run through this checklist to verify everything works:

### As User
- [ ] Can login
- [ ] Can give consent
- [ ] Can withdraw consent
- [ ] Can request data export
- [ ] Can view own audit logs

### As Admin
- [ ] Can access admin panel
- [ ] Can see all audit logs
- [ ] Can see all user consents
- [ ] Can see all export requests
- [ ] Can manage consent types

### System
- [ ] No errors in terminal
- [ ] Audit logs created automatically
- [ ] Consent version tracking works
- [ ] Data export processes successfully

---

## 🐛 Quick Troubleshooting

### "command not found: curl"
- **Windows**: Use PowerShell with `Invoke-RestMethod` or download curl
- **Mac/Linux**: curl should be pre-installed

### "Authentication credentials were not provided"
- Make sure you copied the token correctly
- Include: `-H "Authorization: JWT $TOKEN"`

### "No consent types found"
- Run: `python manage.py create_consent_types`

### Admin login doesn't work
- Verify you created the superuser
- Check password carefully (admin123)

---

## 🚀 Next Steps

1. **Full Testing**: See `GDPR_USER_TESTING_GUIDE.md` for comprehensive scenarios
2. **Account Deletion**: Test deletion requests with 30-day grace period
3. **Multiple Users**: Create youth, guardian, and admin users
4. **Frontend**: Build UI for better user experience

---

## 📞 Need Help?

Check these files:
- `GDPR_USER_TESTING_GUIDE.md` - Complete testing guide
- `GDPR_COMPLETE_SUMMARY.md` - Full feature overview
- `GDPR_QUICK_REFERENCE.md` - API reference

---

**You're all set! Your GDPR system is ready!** 🎉


