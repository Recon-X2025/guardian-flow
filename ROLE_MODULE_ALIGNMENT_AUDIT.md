# Role-to-Module Alignment Audit & Fixes

## Issues Identified

### 1. Finance Manager Accounts Appearing in Analytics Platform
**Problem**: Finance Manager accounts have `module: 'analytics-bi'`, which makes them appear on `/auth/analytics` login page, but they don't have access to `/analytics-platform` route.

**Root Cause**: 
- Finance Managers use `analytics-bi` for financial reporting (BI dashboards, financial analytics)
- BUT they should access via Platform login to go to `/finance` dashboard, not Analytics Platform login
- Analytics Platform (`/analytics-platform`) is for ML Ops, Product Owners - full analytics platform access

**Fix Applied**:
1. Updated `MODULE_MAP['analytics']` to only include `['analytics-platform']`, removing `'analytics-bi'`
2. Finance Manager accounts with `module: 'analytics-bi'` now only appear on Platform login
3. Updated redirect logic so Finance Managers logging via analytics (if they somehow do) go to `/finance`

### 2. Access Denied Errors
**Problem**: Users logging into modules get redirected to routes they don't have permissions for.

**Root Cause**: Redirect logic doesn't check permissions before redirecting.

**Fix Applied**:
1. Updated analytics module redirect to check roles and redirect Finance Managers to `/finance`
2. Added fallback to `/dashboard` for roles without proper permissions
3. Fraud module already has proper role checks

## Role-to-Module Correct Alignment

### Platform Login (`/auth`)
- **All roles** - Used for general platform access
- Finance Managers → `/finance`
- Operations Managers → `/dashboard` or `/work-orders`
- Fraud Investigators → `/fraud`
- etc.

### Field Service Management (`/auth/fsm`)
- **Should show**: `dispatcher`, `technician`, `ops_manager`, `partner_admin`, `partner_user`
- **Module**: `field-service`
- **Redirects to**: `/work-orders`

### Asset Lifecycle (`/auth/asset`)
- **Should show**: `ops_manager`, `technician` (maintenance-focused)
- **Module**: `asset-lifecycle`
- **Redirects to**: `/equipment`

### AI Forecasting (`/auth/forecasting`)
- **Should show**: `ops_manager`, `dispatcher`, `ml_ops`
- **Module**: `ai-forecasting`
- **Redirects to**: `/forecast`

### Fraud Detection (`/auth/fraud`)
- **Should show**: `fraud_investigator`, `auditor`, `client_fraud_manager`, `client_compliance_officer`
- **Module**: `fraud-compliance`, `compliance-automation`
- **Redirects to**: 
  - `fraud_investigator` → `/fraud`
  - `auditor` → `/compliance-dashboard`
  - Others → `/dashboard`

### Analytics Platform (`/auth/analytics`)
- **Should show**: `ml_ops`, `product_owner` (full platform access)
- **Should NOT show**: `finance_manager` (they use analytics-bi via Platform login)
- **Module**: `analytics-platform` only
- **Redirects to**: 
  - `ml_ops`, `product_owner` → `/analytics-platform`
  - `finance_manager` → `/finance` (if they somehow log in)
  - Others → `/dashboard`

### Marketplace (`/auth/marketplace`)
- **Should show**: `partner_admin`, `partner_user`, `product_owner`
- **Module**: `marketplace`
- **Redirects to**: `/marketplace` or `/marketplace-management`

### Customer Portal (`/auth/customer`)
- **Should show**: `customer` role
- **Module**: `customer-portal`
- **Redirects to**: `/customer-portal`

### Training (`/auth/training`)
- **Should show**: `support_agent`, `technician`, `dispatcher`
- **Module**: `video-training`
- **Redirects to**: `/training`

## Test Accounts That Need Module Changes

### Finance Manager Accounts
**Current**: `module: 'analytics-bi'` (appears on Analytics Platform login)
**Should be**: `module: 'platform'` or create a separate `'finance'` module
**Reason**: Finance Managers should access via Platform login, not Analytics Platform login

### Client Finance Managers
**Current**: `module: 'analytics-bi'`
**Should be**: `module: 'platform'`
**Reason**: Same as above - they need Finance dashboard, not Analytics Platform

## Recommended Test Account Module Assignments

| Role | Primary Module | Should Appear On |
|------|---------------|------------------|
| `finance_manager` | `platform` or `finance` | Platform login only |
| `ops_manager` | `field-service` | FSM login |
| `technician` | `field-service` | FSM login |
| `dispatcher` | `field-service` | FSM login |
| `fraud_investigator` | `fraud-compliance` | Fraud login |
| `auditor` | `compliance-automation` | Fraud login |
| `ml_ops` | `analytics-platform` | Analytics login |
| `product_owner` | `analytics-platform` or `marketplace` | Analytics or Marketplace login |
| `partner_admin` | `marketplace` or `field-service` | Marketplace or FSM login |
| `client_finance_manager` | `platform` | Platform login only |

## Next Steps

1. ✅ Updated MODULE_MAP to exclude analytics-bi from analytics module
2. ✅ Updated redirect logic for analytics module
3. ⏳ Update Finance Manager test accounts to use `module: 'platform'` instead of `'analytics-bi'`
4. ⏳ Verify all role-to-module alignments are correct
5. ⏳ Test each module login to ensure correct accounts appear and redirects work

