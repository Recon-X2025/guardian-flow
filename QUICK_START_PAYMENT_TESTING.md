# Quick Start: Payment Gateway Testing

**Get started in 5 minutes!**

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Add Test Credentials to `.env`

Edit `server/.env` and add:

```env
# Stripe Test Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Razorpay Test Keys (get from https://dashboard.razorpay.com/app/keys)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### Step 2: Enable Gateways in Database

```bash
cd server
node scripts/setup-payment-gateways.js
```

### Step 3: Verify Configuration

```bash
node scripts/test-payment-gateway.js
```

✅ If all checks pass, you're ready to test!

---

## 🧪 Test a Payment (2 Minutes)

1. **Start servers:**
   ```bash
   # Terminal 1
   cd server && npm run dev

   # Terminal 2  
   npm run dev
   ```

2. **Login to Customer Portal:**
   - Go to `http://localhost:5175/auth/customer`
   - Login with a customer account

3. **Pay an Invoice:**
   - Navigate to "Invoices & Payments" tab
   - Click "Pay Now" on any invoice
   - Select "Stripe" or "Razorpay"
   - Use test card: `4242 4242 4242 4242` (Stripe)
   - Complete payment

4. **Verify:**
   - ✅ Payment success message
   - ✅ Invoice status = "paid"
   - ✅ Payment history updated

---

## 🔗 Test Webhooks (Optional)

### Stripe Webhooks (Local Testing)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3001/api/payments/webhook/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

## 📚 Full Documentation

- **Setup Guide:** `PAYMENT_GATEWAY_SETUP.md`
- **Testing Guide:** `TESTING_PAYMENT_GATEWAY.md`
- **Implementation Details:** `CUSTOMER_PAYMENT_GATEWAY_COMPLETE.md`

---

**Ready to test! 🚀**

