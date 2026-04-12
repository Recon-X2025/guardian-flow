# Guardian Flow — Technical Requirements Document (TRD)

**Version:** 7.0  
**Date:** April 2026  
**Status:** Accurate as of branch `copilot/sprint-29-through-52`

> This document reflects the **actual implemented state**. Features described as stubs or not-yet-built are explicitly marked. Earlier versions of this document contained aspirational descriptions that did not reflect the implemented code.

---

## 1. System Context

```
External Actors          External Services               Infrastructure
───────────────          ─────────────────               ──────────────
Browser SPA              OpenAI API (optional)           MongoDB Atlas (default)
Partner APIs             Stripe / PayPal / Razorpay      PostgreSQL (optional)
Webhook consumers        SMTP server (optional)          Express.js (Node.js 20+)
SIEM systems             MQTT broker (optional)          Vite 5 (frontend build)
```

---

## 2. Frontend Technical Specification

### 2.1 Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 (strict) | Type safety |
| Vite | 5.4.19 | Build tool |
| React Router | 6.30.1 | Client-side routing |
| TanStack Query | 5.83.0 | Server state management |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui + Radix | — | Component primitives |
| Recharts | 3.3.0 | Data visualisation |
| dnd-kit | 6.3.1 / 10.0.0 | Drag-and-drop |
| React Hook Form | 7.61.1 | Form state |
| Zod | 3.25.76 | Schema validation (shared) |
| next-themes | 0.3.0 | Dark/light theme |
| jsPDF | 4.2.1 | PDF generation |
| DOMPurify | 3.3.0 | HTML sanitisation |
| Vitest | 1.6.1 | Unit/component tests |
| Playwright | 1.58.0 | E2E tests |

### 2.2 Build Output

- **Modules:** 3,824 transformed
- **Build time:** ~16.6 s
- **Total dist size:** ~3.3 MB
- **Largest chunks:** InvoiceDetailDialog (~397 kB), vendor-recharts (~374 kB)

### 2.3 Design System

Design tokens defined in `src/styles/tokens.css` as `--gf-*` CSS custom properties.
Dark mode applied via `.dark` class and `[data-theme="dark"]` attribute.
`ThemeProvider` and `useTheme` hook live in `src/domains/shared/hooks/useTheme.ts`.

### 2.4 Routing Structure

~120 routes defined in `src/App.tsx` using React Router 6 lazy loading with `Suspense`.
Authentication enforced by `<ProtectedRoute>` component.
Role enforcement by `<RoleGuard>` component.

### 2.5 PWA Status

`vite-plugin-pwa` is present in `devDependencies` but **not configured in `vite.config.ts`**. There is no service worker registration, no `manifest.json`, and no offline sync. This is a future gate item.

---

## 3. Backend Technical Specification

### 3.1 Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| Express.js | 4.18.2 | HTTP framework |
| MongoDB driver | 6.3.0 | Default DB |
| pg | 8.11.3 | PostgreSQL driver |
| jsonwebtoken | 9.0.2 | JWT signing/verification |
| bcryptjs | 2.4.3 | Password hashing |
| helmet | 8.1.0 | HTTP security headers |
| express-rate-limit | 7.1.5 | Rate limiting |
| cors | 2.8.5 | CORS |
| multer | 1.4.5 | File uploads |
| ws | 8.16.0 | WebSocket server |
| zod | 3.25.76 | Request validation |
| openai | 4.73.0 | OpenAI client (optional) |
| nodemailer | 7.0.13 | Email (requires config) |
| simple-statistics | 7.8.8 | Statistical analysis |

### 3.2 Server Entry Point

`server/server.js` registers all 57 routes. Middleware order:

```
correlationId  →  metricsMiddleware  →  helmet  →  cors
  →  express.json (10MB limit)  →  express.urlencoded
  →  /api/ rate-limit (generalLimiter)
  →  individual routes (some with authLimiter / mlTrainLimiter)
```

### 3.3 Route Inventory

**Authentication & Platform:**
- `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`
- `GET  /api/auth/me`
- `POST /api/sso/*` — SAML/SSO (requires provider config)
- `GET|POST /api/org/*` — Org management (sys_admin, tenant_admin)

**FSM Operations:**
- `/api/schedule` — schedule optimiser (constraint-based greedy solver)
- `/api/skills` — technician skill registry
- `/api/shifts` — shift management
- `/api/assets` — asset lifecycle
- `/api/assets-health` — asset health monitoring
- `/api/subcontractors` — subcontractor management
- `/api/customer-booking` — customer self-service booking
- `/api/customer360` — customer 360 view
- `/api/iot-telemetry` — IoT ingestion stub (activates with `MQTT_BROKER_URL`)

**Financial:**
- `/api/payments` — Stripe/PayPal/Razorpay (requires API keys)
- `/api/ledger` — general ledger (authenticated)
- `/api/budgeting` — budget management
- `/api/bank-recon` — bank reconciliation
- `/api/goods-receipt` — goods receipt
- `/api/audit-log` — financial audit log
- `/api/currency` — currency conversion

**CRM:**
- `/api/crm` — accounts, contacts, leads, deals, pipeline stages
  - `POST /api/crm/leads/:id/convert` — lead conversion

**AI / ML:**
- `/api/ai/rag/query`, `/api/ai/rag/index` — RAG engine
- `POST /api/ai/assistant` — LLM chat (mock default, real with OPENAI_API_KEY)
- `POST /api/ai/vision/analyse` — **stub: Math.random() defect detection**
- `/api/ai/anomalies` — real z-score analysis
- `/api/ai/governance` — AI audit logs
- `/api/ml/train` — ML training (rate-limited)
- `/api/ml` — experiments, XAI (explainable AI)
- `/api/ai/finetune` — fine-tuning interface
- `/api/ai/prompts` — prompt management
- `/api/knowledge-base` — KB CRUD
- `/api/knowledge-query` — RAG query endpoint

**Compliance & Security:**
- `/api/compliance-policy` — policy registry + enforcement
- `/api/anomalies` — anomaly cases
- `/api/security` — security monitoring
- `/api/sla` — SLA monitoring
- `/api/sla-rules` — SLA rule configuration

**Developer PaaS:**
- `/api/functions` — serverless functions
- `/api/storage` — file storage
- `/api/developer-portal` — developer portal
- `/api/partner` — partner API gateway
- `/api/webhooks` — webhook delivery + retry
- `/api/connectors` — ERP connector management (**stubs: SAP, Salesforce, QB**)
- `/api/db` — DB management
- `/api/dashboard-builder` — custom dashboard builder
- `/api/industry-template` — workflow templates
- `/api/marketplace` — marketplace management

**Platform:**
- `/api/flowspace` — decision ledger (production-ready)
- `/api/dex` — ExecutionContext state machine (production-ready)
- `/api/esg` — ESG data
- `/api/comms` — communications
- `/api/metrics` — platform metrics
- `/api/log-error` — frontend error logging
- `/api/scheduled-reports` — scheduled report runner

### 3.4 Database Abstraction

```
DB_ADAPTER=mongodb (default)   →  server/db/adapters/mongodb.js
DB_ADAPTER=postgresql          →  server/db/adapters/postgresql.js

Shared interface (server/db/interface.js):
  findOne(collection, filter)
  findMany(collection, filter, options)
  insertOne(collection, doc)
  updateOne(collection, filter, update)
  deleteOne(collection, filter)
  deleteMany(collection, filter)
  countDocuments(collection, filter)
  aggregate(collection, pipeline)
```

All queries go through `getAdapter()` singleton from `server/db/factory.js`.

### 3.5 Authentication Middleware

```javascript
// server/middleware/auth.js
authenticateToken(req, res, next)   // Required — returns 401 if no valid JWT
optionalAuth(req, res, next)        // Optional — populates req.user if token present
```

Token payload: `{ id, email, roles, permissions, tenantId }`

### 3.6 AI Service Architecture

```
Default mode (AI_PROVIDER=mock):
  chatCompletion()  →  generateMockResponse() (keyword matching)
  embedding()       →  [] (empty vector — poor search quality)
  visionAnalysis()  →  analyseImage() (Math.random() defects)

Live mode (AI_PROVIDER=openai + OPENAI_API_KEY set):
  chatCompletion()  →  OpenAI GPT-4o
  embedding()       →  OpenAI text-embedding-3-small
  visionAnalysis()  →  OpenAI GPT-4o with image input

All LLM calls write a decision record to FlowSpace (fire-and-forget).
All LLM calls are logged to ai_governance_logs collection.
```

**Always real (independent of AI_PROVIDER):**
- `detectWorkOrderAnomalies()` — z-score on completion times
- `detectFinancialAnomalies()` — z-score on transaction amounts

**Always mock (regardless of AI_PROVIDER):**
- `analyseImage()` — random defect generator in `server/services/ai/vision.js`

### 3.7 Scheduling Solver

`server/services/scheduler.js` — Greedy constraint-based solver.

Scoring for each technician–work order pair:
```
score = (skillMatch × 0.35)
      + (slaUrgency × 0.30)
      + (proximityScore × 0.20)
      + (certScore × 0.15)
```

Proximity uses Euclidean approximation (not real driving time). Falls back to 0.5 if coordinates unavailable.

### 3.8 Route Optimiser

`server/services/routeOptimizer.js` — Nearest-neighbour TSP.

- Distance: haversine formula (straight-line, not road distance)
- Travel time: `distance / 50 km/h` assumption
- No external mapping API (Google Maps, OSRM, etc.)

---

## 4. Testing

### 4.1 Unit / Component Tests

```bash
node_modules/.bin/vitest run
# or
npm test
```

- Framework: Vitest 1.6.1
- Config: `vitest.config.ts` using `@vitejs/plugin-react-swc`
- Test location: `tests/unit/`
- Current count: 155 tests, 21 files, all passing

### 4.2 E2E Tests

```bash
npx playwright test
# or
npm run test:e2e
```

- Framework: Playwright 1.58.0
- Config: `playwright.config.ts`
- Tests: `tests/e2e/`

### 4.3 API Tests

```bash
npm run test:api
```

- Framework: Jest 30 + Supertest
- Tests: `tests/api/`

### 4.4 Load Tests

```bash
npm run test:load   # requires k6 installed
```

### 4.5 Test Coverage Notes

- Unit tests cover DB adapter, auth middleware, core service logic
- No dedicated tests for AI mock/live switching
- Connector stubs are not covered by integration tests (they would require live SAP/Salesforce credentials)

---

## 5. Security Posture

### 5.1 Implemented Controls

| Control | Implementation |
|---------|---------------|
| Authentication | JWT (HS256), 24h expiry, refresh tokens |
| Authorisation | RBAC middleware, per-route permission checks |
| Password hashing | bcryptjs (salt rounds: 10) |
| HTTP hardening | helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| Rate limiting | express-rate-limit on all `/api/` routes; stricter limits on `/api/auth/` and `/api/ml/train` |
| Input validation | Zod schemas on all request bodies |
| SQL/NoSQL injection | Parameterised queries; no raw string interpolation |
| XSS prevention | DOMPurify on frontend; Zod on backend |
| CORS | Allowlist-based, configurable |
| Audit logging | All sensitive operations → `audit_logs` with correlation ID |
| Tenant isolation | `tenant_id` filter on every query |
| MFA | TOTP for high-risk operations |

### 5.2 Known Gaps

| Gap | Risk |
|-----|------|
| npm audit: 17 upstream vulnerabilities (1 critical, 7 high) | Low — all in devDependency chain; not runtime |
| No automated secret rotation | Medium — manual key rotation required |
| No WAF | Medium — Express.js is directly exposed |
| SOC 2 Type II audit not started | Business risk |

---

## 6. Infrastructure Requirements

### 6.1 Minimum Production Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 20.x LTS | 22.x LTS |
| MongoDB Atlas | M10 (2 vCPU, 2 GB) | M30 (4 vCPU, 32 GB) |
| App server RAM | 512 MB | 2 GB |
| Storage | 10 GB | 100 GB + auto-scale |

### 6.2 Optional External Services

| Service | Required for | Configuration |
|---------|-------------|---------------|
| OpenAI API | Real LLM, embeddings, RAG | `OPENAI_API_KEY`, `AI_PROVIDER=openai` |
| Stripe | Payment processing | `STRIPE_SECRET_KEY` |
| PayPal | Payment processing | PayPal API credentials |
| Razorpay | India payments | Razorpay API credentials |
| SMTP server | Email notifications | Nodemailer SMTP config |
| MQTT broker | IoT telemetry | `MQTT_BROKER_URL` |
| SIEM (Datadog/Splunk) | Security monitoring | Webhook endpoint config |

### 6.3 Not Required (Contrary to Previous Docs)

Previous versions of the infrastructure requirements document incorrectly listed these as required:

- ❌ **GPU node pool / Kubernetes cluster** — Vision analysis is currently a mock stub; no GPU inference needed
- ❌ **TorchServe / Kubeflow** — No production ML model serving
- ❌ **AWS SQS / RabbitMQ** — No async CV job queue (feature not built)

---

## 7. Deployment

### 7.1 Development

```bash
# Frontend
npm run dev              # Vite dev server (port 5173)

# Backend
cd server && npm run dev # Express.js with --watch (port 3001)

# DB migrations
node server/scripts/phase0-migration.js
```

### 7.2 Production Build

```bash
npm run build            # Vite production build → dist/
cd server && npm start   # Express.js production server
```

### 7.3 Environment Variables

See `.env.example` for the full list. Minimum required:
```
VITE_API_URL=http://localhost:3001   # frontend → backend URL
JWT_SECRET=<strong-random-secret>    # JWT signing key
DB_ADAPTER=mongodb                   # or postgresql
MONGODB_URI=mongodb://...            # if using MongoDB
```

---

*See `docs/PLATFORM_COMPREHENSIVE_AUDIT.md` for enterprise readiness gap analysis and roadmap.*
