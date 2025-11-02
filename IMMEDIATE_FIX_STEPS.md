# IMMEDIATE FIX STEPS - Do This Now

## 🚨 The Problem
Sidebar only shows 3 items because permissions aren't loading. This could be:
1. Permissions not mapped in database (need to run SQL)
2. Permissions query failing silently (frontend issue)
3. User doesn't have role assigned

---

## ✅ STEP 1: Add Debug Logging (JUST DONE)
**Status:** ✅ I just updated `RBACContext.tsx` with better error logging

**What this does:**
- Now you'll see console messages showing:
  - ✅ How many roles were loaded
  - ✅ Which roles
  - ✅ How many permissions were loaded
  - ❌ Any errors with details

**Action:** Restart your dev server if running, then check browser console

---

## ✅ STEP 2: Run Diagnostics (5 minutes)

**Go to Supabase SQL Editor:**
https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new

**Run this ONE query first to check the basics:**

```sql
-- Quick Check: Does partner_admin have permissions?
SELECT 
    'Permissions mapped' as check_type,
    COUNT(*) as count
FROM public.role_permissions 
WHERE role = 'partner_admin'::app_role;
```

**Expected Result:**
- If count = 0 → Permissions NOT mapped (go to Step 3)
- If count > 0 → Permissions ARE mapped (go to Step 4)

**Tell me the result!**

---

## ✅ STEP 3: Map Permissions (IF Step 2 showed 0)

**If the count was 0, run this:**

1. Open: `MAP_BASE_ROLE_PERMISSIONS.sql`
2. Copy ALL content
3. Paste into SQL Editor
4. Click "Run"
5. **Check for errors** - if you see "ERROR", tell me what it says
6. Should see "INSERT 0 X" messages

**Then go back to Step 2 and verify count > 0**

---

## ✅ STEP 4: Check User Has Role (5 minutes)

**Run this query:**

```sql
-- Check if user has partner_admin role
SELECT 
    u.email,
    ur.role::text as role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%partner%'
ORDER BY u.email;
```

**Expected:**
- Should show at least one row with `role = 'partner_admin'`
- If no rows → User doesn't have role
- **Fix:** Run `seed-accounts.html` again

---

## ✅ STEP 5: Check Browser Console (2 minutes)

**After restarting dev server and refreshing:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console (trash icon)
4. Refresh page
5. Log in with partner admin account
6. **Look for these messages:**

**Good signs:**
- ✅ "Loaded user roles: 1 roles"
- ✅ "Loaded permissions: 20+ permissions"
- ✅ "Sample permissions: [ticket.read, wo.read, ...]"

**Bad signs:**
- ❌ "No user roles found"
- ❌ "Permissions fetch error"
- ❌ "0 permissions"

**Tell me what you see!**

---

## ✅ STEP 6: Test Permissions Query Directly

**Run this in SQL Editor to test what frontend does:**

```sql
-- This simulates what the frontend query does
SELECT 
    rp.role::text as role,
    p.name as permission_name,
    p.category
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role::text = 'partner_admin'
ORDER BY p.category, p.name
LIMIT 20;
```

**Expected:**
- Should return 20+ rows
- Should show permissions like: ticket.read, wo.read, so.view, etc.

**If this returns 0 rows:**
- Permissions not mapped → Run `MAP_BASE_ROLE_PERMISSIONS.sql`

**If this returns rows but frontend shows 0:**
- Query issue in frontend → Check console for errors

---

## 🎯 Most Likely Issue

Based on the symptoms, **most likely**:
1. ❌ Permissions not mapped in database (Step 2 will confirm)
2. ❌ User doesn't have role assigned (Step 4 will confirm)

**After running diagnostics, tell me:**
1. What does Step 2 query return? (count number)
2. What does Step 4 query return? (any rows?)
3. What does browser console show? (the new debug messages)
4. What does Step 6 query return? (any rows?)

---

## ⚡ Quick Win Checklist

Run these in order, tell me results:

- [ ] Step 2: Permission count = ?
- [ ] Step 4: User has role? Yes/No
- [ ] Step 5: Console shows what?
- [ ] Step 6: Query returns rows? Yes/No

**Once I know these results, I can give you the exact fix!** 🎯

