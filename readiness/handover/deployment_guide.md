# Guardian Flow Deployment Guide

## Prerequisites
- Node.js v22+ and npm v10+
- MongoDB Atlas cluster (M30 or higher recommended for production)
- Environment variables from `readiness/handover/env_template.md`

## Steps

### 1. Configure environment
```bash
cp server/.env.example server/.env
# Fill in MONGODB_URI, JWT_SECRET, FRONTEND_URL, and optional AI/payment keys
```

### 2. Install dependencies
```bash
npm install
cd server && npm install
```

### 3. Run DB migrations (idempotent)
```bash
node server/scripts/phase0-migration.js
```

### 4. Build frontend
```bash
npm run build
```

### 5. Start server
```bash
# Development
npm run dev

# Production (with PM2)
npm install -g pm2
pm2 start server/server.js --name guardian-flow
pm2 save
```

### 6. (Optional) Enable payment gateways
Add `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_ID`, and/or `PAYPAL_CLIENT_ID` to `server/.env`.

### 7. (Optional) Enable AI features
Add `OPENAI_API_KEY` and/or `GOOGLE_GEMINI_API_KEY` to `server/.env`.

## Post-deploy
- Verify authentication flow via `POST /api/auth/signin`
- Seed demo data from Forecast Center (`/forecast`) if needed
- Run 'Regenerate Forecasts Only' to enqueue forecast jobs
- Confirm health endpoint: `GET /api/health` → `{ "status": "ok" }`
