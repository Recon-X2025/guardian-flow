# Component Migration Testing Plan

**Date:** November 25, 2025  
**Status:** Ready for Testing  
**Migrated Components:** 21 files

---

## 🎯 Testing Objectives

Verify that all migrated components:
1. ✅ Use `apiClient` instead of `supabase`
2. ✅ Handle API responses correctly
3. ✅ Display data without errors
4. ✅ Handle errors gracefully
5. ✅ Maintain existing functionality

---

## 📋 Test Categories

### 1. Import Verification Tests
**Goal:** Verify all components use `apiClient`
- [ ] Check for any remaining `supabase` imports
- [ ] Verify all imports use `@/integrations/api/client`

### 2. Component Rendering Tests
**Goal:** Ensure components render without errors
- [ ] CreateWorkOrderDialog renders
- [ ] GenerateServiceOrderDialog renders
- [ ] FraudFeedbackDialog renders
- [ ] PrecheckStatus renders
- [ ] Analytics tabs render (Operational, SLA, Inventory, Financial)
- [ ] OperationalCommandView renders

### 3. Data Loading Tests
**Goal:** Verify components fetch data correctly
- [ ] Work orders load in CreateWorkOrderDialog
- [ ] Technicians load correctly
- [ ] Inventory items load in InventoryTab
- [ ] Financial data loads in FinancialTab
- [ ] SLA metrics load in SLATab

### 4. Form Submission Tests
**Goal:** Verify create/update operations work
- [ ] CreateWorkOrderDialog creates work orders
- [ ] AddPenaltyRuleDialog adds rules
- [ ] AddInventoryItemDialog adds items
- [ ] TechnicianDialog saves technicians
- [ ] ContractDialog creates contracts

### 5. Function Invocation Tests
**Goal:** Verify edge function calls work
- [ ] GenerateServiceOrderDialog invokes generate-service-order
- [ ] TriggerPrecheckDialog invokes precheck-orchestrator
- [ ] GenerateOfferDialog invokes generate-offers
- [ ] FraudFeedbackDialog submits feedback

### 6. Error Handling Tests
**Goal:** Verify graceful error handling
- [ ] Network errors display user-friendly messages
- [ ] Missing data doesn't crash components
- [ ] API errors are logged appropriately

---

## 🧪 Manual Testing Checklist

### Critical Components (Test First)

#### CreateWorkOrderDialog
- [ ] Opens without errors
- [ ] Loads technicians list
- [ ] Creates work order successfully
- [ ] Shows success toast
- [ ] Triggers precheck automatically

#### GenerateServiceOrderDialog
- [ ] Opens for valid work order
- [ ] Generates service order via function
- [ ] Updates work order status
- [ ] Creates invoice automatically
- [ ] Displays service order content

#### FraudFeedbackDialog
- [ ] Opens for fraud alert
- [ ] User authentication check works
- [ ] Submits feedback successfully
- [ ] Resets form after submission

#### PrecheckStatus
- [ ] Fetches precheck data
- [ ] Displays status correctly
- [ ] Runs precheck orchestration
- [ ] Updates status after completion

#### Analytics Tabs
- [ ] OperationalTab loads trend data
- [ ] SLATab loads SLA metrics
- [ ] InventoryTab loads inventory items
- [ ] FinancialTab loads invoice data
- [ ] EnhancedSLATab loads all data

### Secondary Components

#### Dialog Components
- [ ] AddPenaltyRuleDialog - Creates penalty rules
- [ ] AddInventoryItemDialog - Adds inventory items
- [ ] TechnicianDialog - Creates/updates technicians
- [ ] ContractDialog - Creates contracts
- [ ] MFAOverrideDialog - Submits override requests

#### Utility Components
- [ ] NLPQueryExecutor - Executes NLP queries
- [ ] OperationalCommandView - Displays OPCV data
- [ ] SecurityDashboard - Shows security metrics
- [ ] PurchaseOrderDialog - Creates purchase orders

---

## 🔧 Automated Testing Strategy

### Unit Tests
Create tests for individual component functions:

```typescript
// Example: CreateWorkOrderDialog.test.tsx
describe('CreateWorkOrderDialog', () => {
  it('should load technicians on open', async () => {
    // Mock apiClient response
    // Render component
    // Verify technicians loaded
  });
  
  it('should create work order on submit', async () => {
    // Mock form submission
    // Verify API call made
    // Check success callback
  });
});
```

### Integration Tests
Test component interactions with API:

```typescript
// Example: WorkOrderFlow.test.tsx
describe('Work Order Creation Flow', () => {
  it('should create work order and trigger precheck', async () => {
    // Create work order
    // Verify precheck triggered
    // Check status updates
  });
});
```

### E2E Tests
Use Playwright for full user flows:

```typescript
// Example: work-order-flow.spec.ts
test('complete work order creation flow', async ({ page }) => {
  // Login
  // Navigate to tickets
  // Create work order
  // Verify work order created
  // Check precheck status
});
```

---

## 📝 Test Execution Plan

### Phase 1: Smoke Tests (1-2 hours)
**Goal:** Verify nothing is completely broken
- ✅ Run linter (already passed)
- [ ] Start dev server
- [ ] Navigate to each migrated component
- [ ] Check browser console for errors
- [ ] Verify basic rendering

### Phase 2: Functional Tests (2-4 hours)
**Goal:** Test core functionality
- [ ] Test CreateWorkOrderDialog end-to-end
- [ ] Test GenerateServiceOrderDialog flow
- [ ] Test analytics tabs data loading
- [ ] Test form submissions
- [ ] Test function invocations

### Phase 3: Edge Cases (1-2 hours)
**Goal:** Test error scenarios
- [ ] Network failures
- [ ] Empty data responses
- [ ] Invalid form inputs
- [ ] Missing authentication
- [ ] API errors

### Phase 4: Regression Tests (2-3 hours)
**Goal:** Ensure no functionality lost
- [ ] Compare behavior with previous Supabase version
- [ ] Test all dialog workflows
- [ ] Verify data accuracy
- [ ] Check performance (should be similar)

---

## 🐛 Known Issues to Watch For

1. **Array vs Single Object Returns**
   - apiClient returns arrays, Supabase sometimes returned single objects
   - Watch for: `data.property` vs `data[0].property`

2. **Missing .then() Calls**
   - All apiClient queries need `.then()`
   - Watch for: Unresolved promises

3. **Function Invoke Patterns**
   - apiClient uses `result.data` not destructured `{ data, error }`
   - Watch for: Undefined variables

4. **Error Response Format**
   - apiClient error format may differ
   - Watch for: Error handling breaking

---

## ✅ Success Criteria

### Minimum (Must Pass)
- [ ] All components render without errors
- [ ] No console errors in browser
- [ ] All form submissions work
- [ ] Data loads correctly
- [ ] Error messages display appropriately

### Target (Should Pass)
- [ ] All components tested manually
- [ ] Unit tests written for critical components
- [ ] Integration tests for main flows
- [ ] Performance similar to before
- [ ] No regression in functionality

### Stretch (Nice to Have)
- [ ] Full test coverage (>80%)
- [ ] Automated E2E tests
- [ ] Performance improvements
- [ ] Enhanced error handling

---

## 🚀 Quick Start Testing

### 1. Start Development Server
```bash
cd server
npm run dev  # Backend on port 3001

# In another terminal
npm run dev  # Frontend on port 5175
```

### 2. Seed Test Data
```bash
# Seed test accounts
curl -X POST http://localhost:3001/api/functions/seed-test-accounts

# Seed India data (work orders)
curl -X POST http://localhost:3001/api/functions/seed-india-data
```

### 3. Run Manual Tests
1. Login with `admin@techcorp.com` / `Admin123!`
2. Navigate through each component
3. Check browser console for errors
4. Verify functionality works

### 4. Run Automated Tests
```bash
# Unit tests
npm run test

# E2E tests (requires server running)
npm run test:e2e
```

---

## 📊 Test Results Template

```
## Component Test Results

### CreateWorkOrderDialog
- [ ] Renders: ✅/❌
- [ ] Loads technicians: ✅/❌
- [ ] Creates work order: ✅/❌
- [ ] Errors handled: ✅/❌
- Notes: _______________

### GenerateServiceOrderDialog
- [ ] Renders: ✅/❌
- [ ] Generates SO: ✅/❌
- [ ] Creates invoice: ✅/❌
- [ ] Errors handled: ✅/❌
- Notes: _______________

[Continue for all components...]
```

---

## 🎯 Next Steps After Testing

1. **Fix any issues found** during testing
2. **Document known limitations** if any
3. **Update migration checklist** with test results
4. **Create test reports** for stakeholders
5. **Plan page-level migrations** (if needed)

---

**Last Updated:** November 25, 2025  
**Next Review:** After testing completion

