# Work Order Flow - Automated Precheck & Warranty-Based Assignment

## Overview
Updated the work order flow to implement automated prechecks and warranty-based repair assignment as requested.

## Changes Implemented

### 1. **Automated Inventory & Warranty Checks (Before Release)**
- Prechecks now run automatically in the background when work order is created
- Inventory cascade checks: Hub → OEM → Partner → Engineer Buffer
- Warranty verification happens automatically via OEM CRM integration
- No manual precheck triggering required

### 2. **Warranty-Based Assignment (At Release)**
When a work order is released, the system automatically:
- Checks warranty status from precheck results
- Sets `repair_type` field:
  - `in_warranty` = Cost-Free Repair (warranty covers)
  - `out_of_warranty` = At-Cost Repair (customer pays)
- Visual badge shows repair type on Work Orders page

**Express.js Route Handler:** `release-work-order`
- Reads warranty result from work_order_prechecks
- Sets repair_type based on warranty coverage
- Logs assignment type in audit trail

### 3. **Validation Before Completion (Engineer Closure)**
Before an engineer can mark a work order as completed, the system validates:

**Required Photo Uploads:**
- Replacement stage photos
- Post-repair stage photos  
- Pickup stage photos
- All must be validated with no anomalies detected

**Required Parts Validation:**
- If parts were reserved, inventory status must be 'passed'
- Ensures parts were actually used/consumed

**Express.js Route Handler:** `complete-work-order`
- Validates all prechecks before allowing completion
- Returns specific error if photos or parts validation incomplete
- Logs completion in audit trail

## Database Changes

### New Columns
```sql
-- work_orders table
ALTER TABLE work_orders 
ADD COLUMN repair_type TEXT CHECK (repair_type IN ('in_warranty', 'out_of_warranty'));
```

### New Permissions
```sql
-- workorders.complete permission
INSERT INTO permissions (name, description, category)
VALUES ('workorders.complete', 'Complete work orders after validation', 'workorders');
```

## Work Order Lifecycle

```
1. CREATE → Automated precheck runs in background
   ├─ Inventory cascade check
   ├─ Warranty verification
   └─ Photo validation setup

2. RELEASE → System assigns repair type
   ├─ If warranty covered → in_warranty (cost-free)
   └─ If not covered → out_of_warranty (at-cost)

3. IN_PROGRESS → Engineer performs repair
   ├─ Takes photos at each stage
   └─ Uses reserved parts

4. COMPLETE → System validates before closure
   ├─ All photo stages must be validated
   ├─ Parts consumption verified (if applicable)
   └─ Only then: status = completed
```

## UI Changes

### Work Orders Page
- Removed manual "View Status" precheck button
- Added repair type badge (Cost-Free vs At-Cost)
- Shows warranty status automatically

### Completion Flow
- Engineers must complete photo uploads before closing WO
- System prevents completion if validation incomplete
- Clear error messages guide engineer on missing requirements

## Security Note
The security linter detected that leaked password protection is disabled in Auth settings. This is a pre-existing configuration and should be enabled for production use:
Refer to auth configuration documentation for password strength and leaked password protection settings.
