# Fix Console Errors - Step by Step

## 🔴 Current Errors in Console

1. **"No user roles found for user: 0584357d-8f18-4730-85f1-b16d1b5ce456"**
   - **Fix:** User doesn't have role assigned in `user_roles` table

2. **406 errors on `profiles` table**
   - **Fix:** RLS policy issue or missing profile data

3. **CORS error for `get-exchange-rates`**
   - **Fix:** Has fallback, not critical

---

## ✅ STEP 1: Fix User Roles (5 minutes)

**Go to Supabase SQL Editor:**
https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new

**Run:** `FIX_USER_ROLES_ISSUE.sql`

This will:
1. Check if user exists
2. Check current roles (probably 0)
3. Determine what role user should have based on email
4. Assign the role automatically
5. Verify role was assigned

**After running, check the output:**
- Should see "Assigned role X to user..." message
- Final query should show the role assigned

---

## ✅ STEP 2: Fix 406 Error on Profiles (3 minutes)

**In same SQL Editor, run:** `FIX_406_PROFILES_ERROR.sql`

This will:
1. Check if profile exists
2. Create profile if missing
3. Ensure tenant_id is set
4. Verify/creates RLS policies

---

## ✅ STEP 3: Verify Everything Works (2 minutes)

**Run this verification query:**

```sql
-- Complete check of user, roles, and profile
SELECT 
    u.id,
    u.email,
    ur.role::text as role_name,
    ur.tenant_id,
    p.full_name,
    p.tenant_id as profile_tenant_id
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = '0584357d-8f18-4730-85f1-b16d1b5ce456';
```

**Expected Result:**
- Should show 1 row
- `role_name` should NOT be NULL (e.g., 'partner_admin')
- `tenant_id` should NOT be NULL
- `full_name` should have a value

---

## ✅ STEP 4: Refresh Browser (1 minute)

1. **Clear browser cache or hard refresh:** Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. **Log out completely**
3. **Log back in**
4. **Check console** - should see:
   - ✅ "Loaded user roles: 1 roles"
   - ✅ "Fetching permissions for roles: ['partner_admin']"
   - ✅ "Loaded permissions: X permissions"
   - ❌ NO MORE "No user roles found" errors

---

## ✅ STEP 5: Check Sidebar

**After refreshing:**
- Sidebar should now show more items
- Should see: Dashboard, Tickets, Work Orders, Photo Capture, etc.
- (If still only 3 items, permissions might not be mapped - run `MAP_BASE_ROLE_PERMISSIONS.sql`)

---

## 🎯 Expected Console Output After Fix

**Good output:**
```
✅ Loaded user roles: 1 roles
📋 User roles: ['partner_admin']
🔍 Fetching permissions for roles: ['partner_admin']
✅ Loaded permissions: 25 permissions
📋 Sample permissions: ['ticket.read', 'wo.read', 'so.view', ...]
```

**Bad output (if you still see this):**
```
⚠️ No user roles found for user: ...
```

---

## 🔍 If Still Not Working

**Check these:**

1. **Did SQL run successfully?**
   - Look for any ERROR messages in SQL output
   - If errors, tell me what they say

2. **Does user have role now?**
   - Run verification query from Step 3
   - If role_name is NULL, role assignment failed

3. **Are permissions mapped?**
   - Run: `CHECK_PARTNER_ADMIN_PERMISSIONS.sql`
   - Should show permission_count > 0

4. **Console still shows errors?**
   - Clear console and refresh
   - Check if errors are new or cached

---

## 📋 Quick Checklist

Run these in order:
- [ ] Run `FIX_USER_ROLES_ISSUE.sql` - Should assign role
- [ ] Run `FIX_406_PROFILES_ERROR.sql` - Should fix 406 errors
- [ ] Run verification query - Should show role assigned
- [ ] Hard refresh browser - Clear cache
- [ ] Check console - Should show "Loaded user roles: 1"
- [ ] Check sidebar - Should show more menu items

**After Step 1 & 2, the console errors should be GONE!** 🎯

