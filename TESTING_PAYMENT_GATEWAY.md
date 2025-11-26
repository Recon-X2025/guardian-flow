# Payment Gateway Testing Guide

**Date:** December 2025  
**Purpose:** Step-by-step guide to test payment gateway integrations

---

## 🚀 Quick Start

### 1. Configure Environment Variables

Create or update `server/.env`:

```env
# Stripe Test Credentials
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay Test Credentials
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

**Get Test Credentials:**
- **Stripe:** https://dashboard.stripe.com/test/apikeys
- **Razorpay:** https://dashboard.razorpay.com/app/keys

### 2. Enable Gateways in Database

```bash
cd server
node scripts/setup-payment-gateways.js
```

Or manually:
```sql
UPDATE payment_gateways SET enabled = true WHERE provider IN ('stripe', 'razorpay', 'manual');
```

### 3. Verify Configuration

```bash
cd server
node scripts/test-payment-gateway.js
```

This will:
- ✅ Check database gateways
- ✅ Verify environment variables
- ✅ Test gateway initialization
- ✅ Show webhook URLs

---

## 🧪 End-to-End Testing

### Test 1: Stripe Payment Flow

**Prerequisites:**
- Stripe test keys in `server/.env`
- Stripe gateway enabled
- Backend server running on port 3001
- Frontend running on port 5175

**Steps:**

1. **Start Servers:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev

   # Terminal 2: Frontend
   npm run dev
   ```

2. **Login to Customer Portal:**
   - Navigate to `http://localhost:5175/auth/customer`
   - Login with customer account (or create one)

3. **Navigate to Invoices:**
   - Go to Customer Portal
   - Click "Invoices & Payments" tab

4. **Initiate Payment:**
   - Find an unpaid invoice
   - Click "Pay Now"
   - PaymentDialog opens

5. **Select Stripe:**
   - Select "Stripe" payment method
   - Click "Continue to Payment"
   - Stripe.js loads (check browser console)

6. **Complete Payment:**
   - Stripe Elements form appears (or Stripe Checkout)
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)
   - Submit payment

7. **Verify Success:**
   - ✅ Payment success toast appears
   - ✅ Invoice status changes to "paid"
   - ✅ Payment history shows new entry
   - ✅ Invoice detail shows payment received date

**Expected Console Logs:**
```
Stripe.js loaded successfully
Payment intent created: pi_...
Processing payment...
Payment confirmed: succeeded
Invoice updated: paid
```

### Test 2: Razorpay Payment Flow

**Prerequisites:**
- Razorpay test keys in `server/.env`
- Razorpay gateway enabled

**Steps:**

1. **Initiate Payment:**
   - Go to Customer Portal → Invoices & Payments
   - Click "Pay Now" on an invoice
   - Select "Razorpay"
   - Click "Continue to Payment"

2. **Razorpay Checkout:**
   - Razorpay Checkout modal opens
   - Shows payment amount and invoice details
   - Select payment method (Card, UPI, NetBanking, etc.)

3. **Test Payment:**
   - **Card:** Use test card numbers from Razorpay dashboard
   - **UPI:** Use test UPI IDs
   - **NetBanking:** Use test bank credentials
   - Complete payment

4. **Verify:**
   - ✅ Razorpay success callback
   - ✅ Payment confirmed via backend
   - ✅ Invoice status updated
   - ✅ Payment history updated

**Expected Behavior:**
- Razorpay modal opens automatically
- Payment options display correctly
- Success callback triggers
- Backend verifies signature
- Payment history created

### Test 3: Manual Payment

**Steps:**

1. Select "Manual Payment" or "Bank Transfer"
2. Payment instructions display
3. Enter reference number (e.g., "CHECK-12345")
4. Add notes (optional)
5. Submit
6. Verify:
   - ✅ Payment shows as "pending"
   - ✅ Reference number saved
   - ✅ Can be manually processed later via admin

---

## 🔗 Webhook Testing

### Stripe Webhooks

**Method 1: Stripe CLI (Recommended for Local Testing)**

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/payments/webhook/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

**Method 2: Stripe Dashboard**

1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhook/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret to `.env`
5. Test webhook from dashboard

**Verify Webhook:**
```bash
# Check server logs for webhook received
# Verify payment_history entry created
# Verify invoice status updated
```

### Razorpay Webhooks

**Method 1: Razorpay Dashboard**

1. Go to https://dashboard.razorpay.com/app/webhooks
2. Create webhook:
   - URL: `https://your-domain.com/api/payments/webhook/razorpay`
   - Events: `payment.captured`, `payment.failed`
3. Test webhook from dashboard

**Method 2: Manual Testing**

Use curl to simulate webhook:
```bash
curl -X POST http://localhost:3001/api/payments/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_test123",
          "amount": 10000,
          "status": "captured"
        }
      }
    }
  }'
```

**Verify Webhook:**
- Check `payment_webhook_logs` table
- Verify payment_history entry
- Verify invoice status updated

---

## ✅ Testing Checklist

### Backend Verification

- [ ] Environment variables configured
- [ ] Payment gateways enabled in database
- [ ] Gateway services initialize without errors
- [ ] Payment intent creation works
- [ ] Payment processing works
- [ ] Webhook endpoints accessible
- [ ] Webhook signature verification works
- [ ] Payment history entries created
- [ ] Invoice status auto-updates

### Frontend Verification

- [ ] PaymentDialog opens without errors
- [ ] Gateway list displays correctly
- [ ] Stripe.js loads successfully
- [ ] Razorpay script loads successfully
- [ ] Payment intent creation works
- [ ] Payment forms render correctly
- [ ] Success/error messages display
- [ ] Payment history loads
- [ ] Invoice status updates in UI

### Database Verification

```sql
-- Check gateways are enabled
SELECT provider, enabled FROM payment_gateways WHERE enabled = true;

-- Check payment transactions
SELECT COUNT(*) FROM payment_transactions;

-- Check payment history
SELECT COUNT(*) FROM payment_history;

-- Check invoice payment statuses
SELECT payment_status, COUNT(*) 
FROM invoices 
GROUP BY payment_status;

-- Verify trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_invoice_payment_status';
```

### End-to-End Flow

- [ ] Customer can select payment gateway
- [ ] Payment intent created successfully
- [ ] Payment form/modal opens
- [ ] Payment processed successfully
- [ ] Payment confirmation received
- [ ] Invoice status updates to "paid"
- [ ] Payment history shows new entry
- [ ] Customer sees success message
- [ ] Webhook received (if configured)
- [ ] No console errors

---

## 🐛 Troubleshooting

### Issue: "Payment gateway not available"

**Check:**
1. Gateway enabled in database:
   ```sql
   SELECT provider, enabled FROM payment_gateways WHERE provider = 'stripe';
   ```
2. Restart server after enabling gateway
3. Check server logs for errors

**Fix:**
```sql
UPDATE payment_gateways SET enabled = true WHERE provider = 'stripe';
```

### Issue: Stripe.js not loading

**Check:**
1. Browser console for script errors
2. Network tab for CDN load failure
3. Internet connection
4. Ad blockers (may block Stripe CDN)

**Fix:**
- Check browser console
- Disable ad blockers for testing
- Verify Stripe publishable key is valid

### Issue: Payment intent creation fails

**Check:**
1. Server logs for error details
2. Stripe secret key is valid
3. Amount format is correct
4. API key has correct permissions

**Fix:**
- Verify `STRIPE_SECRET_KEY` in `.env`
- Check Stripe dashboard for API key status
- Test with Stripe API directly:
  ```bash
  curl https://api.stripe.com/v1/payment_intents \
    -u sk_test_...: \
    -d amount=1000 \
    -d currency=usd
  ```

### Issue: Webhook not receiving events

**Check:**
1. Webhook URL is accessible (use ngrok for local testing)
2. Webhook secret matches
3. Server logs show webhook requests
4. Webhook endpoint is registered in gateway dashboard

**Fix (Local Testing):**
```bash
# Install ngrok
ngrok http 3001

# Use ngrok URL in webhook configuration
# https://abc123.ngrok.io/api/payments/webhook/stripe
```

### Issue: Payment status not updating

**Check:**
1. Database trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_update_invoice_payment_status';
   ```
2. Payment_history entry was created
3. Server logs for trigger errors

**Fix:**
```sql
-- Recreate trigger if missing
\i server/scripts/migrations/add-payment-status.sql
```

---

## 📊 Test Data

### Create Test Invoice

```sql
-- Create test invoice for payment testing
INSERT INTO invoices (
  id, invoice_number, work_order_id, customer_id,
  subtotal, total_amount, status, payment_status,
  created_at
) VALUES (
  gen_random_uuid(),
  'INV-TEST-001',
  (SELECT id FROM work_orders LIMIT 1),
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  1000.00,
  1000.00,
  'sent',
  'pending',
  now()
);
```

### Test Cards

**Stripe:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3DS: `4000 0025 0000 3155`
- Insufficient Funds: `4000 0000 0000 9995`

**Razorpay:**
- Use test credentials from Razorpay dashboard
- Test UPI: `success@razorpay`
- Test NetBanking: Use test bank credentials

---

## 🎯 Success Criteria

✅ **Payment Gateway is fully working when:**
1. PaymentDialog opens and displays gateways
2. Stripe/Razorpay payment forms load
3. Payment intent/order created successfully
4. Payment processed and confirmed
5. Invoice status automatically updates
6. Payment history displays correctly
7. Webhooks received and processed (if configured)
8. No errors in console or server logs

---

**Last Updated:** December 2025  
**Ready for Testing:** Yes ✅

