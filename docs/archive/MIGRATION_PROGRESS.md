# legacy service Migration Progress
**Date:** November 25, 2025

## ✅ Completed

### 1. Forecast Generation Implementation
- [x] Added forecast tables to `init-db.sql`:
  - `forecast_models`
  - `forecast_outputs`
  - `forecast_queue`
  - `forecast_history`
- [x] Implemented `POST /api/functions/run-forecast-now` endpoint
- [x] Implemented `POST /api/functions/get-forecast-metrics` endpoint
- [x] Added forecast calculation logic based on historical work orders
- [x] Added geography-based forecast generation

### 2. Module Sandbox Migration
- [x] Migrated `ModuleSandboxProvider.tsx` to use `apiClient`
- [x] Removed legacy service dependencies
- [x] Added `current_module_context` column to profiles table

### 3. Auth Pages Migration (✅ COMPLETE)
- [x] `AssetAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `FSMAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `ForecastingAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `FraudAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `MarketplaceAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `AnalyticsAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `CustomerAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `TrainingAuth.tsx` - Migrated to use `useAuth()` hook
- [x] `UnifiedPlatformAuth.tsx` - Already migrated (no legacy service references)

### 4. Core Pages Migration (In Progress)
- [x] `Dashboard.tsx` - Fully migrated to `apiClient`
- [ ] `WorkOrders.tsx` - 4 legacy service references remaining
- [ ] `Tickets.tsx` - 3 legacy service references remaining

## 📋 Remaining Work

### High Priority
1. **Complete Auth Pages Migration** (8 files remaining)
   - Replace `apiClient.auth.getUser()` with `useAuth().user`
   - Replace `apiClient.auth.signOut()` with `useAuth().signOut()`

2. **Migrate Core Pages** (Priority order)
   - `Dashboard.tsx`
   - `WorkOrders.tsx`
   - `Tickets.tsx`
   - `PendingValidation.tsx`

3. **Migrate Components**
   - Components using `apiClient` for data fetching
   - Components using `apiClient.functions.invoke()`

### Medium Priority
4. **Implement Missing Express.js Route Handlers**
   - `seed-test-accounts` - Backend implementation
   - `validate-photos` - Photo validation logic
   - `release-work-order` - Work order release

5. **Database Schema Updates**
   - Ensure all required columns exist
   - Add missing indexes

## 📊 Statistics

- **Total files with legacy service references:** ~115
- **Files migrated:** ~20
- **Migration progress:** ~17%
- **Critical paths migrated:** 
  - ✅ Forecast generation
  - ✅ Module sandbox
  - ✅ All 9 auth pages
  - ✅ Dashboard page

## 🔄 Next Steps

1. Continue migrating auth pages (batch process)
2. Migrate core pages (Dashboard, WorkOrders, Tickets)
3. Migrate components systematically
4. Remove legacy service dependencies from package.json
5. Test all migrated functionality

---

**Last Updated:** November 25, 2025

