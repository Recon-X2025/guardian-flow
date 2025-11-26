# Customer Portal - Testing Guide 🧪

**Date:** November 25, 2025  
**Status:** Ready for Testing!

---

## ✅ **Pre-Testing Checklist**

- [x] Backend server running (port 3001)
- [x] Frontend server running (port 5175)
- [x] Database migrations completed
- [x] FAQ tables created
- [x] Payment gateway tables created

---

## 🎯 **Step-by-Step Testing**

### **1. Access Customer Portal**

**URL:** `http://localhost:5175/customer-portal`

**Expected:** Portal loads with 6 tabs visible

---

### **2. Test Overview Tab**

**What to Test:**
- [ ] Dashboard loads without errors
- [ ] Metrics cards display (Pending Requests, Equipment, Outstanding Balance)
- [ ] Recent service requests preview shows
- [ ] Pending payments preview shows
- [ ] All numbers are accurate

**How to Test:**
1. Click "Overview" tab (should be default)
2. Check all 3 metric cards at top
3. Scroll down to see recent requests and payments

---

### **3. Test Service Requests Tab**

**What to Test:**
- [ ] Service requests list displays
- [ ] Status badges show correct colors
- [ ] "Book Service" button works
- [ ] Service booking dialog opens
- [ ] Can create new service request

**How to Test:**
1. Click "Service Requests" tab
2. View existing requests (if any)
3. Click "Book Service" button (top right)
4. Fill out form and submit
5. Verify new request appears in list

---

### **4. Test Equipment Tab**

**What to Test:**
- [ ] Equipment list displays
- [ ] Equipment details show (serial, model, warranty)
- [ ] "Request Service" button works
- [ ] Warranty status displays correctly

**How to Test:**
1. Click "Equipment" tab
2. View equipment list
3. Check equipment details
4. Click "Request Service" on any equipment

---

### **5. Test Invoices & Payments Tab** ⭐ **KEY FEATURE**

**What to Test:**
- [ ] Invoices list displays
- [ ] Outstanding balance shows correctly
- [ ] "Pay Now" button works
- [ ] PaymentDialog opens
- [ ] Can see all 5 payment gateways
- [ ] Manual Payment works
- [ ] Bank Transfer works

**How to Test:**
1. Click "Invoices & Payments" tab
2. View invoice list
3. Check outstanding balance at top
4. Click "Pay Now" on any invoice
5. PaymentDialog should open
6. You should see:
   - Stripe (disabled - needs keys)
   - Razorpay (disabled - needs keys)
   - PayPal (disabled - needs keys)
   - Manual Payment (✅ enabled)
   - Bank Transfer (✅ enabled)
7. Select "Manual Payment"
8. Enter reference number
9. Submit payment
10. Verify payment status updates

---

### **6. Test Service History Tab**

**What to Test:**
- [ ] Work orders list displays
- [ ] Status badges show correctly
- [ ] Dates display properly
- [ ] "View Details" button works

**How to Test:**
1. Click "Service History" tab
2. View work order history
3. Check status indicators
4. Verify dates are correct

---

### **7. Test FAQ System Tab** ⭐ **NEW FEATURE**

**What to Test:**
- [ ] FAQ list displays
- [ ] Search functionality works
- [ ] Category filtering works
- [ ] Can expand/collapse FAQs
- [ ] Helpful/Not Helpful buttons work
- [ ] View counts display

**How to Test:**
1. Click "FAQs" tab
2. You should see FAQs with categories
3. Try searching for "payment" or "service"
4. Click category buttons to filter
5. Click on an FAQ to expand it
6. Click "Helpful" or "Not Helpful"
7. Verify feedback is submitted

---

### **8. Test Knowledge Base Link**

**What to Test:**
- [ ] "Knowledge Base" button in header works
- [ ] Navigates to Knowledge Base page
- [ ] Can view articles

**How to Test:**
1. Click "Knowledge Base" button (top right)
2. Should navigate to `/knowledge-base`
3. View articles and categories

---

## 🐛 **Common Issues & Fixes**

### **Issue: "No data" or empty lists**
**Fix:** Need to seed test data. Use SeedDataManager component.

### **Issue: Payment Dialog doesn't open**
**Fix:** Check browser console for errors. Verify invoice exists.

### **Issue: FAQ search doesn't work**
**Fix:** Check backend logs. Verify FAQ API endpoint is accessible.

### **Issue: "Failed to fetch" errors**
**Fix:** 
- Verify backend is running: `curl http://localhost:3001/health`
- Check CORS settings
- Hard refresh browser

---

## ✅ **Success Criteria**

All tests pass if:
- ✅ All 6 tabs load without errors
- ✅ Payment Dialog opens and shows gateways
- ✅ FAQ system displays and search works
- ✅ No console errors
- ✅ All API calls succeed (check Network tab)

---

## 📊 **Test Results Template**

```
Date: ___________
Tester: ___________

Overview Tab: [ ] Pass [ ] Fail
Service Requests: [ ] Pass [ ] Fail
Equipment: [ ] Pass [ ] Fail
Invoices & Payments: [ ] Pass [ ] Fail
Service History: [ ] Pass [ ] Fail
FAQs: [ ] Pass [ ] Fail
Knowledge Base Link: [ ] Pass [ ] Fail

Issues Found:
1. ________________
2. ________________

Overall: [ ] Ready for Production [ ] Needs Fixes
```

---

## 🚀 **After Testing**

Once testing is complete:
1. Document any bugs found
2. Fix critical issues
3. Configure payment gateway API keys (optional)
4. Seed more test data if needed
5. Move to production deployment

---

**Ready to test! Open `http://localhost:5175/customer-portal` and start testing!** 🎉

