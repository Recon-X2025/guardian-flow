# Module-Based Sidebar Filtering Implementation

**Date**: 2025-11-02  
**Status**: ✅ Complete

---

## Problem
When users log into module-specific pages (like `/fraud` or `/analytics`), they were seeing Field Service Management menu items (Work Orders, Dispatch, etc.) even if they shouldn't. This was especially problematic for client roles like Insurance Agents who were seeing Work Orders.

## Solution
Implemented intelligent sidebar filtering based on:
1. **Module Context**: Which module the user is currently in
2. **User Role**: Whether they have field operations responsibilities

---

## Logic

### Field Service Items
These items are considered "Field Service Management" related:
- Tickets
- Work Orders
- Photo Capture
- Service Orders
- Pending Validation
- Scheduler
- Dispatch
- Route Optimization
- Inventory
- Procurement
- Warranty & RMA
- Offer AI (SaPOS)

### Field Operations Roles
These roles always see Field Service items regardless of module:
- `ops_manager`
- `dispatcher`
- `technician`
- `partner_admin`
- `partner_user`

### Filtering Rules

```
IF (module = 'fsm' OR module = 'platform'):
  → Show ALL items based on permissions

ELSE IF (module = 'fraud' OR 'analytics' OR 'marketplace' OR etc):
  IF (role = field_operations_role):
    → Show ALL items based on permissions
  ELSE:
    → Hide Field Service items
    → Show ONLY module-specific items
```

---

## Examples

### Scenario 1: Insurance Agent in Fraud Module
- **Module**: `/fraud` (fraud module)
- **Role**: `client_admin` (insurance agent)
- **Has wo.read**: Yes (from wildcard `%.read`)
- **Result**: ❌ Work Orders hidden (not field operations role in non-FSM module)

### Scenario 2: Dispatcher in Fraud Module
- **Module**: `/fraud` (fraud module)
- **Role**: `dispatcher`
- **Has wo.read**: Yes
- **Result**: ✅ Work Orders visible (field operations role)

### Scenario 3: Insurance Agent in FSM Module
- **Module**: `/work-orders` (fsm module)
- **Role**: `client_admin` (insurance agent)
- **Has wo.read**: Yes
- **Result**: ✅ Work Orders visible (in FSM module)

### Scenario 4: Equipment OEM Manager in Platform
- **Module**: `/dashboard` (platform)
- **Role**: `client_operations_manager` (OEM user)
- **Has wo.read**: Yes (if they manage field operations)
- **Result**: ✅ Work Orders visible (platform module shows all)

---

## Code Changes

### AppSidebar.tsx
```typescript
const { moduleName, moduleId } = useModuleContext();

// Check if item is Field Service Management related
const isFieldServiceItem = (item: MenuItem): boolean => {
  const fieldServiceUrls = [
    '/tickets', '/work-orders', '/photo-capture', '/service-orders',
    '/pending-validation', '/scheduler', '/dispatch', '/route-optimization',
    '/inventory', '/procurement', '/warranty', '/sapos'
  ];
  return fieldServiceUrls.some(url => item.url.startsWith(url));
};

// Check if user has field operations role
const isFieldOperationsRole = (): boolean => {
  const fieldRoles = ['ops_manager', 'dispatcher', 'technician', 'partner_admin', 'partner_user'];
  return hasAnyRole(fieldRoles as any);
};

const getVisibleGroups = (): MenuGroup[] => {
  // Hide FSM items when in non-FSM module for non-field-roles
  const hideFieldServiceItems = moduleId && moduleId !== 'fsm' && moduleId !== 'platform' && !isFieldOperationsRole();
  
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(item => {
        const hasPermission = canAccessItem(item);
        if (!hasPermission) return false;
        
        if (hideFieldServiceItems && isFieldServiceItem(item)) {
          return false;
        }
        
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
};
```

---

## Benefits

1. ✅ **Industry-Agnostic**: Works for any industry (Insurance, Healthcare, Manufacturing, etc.)
2. ✅ **Role-Aware**: Honors field operations responsibilities
3. ✅ **Module-Specific**: Provides focused UI per module
4. ✅ **Zero DB Changes**: Pure frontend logic, no migration needed
5. ✅ **Client Role Compatible**: Equipment OEMs and hospitals in FSM still see Work Orders

---

## Testing Checklist

- [x] Insurance Agent in `/fraud` → No Field Service items
- [x] Dispatcher in `/fraud` → Field Service items visible
- [x] Fraud Analyst in `/fraud` → No Field Service items
- [x] Equipment OEM in `/work-orders` → Work Orders visible
- [x] Hospital manager in `/dashboard` → Work Orders visible
- [x] Client roles in `/platform` → See all allowed modules
- [x] No linter errors

---

## No Database Changes Required

The existing `wo.read` permissions remain intact. The filtering happens at the UI level based on module context and role type, making it:
- More flexible
- Easier to maintain
- Backward compatible
- Industry-agnostic

