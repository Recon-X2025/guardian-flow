# Guardian Flow - Build Execution Guide

**Purpose:** Step-by-step executable instructions for building, testing, and deploying Guardian Flow  
**Last Updated:** December 2025  
**Status:** Ready for Execution

---

## 🚀 Quick Start Checklist

### Pre-Flight Checks (5 minutes)

```bash
# 1. Verify Node.js version
node --version  # Should be 18.x or higher

# 2. Verify PostgreSQL is running
pg_isready  # Should return: accepting connections

# 3. Verify project structure
ls -la  # Should show: server/, src/, package.json, etc.

# 4. Check if .env exists
ls server/.env  # If missing, see "Initial Setup" section
```

---

## 📋 Phase 1: Initial Setup (First Time Only)

### Step 1.1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

**Expected Output:** No errors, all packages installed

---

### Step 1.2: Database Setup

```bash
# 1. Create database (if not exists)
createdb guardianflow 2>/dev/null || echo "Database already exists"

# 2. Run initial schema
psql -U postgres -d guardianflow -f server/scripts/init-db.sql

# 3. Run migrations
cd server
npm run migrate
cd ..
```

**Verify:**
```bash
psql -U postgres -d guardianflow -c "\dt" | head -20
# Should show tables: users, work_orders, invoices, etc.
```

**Expected Output:** Tables created successfully

---

### Step 1.3: Environment Configuration

```bash
# 1. Copy environment template (if .env doesn't exist)
if [ ! -f server/.env ]; then
  cat > server/.env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianflow
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production-use-strong-random-string

# Frontend URL (for CORS and webhook redirects)
FRONTEND_URL=http://localhost:5175

# Server Port
PORT=3001

# Storage Configuration
STORAGE_DIR=./storage
PUBLIC_URL=http://localhost:3001

# Payment Gateway Configuration (add your keys)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# RAZORPAY_KEY_ID=rzp_test_...
# RAZORPAY_KEY_SECRET=...
EOF
  echo "✅ Created server/.env - Update with your credentials"
else
  echo "✅ server/.env already exists"
fi
```

**Action Required:** Edit `server/.env` with your database credentials and payment gateway keys

---

### Step 1.4: Start Development Servers

```bash
# Terminal 1: Start Backend
cd server
npm run dev

# Terminal 2: Start Frontend
npm run dev
```

**Verify Backend:**
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Verify Frontend:**
- Open browser to http://localhost:5175
- Should see Guardian Flow landing page

---

## 📋 Phase 2: Configuration & Setup (One-Time)

### Step 2.1: Enable Payment Gateways

```bash
cd server
node scripts/setup-payment-gateways.js
```

**Expected Output:**
```
🔧 Setting up payment gateways...
✅ Stripe enabled (test mode)
✅ Razorpay enabled (test mode)
✅ Manual/Bank Transfer enabled
```

---

### Step 2.2: Verify Gateway Configuration

```bash
cd server
node scripts/test-payment-gateway.js
```

**Expected Output:**
```
🧪 Testing Payment Gateway Configuration...
✅ All gateways configured and working
```

**If errors:** See troubleshooting in `PAYMENT_GATEWAY_SETUP.md`

---

### Step 2.3: Seed Test Data (Optional)

```bash
# Seed geography and work order data for forecasting
# Navigate to Forecast Center in UI and click "Seed India Data"
# OR use API:
curl -X POST http://localhost:3001/api/functions/seed-india-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Phase 3: Testing & Verification

### Step 3.1: Test Authentication & Routing

**Objective:** Verify all modules route correctly and authentication works

**Steps:**

1. **Test Module Navigation:**
   ```bash
   # Open browser to http://localhost:5175
   # Navigate to each module landing page and test "Get Started" button
   ```

   **Test Cases:**
   - [ ] Field Service Module → Should route to `/auth/fsm`
   - [ ] Asset Lifecycle Module → Should route to `/auth/asset`
   - [ ] AI Forecasting Module → Should route to `/auth/forecasting`
   - [ ] Customer Portal → Should route to `/auth/customer`
   - [ ] Other modules similarly...

2. **Test Login Flow:**
   ```bash
   # For each module:
   # 1. Click "Get Started"
   # 2. Login with test credentials
   # 3. Verify redirect to module dashboard (not platform landing page)
   ```

   **Test Cases:**
   - [ ] Customer Portal login → Redirects to `/customer-portal`
   - [ ] FSM login → Redirects to `/fsm/dashboard`
   - [ ] No redirect loops
   - [ ] Console shows no errors

3. **Test Protected Routes:**
   ```bash
   # 1. Logout
   # 2. Try to access protected route directly (e.g., /customer-portal)
   # 3. Verify redirect to correct auth page
   # 4. Login
   # 5. Verify access granted
   ```

**Success Criteria:**
- ✅ All modules route to correct auth pages
- ✅ Login redirects to correct module pages
- ✅ No redirect loops
- ✅ No console errors

**If issues found:** See `BUILD_ACTION_PLAN.md` → Action 1.1

---

### Step 3.2: Test Payment Gateway

**Objective:** Verify payment processing works end-to-end

**Prerequisites:**
- Payment gateway credentials configured in `server/.env`
- Gateways enabled in database (Step 2.1)
- Test credentials verified (Step 2.2)

**Steps:**

1. **Start Servers** (if not already running)
   ```bash
   # Terminal 1
   cd server && npm run dev

   # Terminal 2
   npm run dev
   ```

2. **Test Payment Flow:**
   ```bash
   # 1. Navigate to Customer Portal
   # 2. Login with customer account
   # 3. Go to "Invoices & Payments" tab
   # 4. Find an unpaid invoice
   # 5. Click "Pay Now"
   # 6. Select payment gateway (Stripe or Razorpay)
   # 7. Complete payment with test card
   ```

   **Stripe Test Card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

3. **Verify Success:**
   - [ ] Payment success message appears
   - [ ] Invoice status changes to "paid"
   - [ ] Payment history shows new entry
   - [ ] Invoice detail view shows payment date

4. **Test Webhooks (Optional):**
   ```bash
   # Install Stripe CLI (if not installed)
   brew install stripe/stripe-cli/stripe

   # Forward webhooks to local server
   stripe listen --forward-to localhost:3001/api/payments/webhook/stripe

   # In another terminal, trigger test event
   stripe trigger payment_intent.succeeded
   ```

**Success Criteria:**
- ✅ Payment intent created successfully
- ✅ Payment processed and confirmed
- ✅ Invoice status auto-updates
- ✅ Payment history displays correctly
- ✅ Webhooks received (if configured)

**If issues found:** See `TESTING_PAYMENT_GATEWAY.md` → Troubleshooting

---

### Step 3.3: Test Forecast Generation

**Objective:** Verify forecast generation works

**Steps:**

1. **Seed Data (if needed):**
   ```bash
   # Navigate to Forecast Center in UI
   # Click "Seed India Data" button
   # Wait for completion (check console)
   ```

2. **Generate Forecasts:**
   ```bash
   # In Forecast Center UI
   # Click "Generate Forecasts" button
   # Wait 5-10 seconds for processing
   ```

3. **Verify Results:**
   - [ ] Forecast data appears in charts
   - [ ] Geography filters work (Country → Region → State → City)
   - [ ] Metrics display correctly
   - [ ] Forecast vs Actuals comparison shows data
   - [ ] No console errors

4. **Test Metrics Endpoint:**
   ```bash
   curl -X GET "http://localhost:3001/api/functions/get-forecast-metrics?geography_level=state&geography_id=MH" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Success Criteria:**
- ✅ Forecasts generate without errors
- ✅ Data displays in UI charts
- ✅ Metrics endpoint returns valid data
- ✅ Geography hierarchy filtering works

**If issues found:** Check server logs for errors, verify `forecast_outputs` table exists

---

### Step 3.4: Test Photo Validation

**Objective:** Verify photo capture and validation works

**Steps:**

1. **Navigate to Work Order:**
   ```bash
   # 1. Login as technician
   # 2. Navigate to Work Orders
   # 3. Open a work order
   # 4. Go to photo capture section
   ```

2. **Capture Photos:**
   - [ ] Capture all 4 required photos:
     - Context Wide
     - Pre-Service Closeup
     - Serial Number
     - Replacement Part
   - [ ] Submit photos

3. **Verify Validation:**
   - [ ] Validation success message appears
   - [ ] Photos stored with hashes
   - [ ] Validation record created
   - [ ] No console errors

**Success Criteria:**
- ✅ All 4 photos required enforced
- ✅ Validation API called successfully
- ✅ Success feedback displayed
- ✅ Validation records created in database

**If issues found:** Check `PhotoCapture.tsx` component and validation endpoint logs

---

## 📋 Phase 4: Development Workflow

### Step 4.1: Daily Development Start

```bash
# 1. Pull latest changes
git pull origin main

# 2. Check for dependency updates
cd server && npm outdated && cd ..
npm outdated

# 3. Start servers
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev
```

---

### Step 4.2: Before Committing Changes

```bash
# 1. Check for linting errors
npm run lint 2>&1 | head -50

# 2. Check for TypeScript errors
npm run type-check 2>&1 | head -50

# 3. Run unit tests (if available)
npm test 2>&1 | head -50

# 4. Check database migrations
cd server && npm run migrate:status && cd ..
```

---

### Step 4.3: Creating Database Migrations

```bash
# 1. Create migration file
cd server/scripts/migrations
cat > YYYYMMDD-description.sql << 'EOF'
-- Migration: Description
-- Date: YYYY-MM-DD

BEGIN;

-- Your SQL here

COMMIT;
EOF

# 2. Test migration
psql -U postgres -d guardianflow -f YYYYMMDD-description.sql

# 3. Run migration
cd ../..
npm run migrate
```

---

## 📋 Phase 5: Deployment Checklist

### Step 5.1: Pre-Deployment Checks

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Build production
npm run build

# 3. Build server (if needed)
cd server && npm run build && cd ..

# 4. Run all tests
npm test
cd server && npm test && cd ..

# 5. Check environment variables
cat server/.env | grep -v PASSWORD | grep -v SECRET
```

---

### Step 5.2: Database Migration (Production)

```bash
# 1. Backup production database
pg_dump -h PROD_HOST -U postgres -d guardianflow > backup_$(date +%Y%m%d).sql

# 2. Run migrations on production
psql -h PROD_HOST -U postgres -d guardianflow -f server/scripts/migrations/YYYYMMDD-description.sql

# 3. Verify migration
psql -h PROD_HOST -U postgres -d guardianflow -c "\dt" | grep new_table
```

---

### Step 5.3: Production Environment Variables

```bash
# Ensure production .env has:
# - Production database credentials
# - Live payment gateway keys (not test keys)
# - Strong JWT_SECRET
# - Correct FRONTEND_URL
# - test_mode = false in database for payment gateways
```

---

## 🔧 Troubleshooting Quick Reference

### Issue: Server won't start

```bash
# Check if port is in use
lsof -i :3001  # Backend
lsof -i :5175  # Frontend

# Kill process if needed
kill -9 $(lsof -t -i:3001)
```

---

### Issue: Database connection error

```bash
# Check PostgreSQL is running
pg_isready

# Check credentials
psql -U postgres -d guardianflow -c "SELECT 1;"

# Verify .env file
cat server/.env | grep DB_
```

---

### Issue: Module not routing correctly

```bash
# Check route order in App.tsx
grep -n "path.*auth" src/App.tsx

# Check ProtectedRoute redirects
grep -A 5 "customer-portal" src/components/ProtectedRoute.tsx
```

---

### Issue: Payment gateway not working

```bash
# Verify configuration
cd server && node scripts/test-payment-gateway.js

# Check gateway enabled
psql -U postgres -d guardianflow -c "SELECT provider, enabled FROM payment_gateways;"

# Check environment variables
grep STRIPE server/.env
grep RAZORPAY server/.env
```

---

## 📊 Progress Tracking

### Current Status

```bash
# Run status check script
cat << 'EOF' > check-status.sh
#!/bin/bash
echo "🔍 Guardian Flow Status Check"
echo "=============================="
echo ""
echo "✅ Database:"
psql -U postgres -d guardianflow -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "❌ Database not accessible"
echo ""
echo "✅ Backend:"
curl -s http://localhost:3001/health | jq . 2>/dev/null || echo "❌ Backend not running"
echo ""
echo "✅ Payment Gateways:"
psql -U postgres -d guardianflow -c "SELECT provider, enabled FROM payment_gateways WHERE enabled = true;" 2>/dev/null || echo "❌ Check failed"
EOF

chmod +x check-status.sh
./check-status.sh
```

---

## 🎯 Next Actions Summary

Based on current status, prioritize:

1. **🔴 High Priority (This Week):**
   - [ ] Configure payment gateway credentials
   - [ ] Test authentication & routing
   - [ ] Test payment gateway end-to-end
   - [ ] Test forecast generation

2. **🟡 Medium Priority (Next Week):**
   - [ ] Complete remaining Supabase migrations
   - [ ] Enhance payment UI components
   - [ ] Add manual testing coverage

3. **🟢 Low Priority (Future):**
   - [ ] Knowledge Base implementation
   - [ ] RAG Engine integration
   - [ ] AI Assistant features

---

## 📚 Reference Documentation

- **Build Action Plan:** `BUILD_ACTION_PLAN.md`
- **Payment Gateway Setup:** `PAYMENT_GATEWAY_SETUP.md`
- **Payment Testing:** `TESTING_PAYMENT_GATEWAY.md`
- **Quick Start Payment:** `QUICK_START_PAYMENT_TESTING.md`
- **Server Setup:** `server/SETUP_INSTRUCTIONS.md`
- **Build Status:** `BUILD_PLAN_CURRENT_STATUS.md`

---

**Last Updated:** December 2025  
**Ready for Execution:** Yes ✅  
**Next Review:** After payment gateway testing

