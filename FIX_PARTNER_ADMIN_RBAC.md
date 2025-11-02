# Fix Partner Admin RBAC Access

## Problem
The `partner_admin` role has no access because permissions are not properly mapped in the database. The sidebar requires specific permissions (like `ticket.read`, `wo.read`, etc.) but these haven't been assigned to the role.

## Solution

### Step 1: Run the Updated Permission Mapping
Run `MAP_BASE_ROLE_PERMISSIONS.sql` in your Supabase SQL Editor. This has been updated to include the `ticketing` category for `partner_admin`.

1. Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new
2. Copy the entire contents of `MAP_BASE_ROLE_PERMISSIONS.sql`
3. Run it
4. Verify it completes without errors

### Step 2: Verify Permissions Were Assigned
Run `CHECK_PARTNER_ADMIN_PERMISSIONS.sql` to verify:

1. The partner_admin role has permissions assigned
2. You should see multiple permissions listed (wo.read, ticket.read, so.view, etc.)
3. If you see "0" for "Mapped Permissions", the mapping didn't work

### Step 3: Refresh the Browser
After running the SQL:
1. Log out of the application
2. Clear browser cache or do a hard refresh (Ctrl+F5 / Cmd+Shift+R)
3. Log back in with a partner_admin account
4. The sidebar should now show:
   - Core: Dashboard, Tickets, Work Orders, Photo Capture, Service Orders
   - Operations: Pending Validation, Scheduler, Dispatch, Route Optimization, Inventory, Warranty & RMA
   - Financial: Quotes, Invoicing, Finance
   - Developer: Developer Portal (role-based access)

### Expected Permissions for Partner Admin
After running the SQL, `partner_admin` should have permissions from these categories:
- `ticketing` - For Tickets menu (ticket.read, ticket.create, etc.)
- `work_order` - For Work Orders menu (wo.read, wo.update, etc.)
- `service_orders` - For Service Orders menu (so.view, etc.)
- `attachments` - For Photo Capture menu (attachment.upload, etc.)
- `inventory` - For Inventory menu (inventory.view, etc.)
- `finance` - For Financial menus (invoice.view, quote.view, finance.view, etc.)
- `photos` - For photo-related operations
- `warranty` - For Warranty menu
- `sapos` - For Offer AI menu
- `overrides` - For override capabilities

### Troubleshooting

If permissions still don't show:

1. **Check if user has partner_admin role:**
   ```sql
   SELECT ur.*, p.email 
   FROM public.user_roles ur
   JOIN auth.users u ON u.id = ur.user_id
   LEFT JOIN public.profiles p ON p.id = ur.user_id
   WHERE ur.role = 'partner_admin';
   ```

2. **Check if permissions exist in database:**
   ```sql
   SELECT COUNT(*) FROM public.permissions 
   WHERE category IN ('ticketing', 'work_order');
   ```

3. **Manually check partner_admin permissions:**
   ```sql
   SELECT p.name, p.category
   FROM public.role_permissions rp
   JOIN public.permissions p ON p.id = rp.permission_id
   WHERE rp.role = 'partner_admin'::app_role
   ORDER BY p.category, p.name;
   ```

4. **Clear browser console and check for errors:**
   - Open browser DevTools (F12)
   - Check Console tab for any RBAC-related errors
   - Check Network tab to see if permissions are being fetched

### Test Account
Use one of these test accounts to verify:
- `partner.admin@servicepro.com` / `Partner123!`
- Or any partner admin account from your seeded accounts

