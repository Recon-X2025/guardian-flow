# Troubleshooting RBAC Issues - Step by Step

## Current Issue
- Sidebar only shows: Dashboard, Help & Training, Settings
- Dashboard shows "0" for all metrics and "No data available"
- Partner admin account doesn't have access to Work Orders, Tickets, etc.

---

## Step 1: Run Diagnostics First 🔍

**Run this SQL to see what's actually in your database:**

1. Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new
2. Open: `DIAGNOSE_RBAC_ISSUE.sql`
3. Copy ALL content
4. Run it
5. **Tell me the results** - especially:
   - Does Query #2 show permissions for partner_admin? (should show a count > 0)
   - Does Query #4 show permissions exist? (should show total > 0)
   - Does Query #5 show role_permissions have data? (should show rows)

---

## Step 2: Check What SQL You've Actually Run ✅

**Have you run `MAP_BASE_ROLE_PERMISSIONS.sql`?**

If YES:
- When did you run it?
- Did you see any errors?
- Did you see "INSERT 0 X" messages?

If NO:
- **Run it now** (see Step 3)

---

## Step 3: Run Permission Mapping (If Not Done) 🚀

1. Open: `MAP_BASE_ROLE_PERMISSIONS.sql`
2. Copy ALL content
3. Paste into Supabase SQL Editor
4. Click "Run"
5. **Look for errors** - if you see:
   - "ERROR: ..." - Tell me the exact error
   - "INSERT 0 X" - This is GOOD (means it ran)
   - No output - Check if it actually ran

**After running, re-run Step 1 diagnostics to verify permissions were created**

---

## Step 4: Verify User Has Role Assigned 👤

**Check if your test account has the partner_admin role:**

```sql
SELECT 
    u.email,
    ur.role::text as role,
    ur.tenant_id
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%partner.admin%'
   OR u.email LIKE '%servicepro%';
```

**Expected Result:**
- Should show at least one row with `role = 'partner_admin'`
- If no rows: User doesn't have role assigned
- **Fix:** Re-run `seed-accounts.html` to assign roles

---

## Step 5: Check Browser Console for Errors 🖥️

1. Open your app in browser
2. Press F12 (DevTools)
3. Go to **Console** tab
4. Look for errors, especially:
   - "roles fetch error"
   - "No permissions found"
   - "Failed to fetch"
   - Any red errors

**Copy any errors you see and tell me**

---

## Step 6: Check Network Requests 🌐

1. DevTools → **Network** tab
2. Filter by: **Fetch/XHR**
3. Refresh the page
4. Look for:
   - `rest/v1/user_roles` - Should return 200
   - `rest/v1/role_permissions` - Should return 200
   - Any red/failed requests

**Tell me what status codes you see**

---

## Step 7: Force Refresh Permissions 🔄

**Sometimes the frontend caches old data:**

1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. Or: Clear browser cache
3. Log out completely
4. Log back in
5. Check sidebar again

---

## Common Issues & Fixes

### Issue A: "No permissions found" in console
**Cause:** Permissions not mapped in database  
**Fix:** Run `MAP_BASE_ROLE_PERMISSIONS.sql`

### Issue B: "User has no roles" 
**Cause:** User account doesn't have role assigned  
**Fix:** Re-run `seed-accounts.html`

### Issue C: "Table does not exist"
**Cause:** Missing database tables  
**Fix:** Run missing migration files

### Issue D: Permissions exist but sidebar still empty
**Cause:** Frontend not fetching correctly or enum type mismatch  
**Fix:** Check browser console for RBAC errors

---

## Quick Test Script

**Run this to test everything at once:**

```sql
-- Test 1: Check permissions exist
SELECT COUNT(*) as total_permissions FROM public.permissions;

-- Test 2: Check partner_admin permissions
SELECT COUNT(*) as partner_admin_permissions 
FROM public.role_permissions 
WHERE role = 'partner_admin'::app_role;

-- Test 3: Check user has role
SELECT COUNT(*) as user_with_role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'partner.admin@servicepro.com'
  AND ur.role = 'partner_admin'::app_role;

-- Test 4: List sample permissions for partner_admin
SELECT p.name, p.category
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'partner_admin'::app_role
ORDER BY p.category, p.name
LIMIT 10;
```

**Expected Results:**
- Test 1: Should be > 0 (e.g., 100+)
- Test 2: Should be > 0 (e.g., 20+)
- Test 3: Should be 1 (user has role)
- Test 4: Should show permission names like 'ticket.read', 'wo.read', etc.

---

## What to Report Back

Please tell me:
1. ✅ Results from `DIAGNOSE_RBAC_ISSUE.sql` (especially Query #2 permission count)
2. ✅ Have you run `MAP_BASE_ROLE_PERMISSIONS.sql`? When? Any errors?
3. ✅ Browser console errors (if any)
4. ✅ Network tab - what status codes for user_roles and role_permissions?
5. ✅ Which test account you're using to log in

This will help me pinpoint the exact issue! 🎯

