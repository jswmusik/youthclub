# 🔧 GDPR Features - Bug Fixes

## Fixed Issues

### 1. ✅ Missing Translation Error
**Error:** `MISSING_MESSAGE: Could not resolve 'privacy' in messages for locale 'sv'`

**Fix:** Added proper `privacy` namespace to translation files

**Files Changed:**
- `frontend/messages/en.json`
- `frontend/messages/sv.json`

**Added:**
```json
"privacy": {
  "title": "Privacy & Your Data",
  "description": "Manage your privacy settings, consents, and data rights (GDPR)"
}
```

---

### 2. ✅ Admin Consent Card 404 Error
**Error:** `Request failed with status code 404` when viewing user consents in admin

**Root Cause:** 
- Wrong API endpoint (`/gdpr/user-consents/` instead of `/gdpr/my-consents/`)
- Backend didn't support admins viewing other users' consents

**Fix:**

#### Backend (`backend/gdpr/consent_views.py`):
Updated `UserConsentViewSet.get_queryset()` to allow admins to query other users' consents:

```python
def get_queryset(self):
    """
    Users can see their own consents.
    Admins can view any user's consents by providing ?user=<user_id>
    """
    user = self.request.user
    
    # If admin and user parameter provided, show that user's consents
    if user.is_staff or user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
        user_id = self.request.query_params.get('user')
        if user_id:
            return UserConsent.objects.filter(
                user_id=user_id
            ).select_related('consent_type', 'user').prefetch_related('logs')
    
    # Otherwise show only own consents
    return UserConsent.objects.filter(
        user=user
    ).select_related('consent_type').prefetch_related('logs')
```

#### Frontend:
Fixed API endpoint in both files:
- `frontend/app/components/YouthDetailView.tsx`
- `frontend/app/components/GuardianDetailView.tsx`

**Changed from:**
```typescript
const consentsRes = await api.get(`/gdpr/user-consents/?user=${userId}`);
```

**To:**
```typescript
const consentsRes = await api.get(`/gdpr/my-consents/?user=${userId}`);
```

---

### 3. ⚠️ Club/Municipality Data 404 (Investigating)
**Error:** `Request failed with status code 404` when fetching club data

**What This Affects:**
- Municipality and club policies not showing in consent modals

**Current Status:**
- Added better error logging to diagnose issue
- Made the error non-blocking (consent modal still works without this data)
- Need to verify:
  - Does the user have a valid `preferred_club` set?
  - Does the club exist in the database?
  - Does the club have `club_policies` filled in?
  - Does the municipality have `terms_and_conditions` filled in?

**Testing Steps:**
1. Open browser console
2. Go to Privacy & Data page
3. Check console logs for:
   - "Club data loaded: {data}"
   - "Municipality data loaded: {data}"
   - Any 404 errors with details

---

## Testing Checklist

### ✅ Admin Consent Card
- [ ] Go to: `http://localhost:3000/admin/municipality/youth/165`
- [ ] Scroll to "Privacy & Consents" card
- [ ] Should see 4 consents (Terms, Privacy, Data Processing, Age Verification)
- [ ] Each should show "Active" status
- [ ] Each should show timestamp
- [ ] Each should show "Source: REGISTRATION"

### ✅ Privacy Dashboard
- [ ] Go to: `http://localhost:3000/dashboard/youth/privacy`
- [ ] Should see "Privacy & Your Data" title (translated)
- [ ] Should see "Your Consents" section
- [ ] Click any consent → Modal opens
- [ ] Modal shows consent text
- [ ] If Terms of Service: check if municipality/club policies appear

### 🔍 Debugging Club/Municipality Data
If you don't see municipality/club policies in the modal:

1. **Open Browser Console** (F12)
2. **Go to Privacy Dashboard**
3. **Check logs:**
   - ✅ "Club data loaded: {...}" = Club data loaded successfully
   - ✅ "Municipality data loaded: {...}" = Municipality data loaded successfully
   - ❌ "Failed to fetch club/municipality data" = API call failed

4. **If API call succeeds but no policies show:**
   - Check if `club_policies` field is filled in database
   - Check if `terms_and_conditions` field is filled in database
   - Go to Django admin and add content to these fields

---

## API Endpoints Summary

### For Users:
- `GET /gdpr/my-consents/` → Returns own consents
- `GET /gdpr/consent-types/` → Returns available consent types
- `POST /gdpr/my-consents/give/` → Give consent
- `POST /gdpr/my-consents/withdraw/` → Withdraw consent

### For Admins:
- `GET /gdpr/my-consents/?user=<user_id>` → Returns specified user's consents
- Requires: `is_staff=True` OR role in `[SUPER_ADMIN, MUNICIPALITY_ADMIN, CLUB_ADMIN]`

### Other Endpoints:
- `GET /clubs/<club_id>/` → Get club details (public)
- `GET /municipalities/<muni_id>/` → Get municipality details (public)

---

## Next Steps

If you still see the club/municipality 404 error:

1. **Check the console logs** - they now show more details
2. **Verify user has preferred_club** - check in database
3. **Verify club exists** - check if the club ID is valid
4. **Add test data** - add `club_policies` and `terms_and_conditions` in Django admin

Let me know what the console logs show!


