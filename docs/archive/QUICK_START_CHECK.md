# Quick Start - See Your Updates! 🚀

## ✅ Everything is Integrated - Just Need to Start Servers!

---

## 🔄 **Step 1: Start Backend Server**

Open a terminal and run:
```bash
cd server
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
```

---

## 🔄 **Step 2: Start Frontend Server**

Open **another terminal** and run:
```bash
npm run dev
```

You should see:
```
VITE v... ready in ... ms
➜  Local:   http://localhost:5175/
```

---

## 🔄 **Step 3: Refresh Your Browser**

1. Go to your browser
2. Navigate to `http://localhost:5175/customer-portal`
3. **Hard Refresh**: 
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + F5`

---

## 🎯 **Step 4: Test the New Features**

1. **Click on "Invoices & Payments" tab**
2. **Click "Pay Now" on any invoice**
3. **PaymentDialog should open** with gateway selection! 🎉

---

## 🔍 **If Still Not Working:**

### Check Browser Console:
- Press `F12` or `Cmd+Option+I`
- Look for errors in the Console tab
- Share any errors you see

### Check Network Tab:
- See if API calls are failing
- Check `/api/payments/gateways` endpoint

### Common Issues:
1. **"Cannot find module"** → Run `npm install` in both root and server folders
2. **"Connection refused"** → Backend server not running
3. **"404 on /api/payments/gateways"** → Need to run database migration

---

## 📋 **Run Database Migration (If Needed):**

```bash
cd server
mongosh guardianflow --file scripts/migrations/add-payment-gateways.js
```

---

## ✨ **What You Should See:**

When you click "Pay Now" on an invoice:
- ✅ PaymentDialog opens
- ✅ Shows invoice summary
- ✅ Shows payment gateway options (Stripe, Razorpay, PayPal, Manual, Bank Transfer)
- ✅ Can select a gateway
- ✅ For manual/bank transfer: Shows instructions and reference field

---

**Everything is ready - just start your servers!** 🚀

