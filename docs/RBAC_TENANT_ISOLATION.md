# RBAC & Tenant Isolation Implementation

## Overview
This document describes the backend-first RBAC and tenant isolation implementation for Guardian Flow.

## Architecture

### 1. Central Permission Store
- **Permissions collection**: Stores all system permissions with categories
- **Role-Permissions mapping**: Links roles to permissions via `role_permissions` collection
- **User-Roles mapping**: Assigns roles to users via `user_roles` collection with tenant context

### 2. JWT Middleware & Auth Context
- **API Middleware**: All protected endpoints use JWT authentication middleware
- **Auth Context**: Contains user ID, email, roles, permissions, and tenant_id
- **Token Validation**: JWT tokens validated on every API request

### 3. Backend Auth/Me Endpoint
- **Endpoint**: `POST /functions/v1/auth-me`
- **Purpose**: Returns server-validated user context (roles, permissions, tenant_id)
- **Usage**: Frontend calls this on login to cache auth context
- **Response Format**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "roles": ["partner_admin", "technician"],
  "permissions": ["tickets.view", "workorders.create"],
  "tenant_id": "tenant-uuid",
  "is_admin": false
}
```

### 4. Frontend Integration
- **RBACContext**: Fetches auth/me on login, caches roles/permissions/tenant_id
- **Module Visibility**: Components use `useRBAC()` hook to check permissions
- **Protected Actions**: `<ProtectedAction>` component disables UI based on permissions
- **Route Guards**: `<RoleGuard>` protects entire routes by role

## Application-Level Tenant Isolation

### Tenant Isolation Strategy
All multi-tenant collections enforce tenant isolation at the application layer:

```javascript
// Example tenant filtering in query
async function getTickets(userId, tenantId) {
  const user = await getUserWithRoles(userId);

  // System and tenant admins see all data for their tenant
  if (user.roles.includes('sys_admin') || user.roles.includes('tenant_admin')) {
    return db.collection('tickets').find({ tenant_id: tenantId });
  }

  // Partner admins see only their tenant's data
  if (user.roles.includes('partner_admin')) {
    return db.collection('tickets').find({
      tenant_id: tenantId,
      customer_id: user.id
    });
  }

  // Default authenticated user view
  return db.collection('tickets').find({
    tenant_id: tenantId,
    assigned_to: user.id
  });
}
```

### Collections with Tenant Isolation
1. **tickets**: Partner admins see only their tenant's tickets
2. **work_orders**: Scoped by technician's tenant_id
3. **invoices**: Filtered by customer tenant_id
4. **quotes**: Linked to customer tenant
5. **sapos_offers**: Accessible via work order tenant context
6. **profiles**: Users see only their tenant's profiles
7. **penalty_applications**: Scoped to work order tenant
8. **audit_logs**: Filtered by tenant_id

### Authorization Helper Functions
Application-level helpers for role and permission checking:
- `hasRole(user, role)`: Checks if user has specific role
- `hasAnyRole(user, roles[])`: Checks if user has any of specified roles
- `hasPermission(user, permission)`: Checks if user has permission
- `hasAnyPermission(user, permissions[])`: Checks if user has any permission

## Error Handling

### Standardized 403 Response
All API errors include:
- `code`: Error code (e.g., "forbidden", "unauthorized")
- `message`: Human-readable error message
- `correlationId`: Unique request ID for debugging
- `allowedActions`: List of user's actual permissions (for debugging)

### Frontend Error Handler
Use `handleApiError()` from `src/lib/apiClient.ts` to show user-friendly toast messages:

```typescript
import { handleApiError, invokeEdgeFunction } from '@/lib/apiClient';

try {
  const result = await invokeEdgeFunction('my-function', { body: data });
} catch (error) {
  handleApiError(error, toast);
}
```

## Testing

### Playwright Tests
File: `tests/tenant-isolation.spec.ts`

Tests cover:
1. **Cross-tenant ticket access**: Tenant A cannot view Tenant B tickets
2. **Cross-tenant work order access**: Tenant B cannot view Tenant A work orders
3. **Profile isolation**: Partner admin sees only own tenant profiles
4. **API error responses**: 403 errors include correlation IDs
5. **Auth/me validation**: Endpoint returns correct tenant context

### Database Test Function
Function: `testTenantIsolation()`

Creates test tenants and validates:
- Tenant creation
- Data isolation at application level
- Middleware enforcement

## Module Visibility by Role

### Sys Admin
- All modules visible
- Can access all tenants' data
- Can manage roles and permissions

### Tenant Admin
- All modules visible
- Can access only own tenant's data
- Can manage users within tenant

### Partner Admin
- Tickets, Work Orders, Invoices, Quotes
- Can access only own tenant's data
- Cannot access system settings

### Ops Manager
- Tickets, Work Orders, Dispatch, Inventory, Scheduler
- Can manage work orders and assignments

### Technician
- Assigned work orders only
- Photo capture, service orders
- Limited read-only access

### Finance Manager
- Invoices, Penalties, Finance dashboard
- Audit logs for financial operations

### Fraud Investigator
- Fraud alerts, investigation tools
- Audit logs for fraud cases

## API Authorization Flow

1. **Client Request**: Frontend includes JWT token in Authorization header
2. **API Middleware**: Validates authentication via `authenticateToken` middleware
3. **Validation**:
   - Verifies JWT token
   - Fetches user roles from `user_roles` collection
   - Fetches permissions from `role_permissions` collection
   - Checks required permissions/roles
4. **Response**:
   - Success: Returns auth context with user, roles, permissions, tenant_id
   - Failure: Returns standardized error with correlation ID
5. **Query Filtering**: Database queries filtered by tenant_id at application layer

## Audit Logging

All sensitive operations are logged via `logAuditEvent()`:
```typescript
await logAuditEvent(db, {
  userId: context.user.id,
  action: 'workorder.release.override',
  resourceType: 'work_order',
  resourceId: woId,
  actorRole: context.roles[0],
  tenantId: context.tenantId,
  reason: 'Emergency override',
  mfaVerified: true,
  correlationId: requestId,
});
```

## Deployment Checklist

- [x] Auth/me endpoint deployed
- [x] Tenant isolation middleware applied to all routes
- [x] Frontend RBACContext integrated
- [x] Standardized error responses with correlation IDs
- [x] Tenant isolation tests passing
- [ ] Load test auth/me endpoint for performance
- [ ] Monitor correlation IDs in production logs
- [ ] Document role assignment procedures for ops team

## Monitoring & Observability

### Key Metrics
- Auth/me endpoint latency (p50, p95, p99)
- 403 error rate by endpoint
- Role check failures
- Tenant isolation violations (should be 0)

### Alerts
- Spike in 403 errors
- Auth/me endpoint latency > 500ms
- Multiple failed authorization attempts from single user

## Security Best Practices

1. **Never store roles in profiles collection** - Use dedicated `user_roles` collection
2. **Always filter by tenant_id in queries** - Prevents data leakage across tenants
3. **Include correlation IDs in all API responses** - Essential for debugging
4. **Validate permissions on backend** - Never trust frontend checks alone
5. **Audit all privilege escalations** - Log role grants/removals
6. **Test tenant isolation regularly** - Run automated tests on every deploy
