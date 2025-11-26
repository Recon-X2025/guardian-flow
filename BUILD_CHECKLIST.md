# Guardian Flow - Build Checklist

**Quick reference checklist for development and deployment**  
**Use this alongside BUILD_EXECUTION_GUIDE.md**

---

## ✅ Initial Setup (First Time)

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ installed and running
- [ ] Project cloned/checked out
- [ ] Dependencies installed (`npm install`, `cd server && npm install`)
- [ ] Database created (`createdb guardianflow`)
- [ ] Schema initialized (`psql -f server/scripts/init-db.sql`)
- [ ] Migrations run (`cd server && npm run migrate`)
- [ ] Environment configured (`server/.env` created and updated)
- [ ] Payment gateways enabled (`node server/scripts/setup-payment-gateways.js`)
- [ ] Servers start successfully (backend on :3001, frontend on :5175)

---

## ✅ Daily Development Start

- [ ] Pull latest changes (`git pull`)
- [ ] Backend server running (`cd server && npm run dev`)
- [ ] Frontend server running (`npm run dev`)
- [ ] Health checks pass (`curl http://localhost:3001/health`)
- [ ] No critical errors in console

---

## ✅ Testing Checklist

### Authentication & Routing
- [ ] All module "Get Started" buttons route correctly
- [ ] Login redirects to correct module pages
- [ ] No redirect loops
- [ ] Protected routes work correctly
- [ ] Console shows no routing errors

### Payment Gateway
- [ ] Payment gateways configured in `.env`
- [ ] Gateways enabled in database
- [ ] Payment intent creation works
- [ ] Stripe payment flow completes successfully
- [ ] Razorpay payment flow completes successfully
- [ ] Invoice status auto-updates after payment
- [ ] Payment history displays correctly
- [ ] Webhooks received (if configured)

### Forecast Generation
- [ ] Test data seeded (if needed)
- [ ] Forecast generation completes successfully
- [ ] Forecast data displays in UI charts
- [ ] Geography filters work
- [ ] Metrics endpoint returns valid data

### Photo Validation
- [ ] All 4 required photos enforced
- [ ] Photo validation API works
- [ ] Success feedback displayed
- [ ] Validation records created in database

---

## ✅ Pre-Commit Checklist

- [ ] Code linted (`npm run lint`)
- [ ] TypeScript checks pass (`npm run type-check`)
- [ ] Unit tests pass (`npm test`)
- [ ] No console errors
- [ ] Database migrations created (if schema changes)
- [ ] Environment variables documented

---

## ✅ Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Production build successful (`npm run build`)
- [ ] Version updated (`npm version patch|minor|major`)
- [ ] Database backup created
- [ ] Migrations tested on staging
- [ ] Environment variables set for production
- [ ] Payment gateway test mode disabled
- [ ] JWT_SECRET changed to production value
- [ ] CORS configured for production domain
- [ ] SSL certificates configured
- [ ] Monitoring/logging configured

---

## ✅ Post-Deployment Checklist

- [ ] Health checks pass
- [ ] Authentication works
- [ ] Critical workflows tested
- [ ] Payment gateway tested (with small test transaction)
- [ ] Error monitoring active
- [ ] Logs accessible
- [ ] Performance acceptable
- [ ] Rollback plan ready (if needed)

---

## 🐛 Common Issues Checklist

### Server Won't Start
- [ ] Port 3001/5175 not in use
- [ ] Database connection works
- [ ] Environment variables set correctly
- [ ] Dependencies installed

### Database Issues
- [ ] PostgreSQL running (`pg_isready`)
- [ ] Database exists (`psql -l | grep guardianflow`)
- [ ] Credentials correct in `.env`
- [ ] User has permissions

### Payment Gateway Issues
- [ ] Gateway enabled in database
- [ ] Environment variables configured
- [ ] Test keys valid (not production keys)
- [ ] Webhook URLs configured (if testing webhooks)

### Routing Issues
- [ ] Route order correct in `App.tsx`
- [ ] Module auth routes before generic `/auth`
- [ ] ProtectedRoute redirects correctly
- [ ] No circular redirects

---

## 📋 Feature-Specific Checklists

### Payment Gateway Feature
- [ ] Stripe.js loads successfully
- [ ] Razorpay script loads successfully
- [ ] Payment intents created
- [ ] Payment processing works
- [ ] Webhooks verified
- [ ] Payment history displays
- [ ] Invoice status updates
- [ ] Error handling works

### Forecast Feature
- [ ] Forecast table exists (`forecast_outputs`)
- [ ] Forecast generation endpoint works
- [ ] Data seeded correctly
- [ ] UI displays forecasts
- [ ] Geography filtering works
- [ ] Metrics endpoint functional

### Photo Validation Feature
- [ ] Photo capture component works
- [ ] Validation API functional
- [ ] Required photo count enforced
- [ ] Validation records created
- [ ] Success/error messages display

---

## 🔄 Weekly Maintenance

- [ ] Review error logs
- [ ] Check database size/growth
- [ ] Review payment transaction logs
- [ ] Update dependencies (`npm outdated`)
- [ ] Security updates applied
- [ ] Backup verification
- [ ] Performance monitoring review

---

## 📚 Documentation Checklist

- [ ] README.md updated
- [ ] API documentation current
- [ ] Setup instructions accurate
- [ ] Troubleshooting guide updated
- [ ] Changelog maintained
- [ ] Deployment guide current

---

**Last Updated:** December 2025  
**Use with:** `BUILD_EXECUTION_GUIDE.md` and `BUILD_ACTION_PLAN.md`

