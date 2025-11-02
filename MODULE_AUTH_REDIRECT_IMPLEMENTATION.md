# Module-Specific Authentication Redirect Implementation

## Overview
Implemented role-based redirects after authentication so users are directed to their module-specific landing pages based on their roles, instead of everyone going to the platform dashboard.

## Changes Made

### 1. Created Redirect Utility (`src/utils/getRedirectRoute.ts`)
- **Purpose**: Centralized logic to determine redirect routes based on user roles and module context
- **Features**:
  - Handles both module-specific auth (e.g., `/auth/fsm`) and platform auth (`/auth`)
  - Maps user roles to appropriate landing pages
  - Supports all 10 modules (platform, fsm, asset, forecasting, fraud, marketplace, analytics, customer, training, forensics)

### 2. Updated All Module Auth Pages
Updated all 9 module-specific auth pages to use role-based redirects:

- **UnifiedPlatformAuth** (`/auth`) - Platform authentication
- **FSMAuth** (`/auth/fsm`) - Field Service Management
- **AssetAuth** (`/auth/asset`) - Asset Lifecycle Management  
- **ForecastingAuth** (`/auth/forecasting`) - AI Forecasting
- **FraudAuth** (`/auth/fraud`) - Fraud Detection
- **MarketplaceAuth** (`/auth/marketplace`) - Marketplace
- **AnalyticsAuth** (`/auth/analytics`) - Analytics Platform
- **CustomerAuth** (`/auth/customer`) - Customer Portal
- **TrainingAuth** (`/auth/training`) - Training Platform

**Changes in each**:
- Import `useRBAC` hook and `getRedirectRoute` utility
- Call `refreshRoles()` after successful sign-in
- Use `getRedirectRoute(roles, moduleId)` to determine redirect path
- Navigate to module-specific landing page

### 3. Updated ProtectedRoute Component
- Added logic to redirect authenticated users away from `/auth` page
- Uses `getRedirectRoute()` to determine appropriate landing page
- Prevents authenticated users from seeing auth forms

### 4. Updated AnalyticsPlatformAuth
- Updated `handleQuickLogin` to use role-based redirects
- Ensures quick login buttons also redirect correctly

## Redirect Logic by Module

### Platform (`/auth`)
- **sys_admin** / **tenant_admin** → `/dashboard`
- **dispatcher** / **technician** → `/work-orders`
- **ops_manager** → `/dashboard`
- **finance_manager** → `/finance`
- **fraud_investigator** → `/fraud`
- **auditor** → `/compliance-dashboard`
- **partner_admin** / **partner_user** → `/marketplace`
- **ml_ops** / **product_owner** → `/analytics-platform`
- **customer** → `/customer-portal`
- **support_agent** → `/training`
- **billing_agent** → `/payments`
- **Default** → `/dashboard`

### FSM (`/auth/fsm`)
- **dispatcher** / **technician** → `/work-orders`
- **Default** → `/modules/field-service`

### Asset (`/auth/asset`)
- **Default** → `/equipment`

### Forecasting (`/auth/forecasting`)
- **Default** → `/forecast`

### Fraud (`/auth/fraud`)
- **fraud_investigator** → `/fraud`
- **auditor** → `/compliance-dashboard`
- **Default** → `/modules/fraud-compliance`

### Marketplace (`/auth/marketplace`)
- **partner_admin** / **sys_admin** → `/marketplace-management`
- **Default** → `/marketplace`

### Analytics (`/auth/analytics`)
- **Default** → `/analytics-platform`

### Customer (`/auth/customer`)
- **Default** → `/customer-portal`

### Training (`/auth/training`)
- **Default** → `/training`

## Technical Details

### Role Refresh After Sign-In
- All auth pages call `refreshRoles()` after successful authentication
- 300ms delay to ensure RBAC context updates before redirect
- Handles async state updates in React

### Type Safety
- `getRedirectRoute` accepts both `AppRole[]` and `UserRole[]`
- Automatically extracts role strings from UserRole objects
- Type-safe mapping to landing pages

## Testing Recommendations

1. **Test Each Module Auth**:
   - Sign in to each module auth page (`/auth/fsm`, `/auth/asset`, etc.)
   - Verify redirect to correct module landing page
   - Test with different user roles

2. **Test Platform Auth**:
   - Sign in via `/auth` with different roles
   - Verify role-based redirects work correctly

3. **Test Already Authenticated**:
   - Sign in, then navigate to `/auth`
   - Should redirect to appropriate landing page

4. **Test Role Combinations**:
   - Users with multiple roles should get highest priority redirect
   - Priority: Admin > Module-specific > Default

## Files Modified

1. `src/utils/getRedirectRoute.ts` - **NEW FILE**
2. `src/pages/auth/UnifiedPlatformAuth.tsx`
3. `src/pages/auth/FSMAuth.tsx`
4. `src/pages/auth/AssetAuth.tsx`
5. `src/pages/auth/ForecastingAuth.tsx`
6. `src/pages/auth/FraudAuth.tsx`
7. `src/pages/auth/MarketplaceAuth.tsx`
8. `src/pages/auth/AnalyticsAuth.tsx`
9. `src/pages/auth/CustomerAuth.tsx`
10. `src/pages/auth/TrainingAuth.tsx`
11. `src/components/ProtectedRoute.tsx`
12. `src/pages/AnalyticsPlatformAuth.tsx`

## Status
✅ **Implementation Complete**
- All module auth pages redirect based on roles
- Platform auth redirects based on roles
- ProtectedRoute handles authenticated users on /auth
- Type-safe and error-free

