# Guardian Flow

**Modular Enterprise Operations Platform**

> Full build report: [BUILD_REPORT.md](BUILD_REPORT.md) · Platform audit: [docs/PLATFORM_COMPREHENSIVE_AUDIT.md](docs/PLATFORM_COMPREHENSIVE_AUDIT.md)

---

## 🚀 Quick Start — Launch a Dev Instance

### Option 1 — GitHub Codespaces (zero install, browser-based)

> **Recommended for the fastest "try it now" experience.**

1. Click **Code → Codespaces → Create codespace on `main`** on the GitHub repo page.
2. Wait ~2 minutes for the container to build and `postCreateCommand` to run (installs deps + seeds the DB).
3. In the Codespace terminal, start both servers:
   ```bash
   # Terminal 1 — backend (Express on :3001)
   npm run dev:server

   # Terminal 2 — frontend (Vite HMR on :5175)
   npm run dev
   ```
   Or use the built-in VS Code task: **Terminal → Run Task → Start Dev Servers**.
4. GitHub auto-forwards ports 5175 and 3001. Click the **Open in Browser** notification for the frontend URL.

> **Login credentials (seeded by migrations):**
> - `admin@guardian.dev` / `admin123` (sys_admin)

---

### Option 2 — Docker Compose (local, no MongoDB install needed)

```bash
git clone https://github.com/Recon-X2025/guardian-flow.git
cd guardian-flow
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---------|-----|
| Frontend (Vite HMR) | http://localhost:5175 |
| Backend (Express) | http://localhost:3001 |
| MongoDB | localhost:27017 |

---

### Option 3 — Local (Node + existing MongoDB)

```bash
git clone https://github.com/Recon-X2025/guardian-flow.git
cd guardian-flow
npm install && cd server && npm install && cd ..
cp .env.example .env          # edit MONGODB_URI / JWT_SECRET if needed
node server/scripts/phase0-migration.js
npm run dev:all               # starts backend (:3001) + Vite (:5175) concurrently
```

---

## 🟢 Build Status

| Check | Status | Details |
|-------|--------|---------|
| **Vite Production Build** | ✅ Passing | 3,824 modules · 16.59 s · ~3.3 MB dist |
| **Unit / Component / API Tests** | ✅ Passing | 155 tests · 21 files · 15.03 s |
| **TypeScript** | ✅ Passing | strict mode · 5.8.3 |
| **npm audit** | ⚠️ 17 pre-existing | 1 critical · 7 high · 8 moderate · 1 low (all upstream deps) |

_Last recorded build: 2026-04-12 · Branch: `copilot/sprint-29-through-52` · Node v24.14.1_

---

## Platform Overview

Guardian Flow is a multi-tenant **enterprise field service management platform** with PaaS capabilities. It combines work order orchestration, fraud & forgery detection, financial reconciliation, hierarchical forecasting, and an organisation management console — all exposed through a developer API gateway for third-party integrations.

**Current version:** v6.1 (PaaS + Organisation Management Console)

> **AI mode:** The platform ships with a mock AI layer (keyword-matching responses, statistical anomaly detection). Real GPT-4o LLM and OpenAI embeddings activate when `OPENAI_API_KEY` + `AI_PROVIDER=openai` are configured. Computer vision (photo defect detection) is a mock stub regardless of AI mode. See `docs/PRD.md` for the full feature status breakdown.

---

## 🗺️ Feature Map

### 🔧 Field Service Management
| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/` | ✅ Live |
| Work Orders | `/work-orders` | ✅ Live |
| Service Orders | `/service-orders` | ✅ Live |
| Dispatch | `/dispatch` | ✅ Live |
| Scheduler | `/schedule` | ✅ Live |
| Schedule Optimiser | `/schedule-optimizer` | ✅ Live |
| Route Optimisation | `/route-optimization` | ✅ Live |
| Predictive Maintenance | `/predictive-maintenance` | ✅ Live |
| Maintenance Calendar | `/maintenance-calendar` | ✅ Live |
| Technicians | `/technicians` | ✅ Live |
| Equipment | `/equipment` | ✅ Live |
| Pending Validation | `/pending-validation` | ✅ Live |

### 💰 Financial Management
| Feature | Route | Status |
|---------|-------|--------|
| Finance Overview | `/finance` | ✅ Live |
| Invoicing | `/invoicing` | ✅ Live |
| Payments | `/payments` | ✅ Live |
| Quotes | `/quotes` | ✅ Live |
| Warranty | `/warranty` | ✅ Live |
| Penalties | `/penalties` | ✅ Live |
| Dispute Management | `/disputes` | ✅ Live |
| Pricing Calculator | `/pricing-calculator` | ✅ Live |

### 🔍 Fraud & Compliance
| Feature | Route | Status |
|---------|-------|--------|
| Fraud Investigation | `/fraud` | ✅ Live |
| Forgery Detection | `/forgery-detection` | ✅ Live |
| Compliance Dashboard | `/compliance-dashboard` | ✅ Live |
| Compliance Centre | `/compliance` | ✅ Live |

### 📊 Analytics & Intelligence
| Feature | Route | Status |
|---------|-------|--------|
| Analytics | `/analytics` | ✅ Live |
| Analytics Platform | `/analytics-platform` | ✅ Live |
| Forecast Centre | `/forecast` | ✅ Live |
| Anomaly Detection | `/anomaly` | ✅ Live |
| Observability | `/observability` | ✅ Live |
| Custom Report Builder | `/custom-reports` | ✅ Live |
| NLP Query Interface | `/nlp-query` | ✅ Live |
| Analytics Integrations | `/analytics-integrations` | ✅ Live |
| Platform Metrics | `/platform-metrics` | ✅ Live (admin) |
| A/B Test Manager | `/ab-tests` | ✅ Live |

### 🤖 AI & Machine Learning
> 🔑 = requires `OPENAI_API_KEY` · 🔲 = mock/stub · ✅ = always real

| Feature | Route | Status |
|---------|-------|--------|
| AI Offer Engine | `/offer-ai` | 🔑 LLM (mock fallback) |
| Agent Dashboard | `/agent-dashboard` | ✅ Live |
| Model Orchestration | `/models` | ✅ Live |
| RAG Engine | `/rag` | 🔑 Real cosine search (mock embeddings fallback) |
| AI Assistant | `/assistant` | 🔑 GPT-4o (keyword mock fallback) |
| Prompt Management | `/prompts` | ✅ Live |
| Anomaly Detection (statistical) | `/anomaly` | ✅ Always real (z-score) |
| Computer Vision / Photo Defects | (via work orders) | 🔲 Mock — `Math.random()` |
| ERP Connectors (SAP, Salesforce, QB) | (via connectors) | 🔲 Stub — logs only, no real API calls |

### 🏪 Inventory & Procurement
| Feature | Route | Status |
|---------|-------|--------|
| Inventory | `/inventory` | ✅ Live |
| Procurement | `/procurement` | ✅ Live |

### 👥 Customers & Partners
| Feature | Route | Status |
|---------|-------|--------|
| Customers | `/customers` | ✅ Live |
| Customer Portal | `/customer-portal` | ✅ Live |
| Partner Portal | `/partner-portal` | ✅ Live |
| Tickets | `/tickets` | ✅ Live |
| Contracts | `/contracts` | ✅ Live |

### 🛒 Marketplace
| Feature | Route | Status |
|---------|-------|--------|
| Marketplace | `/marketplace` | ✅ Live |
| Marketplace Management | `/marketplace-management` | ✅ Live (admin) |

### 📚 Knowledge & Training
| Feature | Route | Status |
|---------|-------|--------|
| Knowledge Base | `/knowledge-base` | ✅ Live |
| FAQ | `/faq` | ✅ Live |
| Training & Help | `/training` | ✅ Live |
| Help & Training | `/help` | ✅ Live |

### 🧩 Industry & Workflow Modules
| Feature | Route | Status |
|---------|-------|--------|
| Industry Workflows | `/industry-workflows` | ✅ Live |
| Industry Onboarding | (modal/flow) | ✅ Live |
| Templates | `/templates` | ✅ Live |
| Documents | `/documents` | ✅ Live |
| Webhooks | `/webhooks` | ✅ Live |
| System Health | `/system-health` | ✅ Live |

### 🛠 Platform Modules (PaaS)
| Module | Route | Status |
|--------|-------|--------|
| Field Service Module | `/modules/field-service` | ✅ Live |
| Asset Lifecycle Module | `/modules/asset-lifecycle` | ✅ Live |
| AI Forecasting Module | `/modules/ai-forecasting` | ✅ Live |
| Fraud & Compliance Module | `/modules/fraud-compliance` | ✅ Live |
| Marketplace Module | `/modules/marketplace` | ✅ Live |
| Analytics BI Module | `/modules/analytics-bi` | ✅ Live |
| Customer Portal Module | `/modules/customer-portal` | ✅ Live |
| Video Training Module | `/modules/video-training` | ✅ Live |
| Advanced Compliance Module | `/modules/advanced-compliance` | ✅ Live |
| Analytics Platform Module | `/modules/analytics-platform` | ✅ Live |
| Enhanced Scheduler Module | `/modules/enhanced-scheduler` | ✅ Live |
| Image Forensics Module | `/modules/image-forensics` | ✅ Live |

### 🏢 Organisation & Administration
| Feature | Route | Status |
|---------|-------|--------|
| Organisation Management Console (MAC) | `/org-console` | ✅ Live |
| Admin Console | `/admin` | ✅ Live |
| Settings | `/settings` | ✅ Live |
| Developer Portal | `/developer-portal` | ✅ Live |
| Developer Console | `/developer-console` | ✅ Live |
| Developer Landing | `/developer` | ✅ Live (public) |
| Photo Capture | `/photo-capture` | ✅ Live |

---

## 🔌 Backend API Surface

| Route prefix | File | Purpose |
|-------------|------|---------|
| `/api/auth` | `routes/auth.js` | JWT auth — login, register, refresh |
| `/api/db` | `routes/database.js` | Generic DB adapter operations |
| `/api/storage` | `routes/storage.js` | File / blob storage |
| `/api/functions` | `routes/functions.js` | Cloud function proxy / API gateway |
| `/api/payments` | `routes/payments.js` | Payment processing |
| `/api/knowledge-base` | `routes/knowledge-base.js` | KB CRUD |
| `/api/faqs` | `routes/faqs.js` | FAQ CRUD |
| `/api/ml` | `routes/ml.js` | ML model training & inference |
| `/api/ai` | `routes/ai.js` | AI gateway (GPT / Gemini) |
| `/api/security` | `routes/security-monitor.js` | Security event monitoring |
| `/api/log-error` | `routes/log-frontend-error.js` | Frontend error ingestion |
| `/api/sla` | `routes/sla-monitor.js` | SLA tracking |
| `/api/partner` | `routes/partner-api-gateway.js` | Partner API gateway |
| `/api/org` | `routes/org.js` | Org CRUD + member management (MAC) |
| `/metrics` | `routes/metrics.js` | Prometheus-style platform metrics |

---

## 🗄️ Database

- **Default adapter:** MongoDB (Atlas)
- **Alternate adapter:** PostgreSQL (`DB_ADAPTER=postgresql`)
- **Migrations:** `node server/scripts/phase0-migration.js` — idempotent, migrations 003–010 (all Phase 0–5 collections)
- **Abstraction layer:** `server/db/interface.js` → `server/db/factory.js` → `server/db/adapters/`

---

## 🧪 Test Coverage

```
Test Files  21 passed (21)
Tests       155 passed (155)
Duration    15.03s
```

| Suite | File | Tests |
|-------|------|------:|
| DB Adapter | `tests/unit/db-adapter.test.ts` | 13 |
| API Client | `tests/unit/apiClient.test.ts` | 6 |
| Auth Integration | `tests/integration/auth.test.ts` | 6 |
| Auth API | `tests/api/auth.api.test.js` | 4 |
| Database API | `tests/api/database.api.test.js` | 15 |
| Endpoints API | `tests/api/endpoints.api.test.js` | 6 |
| AI Offers API | `tests/api/ai-offers.api.test.js` | 5 |
| AI Fraud API | `tests/api/ai-fraud.api.test.js` | 5 |
| AI Forgery API | `tests/api/ai-forgery.api.test.js` | 5 |
| AI Forecast API | `tests/api/ai-forecast.api.test.js` | 5 |
| AI Predictive API | `tests/api/ai-predictive.api.test.js` | 5 |
| Migration Smoke | `tests/components/migration-smoke.test.tsx` | 25 |
| Offer AI Component | `tests/components/OfferAI.test.tsx` | 8 |
| Forgery Detection Component | `tests/components/ForgeryDetection.test.tsx` | 8 |
| Forecast Centre Component | `tests/components/ForecastCenter.test.tsx` | 8 |
| Predictive Maintenance Component | `tests/components/PredictiveMaintenance.test.tsx` | 9 |
| Fraud Investigation Component | `tests/components/FraudInvestigation.test.tsx` | 8 |
| Analytics Tabs Component | `tests/components/AnalyticsTabs.test.tsx` | 4 |
| Create Work Order Dialog | `tests/components/CreateWorkOrderDialog.test.tsx` | 4 |
| Precheck Status Component | `tests/components/PrecheckStatus.test.tsx` | 3 |
| Generate Service Order Dialog | `tests/components/GenerateServiceOrderDialog.test.tsx` | 3 |

Run tests: `node_modules/.bin/vitest run`

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB / PostgreSQL)
- npm

### Setup

```bash
# 1. Clone and install
npm install

# 2. Configure frontend environment
cp .env.example .env
# Set: VITE_API_URL=http://localhost:3001

# 3. Configure backend environment
cd server && cp .env.example .env
# Set: MONGODB_URI=<your Atlas connection string>

# 4. Run DB migrations
node server/scripts/phase0-migration.js

# 5. Start backend (port 3001)
npm run dev          # from server/

# 6. Start frontend (port 5173)
npm run dev          # from root
```

### For PaaS Developers
1. Visit `/developer` — create a sandbox tenant (7-day trial, 500 calls/day)
2. Receive `api_key` and `tenant_id`
3. Call the API gateway:

```bash
curl -X POST http://localhost:3001/api/functions/api-gateway \
  -H "x-api-key: YOUR_KEY" \
  -H "x-tenant-id: YOUR_TENANT" \
  -H "Content-Type: application/json" \
  -d '{"service": "ops", "action": "list_work_orders", "data": {"limit": 10}}'
```

4. Monitor usage at `/developer-console`

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript 5.8 · Vite 5.4 · Tailwind CSS · shadcn/ui |
| Backend | Express.js · Node.js 20+ |
| Database | MongoDB Atlas (default) · PostgreSQL (alternate) |
| Auth | JWT (access + refresh tokens) |
| AI | OpenAI GPT-4o (requires `OPENAI_API_KEY`; mock by default) |
| Build | Vite 5.4 · @vitejs/plugin-react-swc |
| Testing | Vitest 1.6 (unit) · Playwright 1.58 (E2E) |
| Design Tokens | `src/styles/tokens.css` (`--gf-*` tokens · dark mode) |

---

## 🔐 Security

- JWT authentication with rate-limited auth endpoints
- API key authentication with per-tenant rate limiting (1,000 calls/day default)
- Helmet.js HTTP security headers
- CORS whitelisting
- ReDoS-safe email validation (split-based, no character-class negation regex)
- Role-based access control (`sys_admin`, `tenant_admin`, `user`)
- MFA / SSO / IP allowlist / audit-logging toggles per org (MAC Security tab)
- Soft-delete only for org deactivation

---

## 📁 Project Structure

```
guardian-flow/
├── src/
│   ├── App.tsx                    # Route definitions (60+ routes)
│   ├── domains/
│   │   ├── analytics/             # Analytics, Forecast, Anomaly, Observability
│   │   ├── auth/                  # Authentication & RBAC
│   │   ├── customers/             # Customers, Customer Portal, Partner Portal
│   │   ├── financial/             # Finance, Invoicing, Payments, Quotes, Warranty
│   │   ├── fraud/                 # Fraud, Forgery, Compliance
│   │   ├── inventory/             # Inventory, Equipment, Procurement
│   │   ├── knowledge/             # Knowledge Base, FAQ, RAG Engine
│   │   ├── marketplace/           # Marketplace, Marketplace Management
│   │   ├── org/                   # Organisation Management Console (MAC)
│   │   ├── shared/                # Dashboard, Admin, Settings, AI tools, etc.
│   │   ├── tickets/               # Tickets
│   │   ├── training/              # Training & Help
│   │   └── workOrders/            # Work Orders, Dispatch, Scheduler, Routes
│   ├── pages/modules/             # 12 PaaS module pages
│   └── styles/tokens.css          # --gf-* design tokens
├── server/
│   ├── server.js                  # Express app + route registration (57 routes)
│   ├── routes/                    # 57 route files
│   ├── services/                  # AI, analytics, scheduler, connectors, flowspace
│   ├── db/                        # DB abstraction (MongoDB / PostgreSQL)
│   └── scripts/phase0-migration.js
├── tests/
│   ├── unit/                      # DB adapter, API client
│   ├── integration/               # Auth integration
│   ├── api/                       # API endpoint tests
│   └── components/                # React component tests
├── BUILD_REPORT.md                # Detailed build + test + audit report
└── README.md                      # This file
```

---

## 📖 Documentation

| Document | Location |
|----------|---------|
| **Contributor Onboarding & Build Context** | [`docs/CONTRIBUTOR_ONBOARDING.md`](docs/CONTRIBUTOR_ONBOARDING.md) |
| Build Report (build + test + audit) | [`BUILD_REPORT.md`](BUILD_REPORT.md) |
| Platform Comprehensive Audit | [`docs/PLATFORM_COMPREHENSIVE_AUDIT.md`](docs/PLATFORM_COMPREHENSIVE_AUDIT.md) |
| Product Requirements (PRD) | [`docs/PRD.md`](docs/PRD.md) |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Technical Requirements (TRD) | [`docs/TRD.md`](docs/TRD.md) |
| RBAC Permissions | [`docs/RBAC_ACTION_PERMISSIONS.md`](docs/RBAC_ACTION_PERMISSIONS.md) |
| Tenant Isolation | [`docs/RBAC_TENANT_ISOLATION.md`](docs/RBAC_TENANT_ISOLATION.md) |
| Testing Guide | [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) |
| Infrastructure Requirements | [`docs/INFRASTRUCTURE_REQUIREMENTS.md`](docs/INFRASTRUCTURE_REQUIREMENTS.md) |
| Monitoring & Observability | [`docs/MONITORING_SETUP.md`](docs/MONITORING_SETUP.md) |
| Forecasting System | [`docs/INDIA_FORECASTING_SYSTEM.md`](docs/INDIA_FORECASTING_SYSTEM.md) |
| Forecast Cron Setup | [`docs/FORECAST_CRON_SETUP.md`](docs/FORECAST_CRON_SETUP.md) |
| Partner Admin Setup | [`docs/PARTNER_ADMIN_SETUP.md`](docs/PARTNER_ADMIN_SETUP.md) |
| Agent Auto-Release | [`docs/AGENT_AUTO_RELEASE_SETUP.md`](docs/AGENT_AUTO_RELEASE_SETUP.md) |
| SOC 2 Compliance Guide | [`docs/SOC2_COMPLIANCE_SYSTEM_GUIDE.md`](docs/SOC2_COMPLIANCE_SYSTEM_GUIDE.md) |
| SOC 2 / ISO 27001 Roadmap | [`docs/SOC2_ISO27001_COMPLIANCE_ROADMAP.md`](docs/SOC2_ISO27001_COMPLIANCE_ROADMAP.md) |

---

## License

Proprietary — © 2026 Guardian Flow
