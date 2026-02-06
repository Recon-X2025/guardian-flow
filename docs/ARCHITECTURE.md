# GuardianFlow Architecture Document

**Version:** 6.1 | **Last Updated:** February 2026

---

## 1. Overview

GuardianFlow is an AI-powered enterprise field service management platform with Platform-as-a-Service (PaaS) capabilities. It combines work order orchestration, fraud detection, financial reconciliation, predictive maintenance, and hierarchical forecasting into a single multi-tenant system.

**Core Identity:** Enterprise Field Service Intelligence Platform + PaaS

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  React 18 SPA (Vite)  │  WebSocket Client  │  External API     │
└────────────┬───────────┴──────┬─────────────┴──────┬────────────┘
             │                  │                    │
             ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│  Express.js (port 3001)                                         │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │  Helmet   │ │  CORS    │ │ Rate Limit│ │ Correlation IDs  │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ JWT Auth  │ │  RBAC    │ │ Validate  │ │ Metrics MW       │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
│                                                                 │
│  Routes          Services           ML Pipeline                 │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐      │
│  │ /auth    │   │ AI / LLM     │   │ Failure Prediction │      │
│  │ /db      │   │ RAG Engine   │   │ SLA Breach         │      │
│  │ /storage │   │ Anomaly Det. │   │ Forecasting        │      │
│  │ /ai      │   │ Governance   │   │ Anomaly Detection  │      │
│  │ /ml      │   │ Embeddings   │   │ Forgery Detection  │      │
│  │ /payments│   │ Predictive   │   │ Orchestrator       │      │
│  │ /functions│  │ Routing      │   └────────────────────┘      │
│  │ /kb      │   │ Scheduler    │                                │
│  │ /faqs    │   │ Prompts      │                                │
│  │ /metrics │   └──────────────┘                                │
│  └──────────┘                                                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  ┌──────────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ MongoDB Atlas     │  │ File Storage│  │ WebSocket (ws)    │  │
│  │ Native Driver     │  │ Disk-based  │  │ Channel-based     │  │
│  │ 20 max pool       │  │ Multer      │  │ JWT-authenticated │  │
│  └──────────────────┘  └─────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool + dev server (port 5175) |
| React Router | 6.30.1 | Client-side routing |
| TanStack React Query | 5.x | Server state management / caching |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui (Radix UI) | — | 48+ accessible UI primitives |
| Recharts | 3.3.0 | Charts and data visualization |
| react-hook-form + Zod | — | Forms + schema validation |
| Lucide React | 0.462.0 | Icon library |
| next-themes | 0.3.0 | Dark/light theme |
| Sonner | 1.7.4 | Toast notifications |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express.js | — | HTTP server framework |
| MongoDB Atlas | 7.x | Primary database (document store) |
| mongodb (driver) | 6.3+ | Native MongoDB driver with connection pool |
| jsonwebtoken | — | JWT authentication |
| bcryptjs | — | Password hashing |
| ws | — | WebSocket server |
| multer | — | File upload handling |
| helmet | — | Security headers |
| express-rate-limit | — | Rate limiting |
| winston | — | Structured logging |
| joi | — | Request validation schemas |

### AI / ML
| Technology | Purpose |
|---|---|
| OpenAI / Gemini APIs | LLM integration for NLP, summarization, routing |
| Custom ML pipeline | Equipment failure prediction, SLA breach, forecasting |
| Holt-Winters | Time series forecasting |
| RAG Engine | Retrieval-augmented generation for knowledge base |
| Embeddings service | Vector representations for semantic search |

### Testing
| Technology | Purpose |
|---|---|
| Vitest | Unit + component tests |
| Playwright | E2E tests |
| Custom API tests | Backend endpoint validation |

---

## 4. Frontend Architecture

### 4.1 Domain-Driven Organization

The frontend uses **domain-driven design** with 12 feature domains, each self-contained:

```
src/
├── App.tsx                       # Router config + lazy loading
├── components/ui/                # 48 shadcn/ui primitives
├── integrations/api/client.ts    # Custom API client
├── pages/modules/                # Standalone module pages
└── domains/
    ├── analytics/                # Dashboards, forecasting, anomaly
    ├── auth/                     # Login, RBAC, MFA, protected routes
    ├── customers/                # CRM, portals, service booking
    ├── financial/                # Invoicing, payments, penalties, quotes
    ├── fraud/                    # Fraud investigation, forgery, compliance
    ├── inventory/                # Equipment, stock, procurement
    ├── knowledge/                # Knowledge base, FAQ, RAG
    ├── marketplace/              # Marketplace listings + management
    ├── shared/                   # Dashboard, settings, shared components
    ├── tickets/                  # Ticket management
    ├── training/                 # Help & training platform
    └── workOrders/               # Work orders, dispatch, scheduling, routes
```

Each domain follows this structure:
```
domain/
├── pages/          # Route-level components (lazy-loaded)
├── components/     # Domain-specific components
├── hooks/          # Domain-specific hooks
├── contexts/       # Context providers (auth only)
├── types/          # TypeScript interfaces
├── lib/            # Utilities
└── config/         # Domain configuration
```

### 4.2 Page & Component Scale

| Metric | Count |
|---|---|
| Feature domains | 12 |
| Page components | 81+ |
| Domain components | 80+ |
| UI primitives (shadcn) | 48 |
| Protected routes | 60+ |
| RBAC roles | 16 |

### 4.3 Routing

React Router v6 with lazy loading (`React.lazy` + `Suspense`):

| Category | Example Routes |
|---|---|
| **Public** | `/`, `/developer`, `/pricing-calculator`, `/contact`, `/privacy`, `/terms` |
| **Auth** | `/auth`, `/auth/fsm`, `/auth/fraud`, `/auth/analytics`, `/auth/platform` |
| **Operations** | `/dashboard`, `/tickets`, `/work-orders`, `/service-orders`, `/dispatch` |
| **Scheduling** | `/scheduler`, `/schedule-optimizer`, `/route-optimization` |
| **Financial** | `/finance`, `/quotes`, `/invoicing`, `/payments`, `/penalties`, `/disputes` |
| **AI/Automation** | `/sapos`, `/agent-dashboard`, `/nlp-query`, `/knowledge-base`, `/rag` |
| **Analytics** | `/analytics`, `/analytics-platform`, `/forecast`, `/anomaly`, `/observability` |
| **Security** | `/fraud`, `/forgery-detection`, `/compliance`, `/compliance-dashboard` |
| **Admin** | `/settings`, `/webhooks`, `/developer-console`, `/platform-metrics` |
| **Field Service** | `/technicians`, `/equipment`, `/inventory`, `/procurement`, `/photo-capture` |

### 4.4 State Management

```
┌─────────────────────────────────────────┐
│            State Architecture           │
├──────────────┬──────────────────────────┤
│ Auth State   │ AuthContext (React)      │
│              │ - user, session, token   │
│              │ - login/signup/logout    │
│              │ - localStorage persist   │
├──────────────┼──────────────────────────┤
│ RBAC State   │ RBACContext (React)      │
│              │ - roles, permissions     │
│              │ - tenant_id              │
│              │ - 16 app roles           │
├──────────────┼──────────────────────────┤
│ Server State │ TanStack React Query     │
│              │ - useQuery / useMutation │
│              │ - Cache + background     │
│              │   refetching             │
├──────────────┼──────────────────────────┤
│ UI State     │ Local component state    │
│              │ - useState / useReducer  │
├──────────────┼──────────────────────────┤
│ Cross-cutting│ Custom hooks             │
│              │ - useCurrency            │
│              │ - useOfflineSync         │
│              │ - useGeolocation         │
└──────────────┴──────────────────────────┘
```

### 4.5 API Client

Custom fetch-based client (`src/integrations/api/client.ts`) that provides a query-builder interface:

```
apiClient.from(table).select().eq(col, val)   →  POST /api/db/query
apiClient.from(table).insert(data)             →  POST /api/db/query
apiClient.functions.invoke(name, opts)         →  POST /api/functions/:name
apiClient.storage.from(bucket).upload(...)     →  POST /api/storage/:bucket/upload
apiClient.signIn(email, password)              →  POST /api/auth/signin
apiClient.channel(name).on(event, cb)          →  WebSocket /ws
```

All requests include `Authorization: Bearer <jwt>` header.

### 4.6 Performance Patterns

- **Code splitting**: Every page is lazy-loaded via `React.lazy()`
- **Vendor chunking**: Vite manual chunks for `react`, `react-query`, `recharts`, `radix-ui`
- **Query caching**: React Query stale-while-revalidate
- **Offline support**: `useOfflineSync` hook with IndexedDB queue + auto-retry
- **Debounced inputs**: Search and filter fields

---

## 5. Backend Architecture

### 5.1 Server Setup

Express.js on Node.js, running on port 3001 (configurable via `PORT` env):

```
server/
├── server.js              # Entry point — middleware + route mounting
├── config/
│   ├── secrets.js         # Multi-provider secrets (env / AWS / GCP)
│   └── dbValidation.js    # Database credential validation
├── db/
│   ├── client.js          # MongoDB client (MongoClient, 20 max pool)
│   ├── query.js           # Query helpers (findOne, findMany, insertOne, etc.)
│   └── tokenBlacklist.js  # JWT revocation with in-memory + MongoDB TTL
├── middleware/
│   ├── auth.js            # JWT authentication (authenticateToken, optionalAuth)
│   ├── rbac.js            # Role-based access control
│   ├── validate.js        # Joi schema validation
│   ├── correlationId.js   # Request correlation IDs
│   └── rateLimit.js       # Custom rate limiting
├── routes/                # 10 route modules (see below)
├── services/ai/           # 9 AI service modules
├── ml/                    # 7 ML pipeline modules
├── migrations/            # SQL migration files
├── metrics/               # Request metrics collection
├── schemas/               # Joi validation schemas
├── scripts/               # DB setup and seeding scripts
├── utils/
│   ├── errorHandler.js    # Global error handling
│   └── logger.js          # Winston structured logging
└── websocket/
    └── server.js          # WebSocket manager (ws library)
```

### 5.2 Middleware Pipeline

Request flow through the middleware stack:

```
Request
  │
  ├─→ correlationId        (assign unique request ID)
  ├─→ metricsMiddleware    (start timer, track active requests)
  ├─→ helmet               (security headers: HSTS, etc.)
  ├─→ cors                 (origin allowlist, strict in production)
  ├─→ express.json         (body parsing, 10MB limit)
  ├─→ generalLimiter       (1000 req/15min in production)
  │
  ├─→ [Route-specific middleware]
  │   ├─→ authenticateToken    (JWT verification)
  │   ├─→ optionalAuth         (JWT if present, anonymous OK)
  │   ├─→ authLimiter          (20 req/15min for auth routes)
  │   ├─→ mlTrainLimiter       (10 req/15min for ML training)
  │   ├─→ rbacMiddleware       (role/permission checks)
  │   └─→ validate(schema)     (Joi request validation)
  │
  ├─→ Route Handler
  │
  └─→ errorHandler         (global catch-all, structured errors)
```

### 5.3 API Routes

| Route Module | Mount Point | Key Endpoints |
|---|---|---|
| **auth.js** | `/api/auth` | `POST /signin`, `POST /signup`, `POST /signout`, `GET /me`, `POST /refresh`, MFA endpoints |
| **database.js** | `/api/db` | `POST /query` — generic query builder (select, insert, update, delete with filters) |
| **storage.js** | `/api/storage` | `POST /:bucket/upload`, `DELETE /:bucket`, `GET /:bucket/:filename` — file management with MIME allowlist |
| **functions.js** | `/api/functions` | `POST /:functionName` — serverless-style function invocation (API gateway, OPCV, exchange rates, seed data, etc.) |
| **payments.js** | `/api/payments` | Payment processing — 5 gateways: Stripe, Razorpay, PayPal, Manual, Bank Transfer |
| **knowledge-base.js** | `/api/kb` | CRUD for articles, categories, tags, search, view tracking |
| **faqs.js** | `/api/faqs` | FAQ management with helpful/not-helpful voting |
| **ai.js** | `/api/ai` | AI-powered features: NLP query, summarization, offer generation, fraud analysis |
| **ml.js** | `/api/ml` | ML model training, prediction, anomaly detection |
| **metrics.js** | `/api/metrics` | Prometheus-style metrics endpoint |

### 5.4 Database Architecture

**MongoDB Atlas** with native driver:

- **Connection pool**: 20 max connections, 5s connect/server selection timeout
- **Migrations**: JavaScript-based migration runner (`npm run migrate`)
- **Multi-tenancy**: Application-level tenant isolation via `tenant_id` field on all collections
- **Indexes**: TTL indexes for token cleanup, text indexes for search, compound indexes for queries

Key table groups:
```
Auth & Users:       users, user_roles, permissions, role_permissions, tenant_memberships
Work Orders:        work_orders, service_orders, work_order_assignments
Tickets:            tickets, ticket_comments, ticket_attachments
Financial:          invoices, payments, penalties, quotes, purchase_orders
Inventory:          inventory_items, equipment, stock_adjustments
Knowledge:          knowledge_base_articles, knowledge_base_categories, knowledge_base_tags
Analytics:          analytics_events, ml_models, forecasts
Security:           token_blacklist, user_token_revocations, audit_logs
PaaS:               api_keys, api_usage_logs, tenant_billing
```

### 5.5 Authentication & Authorization

```
┌─────────────────────────────────────────────────────┐
│                 Auth Flow                            │
│                                                     │
│  1. POST /api/auth/signin {email, password}         │
│     → bcrypt.compare(password, hash)                │
│     → JWT signed with JWT_SECRET                    │
│     → Returns {user, session: {access_token}}       │
│                                                     │
│  2. Client stores token in localStorage             │
│     → Sends Authorization: Bearer <token>           │
│                                                     │
│  3. authenticateToken middleware                     │
│     → jwt.verify(token, JWT_SECRET)                 │
│     → Check token_blacklist (in-memory + DB)        │
│     → Check user_token_revocations                  │
│     → Attach req.user = {id, email, role, tenant}   │
│                                                     │
│  4. RBAC middleware                                  │
│     → Check user roles against required roles       │
│     → Check user permissions against required perms │
│                                                     │
│  Roles: sys_admin, tenant_admin, ops_manager,       │
│         dispatcher, technician, finance_manager,    │
│         auditor, customer, partner, developer,      │
│         analyst, compliance_officer, field_manager,  │
│         support_agent, warehouse_manager, viewer     │
└─────────────────────────────────────────────────────┘
```

**Token security:**
- JWT with configurable expiry
- Token blacklist with in-memory Set + MongoDB collection (TTL auto-cleanup) for revocation
- Per-user revocation timestamps for "revoke all sessions"
- Periodic cleanup of expired blacklist entries

### 5.6 WebSocket (Real-time)

`ws` library on path `/ws`, JWT-authenticated:

- **Channel-based pub/sub**: Clients subscribe to named channels
- **Message types**: subscribe, unsubscribe, broadcast
- **Authentication**: JWT verified on connection
- **Payload limit**: 100KB max to prevent memory exhaustion
- **Frontend auto-reconnect**: Exponential backoff, max 5 attempts

---

## 6. AI & ML Architecture

### 6.1 AI Services (`server/services/ai/`)

| Module | Purpose |
|---|---|
| `llm.js` | LLM provider abstraction (OpenAI / Gemini API calls) |
| `rag.js` | Retrieval-Augmented Generation — queries knowledge base + LLM |
| `embeddings.js` | Text embedding generation for semantic search |
| `anomaly.js` | AI-powered anomaly detection in operational data |
| `predictive.js` | Predictive analytics for maintenance, failures |
| `governance.js` | AI governance, model evaluation, bias checks |
| `routing.js` | Intelligent work order routing / assignment |
| `scheduler.js` | AI-assisted schedule optimization |
| `prompts.js` | Prompt templates and management |

### 6.2 ML Pipeline (`server/ml/`)

| Module | Algorithm | Purpose |
|---|---|---|
| `failure.js` | Custom model | Equipment failure prediction from lifecycle events |
| `sla.js` | Custom model | SLA breach probability scoring |
| `forecasting.js` | Holt-Winters | Time series forecasting (demand, workload) |
| `anomaly.js` | Statistical | Operational anomaly detection |
| `forgery.js` | Custom model | Document/image forgery detection |
| `orchestrator.js` | — | Training pipeline orchestrator (dispatches to models) |
| `utils.js` | — | Shared ML utilities |

Training pipeline:
```
POST /api/ml/train {modelType, config}
  → orchestrator.trainModel(modelType, config)
    → Loads data from MongoDB
    → Falls back to synthetic data if insufficient real data
    → Trains model, computes metrics (accuracy, precision, recall, F1)
    → Stores model weights + metrics in ml_models table
```

---

## 7. Multi-Tenancy

```
┌──────────────────────────────────────────┐
│           Multi-Tenant Model             │
│                                          │
│  • Application-level isolation           │
│    (NOT database-level policies)         │
│                                          │
│  • Every table has tenant_id column      │
│  • Queries filtered by tenant_id         │
│  • sys_admin sees all tenants            │
│  • Other roles see only their tenant     │
│                                          │
│  PaaS Tenancy:                           │
│  • API keys scoped to tenant             │
│  • Usage metering per tenant             │
│  • Sandbox tenants (7-day trial)         │
│  • Rate limits: 1000 calls/day default   │
│  • Billing: ₹0.25 per API call          │
└──────────────────────────────────────────┘
```

---

## 8. PaaS / Developer Platform

GuardianFlow exposes its capabilities as platform services:

```
External Developer Flow:
  1. Visit /developer → create sandbox tenant
  2. Receive api_key + tenant_id
  3. Call POST /api/functions/api-gateway
     Headers: x-api-key, x-tenant-id
     Body: {service, action, data}
  4. Monitor usage at /developer-console

Available Services:
  • ops     — Work order CRUD, technician management
  • fraud   — Fraud detection, validation
  • finance — Invoicing, billing, payments
  • forecast — Hierarchical forecasting (7 geographic levels)
```

---

## 9. Security Architecture

| Layer | Mechanism |
|---|---|
| **Transport** | HTTPS (HSTS in production) |
| **Headers** | Helmet (security headers) |
| **CORS** | Origin allowlist (strict in production, requires `FRONTEND_URL`) |
| **Authentication** | JWT with bcrypt password hashing |
| **Authorization** | 16-role RBAC with granular permissions |
| **MFA** | Multi-factor auth for sensitive operations |
| **Rate Limiting** | General (1000/15min), Auth (20/15min), ML (10/15min) |
| **Input Validation** | Joi schemas on request bodies |
| **File Uploads** | MIME type allowlist, 10MB size limit |
| **Token Revocation** | In-memory blacklist + MongoDB collection (TTL) |
| **Secrets** | Multi-provider (env vars, AWS Secrets Manager, GCP Secret Manager) |
| **Audit Logging** | Comprehensive audit trail with correlation IDs |
| **NoSQL Injection** | Input validation + allowlisted collections |
| **WebSocket** | JWT auth on connection, 100KB payload limit |

---

## 10. Observability

```
Metrics:          Prometheus-style (server/metrics/)
                  - Request count, latency, status codes
                  - Active connections
                  - Per-endpoint performance

Logging:          Winston structured JSON logging
                  - Correlation IDs across requests
                  - Error context with stack traces

Health Check:     GET /api/health
                  - Database connectivity
                  - Uptime, memory usage, version

WebSocket:        Connection count + channel monitoring

Frontend:         /observability page for system monitoring
                  /platform-metrics for admin analytics
```

---

## 11. Build & Development

### Development Setup
```bash
# Frontend (port 5175)
npm install && npm run dev

# Backend (port 3001)
cd server && npm install && npm run dev

# Database
# MongoDB Atlas connection via MONGODB_URI environment variable
npm run migrate   # Apply migrations
```

### Vite Build Optimization
- SWC transpiler (`@vitejs/plugin-react-swc`)
- Manual chunk splitting: `vendor-react`, `vendor-query`, `vendor-recharts`, `vendor-ui`
- Path alias: `@/*` → `src/*`
- Proxy: `/api` → `http://localhost:3001` in development

### Code Quality
- ESLint (flat config) + TypeScript ESLint
- React Hooks lint rules
- React Refresh for HMR

---

## 12. Testing Strategy

```
tests/
├── __mocks__/                    # Shared mocks
├── api/                          # API endpoint tests
│   ├── ai-forecast.api.test.js
│   ├── ai-forgery.api.test.js
│   ├── ai-fraud.api.test.js
│   ├── ai-offers.api.test.js
│   └── ai-predictive.api.test.js
├── components/                   # Component tests (Vitest)
│   ├── AnalyticsTabs.test.tsx
│   ├── CreateWorkOrderDialog.test.tsx
│   ├── ForecastCenter.test.tsx
│   ├── ForgeryDetection.test.tsx
│   ├── FraudInvestigation.test.tsx
│   ├── OfferAI.test.tsx
│   ├── PredictiveMaintenance.test.tsx
│   └── PrecheckStatus.test.tsx
├── e2e/                          # Playwright E2E tests
│   └── ai-features.spec.ts
├── integration/                  # Integration tests
├── load/                         # Load/performance tests
├── unit/                         # Unit tests
├── auth-ux.spec.ts               # Auth UX flows
├── rbac.spec.ts                  # RBAC permission tests
├── tenant-isolation.spec.ts      # Multi-tenant isolation
└── comprehensive-functionality.spec.ts
```

---

## 13. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend org | Domain-driven folders | Scalable separation for 12+ feature areas |
| State mgmt | Context + React Query | Simpler than Redux, sufficient for this scale |
| API client | Custom fetch wrapper | Full control, query-builder interface preserved |
| UI library | shadcn/ui (Radix) | Accessible, customizable, no external dependency lock-in |
| Database | MongoDB Atlas | Document store, flexible schema, global clusters |
| Multi-tenancy | Application-level | Flexible, tenant_id field on all collections |
| Auth | JWT (self-managed) | Custom token blacklist with MongoDB TTL for revocation |
| ML pipeline | In-process Node.js | Lightweight models (Holt-Winters, statistical); synthetic data fallback |
| Real-time | ws library | Lightweight WebSocket; channel-based pub/sub |
| Secrets | Multi-provider | Supports env vars, AWS Secrets Manager, GCP Secret Manager |
| File storage | Disk-based (multer) | Simple, portable; can migrate to S3/GCS later |
| Payments | Multi-gateway (5) | Stripe, Razorpay, PayPal, Manual, Bank Transfer via base gateway pattern |
| Email | Nodemailer | Transactional email service |
| Logging | Winston | Structured JSON, correlation IDs, production-ready |

---

## 14. Deployment Architecture

```
Development:
  Frontend  → Vite dev server (localhost:5175)
  Backend   → Express dev server (localhost:3001)
  Database  → MongoDB Atlas (cloud cluster)

Production:
  Frontend  → Static build (Vite → dist/)
  Backend   → Express.js (PM2 or container)
  Database  → MongoDB Atlas (managed cluster)
  Secrets   → AWS Secrets Manager / GCP Secret Manager
  CORS      → FRONTEND_URL env var (required)
  SSL       → Database SSL + HSTS headers
```

**Prerequisites:**
- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB 7+)
- JWT_SECRET environment variable (required), MONGODB_URI for Atlas connection

---

## 15. Data Flow Diagrams

### 15.1 API Request Flow
```
Browser → Vite Proxy (/api) → Express Server
  → correlationId → metrics → helmet → cors → json parse
  → rate limit → JWT auth → RBAC check → validate(schema)
  → Route Handler → MongoDB driver → MongoDB Atlas
  → Response → metrics record → Client
```

### 15.2 AI Query Flow
```
User types NLP query
  → POST /api/ai/nlp-query
  → LLM service generates MongoDB query from natural language
  → Query executed against MongoDB collection
  → Results formatted and returned
  → Optional: RAG augments response with knowledge base context
```

### 15.3 ML Training Flow
```
Admin triggers training
  → POST /api/ml/train {modelType}
  → Orchestrator loads data from MongoDB
  → If insufficient data → generate synthetic dataset
  → Train model (failure/SLA/forecast)
  → Compute metrics (accuracy, precision, recall, F1)
  → Store weights + metrics in ml_models table
  → Return training results
```

### 15.4 WebSocket Flow
```
Client connects to ws://host/ws?token=<jwt>
  → Server verifies JWT
  → Client sends {type: "subscribe", channel: "work_orders"}
  → Server adds client to channel set
  → On data change: server broadcasts to all channel subscribers
  → Client receives real-time update
```
