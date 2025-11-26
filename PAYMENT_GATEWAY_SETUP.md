# Payment Gateway Setup Guide

**Date:** December 2025  
**Purpose:** Configure Stripe, Razorpay, and other payment gateways for testing and production

---

## 🔐 Environment Variables Setup

### Backend Environment (.env)

Create or update `server/.env` with the following:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# PayPal Configuration (Optional)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# Frontend URL (for webhook redirects)
FRONTEND_URL=http://localhost:5175
```

---

## 🧪 Test Credentials Setup

### Stripe Test Mode

1. **Create Stripe Test Account:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Copy your **Secret key** (starts with `sk_test_`)

2. **Set up Webhook (for testing):**
   - Go to https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - Endpoint URL: `http://localhost:3001/api/payments/webhook/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)

3. **Test Cards:**
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   Requires 3DS: 4000 0025 0000 3155
   ```
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### Razorpay Test Mode

1. **Create Razorpay Test Account:**
   - Go to https://dashboard.razorpay.com/app/keys
   - Copy **Key ID** (starts with `rzp_test_`)
   - Copy **Key Secret**

2. **Set up Webhook (for testing):**
   - Go to https://dashboard.razorpay.com/app/webhooks
   - Click "Create Webhook"
   - Webhook URL: `http://localhost:3001/api/payments/webhook/razorpay`
   - Select events: `payment.captured`, `payment.failed`

### PayPal Sandbox

1. **Create PayPal Developer Account:**
   - Go to https://developer.paypal.com/
   - Create a sandbox app
   - Copy **Client ID** and **Secret**

---

## 📊 Database Configuration

### Enable Payment Gateways

After setting environment variables, enable gateways in the database:

```sql
-- Enable Stripe (test mode)
UPDATE payment_gateways 
SET enabled = true, 
    test_mode = true,
    config = jsonb_build_object(
      'public', jsonb_build_object(
        'publishableKey', 'pk_test_...'
      )
    )
WHERE provider = 'stripe';

-- Enable Razorpay (test mode)
UPDATE payment_gateways 
SET enabled = true, 
    test_mode = true,
    config = jsonb_build_object(
      'public', jsonb_build_object(
        'keyId', 'rzp_test_...'
      )
    )
WHERE provider = 'razorpay';

-- Verify gateways are enabled
SELECT provider, name, enabled, test_mode 
FROM payment_gateways 
WHERE enabled = true;
```

---

## 🧪 Testing Guide

### 1. Test Stripe Payment Flow

**Prerequisites:**
- Stripe test keys configured in `.env`
- Stripe gateway enabled in database
- Server running on port 3001

**Steps:**
1. Navigate to Customer Portal
2. Go to "Invoices & Payments" tab
3. Click "Pay Now" on an invoice
4. Select "Stripe" as payment method
5. Click "Continue to Payment"
6. Stripe.js will load
7. Enter test card: `4242 4242 4242 4242`
8. Complete payment
9. Verify:
   - Payment success message appears
   - Invoice status updates to "paid"
   - Payment history shows new entry

**Expected Console Logs:**
```
Stripe.js loaded successfully
Payment intent created: pi_...
Processing payment...
Payment confirmed: succeeded
```

### 2. Test Razorpay Payment Flow

**Prerequisites:**
- Razorpay test keys configured in `.env`
- Razorpay gateway enabled in database

**Steps:**
1. Navigate to Customer Portal
2. Go to "Invoices & Payments" tab
3. Click "Pay Now" on an invoice
4. Select "Razorpay" as payment method
5. Click "Continue to Payment"
6. Razorpay Checkout modal opens
7. Complete payment using test mode
8. Verify:
   - Payment success callback
   - Invoice status updates
   - Payment history updated

**Expected Behavior:**
- Razorpay checkout modal opens
- Test payment methods available
- Success callback triggers backend confirmation
- Payment history shows new entry

### 3. Test Manual Payment

**Steps:**
1. Select "Manual Payment" or "Bank Transfer"
2. Enter reference number (e.g., "CHECK-12345")
3. Add optional notes
4. Submit
5. Verify:
   - Payment shows as "pending"
   - Reference number saved
   - Can be processed manually later

### 4. Test Payment History

**Steps:**
1. Go to Customer Portal → Invoices & Payments
2. Click "View Details" on an invoice with payments
3. Verify:
   - Payment history section loads
   - All payments displayed with dates
   - Payment methods shown
   - Amounts and statuses correct

### 5. Test Webhook Callbacks

**Stripe Webhook Test:**
```bash
# Using Stripe CLI (recommended for local testing)
stripe listen --forward-to localhost:3001/api/payments/webhook/stripe

# Trigger a test event
stripe trigger payment_intent.succeeded
```

**Razorpay Webhook Test:**
1. Use Razorpay dashboard webhook testing
2. Send test event from dashboard
3. Check server logs for webhook received
4. Verify invoice status updated

---

## 🔍 Verification Checklist

### Backend Verification

- [ ] Environment variables set in `server/.env`
- [ ] Payment gateway services loading credentials correctly
- [ ] Database has payment_gateways table with enabled gateways
- [ ] Webhook endpoints accessible at `/api/payments/webhook/:gateway`
- [ ] Server logs show no credential errors

### Frontend Verification

- [ ] PaymentDialog loads without errors
- [ ] Gateway list shows enabled gateways
- [ ] Stripe.js script loads successfully
- [ ] Razorpay script loads successfully
- [ ] Payment intent creation works
- [ ] Payment confirmation works

### Database Verification

```sql
-- Check payment gateways are enabled
SELECT provider, name, enabled, test_mode FROM payment_gateways WHERE enabled = true;

-- Check payment transactions table exists
SELECT COUNT(*) FROM payment_transactions;

-- Check payment history table exists
SELECT COUNT(*) FROM payment_history;

-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_invoice_payment_status';
```

---

## 🐛 Troubleshooting

### Issue: "Payment gateway not available"

**Solution:**
- Check gateway is enabled in database
- Verify environment variables are set
- Check server logs for credential errors
- Restart server after updating `.env`

### Issue: Stripe.js not loading

**Solution:**
- Check browser console for script load errors
- Verify internet connection (Stripe.js loads from CDN)
- Check if script tag was added to document head
- Verify publishable key is valid

### Issue: Razorpay modal not opening

**Solution:**
- Verify Razorpay script loaded successfully
- Check browser console for errors
- Verify keyId is set correctly
- Check if orderId was created successfully

### Issue: Payment status not updating

**Solution:**
- Check database trigger exists
- Verify payment_history entry was created
- Check server logs for trigger errors
- Verify invoice exists in database

### Issue: Webhook not receiving events

**Solution:**
- Verify webhook URL is accessible
- Check webhook secret matches
- Verify webhook is registered in gateway dashboard
- Check server logs for webhook requests
- Test with Stripe CLI for local development

---

## 📝 Quick Setup Script

Create `server/setup-payment-gateways.js`:

```javascript
import { query } from './db/query.js';

async function setupGateways() {
  // Enable Stripe
  await query(`
    UPDATE payment_gateways 
    SET enabled = true, test_mode = true
    WHERE provider = 'stripe'
  `);
  
  // Enable Razorpay
  await query(`
    UPDATE payment_gateways 
    SET enabled = true, test_mode = true
    WHERE provider = 'razorpay'
  `);
  
  // Enable Manual (always enabled)
  await query(`
    UPDATE payment_gateways 
    SET enabled = true
    WHERE provider IN ('manual', 'bank_transfer')
  `);
  
  console.log('✅ Payment gateways enabled');
}

setupGateways();
```

Run: `node server/setup-payment-gateways.js`

---

## 🚀 Production Checklist

Before going to production:

- [ ] Use **live** API keys (not test keys)
- [ ] Set `test_mode = false` in database
- [ ] Configure production webhook URLs
- [ ] Set up SSL certificates
- [ ] Test webhook signature verification
- [ ] Set up monitoring and alerts
- [ ] Review security best practices
- [ ] Enable PCI compliance features
- [ ] Set up payment reconciliation process
- [ ] Configure refund handling

---

**Last Updated:** December 2025

