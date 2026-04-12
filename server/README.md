# Guardian Flow Backend Server

Backend API server powered by MongoDB Atlas.

## Setup

### 1. MongoDB Atlas Setup

The application uses MongoDB Atlas cloud database. No local installation required.

**Connection String:** Set in `server/.env` as `MONGODB_URI`.  
See `readiness/handover/env_template.md` for the full variable list.

**Database Name:** `guardianflow`

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB connection details, JWT_SECRET, and optional keys
```

### 4. Run Migrations (idempotent)

```bash
node scripts/phase0-migration.js
```

Migrations 003–010 cover all Phase 0–5 collections and are tracked via the `schema_migrations` collection.

### 5. Start Server

```bash
npm run dev
```

The server will run on http://localhost:3001

## API Route Summary (57 routes)

| Prefix | Route file | Auth required |
|--------|------------|---------------|
| `/api/auth` | auth.js | No (issues JWT) |
| `/api/db` | database.js | No |
| `/api/storage` | storage.js | No |
| `/api/functions` | functions.js | No |
| `/api/payments` | payments.js | No |
| `/api/knowledge-base` | knowledge-base.js | No |
| `/api/faqs` | faqs.js | No |
| `/api/ml` | ml.js, ml-experiments.js, xai.js | Partial |
| `/api/ai` | ai.js, finetune.js, vision.js, ai-governance.js, ai-prompts.js | No |
| `/api/security` | security-monitor.js | No |
| `/api/log-error` | log-frontend-error.js | No |
| `/api/sla` | sla-monitor.js | No |
| `/api/partner` | partner-api-gateway.js | No |
| `/api/org` | org.js | No |
| `/api/flowspace` | flowspace.js | No |
| `/api/dex` | dex.js | No |
| `/api/sso` | sso.js | No |
| `/api/currency` | currency.js | No |
| `/api/ledger` | ledger.js | ✅ JWT |
| `/api/skills` | skills.js | ✅ JWT |
| `/api/schedule` | schedule.js | ✅ JWT |
| `/api/customer-booking` | customer-booking.js | No |
| `/api/customer360` | customer360.js | No |
| `/api/comms` | comms.js | No |
| `/api/assets` | assets.js, assets-health.js | No |
| `/api/connectors` | connectors.js | No |
| `/api/knowledge` | knowledge-query.js | No |
| `/api/analytics` | anomalies.js | No |
| `/api/crm` | crm.js | ✅ JWT |
| `/api/iot-telemetry` | iot-telemetry.js | ✅ JWT |
| `/api/sla-rules` | sla-rules.js | ✅ JWT |
| `/api/shifts` | shifts.js | ✅ JWT |
| `/api/budgeting` | budgeting.js | ✅ JWT |
| `/api/inventory-adv` | inventory-advanced.js | ✅ JWT |
| `/api/goods-receipt` | goods-receipt.js | ✅ JWT |
| `/api/bank-recon` | bank-recon.js | ✅ JWT |
| `/api/mfa` | mfa.js | ✅ JWT |
| `/api/audit-log` | audit-log.js | ✅ JWT |
| `/api/esg` | esg.js | ✅ JWT |
| `/api/dashboards` | dashboard-builder.js | ✅ JWT |
| `/api/scheduled-reports` | scheduled-reports.js | ✅ JWT |
| `/api/ml-studio` | ml-studio.js | ✅ JWT |
| `/api/subcontractors` | subcontractors.js | ✅ JWT |

Full API reference: [`public/API_DOCUMENTATION.md`](../public/API_DOCUMENTATION.md)

## Development Stack

The server uses:
- **Express.js** — Web framework (port 3001)
- **mongodb** — MongoDB Atlas client
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT authentication (24 h expiry)
- **helmet / cors / express-rate-limit** — Security middleware
- **ws** — WebSocket manager
- **DB adapter** — `server/db/factory.js` (selects MongoDB or PostgreSQL via `DB_ADAPTER` env)

## Production Deployment

1. Copy and fill `server/.env` (see `readiness/handover/env_template.md`)
2. Run `node scripts/phase0-migration.js`
3. Start with PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name guardian-flow
   pm2 save
   ```
4. Serve the `dist/` frontend via nginx or a static host pointed at port 3001 for API proxying.

