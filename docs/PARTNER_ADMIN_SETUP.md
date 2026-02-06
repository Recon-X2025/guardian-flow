# Partner Admin Setup Guide

## Overview
The system now supports **4 distinct partner organizations**, each with isolated data access. Partner admins can only view finance data (invoices, work orders, penalties) for engineers assigned to their specific partner organization.

## Partner Organizations

### 1. ServicePro Partners
- **Tenant Slug**: `servicepro`
- **Region**: North
- **Contract Type**: Premium
- **Admin Email**: `admin@servicepro.com`
- **Password**: `Partner123!`
- **Engineers**: 40 (engineer1@servicepro.com through engineer40@servicepro.com)

### 2. TechField Solutions
- **Tenant Slug**: `techfield`
- **Region**: South
- **Contract Type**: Standard
- **Admin Email**: `admin@techfield.com`
- **Password**: `Partner123!`
- **Engineers**: 40 (engineer1@techfield.com through engineer40@techfield.com)

### 3. RepairHub Network
- **Tenant Slug**: `repairhub`
- **Region**: East
- **Contract Type**: Premium
- **Admin Email**: `admin@repairhub.com`
- **Password**: `Partner123!`
- **Engineers**: 40 (engineer1@repairhub.com through engineer40@repairhub.com)

### 4. FixIt Partners
- **Tenant Slug**: `fixit`
- **Region**: West
- **Contract Type**: Standard
- **Admin Email**: `admin@fixit.com`
- **Password**: `Partner123!`
- **Engineers**: 40 (engineer1@fixit.com through engineer40@fixit.com)

---

## Tenant Isolation Enforcement

### Database Level (Tenant Isolation Policies)
Partner admins have restricted access via application-level tenant isolation policies:

1. **Invoices**: Can only view invoices for work done by their tenant's engineers
2. **Work Orders**: Can only view work orders assigned to their tenant's engineers
3. **Penalties**: Can only view penalties applied to their tenant's engineers
4. **Audit Logs**: Can only view audit logs for their tenant

### API Level
All Express.js route handlers enforce tenant isolation:
- Partner admins' API calls automatically filter by `tenant_id`
- Cross-tenant data leaks are prevented at the database query level
- Unauthorized access attempts are logged in audit trails

---

## Creating Accounts

### Using the Seed Function
Click the "Seed Test Accounts" button on the auth page to create all 4 partner admins + 160 engineers (40 per partner) automatically.

**What gets created:**
- 4 partner admin accounts
- 160 engineer accounts (40 per partner)
- All accounts are linked to their respective tenant organizations
- Proper roles and permissions are automatically assigned

### Manual Account Creation (Optional)
If you need to add individual accounts:

```sql
-- 1. Create user in auth (via Admin Dashboard or API)
-- 2. Link to tenant in profiles table
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'servicepro')
WHERE id = '<user_id>';

-- 3. Assign partner_admin role
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES (
  '<user_id>',
  'partner_admin',
  (SELECT id FROM public.tenants WHERE slug = 'servicepro')
);
```

---

## Testing Partner Isolation

### Test Scenario 1: Finance View Isolation
1. Log in as `admin@servicepro.com`
2. Navigate to Finance page
3. **Expected**: Only see invoices/work orders for ServicePro's 40 engineers
4. **Should NOT see**: Any data from TechField, RepairHub, or FixIt engineers

### Test Scenario 2: Work Order Access
1. Log in as `admin@techfield.com`
2. Navigate to Work Orders page
3. **Expected**: Only see work orders assigned to TechField's engineers
4. Try to access a work order from another partner (direct URL navigation)
5. **Expected**: Access Denied or 403 error

### Test Scenario 3: Penalty Applications
1. Log in as `admin@repairhub.com`
2. Navigate to Penalties page
3. **Expected**: Only see penalties for RepairHub's engineers
4. **Should NOT see**: Penalties from other partners

### Test Scenario 4: Cross-Partner API Call
1. Log in as `admin@fixit.com`
2. Use browser DevTools Network tab
3. Attempt to modify API request to access another partner's data
4. **Expected**: 403 Forbidden with correlation ID in response

---

## Finance Dashboard for Partner Admins

When a partner admin logs in, their Finance view shows:

### Key Metrics (Filtered by Tenant)
- Total Revenue (from their engineers only)
- Outstanding Invoices
- Penalties Applied to their engineers
- Work Orders Completed by their engineers

### Data Tables
All tables automatically filter to show only:
- Invoices generated from work done by their engineers
- Work orders assigned to their engineers
- Penalty applications against their engineers
- Audit logs for actions within their tenant

### Export & Reports
When partner admins export data or generate reports, the export contains **only their tenant's data**.

---

## Security Architecture

### Multi-Tenant Data Model
```
Tenant (Partner Org)
  ├── Partner Admin (1 per tenant)
  ├── Engineers (40 per tenant)
  └── Data (invoices, work orders, penalties)
       └── Filtered by engineer's tenant_id
```

### Access Control Flow
1. User authenticates → JWT issued with `tenant_id` claim
2. Frontend loads → `useRBAC()` hook fetches user's roles + tenant
3. API call made → Edge function validates `tenant_id` from JWT
4. Database query → Tenant isolation policy enforces tenant filter
5. Response returned → Only tenant-scoped data

### Audit Trail
All partner admin actions are logged with:
- `actor_id`: Partner admin user ID
- `actor_role`: `partner_admin`
- `tenant_id`: Partner organization ID
- `action`: What operation was performed
- `resource_type` & `resource_id`: What was accessed/modified
- `correlation_id`: For request tracing

---

## Troubleshooting

### Partner Admin Can't See Any Data
**Possible Causes:**
1. `tenant_id` not set in profiles table
2. No engineers assigned to the partner tenant
3. No work orders created for the partner's engineers

**Solution:**
```sql
-- Verify tenant assignment
SELECT p.email, p.tenant_id, t.name
FROM profiles p
LEFT JOIN tenants t ON t.id = p.tenant_id
WHERE p.email = 'admin@servicepro.com';

-- Count engineers in tenant
SELECT COUNT(*)
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE slug = 'servicepro')
AND ur.role = 'technician';
```

### Partner Admin Sees Data from Other Partners
**This is a critical security issue!**

**Immediate Action:**
1. Check tenant isolation policies are enabled via the admin dashboard
2. Review and reapply tenant isolation policies
3. Check audit logs for unauthorized access
4. Rotate credentials if data breach suspected

### Engineers Not Showing Up
**Solution:**
Run the seed function again - it's idempotent and will:
- Skip existing accounts
- Assign missing roles
- Update tenant associations

---

## Production Considerations

### Before Going Live:
1. **Change all default passwords** - especially partner admin passwords
2. **Enable MFA** for partner admin accounts
3. **Review tenant isolation policies** - ensure no gaps in tenant isolation
4. **Test cross-tenant access** - attempt to breach isolation from multiple angles
5. **Set up monitoring** - alert on 403 errors and unauthorized access attempts
6. **Document partner onboarding** - process for adding new partners
7. **Backup strategy** - ensure tenant data can be restored independently

### Adding a New Partner
1. Insert new tenant record in `tenants` table
2. Create partner admin account via seed function or manually
3. Create engineer accounts and link to tenant
4. Verify isolation with test scenarios above
5. Provide credentials securely to partner admin

---

## Support

For issues with partner admin access or tenant isolation:
1. Check audit logs: `SELECT * FROM audit_logs WHERE tenant_id = '<tenant_id>' ORDER BY created_at DESC;`
2. Review tenant isolation policies: inspect collection in mongosh
3. Test with multiple partner accounts simultaneously
4. Contact system administrator if cross-tenant data leak is suspected
