# Quick Fix Checklist - Execute in Order

## 🚨 DO THESE FIRST (Critical - 15 minutes)

### ✅ Step 1: Fix RBAC Permissions
- [ ] Open Supabase Dashboard: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new
- [ ] Open file: `MAP_BASE_ROLE_PERMISSIONS.sql`
- [ ] Copy ALL content
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait 10-20 seconds
- [ ] Should see "INSERT 0 X" messages (no errors)

### ✅ Step 2: Verify Permissions Were Mapped
- [ ] In same SQL Editor, open: `CHECK_PARTNER_ADMIN_PERMISSIONS.sql`
- [ ] Copy and run
- [ ] Check results - should show:
  - `partner_admin` role exists in user_roles
  - Multiple permissions mapped (wo.read, ticket.read, etc.)
  - If shows "0" permissions, something went wrong - check errors

### ✅ Step 3: Verify Database Tables Exist
Run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'subscription_plans',
    'tenant_subscriptions',
    'available_modules',
    'notifications',
    'notification_preferences'
  )
ORDER BY table_name;
```
- [ ] Should return 5 rows (all tables exist)
- [ ] If any missing, check migration files and run them

---

## 🔧 DO THESE NEXT (High Priority - 30 minutes)

### ✅ Step 4: Re-seed Test Accounts
- [ ] Close browser if `seed-accounts.html` is open
- [ ] Open: `seed-accounts.html` (double-click in file explorer)
- [ ] Click "Create All Test Accounts"
- [ ] Wait 2-3 minutes
- [ ] Should see "✅ Created: ~X accounts"

### ✅ Step 5: Test Login
- [ ] Go to: http://localhost:8088/auth (or your dev server URL)
- [ ] Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- [ ] Log in with: `partner.admin@servicepro.com` / `Partner123!`
- [ ] **Expected Result:**
  - ✅ Login succeeds
  - ✅ Redirects to dashboard
  - ✅ Sidebar shows: Dashboard, Tickets, Work Orders, Photo Capture, Service Orders, Inventory, etc.
  - ✅ Dashboard loads (even if showing "No data")

### ✅ Step 6: Test Other Roles
- [ ] Log out
- [ ] Log in with: `admin@techcorp.com` / `Admin123!`
- [ ] Verify sidebar shows admin-appropriate items
- [ ] Log out
- [ ] Log in with: `tech1@servicepro.com` / `Tech123!`
- [ ] Verify technician sidebar

---

## 🐛 IF SOMETHING IS STILL BROKEN

### Check Console Errors
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - ❌ Red errors about permissions
   - ❌ 404 errors for tables
   - ❌ CORS errors
4. Report specific error messages

### Check Network Tab
1. DevTools → Network tab
2. Filter by "Failed" (red)
3. Check what requests are failing:
   - Database queries (rest/v1/...)
   - Edge functions (functions/v1/...)

### Common Issues & Fixes

**Issue: "No permissions found for roles"**
- ✅ Re-run `MAP_BASE_ROLE_PERMISSIONS.sql`
- ✅ Check if role exists: `SELECT * FROM public.user_roles WHERE role = 'partner_admin';`

**Issue: "Table does not exist"**
- ✅ Run verification query from Step 3
- ✅ Create missing tables via migrations

**Issue: Sidebar still empty after permissions fix**
- ✅ Hard refresh browser (Ctrl+F5)
- ✅ Check browser console for RBAC errors
- ✅ Verify user has role assigned: `SELECT * FROM public.user_roles WHERE user_id = '<user-id>';`

**Issue: "Login failed: Invalid credentials"**
- ✅ Account may not be seeded
- ✅ Re-run `seed-accounts.html`
- ✅ Check: `SELECT email FROM auth.users WHERE email = 'partner.admin@servicepro.com';`

---

## ✅ SUCCESS CRITERIA

You're done when:
- [x] Partner admin can log in
- [x] Sidebar shows appropriate menu items
- [x] Dashboard loads (shows stats or "No data")
- [x] Can navigate to Work Orders, Tickets, etc.
- [x] No red errors in console about permissions
- [x] No 404 errors for database tables

---

## 📞 STUCK?

1. Check the detailed plan: `SYSTEM_FAILURES_AND_FIX_PLAN.md`
2. Verify each step completed successfully
3. Check console/network for specific error messages
4. Report specific error message + step where it failed

**You're 80% there - these fixes should resolve most issues!** 🎯

