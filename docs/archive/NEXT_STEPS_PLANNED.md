# Next Steps - Planned Actions

**Date:** November 25, 2025  
**Current Status:** Component Migration Complete | Testing Ready

---

## 🎯 Immediate Next Steps (This Week)

### 1. ✅ Component Migration - COMPLETE
**Status:** ✅ **100% Complete**
- ✅ All 21 component files migrated
- ✅ All hooks migrated
- ✅ Zero legacy API references
- ✅ Smoke tests passing (25/25)

**Next Action:** None - Complete!

---

### 2. ⏳ Manual Testing (Priority: HIGH)
**Status:** Ready to Start  
**Estimated Time:** 4-6 hours  
**Guide:** `MANUAL_TESTING_GUIDE.md`

**Tasks:**
- [ ] Start development servers (backend + frontend)
- [ ] Seed test data (accounts + work orders)
- [ ] Test critical components:
  - [ ] CreateWorkOrderDialog
  - [ ] GenerateServiceOrderDialog
  - [ ] FraudFeedbackDialog
  - [ ] PrecheckStatus
  - [ ] Analytics tabs (Operational, SLA, Inventory, Financial)
- [ ] Test secondary components
- [ ] Document test results
- [ ] Fix any issues found

**Acceptance Criteria:**
- All components render without errors
- No console errors in browser
- All form submissions work
- Data loads correctly
- Error messages display appropriately

---

### 3. ⏳ Fix Unit Tests (Priority: MEDIUM)
**Status:** Tests Created, Need Refinement  
**Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Fix mocking setup in unit tests
- [ ] Ensure all component tests pass
- [ ] Add tests for remaining components (17 more)
- [ ] Improve test coverage

**Current Status:**
- ✅ 4 component tests created
- ⚠️ Some tests need better mocking
- ⏳ 17 components still need tests

---

## 📅 Short Term (Next 2 Weeks)

### 4. ⏳ Complete Forecast Generation (Priority: HIGH)
**Status:** Partially Implemented  
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] Verify `forecast_outputs` table exists
- [ ] Complete forecast calculation logic
- [ ] Test forecast generation with seeded data
- [ ] Verify forecast data appears in Forecast Center UI
- [ ] Test forecast metrics endpoint

**Files:**
- `server/routes/functions.js` - `run-forecast-now` endpoint
- `src/pages/ForecastCenter.tsx` - UI verification

**Note:** Table already exists, logic is implemented - needs testing/verification

---

### 5. ⏳ Page-Level Migrations (Priority: MEDIUM)
**Status:** Not Started  
**Estimated Time:** 1-2 weeks (can be incremental)

**Scope:** ~31 page files in `src/pages/` still reference legacy API

**High Priority Pages:**
- [ ] `src/pages/Dashboard.tsx`
- [ ] `src/pages/WorkOrders.tsx`
- [ ] `src/pages/Tickets.tsx`
- [ ] `src/pages/auth/*.tsx` (9 auth pages)
- [ ] `src/pages/ForecastCenter.tsx`

**Approach:**
- Migrate as pages are actively developed
- Or do dedicated migration sprint
- Follow same patterns as component migration

**Note:** Lower priority since components are done - pages can be migrated incrementally

---

### 6. ⏳ Module Sandbox Verification (Priority: MEDIUM)
**Status:** Already Migrated, Needs Testing  
**Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Verify `ModuleSandboxProvider.tsx` works correctly
- [ ] Test module-specific logins (Asset, FSM, Forecasting, etc.)
- [ ] Verify sidebar filtering works after module login
- [ ] Test module context saving

**Note:** Already uses apiClient - just needs verification testing

---

### 7. ⏳ Expand Test Coverage (Priority: MEDIUM)
**Status:** Started  
**Estimated Time:** 1 week

**Tasks:**
- [ ] Add unit tests for remaining 17 components
- [ ] Create integration tests for critical flows
- [ ] Add E2E tests for main user journeys
- [ ] Achieve >80% test coverage

**Current Coverage:**
- ✅ Smoke tests: 25/25 (100%)
- ⚠️ Unit tests: 4/21 components (~19%)
- ⏳ E2E tests: 0 critical flows

---

## 🎯 Medium Term (Next Month)

### 8. ⏳ Implement Missing Express.js Route Handlers (Priority: MEDIUM)
**Status:** Many Placeholders Exist  
**Estimated Time:** 1 week

**Critical Functions:**
- [ ] `validate-photos` - Photo validation logic
- [ ] `release-work-order` - Work order release workflow
- [ ] `generate-service-order` - Service order creation (may already exist)
- [ ] `precheck-orchestrator` - Precheck orchestration (may already exist)

**Note:** Some functions may already be implemented - needs audit

---

### 9. ⏳ Error Handling Improvements (Priority: MEDIUM)
**Status:** Basic Implementation Exists  
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Standardize error response format
- [ ] Add error boundaries to React components
- [ ] Improve user-facing error messages
- [ ] Add error logging/monitoring
- [ ] Handle network errors gracefully

---

### 10. ⏳ Performance Optimization (Priority: LOW-MEDIUM)
**Status:** Not Optimized  
**Estimated Time:** 1 week

**Tasks:**
- [ ] Add database query caching
- [ ] Implement pagination for large datasets
- [ ] Optimize slow queries
- [ ] Add lazy loading for components
- [ ] Optimize bundle size

---

## 📊 Priority Summary

### 🔴 High Priority (Do First)
1. ⏳ **Manual Testing** - Verify migrated components work
2. ⏳ **Forecast Generation** - Complete implementation
3. ⏳ **Fix Unit Tests** - Ensure test suite is solid

### 🟡 Medium Priority (Do Soon)
4. ⏳ **Page-Level Migrations** - Complete legacy API removal
5. ⏳ **Module Sandbox Testing** - Verify functionality
6. ⏳ **Expand Test Coverage** - Add more automated tests
7. ⏳ **Express.js Route Handlers** - Implement missing functions

### 🟢 Low Priority (Do Later)
8. ⏳ **Error Handling** - Improve user experience
9. ⏳ **Performance** - Optimize for scale
10. ⏳ **Documentation** - Complete API docs

---

## 🚀 Recommended Action Plan

### Week 1 (This Week)
**Focus:** Testing & Verification
- [ ] Day 1-2: Manual testing of all migrated components
- [ ] Day 3: Fix any issues found during testing
- [ ] Day 4: Refine unit tests, ensure they pass
- [ ] Day 5: Verify forecast generation works

### Week 2
**Focus:** Page Migrations
- [ ] Migrate high-priority pages (Dashboard, WorkOrders, Tickets)
- [ ] Migrate auth pages
- [ ] Test migrated pages

### Week 3-4
**Focus:** Polish & Optimization
- [ ] Complete remaining page migrations
- [ ] Implement missing Express.js route handlers
- [ ] Improve error handling
- [ ] Performance optimization

---

## ✅ Quick Reference

### Testing
- **Smoke Tests:** `npm run test tests/components/migration-smoke.test.tsx`
- **All Tests:** `npm run test`
- **Manual Guide:** `MANUAL_TESTING_GUIDE.md`

### Migration
- **Component Status:** ✅ 100% Complete (21/21)
- **Page Status:** ⏳ 0% Complete (0/31)
- **Pattern Guide:** `API_MIGRATION_CHECKLIST.md`

### Development
- **Start Backend:** `cd server && npm run dev`
- **Start Frontend:** `npm run dev`
- **Seed Data:** See `MANUAL_TESTING_GUIDE.md`

---

## 📝 Notes

- **Component migration is complete** - All components use apiClient
- **Page migrations are optional** - Can be done incrementally
- **Testing is the immediate priority** - Verify everything works
- **Forecast generation needs verification** - Logic exists, needs testing

---

**Last Updated:** November 25, 2025  
**Next Review:** After manual testing completion

