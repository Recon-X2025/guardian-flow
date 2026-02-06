# Automated Precheck Implementation

## Overview
The precheck orchestration for work orders now runs **automatically** without requiring manual human intervention. The system performs inventory cascade and warranty coverage verification immediately upon work order creation.

## Workflow

### 1. Work Order Creation
When a work order is created via `CreateWorkOrderDialog`:
- Work order record is inserted with `draft` status
- Precheck record is initialized with all statuses as `pending`
- **Automatic trigger**: `precheck-orchestrator` Express.js route handler is invoked immediately

### 2. Automatic Precheck Execution
The precheck orchestrator automatically:
- ✓ **Inventory Cascade Check**: Verifies parts availability (hub → OEM → partner → buffer)
- ✓ **Warranty Coverage Verification**: Checks warranty status and calculates customer cost
- Updates precheck statuses to `passed` or `failed` based on results

### 3. Photo Validation (Technician-Driven)
- Technician captures 4 required photos (replacement, post_repair, pickup stages)
- Photo validation runs when photos are uploaded
- Photo status updates to `passed` when all required stages validated

### 4. Auto-Release
The `can_release` column is a **generated column** that automatically computes:
```sql
can_release = (inventory_status = 'passed' AND warranty_status = 'passed' AND photo_status = 'passed')
```

When all three statuses pass:
- Work order status updates to `pending_validation` or `in_progress`
- Work order is released to technician for field work
- No manual intervention required

## Database Changes

### Generated Column Implementation
```sql
ALTER TABLE work_order_prechecks 
ADD COLUMN can_release boolean GENERATED ALWAYS AS (
  inventory_status = 'passed' 
  AND warranty_status = 'passed' 
  AND photo_status = 'passed'
) STORED;
```

**Why Generated Column?**
- Eliminates manual calculation errors
- Ensures consistency across all operations
- Prevents explicit value insertion (auto-calculated by database)
- Automatically updates when any status changes

## Express.js Route Handler Changes

### Precheck Orchestrator
**Location**: `server/routes/functions.js` (precheck-orchestrator handler)

**Changes**:
- Removed explicit `requiredPermissions` check - now allows any authenticated user
- No longer attempts to set `can_release` value (auto-generated)
- Returns correlation ID for audit trail

### Work Order Creation
**Location**: `src/components/CreateWorkOrderDialog.tsx`

**Changes**:
- Automatically invokes `precheck-orchestrator` after WO creation
- No longer inserts `can_release: false` (handled by database)
- Provides user feedback on automatic precheck initiation

## UI Changes

### Removed Manual Trigger
**Location**: `src/pages/WorkOrders.tsx`

**Removed**:
- ❌ "Run Precheck" button (no longer needed)
- ❌ `TriggerPrecheckDialog` component
- ❌ `triggerPrecheckOpen` state
- ❌ Manual precheck invocation

**Kept**:
- ✓ "View Status" button - displays current precheck status
- ✓ `PrecheckStatus` component - real-time status monitoring

## Benefits

### 1. Zero Human Intervention
- No dispatcher action required
- No manual button clicks
- Automatic execution on WO creation

### 2. Immediate Feedback
- Inventory and warranty checks run instantly
- Technician knows parts availability before dispatch
- Customer cost calculated immediately

### 3. Consistency
- Every work order gets prechecked automatically
- No skipped or forgotten prechecks
- Audit trail for every precheck execution

### 4. Reduced Errors
- No manual `can_release` value setting
- Database enforces business logic
- Generated column prevents data inconsistencies

## Error Handling

### Automatic Precheck Failure
If precheck invocation fails:
- Toast notification informs user
- Work order still created (manual retry available via backend)
- Precheck record exists with `pending` statuses

### Precheck Results
- **All Passed**: `can_release = true`, WO released automatically
- **Any Failed**: `can_release = false`, override request may be required
- **Override**: Manager with MFA can approve override request

## Monitoring

### Audit Trail
Every precheck execution logs:
- Correlation ID for tracing
- User who created the WO (trigger)
- Inventory, warranty, and photo results
- Final `can_release` status

### Status Tracking
View precheck status at any time:
1. Navigate to Work Orders page
2. Click "View Status" for any WO
3. See real-time inventory, warranty, photo statuses

## Security Note

⚠️ **Password Protection Warning**: A security linter warning exists about leaked password protection being disabled. This is unrelated to the precheck automation and should be addressed separately by enabling password protection in auth configuration.

## Testing

### Test Automatic Workflow
1. Create a new ticket
2. Convert ticket to work order (assign technician)
3. ✓ Precheck should run automatically within seconds
4. Check "View Status" - inventory and warranty should show results
5. Upload 4 photos (as technician)
6. ✓ Photo validation updates automatically
7. ✓ When all pass, `can_release = true` automatically

### Expected Timeline
- **Inventory Check**: ~2-5 seconds
- **Warranty Check**: ~2-5 seconds  
- **Photo Upload**: User-driven (when technician captures)
- **Photo Validation**: ~5-10 seconds per batch
- **Auto-Release**: Immediate when all pass
