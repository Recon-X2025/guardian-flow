# RBAC & Tenant Isolation Implementation

## Overview
This document describes the backend-first RBAC and tenant isolation implementation for ReconX Guardian Flow.

## Architecture

### 1. Central Permission Store
- **Permissions table**: Stores all system permissions with categories
- **Role-Permissions mapping**: Links roles to permissions via `role_permissions` table
- **User-Roles mapping**: Assigns roles to users via `user_roles` table with tenant context

### 2. JWT Middleware & Auth Context
- **Edge Functions**: All protected functions use `validateAuth()` from `_shared/auth.ts`
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

## Row-Level Security (RLS) Policies

### Tenant Isolation Strategy
All multi-tenant tables enforce tenant isolation via RLS policies using the pattern:

```sql
CREATE POLICY "Users view own tenant data"
ON public.table_name FOR SELECT
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin', 'tenant_admin']) THEN true
    WHEN has_role(auth.uid(), 'partner_admin') THEN (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id = table_name.tenant_id
      )
    )
    ELSE auth.role() = 'authenticated'
  END
);
```

### Tables with Tenant Isolation
1. **tickets**: Partner admins see only their tenant's tickets
2. **work_orders**: Scoped by technician's tenant_id
3. **invoices**: Filtered by customer tenant_id
4. **quotes**: Linked to customer tenant
5. **sapos_offers**: Accessible via work order tenant context
6. **profiles**: Users see only their tenant's profiles
7. **penalty_applications**: Scoped to work order tenant
8. **audit_logs**: Filtered by tenant_id

### Security Definer Functions
To prevent infinite recursion in RLS, these functions use `SECURITY DEFINER`:
- `has_role(user_id, role)`: Checks if user has specific role
- `has_any_role(user_id, roles[])`: Checks if user has any of specified roles
- `has_permission(user_id, permission)`: Checks if user has permission
- `has_any_permission(user_id, permissions[])`: Checks if user has any permission

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
Function: `public.test_tenant_isolation()`

Creates test tenants and validates:
- Tenant creation
- Data isolation at DB level
- RLS policy enforcement

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
2. **Edge Function**: Calls `validateAuth(req, { requiredPermissions: [...] })`
3. **Validation**: 
   - Verifies JWT token
   - Fetches user roles from `user_roles` table
   - Fetches permissions from `role_permissions` table
   - Checks required permissions/roles
4. **Response**:
   - Success: Returns auth context with user, roles, permissions, tenant_id
   - Failure: Returns standardized error with correlation ID
5. **RLS Enforcement**: Database queries automatically filtered by tenant via RLS policies

## Audit Logging

All sensitive operations are logged via `logAuditEvent()`:
```typescript
await logAuditEvent(supabase, {
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
- [x] RLS policies applied to all tenant tables
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

1. **Never store roles in profiles table** - Use dedicated `user_roles` table
2. **Always use SECURITY DEFINER for role checks** - Prevents RLS recursion
3. **Include correlation IDs in all API responses** - Essential for debugging
4. **Validate permissions on backend** - Never trust frontend checks alone
5. **Audit all privilege escalations** - Log role grants/removals
6. **Test tenant isolation regularly** - Run automated tests on every deploy
