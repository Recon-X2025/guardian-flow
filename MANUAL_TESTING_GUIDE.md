# Manual Testing Guide - Migrated Components

**Date:** November 25, 2025  
**Purpose:** Step-by-step guide for manually testing all migrated components

---

## 🚀 Setup

### 1. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Should start on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Should start on http://localhost:5175
```

### 2. Seed Test Data

**Seed Test Accounts:**
```bash
curl -X POST http://localhost:3001/api/functions/seed-test-accounts
```

**Seed Work Orders (India Data):**
```bash
curl -X POST http://localhost:3001/api/functions/seed-india-data
```

### 3. Login

1. Navigate to http://localhost:5175
2. Login with: `admin@techcorp.com` / `Admin123!`
3. Verify you're logged in and see the dashboard

---

## 📋 Component Testing Checklist

### ✅ Critical Components (Test First)

#### 1. CreateWorkOrderDialog
**Location:** Tickets page → Create Work Order button

**Test Steps:**
- [ ] Navigate to Tickets page
- [ ] Click "Create Work Order" on a ticket
- [ ] Dialog opens without errors
- [ ] Technician dropdown loads (check browser console)
- [ ] Select a technician
- [ ] Click "Create Work Order"
- [ ] Verify success toast appears
- [ ] Verify work order is created
- [ ] Check browser console for errors

**Expected Results:**
- ✅ Dialog renders correctly
- ✅ Technicians load from API
- ✅ Work order created successfully
- ✅ Precheck triggered automatically
- ✅ No console errors

**API Calls to Verify:**
- `GET /api/db/query` - Fetch technicians
- `POST /api/db/work_orders` - Create work order
- `POST /api/functions/precheck-orchestrator` - Trigger precheck

---

#### 2. GenerateServiceOrderDialog
**Location:** Work Orders page → Generate Service Order button

**Test Steps:**
- [ ] Navigate to Work Orders page
- [ ] Find a completed work order
- [ ] Click "Generate Service Order"
- [ ] Dialog opens
- [ ] Click "Generate Service Order" button
- [ ] Wait for generation (loading spinner)
- [ ] Verify service order HTML displays
- [ ] Verify invoice is created automatically
- [ ] Check browser console for errors

**Expected Results:**
- ✅ Service order generated successfully
- ✅ Service order HTML content displays
- ✅ Invoice created automatically
- ✅ Work order status updated to 'completed'
- ✅ No console errors

**API Calls to Verify:**
- `POST /api/functions/generate-service-order`
- `POST /api/db/work_orders/{id}` - Update status
- `POST /api/db/invoices` - Create invoice

---

#### 3. FraudFeedbackDialog
**Location:** Fraud Investigation page → Feedback button

**Test Steps:**
- [ ] Navigate to Fraud Investigation page
- [ ] Click "Feedback" on a fraud alert
- [ ] Dialog opens
- [ ] Select label (True Positive/False Positive/Uncertain)
- [ ] Select confidence level
- [ ] Add investigation notes
- [ ] Click "Submit Feedback"
- [ ] Verify success message
- [ ] Check browser console for errors

**Expected Results:**
- ✅ Dialog renders correctly
- ✅ Form validation works
- ✅ Feedback submitted successfully
- ✅ Form resets after submission
- ✅ No console errors

**API Calls to Verify:**
- `POST /api/db/fraud_feedback` - Submit feedback

---

#### 4. PrecheckStatus
**Location:** Work Order Details page

**Test Steps:**
- [ ] Navigate to a work order
- [ ] Scroll to Precheck Status section
- [ ] Verify status displays (inventory, warranty, photo)
- [ ] Click "Run Precheck" button
- [ ] Wait for precheck to complete
- [ ] Verify status updates
- [ ] Check browser console for errors

**Expected Results:**
- ✅ Precheck status displays correctly
- ✅ Progress indicator shows 0-3 checks
- ✅ Precheck runs successfully
- ✅ Status updates after completion
- ✅ No console errors

**API Calls to Verify:**
- `GET /api/db/query` - Fetch precheck data
- `POST /api/functions/precheck-orchestrator` - Run precheck
- `POST /api/db/work_order_prechecks` - Update status

---

#### 5. Analytics Tabs
**Location:** Analytics page → Various tabs

**Test Steps for Each Tab:**

**OperationalTab:**
- [ ] Navigate to Analytics → Operational tab
- [ ] Verify OPCV data loads
- [ ] Verify work orders trend chart displays
- [ ] Check browser console for errors

**SLATab:**
- [ ] Navigate to Analytics → SLA tab
- [ ] Verify SLA metrics cards display
- [ ] Verify compliance percentage shows
- [ ] Check browser console for errors

**InventoryTab:**
- [ ] Navigate to Analytics → Inventory tab
- [ ] Verify inventory items table loads
- [ ] Verify item details display correctly
- [ ] Check browser console for errors

**FinancialTab:**
- [ ] Navigate to Analytics → Financial tab
- [ ] Verify invoice table loads
- [ ] Verify financial metrics display
- [ ] Check browser console for errors

**Expected Results:**
- ✅ All tabs render without errors
- ✅ Data loads from API
- ✅ Charts/tables display correctly
- ✅ No console errors

**API Calls to Verify:**
- `GET /api/db/query` - Various data fetches
- `POST /api/functions/opcv-summary` - OPCV data

---

### ✅ Secondary Components

#### 6. AddPenaltyRuleDialog
**Location:** Penalties page → Add Rule button

**Test Steps:**
- [ ] Navigate to Penalties page
- [ ] Click "Add Penalty Rule"
- [ ] Fill in form fields
- [ ] Submit form
- [ ] Verify rule created
- [ ] Check browser console

**Expected Results:**
- ✅ Form validation works
- ✅ Rule created successfully
- ✅ No console errors

---

#### 7. AddInventoryItemDialog
**Location:** Inventory page → Add Item button

**Test Steps:**
- [ ] Navigate to Inventory page
- [ ] Click "Add Item"
- [ ] Fill in SKU, description, price
- [ ] Submit form
- [ ] Verify item created
- [ ] Check browser console

**Expected Results:**
- ✅ Form validation works
- ✅ Item created successfully
- ✅ No console errors

---

#### 8. TriggerPrecheckDialog
**Location:** Work Orders page → Trigger Precheck button

**Test Steps:**
- [ ] Navigate to Work Orders
- [ ] Click "Trigger Precheck" on a work order
- [ ] Dialog opens
- [ ] Click "Run Precheck"
- [ ] Verify results display
- [ ] Check browser console

**Expected Results:**
- ✅ Precheck runs successfully
- ✅ Results display correctly
- ✅ Work order status updates if can_release
- ✅ No console errors

---

#### 9. GenerateOfferDialog
**Location:** Work Orders page → Generate Offers button

**Test Steps:**
- [ ] Navigate to Work Orders
- [ ] Click "Generate Offers"
- [ ] Dialog opens
- [ ] Click "Generate Offers" button
- [ ] Verify offers generated
- [ ] Check browser console

**Expected Results:**
- ✅ Offers generated successfully
- ✅ Success message displays
- ✅ No console errors

---

#### 10. OperationalCommandView
**Location:** Analytics → Operational tab (embedded)

**Test Steps:**
- [ ] Navigate to Analytics → Operational tab
- [ ] Verify OPCV component displays
- [ ] Verify stage cards show data
- [ ] Verify forecast breaches display
- [ ] Verify top engineers display
- [ ] Check browser console

**Expected Results:**
- ✅ All OPCV sections render
- ✅ Data loads from API
- ✅ No console errors

---

## 🐛 Common Issues to Watch For

### 1. Array vs Single Object
**Symptom:** `Cannot read property 'property' of undefined`
**Fix:** Use `data[0]` instead of `data` when expecting single object

### 2. Missing .then()
**Symptom:** Promise not resolving, data never loads
**Fix:** Ensure all apiClient queries end with `.then()`

### 3. Function Invoke Pattern
**Symptom:** `data is not defined` errors
**Fix:** Use `result.data` instead of destructured `{ data, error }`

### 4. Network Errors
**Symptom:** Components show loading forever
**Fix:** Check backend is running, verify API endpoints

---

## 📊 Test Results Template

```
## Manual Test Results - [Date]

### CreateWorkOrderDialog
- Renders: ✅/❌
- Loads technicians: ✅/❌
- Creates work order: ✅/❌
- Errors handled: ✅/❌
- Console errors: None/List errors
- Notes: _______________

### GenerateServiceOrderDialog
- Renders: ✅/❌
- Generates SO: ✅/❌
- Creates invoice: ✅/❌
- Errors handled: ✅/❌
- Console errors: None/List errors
- Notes: _______________

[Continue for all components...]

## Summary
- Components tested: X/21
- Passing: X
- Failing: X
- Issues found: [List]
```

---

## ✅ Success Criteria

All components should:
- ✅ Render without errors
- ✅ Load data correctly
- ✅ Handle form submissions
- ✅ Display success/error messages
- ✅ Have no console errors
- ✅ Maintain existing functionality

---

## 🚨 If Tests Fail

1. **Check Browser Console**
   - Look for JavaScript errors
   - Check network tab for failed API calls
   - Verify error messages

2. **Check Backend Logs**
   - Verify server is running
   - Check for API errors
   - Verify database connection

3. **Verify API Endpoints**
   - Test endpoints directly with curl
   - Check response format matches expected

4. **Check Component Code**
   - Verify apiClient usage is correct
   - Check for missing `.then()` calls
   - Verify variable references

---

**Last Updated:** November 25, 2025  
**Next Review:** After testing completion

