# Debug RBAC Permission Loading

## Problem
Permissions are correctly mapped in database (technician has `wo.read`), but user still gets "Access Denied".

## Possible Causes

### 1. User Doesn't Have Technician Role Assigned
**Check**: Run `VERIFY_USER_ROLE_AND_PERMISSIONS.sql` to verify the user has `technician` role in `user_roles` table.

### 2. RBAC Context Not Loading Permissions
**Symptoms**:
- Browser console shows `✅ Loaded permissions: 0 permissions`
- Or permissions list doesn't include `wo.read`

**Debug Steps**:
1. Open browser console (F12)
2. Log in as technician
3. Look for these logs:
   ```
   ✅ Loaded user roles: X roles
   📋 User roles: ['technician']
   🔍 Fetching permissions for roles: ['technician']
   ✅ Loaded permissions: X permissions
   📋 Sample permissions: ['wo.read', 'wo.update', ...]
   ```

4. If permissions count is 0, check for errors:
   ```
   ❌ Permissions fetch error: ...
   ```

### 3. RBAC Context Not Refreshing After Login
**Symptoms**: Permissions loaded on initial page load but not after login

**Fix**: Ensure `refreshRoles()` is called after login in auth pages

### 4. Permission Name Mismatch
**Check**: Verify permission is exactly `"wo.read"` (not `"work_order.read"` or `"wo.read"` with different casing)

### 5. Caching Issue
**Fix**: 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check if session token is valid

## Diagnostic Queries

### Check User Role Assignment
```sql
SELECT 
    u.email,
    ur.role,
    ur.tenant_id
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'tech.mobile@techcorp.com';
```

**Expected**: Should return row with `role = 'technician'`

### Check Role Has Permission
```sql
SELECT 
    rp.role,
    p.name
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
AND p.name = 'wo.read';
```

**Expected**: Should return 1 row

### Check User's Actual Permissions (via Role)
```sql
SELECT 
    u.email,
    ur.role,
    p.name as permission_name
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.role_permissions rp ON rp.role = ur.role
JOIN public.permissions p ON p.id = rp.permission_id
WHERE u.email = 'tech.mobile@techcorp.com'
AND p.name = 'wo.read';
```

**Expected**: Should return row with `permission_name = 'wo.read'`

## Browser Console Debugging

After login, run this in browser console:

```javascript
// Check RBAC context state
const rbacContext = /* Get from React DevTools or add console.log in RBACContext */;
console.log('Roles:', rbacContext.roles);
console.log('Permissions:', rbacContext.permissions);
console.log('Has wo.read:', rbacContext.hasPermission('wo.read'));
console.log('Loading:', rbacContext.loading);
```

## Quick Fixes

### If User Missing Role
Run this SQL to assign role:
```sql
-- Get user ID first
SELECT id FROM auth.users WHERE email = 'tech.mobile@techcorp.com';

-- Then assign role (replace USER_ID and TENANT_ID)
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('USER_ID', 'technician'::app_role, 'TENANT_ID' OR NULL)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
```

### If Permissions Not Loading
1. Check Supabase RLS policies allow reading `role_permissions` table
2. Verify user is authenticated (has valid session)
3. Check browser network tab for failed API calls

