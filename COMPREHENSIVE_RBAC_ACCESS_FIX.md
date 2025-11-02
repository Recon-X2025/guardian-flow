# Comprehensive RBAC Access Fix

## Problem
Users are experiencing "Access Denied" errors across multiple modules and roles. The root cause is that many routes require `admin.config` permission, but only `sys_admin` has this permission.

## Root Cause Analysis

### Routes Requiring `admin.config`:
1. `/marketplace` - Requires `admin.config`
2. `/compliance` - Requires `admin.config`
3. `/system-health` - Requires `admin.config`
4. `/analytics-integrations` - Requires `admin.config`
5. `/developer-console` - Requires `admin.config`
6. And many more...

### Current Permission Mappings:
- **sys_admin**: Has ALL permissions (including `admin.config`) ✅
- **tenant_admin**: Has all permissions EXCEPT 'admin' category ❌
- **partner_admin**: Only has specific categories (work_order, inventory, etc.) ❌
- **ops_manager**: Only has operational categories ❌

## Solution

### 1. Run the Fix Script
Execute `FIX_ACCESS_DENIED_PERMISSIONS.sql` in your Supabase SQL Editor to:
- Add `admin.config` to `tenant_admin`, `partner_admin`, and `ops_manager`
- Add marketplace/developer category permissions where appropriate
- Ensure all roles have the permissions they need for their intended functions

### 2. Routes That May Need Role-Based Checks Instead

Some routes might be better protected by role checks rather than permission checks:

#### `/marketplace`
- **Current**: Requires `admin.config` permission
- **Recommended**: Check for `partner_admin` OR `sys_admin` OR `tenant_admin` role
- **Reason**: Marketplace is primarily for partners, but admins should also access it

#### `/developer-portal`
- **Current**: Uses role checks (`sys_admin`, `tenant_admin`, `partner_admin`)
- **Status**: ✅ Already correct

#### `/marketplace-management`
- **Current**: Requires `sys_admin` role
- **Status**: ✅ Correct (only system admins manage the marketplace itself)

## Steps to Fix

1. **Run the SQL script**:
   ```sql
   -- Copy and paste FIX_ACCESS_DENIED_PERMISSIONS.sql into Supabase SQL Editor
   ```

2. **Verify permissions are assigned**:
   ```sql
   -- Check if admin.config is now available to the roles
   SELECT rp.role::text, p.name 
   FROM role_permissions rp
   JOIN permissions p ON p.id = rp.permission_id
   WHERE p.name = 'admin.config';
   ```

3. **Test access**:
   - Login as `partner_admin` → Try accessing `/marketplace`
   - Login as `tenant_admin` → Try accessing `/compliance`
   - Login as `ops_manager` → Try accessing operational routes

4. **If issues persist**, check:
   - User's roles in `user_roles` table
   - RBAC context is loading permissions correctly (check browser console)
   - Permission names match exactly (case-sensitive)

## Alternative: Role-Based Route Protection

If permission-based checks are too restrictive, consider updating routes to use role-based checks:

```tsx
// Instead of:
<RoleGuard permissions={["admin.config"]}>

// Use:
<RoleGuard roles={["sys_admin", "tenant_admin", "partner_admin"]}>
```

This provides more flexibility but requires updating each route individually.

## Verification Checklist

- [ ] `admin.config` permission assigned to `tenant_admin`
- [ ] `admin.config` permission assigned to `partner_admin`
- [ ] `admin.config` permission assigned to `ops_manager`
- [ ] Marketplace permissions assigned to `partner_admin`
- [ ] Users can access `/marketplace` as `partner_admin`
- [ ] Users can access module routes according to their roles
- [ ] No console errors about missing permissions

