# Immediate Fix for Technician Access to Work Orders

## Problem
Technician role is getting "Access Denied" when trying to access `/work-orders` route.

## Root Cause
The `/work-orders` route requires `wo.read` permission. The technician role may not have this permission mapped in the database.

## Immediate Fix Steps

### Step 1: Run SQL Fix in Supabase
1. Open Supabase Dashboard → SQL Editor
2. Run `COMPREHENSIVE_ROLE_FIXES.sql` (or at minimum, the technician section)
3. This ensures `technician` role has `wo.read` permission

### Step 2: Verify Permission is Mapped
Run this query in Supabase SQL Editor:
```sql
SELECT 
    p.name,
    rp.role
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
AND p.name = 'wo.read';
```

**Expected Result**: Should return 1 row with `wo.read` permission

### Step 3: Verify User Has Technician Role
Run this query to check if the technician user has the role:
```sql
SELECT 
    u.email,
    ur.role,
    ur.tenant_id
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%tech%'
AND ur.role = 'technician'::app_role;
```

**Expected Result**: Should return rows for technician test accounts

### Step 4: Clear Browser Cache & Test
1. Clear browser cache or open in incognito
2. Log in as technician: `tech.mobile@techcorp.com` / `Tech123!`
3. Check browser console for:
   - `✅ Loaded permissions: X permissions`
   - Look for `wo.read` in the permissions list
4. Check sidebar - should show "Work Orders" menu item
5. Navigate to `/work-orders` - should NOT show "Access Denied"

## If Still Not Working

### Check Browser Console
After login, look for these logs:
- `[AppSidebar] RBAC State:` - Shows permission count and whether `hasWoRead: true`
- `[AppSidebar] Access denied for "Work Orders"` - Shows which permissions are missing

### Check RBAC Context Loading
Look for:
- `✅ Loaded user roles: X roles`
- `✅ Loaded permissions: X permissions`
- If permissions count is 0, RBAC context is not loading correctly

### Manual Permission Check
In browser console (after login), run:
```javascript
// Get RBAC context
const rbac = useRBAC();
console.log('Permissions:', rbac.permissions);
console.log('Has wo.read:', rbac.hasPermission('wo.read'));
```

## Test Accounts
Use these accounts to test technician access:
- `tech.mobile@techcorp.com` / `Tech123!`
- `tech.photos@techcorp.com` / `Tech123!`
- `tech.complete@techcorp.com` / `Tech123!`

All should have access to `/work-orders` after the fix.

