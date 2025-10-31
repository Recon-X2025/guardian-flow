# Test Execution Plan - Guardian Flow

## Test Summary
**Created Accounts**: 174 total
- ✅ 4 Partner Admins (1 per partner org)
- ✅ 160 Engineers (40 per partner)
- ✅ 10 Platform accounts (admin, ops, finance, fraud, etc.)

---

## 🧪 Test Suite Overview

### Priority Levels
- 🔴 **CRITICAL**: Core auth & RBAC security
- 🟡 **HIGH**: Main workflow features  
- 🟢 **MEDIUM**: Supporting features
- ⚪ **LOW**: UI/UX enhancements

---

## 🔴 CRITICAL TESTS - Authentication & RBAC

### Test 1: Login & Session Management
**Objective**: Verify authentication works for all roles

| Account | Email | Password | Expected Dashboard Access |
|---------|-------|----------|---------------------------|
| Sys Admin | admin@techcorp.com | Admin123! | ✅ All modules visible |
| Partner Admin | admin@servicepro.com | Partner123! | ⚠️ Partner modules only |
| Technician | engineer1@servicepro.com | Tech123! | ⚠️ Technician PWA only |
| Finance Manager | finance@techcorp.com | Finance123! | ⚠️ Finance modules only |
| Fraud Investigator | fraud@techcorp.com | Fraud123! | ⚠️ Fraud module only |

**Test Steps**:
1. Log out completely
2. Log in with each account above
3. Verify sidebar shows ONLY permitted modules
4. Try to navigate to unauthorized route (e.g., /finance as technician)
5. ✅ PASS: Access Denied page shown
6. ❌ FAIL: Can access unauthorized pages

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Passed | ❌ Failed

---

### Test 2: Partner Data Isolation
**Objective**: Verify partner admins can ONLY see their engineers' data

**Test Steps**:
1. Log in as `admin@servicepro.com`
2. Navigate to Finance page
3. Check invoices/work orders - should ONLY show ServicePro's 40 engineers
4. Log out
5. Log in as `admin@techfield.com`
6. Navigate to Finance page
7. ✅ PASS: Different data shown (TechField engineers only)
8. ❌ FAIL: Sees ServicePro data or all data

**Test Data Check**:
```sql
-- Run this query to verify tenant isolation
SELECT 
  t.name as partner,
  COUNT(DISTINCT p.id) as engineer_count
FROM tenants t
JOIN profiles p ON p.tenant_id = t.id
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'technician'
GROUP BY t.name;
```

**Expected**: Each partner has exactly 40 engineers

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Passed | ❌ Failed

---

### Test 3: API Authorization Enforcement
**Objective**: Verify API endpoints reject unauthorized requests

**Test Steps**:
1. Log in as `engineer1@servicepro.com`
2. Open DevTools Network tab
3. Try to call: `POST /functions/v1/assign-role` (requires admin permission)
4. ✅ PASS: Returns 403 Forbidden
5. ❌ FAIL: Returns 200 or performs action

**Additional API Tests**:
| Endpoint | Required Permission | Test Account | Expected Result |
|----------|---------------------|--------------|-----------------|
| check-inventory | inventory.check | engineer1@servicepro.com | 403 Forbidden |
| validate-photos | photos.validate | admin@servicepro.com | 403 Forbidden |
| generate-sapos-offers | sapos.generate | fraud@techcorp.com | 403 Forbidden |
| approve-override-request | override.approve | engineer1@servicepro.com | 403 Forbidden |

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Passed | ❌ Failed

---

## 🟡 HIGH PRIORITY - Core Workflows

### Test 4: Work Order Creation Flow
**Status**: ⚠️ **PLACEHOLDER DETECTED**

**Current Implementation**: Dashboard shows placeholder data
**Required Implementation**:
1. Ticket creation form
2. Work order generation from ticket
3. Technician assignment
4. Status tracking

**Test When Implemented**:
1. Log in as `ops@techcorp.com`
2. Navigate to Tickets page
3. Create new ticket (unit serial, customer, symptom)
4. Convert ticket to work order
5. Assign to engineer1@servicepro.com
6. Verify engineer can see the work order

**Status**: ⬜ Feature Not Implemented | ⬜ Ready to Test

---

### Test 5: Photo Capture & Validation
**Status**: ⚠️ **PLACEHOLDER DETECTED**

**Current Implementation**: PhotoCapturePage exists but validation logic incomplete
**Required Implementation**:
1. Camera capture (4 photos: context, pre-closeup, serial, part)
2. GPS stamping
3. Hash generation
4. Upload to backend
5. Validation via `validate-photos` edge function
6. Anomaly detection

**Test When Implemented**:
1. Log in as engineer1@servicepro.com
2. Open work order WO-2025-0001
3. Navigate to photo capture page
4. Capture 4 required photos
5. Verify GPS coordinates attached
6. Submit photos
7. Check validation result
8. ✅ PASS: Photos validated, no anomalies
9. ❌ FAIL: Validation fails or missing photos accepted

**Status**: ⬜ Feature Not Implemented | ⬜ Ready to Test

---

### Test 6: Precheck Orchestration
**Status**: ⚠️ **EDGE FUNCTION EXISTS - UI PLACEHOLDER**

**Implemented**: `precheck-orchestrator` edge function
**Missing**: UI to trigger precheck and display results

**Test When UI Implemented**:
1. Create work order with parts list
2. Trigger precheck orchestration
3. Verify cascades:
   - Inventory check (hub → OEM → partner → engineer buffer)
   - Warranty check (unit serial lookup)
   - Photo validation check (3 stages required)
4. ✅ PASS: All checks complete, can_release = true/false correctly set
5. ❌ FAIL: Precheck hangs or returns incorrect status

**Status**: ⬜ UI Not Implemented | ⬜ Ready to Test

---

### Test 7: SaPOS Offer Generation
**Status**: ⚠️ **EDGE FUNCTION EXISTS - UI PLACEHOLDER**

**Implemented**: `generate-sapos-offers` edge function (uses Lovable AI)
**Missing**: UI to trigger generation and display offers

**Test When UI Implemented**:
1. Complete work order
2. Trigger SaPOS offer generation
3. Verify AI generates 2-3 contextual offers
4. Check offer types: extended_warranty, upgrade, accessory
5. Verify warranty conflict detection
6. ✅ PASS: Relevant offers generated
7. ❌ FAIL: Offers irrelevant or warranty conflicts ignored

**Status**: ⬜ UI Not Implemented | ⬜ Ready to Test

---

### Test 8: Service Order Generation
**Status**: ⚠️ **EDGE FUNCTION EXISTS - UI PLACEHOLDER**

**Implemented**: `generate-service-order` edge function
**Missing**: UI to trigger generation, view HTML, and capture signatures

**Test When UI Implemented**:
1. Complete work order with photos validated
2. Trigger service order generation
3. Verify HTML content rendered correctly
4. Check QR code generated for photo evidence
5. Capture customer signature
6. Capture technician signature
7. Generate PDF
8. ✅ PASS: Service order PDF generated and downloadable
9. ❌ FAIL: Missing data or signatures

**Status**: ⬜ UI Not Implemented | ⬜ Ready to Test

---

### Test 9: Invoice Generation & Penalties
**Status**: ⚠️ **PLACEHOLDER DETECTED**

**Current Implementation**: Finance page shows static data
**Required Implementation**:
1. Invoice auto-generation from work order
2. Penalty matrix application (SLA violations, quality issues)
3. Dispute flow for penalties
4. Invoice approval/hold workflow

**Test When Implemented**:
1. Complete work order as engineer1@servicepro.com
2. Navigate to Finance as admin@servicepro.com
3. Verify invoice generated automatically
4. Check penalty applications (if any)
5. Test dispute flow
6. ✅ PASS: Invoice reflects correct charges and penalties
7. ❌ FAIL: Incorrect totals or missing penalties

**Status**: ⬜ Feature Not Implemented | ⬜ Ready to Test

---

### Test 10: Override Request & MFA Approval
**Status**: ✅ **IMPLEMENTED - READY TO TEST**

**Implemented**: Both edge functions + UI components exist
**Test Steps**:
1. Log in as `ops@techcorp.com`
2. Navigate to Work Orders
3. Find work order with failed precheck
4. Click "Request Override"
5. Provide reason: "Customer escalation"
6. Submit request
7. Log out
8. Log in as `admin@techcorp.com` (sys admin)
9. Navigate to Overrides page
10. Click "Approve Override"
11. ❌ Should FAIL: "MFA required"
12. Request MFA token
13. Enter 6-digit token
14. Approve override
15. ✅ PASS: Override approved, audit log created
16. ❌ FAIL: Approved without MFA or audit log missing

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Passed | ❌ Failed

---

## 🟢 MEDIUM PRIORITY - Supporting Features

### Test 11: Dispatch Management
**Status**: ⚠️ **PLACEHOLDER DETECTED**

**Current Implementation**: Dispatch page exists but no functional logic
**Required**: Assignment logic, scheduling, route optimization

**Status**: ⬜ Feature Not Implemented

---

### Test 12: Fraud Investigation
**Status**: ⚠️ **PLACEHOLDER DETECTED**

**Current Implementation**: Page exists but no fraud alerts populated
**Required**: Anomaly detection integration, alert generation, investigation workflow

**Status**: ⬜ Feature Not Implemented

---

### Test 13: Warranty Check Integration
**Status**: ✅ **IMPLEMENTED - READY TO TEST**

**Edge Function**: `check-warranty` exists
**Test Steps**:
1. Create work order with unit serial: TEST-SERIAL-001
2. Insert warranty record:
```sql
INSERT INTO warranty_records (unit_serial, warranty_start, warranty_end, coverage_type)
VALUES ('TEST-SERIAL-001', '2024-01-01', '2026-01-01', 'premium');
```
3. Trigger warranty check
4. ✅ PASS: Returns covered=true with warranty details
5. Test expired warranty (warranty_end < now())
6. ✅ PASS: Returns covered=false

**Status**: ⬜ Not Started | ⬜ Ready to Test

---

### Test 14: Inventory Cascade Check
**Status**: ✅ **IMPLEMENTED - READY TO TEST**

**Edge Function**: `check-inventory` exists
**Test Steps**:
1. Insert test inventory:
```sql
INSERT INTO inventory_items (sku, description, unit_price, consumable)
VALUES ('PART-TEST-001', 'Test Part', 50.00, false);

INSERT INTO stock_levels (item_id, location, qty_available, qty_reserved)
SELECT id, 'main', 10, 0 FROM inventory_items WHERE sku = 'PART-TEST-001';
```
2. Call edge function with parts: [{ sku: 'PART-TEST-001', quantity: 1 }]
3. ✅ PASS: Returns available=true, source='main'
4. Test unavailable part (qty_available = 0)
5. ✅ PASS: Returns available=false, source='procurement_required'

**Status**: ⬜ Not Started | ⬜ Ready to Test

---

### Test 15: Audit Trail & Compliance
**Status**: ✅ **IMPLEMENTED - READY TO TEST**

**Test Steps**:
1. Perform sensitive action (approve override, assign role)
2. Query audit logs:
```sql
SELECT * FROM audit_logs 
WHERE action = 'override_approved' 
ORDER BY created_at DESC 
LIMIT 10;
```
3. Verify log contains:
   - user_id (who performed action)
   - action (what was done)
   - resource_type & resource_id (what was affected)
   - changes (before/after)
   - mfa_verified (if MFA was used)
   - tenant_id (tenant scope)
   - ip_address & user_agent
   - correlation_id (for tracing)
4. ✅ PASS: All fields populated correctly
5. ❌ FAIL: Missing required fields

**Status**: ⬜ Not Started | ⬜ Ready to Test

---

## ⚪ LOW PRIORITY - UI/UX

### Test 16: Responsive Design
**Test on**: Mobile (375px), Tablet (768px), Desktop (1440px)
**Status**: ⬜ Not Started

### Test 17: Dark Mode
**Status**: ⬜ Not Implemented

### Test 18: Loading States & Error Handling
**Status**: ⬜ Not Started

---

## 📊 Test Execution Summary

### By Priority
| Priority | Total | Implemented | Placeholder | Passed | Failed |
|----------|-------|-------------|-------------|--------|--------|
| 🔴 Critical | 3 | 3 | 0 | 0 | 0 |
| 🟡 High | 7 | 4 | 3 | 0 | 0 |
| 🟢 Medium | 5 | 3 | 2 | 0 | 0 |
| ⚪ Low | 3 | 0 | 3 | 0 | 0 |
| **TOTAL** | **18** | **10** | **8** | **0** | **0** |

### Implementation Status
- ✅ **Fully Implemented**: 10 tests (55%)
- ⚠️ **Partially Implemented**: 5 tests (28%)
- ❌ **Not Implemented**: 3 tests (17%)

---

## 🚨 CRITICAL GAPS IDENTIFIED

### 1. Missing UI Integrations
**Impact**: HIGH - Edge functions exist but no UI to trigger them
- Precheck orchestration UI
- SaPOS offer generation UI
- Service order generation & signature capture UI

### 2. Placeholder Pages
**Impact**: HIGH - Pages exist but no functional logic
- Work Orders page (no CRUD operations)
- Tickets page (no ticket creation)
- Dispatch page (no assignment logic)
- Fraud Investigation page (no alerts)

### 3. Missing Workflows
**Impact**: MEDIUM - End-to-end flows not connected
- Ticket → Work Order → Precheck → Release → Service Order → Invoice flow
- Photo capture → Validation → Anomaly detection flow
- Override request → Approval → MFA → Audit flow (partially implemented)

---

## 📋 Next Steps

### Immediate Actions (Next 1-2 Days)
1. ✅ **COMPLETED**: Seed test accounts - DONE
2. 🔴 **DO NEXT**: Run Critical Tests 1-3 (Auth & RBAC)
3. 🟡 **THEN**: Test implemented edge functions (Tests 10, 13, 14, 15)
4. 📝 **DOCUMENT**: Log all failures and bugs

### Short-Term (Next Week)
1. Build UI integrations for existing edge functions
2. Connect end-to-end workflows
3. Replace placeholder pages with functional logic

### Medium-Term (Next 2 Weeks)
1. Implement missing features (dispatch, fraud, quotes)
2. Add UI/UX polish
3. Comprehensive regression testing
4. Performance testing with 160+ concurrent users

---

## 🐛 Bug Tracking

### Found Issues
| Test # | Issue | Severity | Status |
|--------|-------|----------|--------|
| - | (Log bugs here as you test) | - | - |

---

## 📞 Support

If you encounter issues during testing:
1. Check audit logs: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;`
2. Check edge function logs via Lovable Cloud dashboard
3. Verify RLS policies: `\d+ <table_name>` in psql
4. Review network requests in DevTools

**Critical Failures**: Stop testing and investigate immediately
**Non-Critical Issues**: Document and continue testing
