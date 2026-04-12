# RBAC & Tenant Isolation

**Version:** 7.0 | **Date:** April 2026

## Overview

All data in Guardian Flow is tenant-scoped at the application layer. Every database query includes a `tenant_id` filter. There is no row-level security in the database itself — isolation is enforced entirely in the Express.js route handlers and service layer.

---

## Architecture

```
Client Request
    │
    ▼
JWT Middleware (authenticateToken)
    │  Validates token
    │  Extracts: { id, email, roles, permissions, tenantId }
    │
    ▼
Route Handler
    │  Checks required permissions
    │  Scopes all queries to req.user.tenantId
    │
    ▼
Database Query
    { tenant_id: req.user.tenantId, ...otherFilters }
```

---

## JWT Authentication

### Login Response

```json
{
  "token": "<jwt>",
  "user": { "id": "uuid", "email": "user@example.com", "full_name": "..." },
  "roles": ["dispatcher"],
  "permissions": ["workorders.view", "workorders.create", "dispatch.execute"],
  "tenant_id": "tenant-uuid"
}
```

### Middleware Usage

```javascript
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

// Required authentication
router.get('/work-orders', authenticateToken, handler);

// Optional (populates req.user if token present, proceeds if not)
router.get('/public-resource', optionalAuth, handler);
```

Token payload is available as `req.user`:
```javascript
const { id, email, roles, permissions, tenantId } = req.user;
```

---

## Tenant Isolation Patterns

### Standard Query Pattern

All collection queries must include `tenant_id`:

```javascript
// Correct — tenant-scoped
const tickets = await adapter.findMany('tickets', {
  tenant_id: req.user.tenantId,
  status: 'open',
});

// Wrong — returns data from all tenants
const tickets = await adapter.findMany('tickets', { status: 'open' });
```

### Role-Based Scoping Within a Tenant

```javascript
async function getWorkOrders(req) {
  const { tenantId, roles, id: userId } = req.user;
  const base = { tenant_id: tenantId };

  if (roles.includes('sys_admin') || roles.includes('tenant_admin')) {
    // See all work orders in tenant
    return adapter.findMany('work_orders', base);
  }

  if (roles.includes('dispatcher') || roles.includes('ops_manager')) {
    // See all work orders in tenant
    return adapter.findMany('work_orders', base);
  }

  if (roles.includes('technician')) {
    // See only assigned work orders
    return adapter.findMany('work_orders', { ...base, assigned_to: userId });
  }

  if (roles.includes('partner_admin')) {
    // See only work orders linked to their partner organisation
    return adapter.findMany('work_orders', { ...base, partner_id: userId });
  }
}
```

---

## Collections with Tenant Isolation

All of the following collections are always queried with `{ tenant_id: ... }`:

| Collection | Notes |
|------------|-------|
| `tickets` | Partner admins additionally scoped by `customer_id` |
| `work_orders` | Technicians scoped by `assigned_to` |
| `service_orders` | |
| `invoices` | |
| `quotes` | |
| `ledger_entries` | |
| `payments` | |
| `penalties` | |
| `audit_logs` | |
| `decision_records` (FlowSpace) | |
| `dex_contexts` | |
| `knowledge_base_articles` | |
| `knowledge_base_chunks` | |
| `ai_governance_logs` | |
| `crm_accounts` | |
| `crm_contacts` | |
| `crm_leads` | |
| `crm_deals` | |
| `profiles` | |
| `assets` | |
| `inventory` | |

---

## Frontend RBAC Integration

The frontend fetches the auth context immediately after login:

```typescript
// AuthContext calls GET /api/auth/me on login
// Caches: { user, roles, permissions, tenant_id }

// RBACContext provides permission checking
const { hasRole, hasPermission } = useRBAC();

if (hasRole('sys_admin')) { /* show admin UI */ }
if (hasPermission('workorders.create')) { /* show create button */ }
```

Route-level protection:
```tsx
<Route path="/org-console" element={
  <RoleGuard allowedRoles={['sys_admin', 'tenant_admin']}>
    <OrgManagementConsole />
  </RoleGuard>
} />
```

---

## Error Handling

### Standardised 403 Response

```json
{
  "code": "forbidden",
  "message": "Insufficient permissions to perform this action",
  "correlationId": "req-abc-123",
  "allowedActions": ["workorders.view"]
}
```

All API errors include a `correlationId` (set by the `correlationId` middleware at request entry).

---

## Audit Logging

All sensitive operations are logged via `logAuditEvent()`:

```javascript
import { logAuditEvent } from '../services/audit.js';

await logAuditEvent(db, {
  userId: req.user.id,
  action: 'workorder.release.override',
  resourceType: 'work_order',
  resourceId: woId,
  actorRole: req.user.roles[0],
  tenantId: req.user.tenantId,
  reason: 'Emergency override',
  correlationId: req.correlationId,
});
```

Audit logs are stored in `audit_logs` collection with 7-year immutable retention (partitioned 2025–2031).

---

## sys_admin Cross-Tenant Access

`sys_admin` is the only role that may access data across tenants. All route handlers check for this explicitly:

```javascript
const filter = roles.includes('sys_admin')
  ? {}                              // no tenant filter
  : { tenant_id: tenantId };       // scoped to own tenant
```

---

## Module Visibility by Role

| Module | sys_admin | tenant_admin | ops_manager | dispatcher | technician | finance_manager | fraud_investigator | partner_admin |
|--------|:---------:|:------------:|:-----------:|:----------:|:----------:|:---------------:|:-----------------:|:-------------:|
| Work Orders | ✅ | ✅ | ✅ (view) | ✅ | ✅ (own) | ✅ (view) | ✅ (view) | ✅ (own tenant) |
| Finance | ✅ | ✅ | ✅ (view) | ❌ | ❌ | ✅ | ❌ | ✅ (view) |
| Fraud / Compliance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| CRM | ✅ | ✅ | ✅ (view) | ✅ (view) | ❌ | ✅ (view) | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ | ✅ (view) | ❌ | ✅ | ✅ (view) | ❌ |
| Admin Console | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Org Console (MAC) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Developer Portal | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Marketplace | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ML Studio | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Security Principles

1. **Application-layer isolation** — `tenant_id` filter on every query; no database-level RLS
2. **Never trust the client** — all permission checks run on the backend regardless of frontend state
3. **Audit all privilege operations** — role grants, overrides, and admin actions must be logged
4. **No cross-tenant data leakage** — `sys_admin` cross-tenant access is intentional and audited
5. **Correlation IDs on every error** — required for debugging security incidents in production
