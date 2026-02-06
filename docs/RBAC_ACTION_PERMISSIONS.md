# RBAC Action-Level Permissions Guide

## Overview
GuardianFlow implements comprehensive Role-Based Access Control (RBAC) at the **button and action level**, not just page visibility. Every interactive element respects role permissions.

## Permission Types

Each role has 5 types of permissions per resource:

| Permission | Description | Example |
|------------|-------------|---------|
| `view` | Can see the resource | View work orders list |
| `create` | Can create new records | Create new work order |
| `edit` | Can modify existing records | Update work order status |
| `delete` | Can remove records | Delete draft work order |
| `execute` | Can perform special actions | Generate SO, Release to field, Run precheck |

## Role Permission Matrix

### Operations Manager
**Philosophy**: View-only oversight role

| Resource | View | Create | Edit | Delete | Execute |
|----------|------|--------|------|--------|---------|
| Work Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dispatch | ✅ | ❌ | ❌ | ❌ | ❌ |
| Technicians | ✅ | ❌ | ❌ | ❌ | ❌ |
| Customers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ✅ | ❌ | ❌ | ❌ | ❌ |

**Result**: Operations Managers can monitor everything but cannot take any actions. Buttons are hidden or disabled.

### Dispatcher
**Philosophy**: Create and manage assignments, but not generate financial documents

| Resource | View | Create | Edit | Delete | Execute |
|----------|------|--------|------|--------|---------|
| Work Orders | ✅ | ✅ | ✅ | ❌ | ✅ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dispatch | ✅ | ✅ | ✅ | ❌ | ✅ |
| Technicians | ✅ | ❌ | ❌ | ❌ | ❌ |

**Result**: Can assign work, release to field, check-in/out technicians, but **cannot generate Service Orders** (only view).

### Technician
**Philosophy**: Execute assigned work, minimal administrative access

| Resource | View | Create | Edit | Delete | Execute |
|----------|------|--------|------|--------|---------|
| Work Orders | ✅ | ❌ | ✅ | ❌ | ✅ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dispatch | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ |

**Result**: Can update their work orders, complete tasks, view inventory. Cannot create work orders or generate documents.

### Finance Manager
**Philosophy**: Financial operations only

| Resource | View | Create | Edit | Delete | Execute |
|----------|------|--------|------|--------|---------|
| Work Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Service Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ✅ | ✅ | ✅ | ❌ | ✅ |
| Customers | ✅ | ❌ | ❌ | ❌ | ❌ |

**Result**: Read-only on operational data, full control over invoices, payments, settlements.

### Fraud Investigator
**Philosophy**: Investigate fraud, no operational access

| Resource | View | Create | Edit | Delete | Execute |
|----------|------|--------|------|--------|---------|
| Work Orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fraud | ✅ | ✅ | ✅ | ❌ | ✅ |
| Customers | ✅ | ❌ | ❌ | ❌ | ❌ |

**Result**: Can investigate fraud cases, flag anomalies, but cannot modify operational data.

## Implementation

### 1. Using `useActionPermissions` Hook

```typescript
import { useActionPermissions } from '@/hooks/useActionPermissions';

function MyComponent() {
  const woPerms = useActionPermissions('workOrders');
  const soPerms = useActionPermissions('serviceOrders');
  
  return (
    <>
      {/* Edit button - only if user can edit */}
      {woPerms.edit && (
        <Button onClick={handleEdit}>Edit</Button>
      )}
      
      {/* Generate SO - only if user can execute */}
      {soPerms.execute && (
        <Button onClick={handleGenerateSO}>Generate SO</Button>
      )}
      
      {/* View-only state for Operations Manager */}
      {soPerms.view && !soPerms.execute && (
        <Button disabled title="View-only access">
          View SO
        </Button>
      )}
    </>
  );
}
```

### 2. Conditional Action Execution

```typescript
const handleAction = () => {
  if (!woPerms.execute) {
    toast({
      title: 'Permission Denied',
      description: 'You do not have permission to perform this action',
      variant: 'destructive',
    });
    return;
  }
  
  // Proceed with action
  performAction();
};
```

### 3. View-Only Alerts

```typescript
{isViewOnly && (
  <Alert className="bg-blue-50 border-blue-200">
    <EyeOff className="h-4 w-4 text-blue-600" />
    <AlertDescription>
      <strong>View-Only Mode:</strong> You can view this information but cannot perform actions.
    </AlertDescription>
  </Alert>
)}
```

## Examples

### Dispatch Page - Operations Manager View
```typescript
// Dispatch.tsx
const dispatchPerms = useActionPermissions('dispatch');
const isViewOnly = !dispatchPerms.create && !dispatchPerms.edit && !dispatchPerms.execute;

// Show alert
{isViewOnly && <Alert>View-Only Mode</Alert>}

// Hide action buttons
{dispatchPerms.execute && (
  <Button onClick={handleCheckIn}>Check In</Button>
)}
{dispatchPerms.edit && (
  <Button onClick={handleComplete}>Mark Complete</Button>
)}
{isViewOnly && <Badge>View Only</Badge>}
```

**Result for Operations Manager**: 
- Sees all work orders
- All action buttons are hidden
- Shows "View Only" badges instead
- Alert banner explains view-only status

### Work Orders - Generate SO Button
```typescript
// WorkOrders.tsx
const soPerms = useActionPermissions('serviceOrders');

{soPerms.execute ? (
  <Button onClick={() => setGenerateSOOpen(true)}>
    Generate SO
  </Button>
) : soPerms.view ? (
  <Button disabled title="View-only access to Service Orders">
    View SO
  </Button>
) : null}
```

**Result for Operations Manager**:
- See disabled "View SO" button
- Cannot click or generate
- Tooltip explains view-only access

**Result for Dispatcher**:
- Same as Operations Manager (view-only for SO)
- Can still perform other dispatch actions

**Result for Tenant Admin**:
- Full "Generate SO" button
- Can create service orders

## Key Principles

1. **Action-Level Control**: Every button respects RBAC, not just page visibility
2. **Graceful Degradation**: View-only roles see disabled buttons with explanations, not hidden features
3. **Clear Feedback**: Users know why they can't perform an action
4. **Role Hierarchy**: sys_admin can do everything; specific roles have limited scopes
5. **Tenant Isolation**: All permissions respect tenant boundaries

## Testing RBAC

### Test Operations Manager
1. Login as operations_manager
2. Navigate to Dispatch → Should see "View-Only Mode" alert
3. Try to click any action button → Should be hidden or disabled
4. Navigate to Work Orders → "Generate SO" should be disabled "View SO"
5. Dashboard → Should show view-only metrics

### Test Dispatcher
1. Login as dispatcher
2. Navigate to Dispatch → Can check-in/out, release to field
3. Navigate to Work Orders → Can edit WOs, but SO button shows "View SO"
4. Cannot access Finance or Fraud pages

### Test Technician
1. Login as technician
2. Dashboard → Shows "My Assigned WOs", "Completed Today"
3. Work Orders → Can edit only assigned WOs
4. Dispatch → View-only, no action buttons

## Adding New Permissions

To add permissions for a new resource:

1. **Update `rolePermissions.ts`**:
```typescript
export const roleActionPermissions = {
  operations_manager: {
    newResource: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  // ... other roles
};
```

2. **Use in Component**:
```typescript
const newPerms = useActionPermissions('newResource');

{newPerms.create && <Button>Create New</Button>}
{newPerms.edit && <Button>Edit</Button>}
```

3. **Document in this file**

## Security Notes

- **Frontend RBAC is UX only** - Always enforce permissions in backend (tenant isolation + Express.js route handlers)
- **Never trust client state** - Backend must validate every action
- **Audit logging** - All sensitive actions logged in `events_log` table
- **Tenant isolation** - Every permission check also validates tenant_id

## Resources

- Role Configuration: `src/config/rolePermissions.ts`
- Hook Implementation: `src/hooks/useActionPermissions.tsx`
- Example Implementation: `src/pages/Dispatch.tsx`, `src/pages/WorkOrders.tsx`
- Dashboard Config: `src/config/dashboardConfig.ts`
