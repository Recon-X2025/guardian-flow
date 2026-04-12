# RBAC Action-Level Permissions Guide

**Version:** 7.0 | **Date:** April 2026

## Overview

Guardian Flow implements Role-Based Access Control (RBAC) at the **button and action level**, not just page visibility. Backend middleware enforces permissions on every API request. Frontend components hide or disable actions based on the current user's role.

## Roles

| Role | Scope |
|------|-------|
| `sys_admin` | All modules, all tenants |
| `tenant_admin` | All modules, own tenant only |
| `ops_manager` | View-only across operations |
| `dispatcher` | Create/manage assignments; view-only on finance |
| `technician` | Own assigned work orders only |
| `finance_manager` | Full finance; read-only operations |
| `fraud_investigator` | Fraud/compliance; read-only operations |
| `support_agent` | Tickets, customer portal |
| `partner_admin` | Tenant-scoped tickets, work orders, invoices |
| `ml_ops` | ML studio, model monitoring |
| `customer` | Self-service portal only |

## Permission Types

Each role has 5 permission types per resource:

| Permission | Description |
|------------|-------------|
| `view` | Can read / list the resource |
| `create` | Can create new records |
| `edit` | Can modify existing records |
| `delete` | Can remove records |
| `execute` | Can perform special actions (e.g., release to field, generate SO) |

## Role Permission Matrix

### Operations Manager — view-only across all operational modules

| Resource | View | Create | Edit | Delete | Execute |
|----------|:----:|:------:|:----:|:------:|:-------:|
| Work Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dispatch | ✅ | ❌ | ❌ | ❌ | ❌ |
| Technicians | ✅ | ❌ | ❌ | ❌ | ❌ |
| Customers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ✅ | ❌ | ❌ | ❌ | ❌ |

All action buttons are hidden; "View Only" badges and alert banners are shown instead.

### Dispatcher — create and manage assignments

| Resource | View | Create | Edit | Delete | Execute |
|----------|:----:|:------:|:----:|:------:|:-------:|
| Work Orders | ✅ | ✅ | ✅ | ❌ | ✅ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dispatch | ✅ | ✅ | ✅ | ❌ | ✅ |
| Technicians | ✅ | ❌ | ❌ | ❌ | ❌ |

Can assign work, release to field, check technicians in/out. **Cannot generate Service Orders.**

### Technician — execute assigned work

| Resource | View | Create | Edit | Delete | Execute |
|----------|:----:|:------:|:----:|:------:|:-------:|
| Work Orders | ✅ | ❌ | ✅ | ❌ | ✅ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dispatch | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ |

Can update their own work orders and complete tasks. Cannot create work orders or generate documents.

### Finance Manager — financial operations only

| Resource | View | Create | Edit | Delete | Execute |
|----------|:----:|:------:|:----:|:------:|:-------:|
| Work Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ✅ | ✅ | ✅ | ❌ | ✅ |
| Customers | ✅ | ❌ | ❌ | ❌ | ❌ |

Read-only on all operational data; full control over invoices, payments, settlements.

### Fraud Investigator — investigate; no operational write access

| Resource | View | Create | Edit | Delete | Execute |
|----------|:----:|:------:|:----:|:------:|:-------:|
| Work Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fraud & Compliance | ✅ | ✅ | ✅ | ❌ | ✅ |
| Customers | ✅ | ❌ | ❌ | ❌ | ❌ |

Can flag anomalies and progress investigations. Cannot modify operational records.

---

## Implementation

### Frontend: `useActionPermissions` Hook

```typescript
import { useActionPermissions } from '@/hooks/useActionPermissions';

function WorkOrderActions() {
  const woPerms  = useActionPermissions('workOrders');
  const soPerms  = useActionPermissions('serviceOrders');

  return (
    <>
      {woPerms.edit && <Button onClick={handleEdit}>Edit</Button>}

      {soPerms.execute ? (
        <Button onClick={handleGenerateSO}>Generate SO</Button>
      ) : soPerms.view ? (
        <Button disabled title="View-only access">View SO</Button>
      ) : null}
    </>
  );
}
```

Role configuration source: `src/config/rolePermissions.ts`  
Hook implementation: `src/hooks/useActionPermissions.tsx`

### Frontend: View-Only Patterns

When a role has `view` but no `create/edit/execute`, show an informational alert:

```typescript
const isViewOnly = !perms.create && !perms.edit && !perms.execute;

{isViewOnly && (
  <Alert>
    <AlertDescription>
      <strong>View-Only Mode:</strong> You can view this data but cannot perform actions.
    </AlertDescription>
  </Alert>
)}
```

### Backend: Enforcing Permissions

Frontend RBAC is UX-only. **Every** protected backend route validates the JWT and checks tenant scope:

```javascript
// Middleware applied to all protected routes
router.use(authenticateToken);

// Per-endpoint permission check example
router.post('/work-orders', authenticateToken, async (req, res) => {
  if (!req.user.permissions.includes('workorders.create')) {
    return res.status(403).json({ code: 'forbidden', message: 'Insufficient permissions' });
  }
  // ...
});
```

---

## Tenant Isolation in RBAC

All permission checks also enforce `tenant_id` scoping:

- `sys_admin` — may query any tenant
- All other roles — queries are hard-scoped to `req.user.tenantId`
- `partner_admin` — additionally scoped to their assigned partner organisation

---

## Adding Permissions for a New Resource

1. Update `src/config/rolePermissions.ts`:
```typescript
export const roleActionPermissions = {
  ops_manager: {
    newResource: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  // ...other roles
};
```

2. Use in component:
```typescript
const perms = useActionPermissions('newResource');
{perms.create && <Button>Create</Button>}
```

3. Add backend permission check to the new route.
4. Document the change in this file.

---

## Security Principles

1. **Frontend RBAC is UX only** — never a security boundary; backend must validate every action
2. **Tenant isolation is always enforced** — `tenant_id` filter on every query, every role
3. **Audit all sensitive actions** — `logAuditEvent()` for any privilege-bearing operation
4. **Graceful degradation** — view-only roles see disabled buttons with tooltips, not hidden features

---

## Testing RBAC

### Manual Test Matrix

| Role | Dispatch page | Work Orders SO button | Finance page |
|------|:-------------:|:---------------------:|:------------:|
| sys_admin | Full access | Generate SO | Full access |
| ops_manager | View-only alert | View SO (disabled) | View-only |
| dispatcher | Can assign/check-in | View SO (disabled) | No access |
| technician | View-only | No SO button | No access |
| finance_manager | View-only | View SO (disabled) | Full access |

### Key Files

| Purpose | Path |
|---------|------|
| Role permission config | `src/config/rolePermissions.ts` |
| `useActionPermissions` hook | `src/hooks/useActionPermissions.tsx` |
| Dashboard config (role-specific tiles) | `src/config/dashboardConfig.ts` |
| Backend auth middleware | `server/middleware/auth.js` |
| Tenant isolation docs | `docs/RBAC_TENANT_ISOLATION.md` |
