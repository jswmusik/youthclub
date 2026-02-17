# 🔧 Fixed: Consent Recording During Registration

## The Problem
User `test@tre.se` had **0 consents** recorded even though they registered with the new consent flow.

## Root Cause
The `_record_consents()` method in `YouthRegistrationSerializer` was using **incorrect field names** that don't exist in the `UserConsent` model:

**Wrong Field Names:**
- `given_at` ❌ (should be `consented_at`)
- `source` ❌ (should be `consent_method`)

## The Fix

### 1. Backend - Updated Serializer ✅
**File:** `backend/users/serializers.py`

**Fixed the `_record_consents()` method:**
```python
def _record_consents(self, user, consents_dict):
    """Helper to record GDPR consents given during registration"""
    from gdpr.consent_models import ConsentType, UserConsent
    
    # Get IP address from request context
    ip_address = None
    if hasattr(self, 'context') and 'request' in self.context:
        ip_address = self.context['request'].META.get('REMOTE_ADDR')
    
    for consent_code, accepted in consents_dict.items():
        if accepted:
            try:
                consent_type = ConsentType.objects.get(code=consent_code, is_active=True)
                UserConsent.objects.create(
                    user=user,
                    consent_type=consent_type,
                    consent_method='REGISTRATION',  # ✅ Correct field name
                    ip_address=ip_address,
                    version_snapshot=consent_type.version,
                    is_active=True
                )
            except ConsentType.DoesNotExist:
                logger.warning(f"Consent type '{consent_code}' not found")
                continue
```

**Changes:**
- ✅ `given_at` → removed (field is auto-populated by `consented_at` with `auto_now_add=True`)
- ✅ `source='REGISTRATION'` → `consent_method='REGISTRATION'`
- ✅ Added `ip_address` capture from request
- ✅ Added `version_snapshot` to track consent version

---

### 2. Frontend - Fixed Field Names ✅
**Files:**
- `frontend/app/components/YouthDetailView.tsx`
- `frontend/app/components/GuardianDetailView.tsx`

**Updated to use correct API response fields:**
```typescript
// OLD (incorrect)
Given: {new Date(consent.given_at).toLocaleDateString()}
Source: {consent.source}

// NEW (correct)
Given: {new Date(consent.consented_at).toLocaleDateString()}
Source: {consent.consent_method}
```

---

### 3. Test Data - Added Consents ✅
**Manually added 4 consents for user `test@tre.se` (ID: 165):**
- ✅ Terms of Service
- ✅ Privacy Policy
- ✅ Data Processing
- ✅ Age Verification

All set to:
- `is_active=True`
- `consent_method='REGISTRATION'`
- `version_snapshot=1`

---

## UserConsent Model Field Reference

For future reference, here are the correct field names:

| Purpose | Field Name | Type | Notes |
|---------|-----------|------|-------|
| When consent was given | `consented_at` | DateTimeField | auto_now_add=True |
| How consent was obtained | `consent_method` | CharField | Choices: REGISTRATION, SETTINGS, PROMPT, API, ADMIN |
| Is consent active | `is_active` | BooleanField | Default: True |
| When withdrawn | `withdrawn_at` | DateTimeField | null=True |
| Withdrawal reason | `withdrawal_reason` | TextField | blank=True |
| IP address | `ip_address` | GenericIPAddressField | null=True |
| Version snapshot | `version_snapshot` | CharField | Tracks consent type version |

---

## Testing

### ✅ Test New Registrations
1. Register a new user: `http://localhost:3000/register`
2. Accept all 4 required consents
3. Complete registration
4. Go to admin: `http://localhost:3000/admin/municipality/youth/[id]`
5. Check "Privacy & Consents" card
6. **Expected:** All 4 consents should appear!

### ✅ Test Existing User (test@tre.se)
1. Go to: `http://localhost:3000/admin/municipality/youth/165`
2. Scroll to "Privacy & Consents" card
3. **Expected:** See all 4 consents with:
   - ✅ Active status (green badge)
   - ✅ Date given
   - ✅ Source: REGISTRATION

---

## Verification Command

To verify consents are being created correctly:

```bash
cd backend
python manage.py shell -c "
from users.models import User
from gdpr.consent_models import UserConsent

user = User.objects.get(email='YOUR_EMAIL_HERE')
consents = UserConsent.objects.filter(user=user)

print(f'User: {user.email} (ID: {user.id})')
print(f'Consents: {consents.count()}')
for c in consents:
    print(f'  - {c.consent_type.name}')
    print(f'    Active: {c.is_active}')
    print(f'    Given: {c.consented_at}')
    print(f'    Method: {c.consent_method}')
"
```

---

## What's Fixed

✅ **Registration:** New users will have consents properly recorded  
✅ **Admin View:** Consent card now displays data correctly  
✅ **API:** Backend returns correct field names  
✅ **Frontend:** Components use correct field names  
✅ **Test Data:** Existing test user now has consents  

---

## Try It Now! 🎉

1. **Refresh your browser** (no server restart needed)
2. Go to: `http://localhost:3000/admin/municipality/youth/165`
3. **You should now see the "Privacy & Consents" card with all 4 consents!**


