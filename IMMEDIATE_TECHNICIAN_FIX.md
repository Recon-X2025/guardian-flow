# Immediate Fix for Technician Access Issue

## Problem Confirmed
✅ Permissions ARE correctly mapped in database (technician has `wo.read`)  
❌ User account likely doesn't have `technician` role assigned OR RLS policy blocking query

## Quick Diagnostic

### Step 1: Check if User Has Role
Run this in Supabase SQL Editor:
```sql
SELECT 
    u.email,
    ur.role,
    ur.tenant_id
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%tech%@techcorp.com';
```

**Expected**: Should return rows with `role = 'technician'`  
**If empty**: User doesn't have role assigned - run `FIX_ALL_TECHNICIAN_ACCOUNTS.sql`

### Step 2: Check RLS Policy
Run this:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'role_permissions';
```

**Expected**: Should have a SELECT policy for authenticated users  
**If empty**: Run `CHECK_RLS_ROLE_PERMISSIONS.sql`

## Immediate Fix

### Option A: Fix All Technician Accounts (Recommended)
1. Run `FIX_ALL_TECHNICIAN_ACCOUNTS.sql` in Supabase SQL Editor
2. This will:
   - Ensure all technician test accounts have profiles
   - Assign `technician` role to all of them
   - Verify they can access `/work-orders`

### Option B: Check and Fix RLS
1. Run `CHECK_RLS_ROLE_PERMISSIONS.sql` to ensure RLS policy allows reading `role_permissions`

### Option C: Verify Specific User
1. Run `DIAGNOSE_TECHNICIAN_USER.sql` to check specific technician account

## After Running Fix

1. **Clear browser cache** or open incognito
2. **Log in** as technician: `tech.mobile@techcorp.com` / `Tech123!`
3. **Check browser console** for:
   ```
   ✅ Loaded user roles: 1 roles
   📋 User roles: ['technician']
   🔍 Fetching permissions for roles: ['technician']
   ✅ Loaded permissions: 8 permissions
   📋 Sample permissions: ['wo.read', 'wo.update', ...]
   ```
4. **Check sidebar** - should show "Work Orders" menu item
5. **Navigate to `/work-orders`** - should NOT show "Access Denied"

## If Still Not Working

Check browser console for:
- `❌ Roles fetch error:` - User might not exist or RLS blocking
- `⚠️ No user roles found for user:` - User doesn't have role assigned
- `❌ Permissions fetch error:` - RLS policy blocking role_permissions query
- `[AppSidebar] Access denied for "Work Orders"` - Shows which permissions are missing

