# Technician Access Denied - Diagnostic Guide

## Issue
Technician role getting "Access Denied" when trying to access `/work-orders` route.

## Root Cause Analysis

### Route Protection
- **Route**: `/work-orders`
- **Required Permission**: `["wo.read"]`
- **Component**: `RoleGuard` with `permissions={["wo.read"]}`

### Expected Technician Permissions
According to `MAP_BASE_ROLE_PERMISSIONS.sql`, technician should have:
- ✅ `wo.read` - **REQUIRED for /work-orders route**
- ✅ `wo.update`
- ✅ `wo.complete`
- ✅ `inventory.view`
- ✅ `attachment.upload`
- ✅ `attachment.view`
- ✅ `photo.validate`
- ✅ `so.view`
- ✅ `so.sign`

### Potential Issues

#### 1. Permission Not Mapped in Database
**Check**: Run this SQL in Supabase:
```sql
SELECT 
    p.name,
    rp.role
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
AND p.name = 'wo.read';
```

**If returns no rows**: Permission is not mapped. Run `FIX_TECHNICIAN_ACCESS.sql`

#### 2. Technician Role Not Assigned to User
**Check**: Run this SQL:
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

**If returns no rows**: User doesn't have technician role assigned.

#### 3. RBAC Context Not Loading Permissions
**Check**: Open browser console after login and look for:
- `✅ Loaded user roles: X roles`
- `✅ Loaded permissions: X permissions`
- `📋 Sample permissions: [...]`

**If permissions count is 0 or doesn't include `wo.read`**: RBAC context is not loading correctly.

#### 4. Permission Check Logic Issue
The `RoleGuard` component uses:
```typescript
hasPermission("wo.read")
```

This checks if `permissions` array includes `"wo.read"`.

## Fixes

### Immediate Fix
Run `FIX_TECHNICIAN_ACCESS.sql` in Supabase SQL Editor to ensure technician role has `wo.read` permission.

### Verify Fix
1. Log in as technician account (e.g., `tech.mobile@techcorp.com`)
2. Check browser console for:
   - `✅ Loaded permissions: X permissions`
   - `📋 Sample permissions: ['wo.read', 'wo.update', ...]`
3. Check if sidebar shows "Work Orders" menu item
4. Navigate to `/work-orders` - should not show "Access Denied"

### If Still Not Working
1. Check if `MAP_BASE_ROLE_PERMISSIONS.sql` has been run
2. Verify user actually has `technician` role in `user_roles` table
3. Check RBAC context is loading after login (may need to refresh roles)
4. Verify permission name is exactly `"wo.read"` (case-sensitive)

## Test Accounts
- `tech.mobile@techcorp.com` / `Tech123!` - technician role
- `tech.photos@techcorp.com` / `Tech123!` - technician role
- `tech.complete@techcorp.com` / `Tech123!` - technician role

All should have access to `/work-orders` after fix is applied.

