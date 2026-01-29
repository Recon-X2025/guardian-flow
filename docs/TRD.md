# Guardian Flow — Technical Requirements Document (TRD)

**Version:** 6.0
**Date:** January 29, 2026
**Author:** Engineering Team
**Status:** Active

---

## 1. Introduction

### 1.1 Purpose

This document defines the technical architecture, implementation details, design decisions, and infrastructure requirements for Guardian Flow v6.0. It serves as the authoritative reference for engineering teams building, maintaining, and extending the platform.

### 1.2 Scope

Covers all technical layers: frontend application, backend API, database schema, ML pipeline, edge functions, authentication, testing, and deployment infrastructure.

### 1.3 System Context

```
External Users        External Services         Infrastructure
─────────────        ─────────────────         ──────────────
Browsers (SPA)       Gemini 2.5 Flash          PostgreSQL 14+
Mobile (PWA)         OpenAI API                Supabase (Edge, Auth, Storage)
Partner APIs         Stripe/PayPal/Razorpay    Vultr (Production)
Webhooks             Google/Outlook Calendar   Node.js 18+ Runtime
                     SIEM Systems              Deno Runtime (Edge Functions)
```

---

## 2. Frontend Architecture

### 2.1 Application Structure

```
src/
├── App.tsx                    # Route definitions (83 routes)
├── main.tsx                   # Application entry point
├── domains/                   # Domain-driven design (12 domains)
│   ├── auth/                  # Authentication & RBAC
│   │   ├── contexts/          # AuthContext, RBACContext
│   │   ├── components/        # ProtectedRoute, RoleGuard, AccessDenied
│   │   ├── hooks/             # useAuth, useRBAC, useSession
│   │   └── pages/             # Auth, UnifiedPlatformAuth (8 variants)
│   ├── workOrders/            # Work order lifecycle
│   ├── tickets/               # Ticket management
│   ├── financial/             # Invoicing, payments, penalties
│   ├── analytics/             # BI, forecasting, anomaly detection
│   ├── fraud/                 # Fraud investigation, compliance
│   ├── inventory/             # Equipment, stock, procurement
│   ├── customers/             # Customer & partner management
│   ├── knowledge/             # KB, FAQ, RAG
│   ├── marketplace/           # Extension marketplace
│   ├── training/              # Training platform
│   └── shared/                # Cross-cutting: layout, dashboard, admin
├── components/ui/             # shadcn/ui component library (40+ components)
├── hooks/                     # Global hooks
├── lib/                       # Utilities (apiClient, supabase client)
└── integrations/supabase/     # Supabase client configuration
```

### 2.2 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Client-side SPA | Field service dashboard requires persistent state; no SEO requirements |
| State management | TanStack Query + Context | Server state caching with Query; auth/RBAC state via Context |
| Component library | shadcn/ui (Radix) | Accessible, composable, tree-shakeable; TailwindCSS integration |
| Form handling | React Hook Form + Zod | Type-safe validation with schema composition |
| Routing | React Router 6 | Nested routes with layout components; route-level code splitting |
| Build tool | Vite 5.4 | Fast HMR, ESM-native, optimized production builds |

### 2.3 Route Protection Architecture

```
<Route path="/work-orders" element={
  <ProtectedRoute>                          // Layer 1: Auth gate
    <RoleGuard                              // Layer 2: RBAC
      roles={['sys_admin','ops_manager']}
      permissions={["wo.read"]}
      showError={true}
    >
      <AppLayout>                           // Layer 3: Layout wrapper
        <WorkOrders />                      // Layer 4: Page component
      </AppLayout>
    </RoleGuard>
  </ProtectedRoute>
} />
```

**ProtectedRoute**: Redirects unauthenticated users to `/auth`.
**RoleGuard**: Checks permissions first (via `hasAnyPermission`), then roles (via `hasAnyRole`). Renders access-denied card if both fail.
**AppLayout**: Sidebar + header + content area.

### 2.4 Sidebar Navigation

Menu items in `AppSidebar.tsx` are organized into 8 groups (Core, Operations, Financial, AI & Automation, Analytics & Security, Portals, Developer, System). Each item specifies required `roles` and/or `permissions`. Items without any permission specification are **denied by default** (security-first).

```typescript
canAccessItem(item): boolean {
  if (item.roles) return hasAnyRole(item.roles);
  if (item.permissions) return hasAnyPermission(item.permissions);
  return false; // Deny by default
}
```

### 2.5 API Client

`src/lib/apiClient.ts` — unified client wrapping both Express API calls and Supabase function invocations:

- JWT passed in `Authorization: Bearer <token>` header
- Automatic token refresh on 401
- Error normalization
- Supabase function proxy via Express fallback

---

## 3. Backend Architecture

### 3.1 Express Server

**Entry point:** `server/server.js`
**Port:** 3001
**Module system:** ES Modules (`"type": "module"` in `server/package.json`)

```
server/
├── server.js              # Express app setup, middleware, route mounting
├── db/
│   └── client.js          # PostgreSQL connection pool (pg)
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── ml.js              # ML training, prediction, anomaly detection
│   ├── payments.js        # Payment gateway integration
│   ├── functions.js       # Edge function proxy
│   ├── knowledge-base.js  # KB CRUD
│   └── faqs.js            # FAQ endpoints
├── ml/
│   ├── utils.js           # ML primitives (sigmoid, dotProduct, normalize, etc.)
│   ├── failure.js         # Equipment failure model
│   ├── sla.js             # SLA breach model
│   ├── forecasting.js     # Holt-Winters forecasting
│   ├── anomaly.js         # Statistical anomaly detection
│   └── orchestrator.js    # Training pipeline & model storage
└── middleware/
    └── (rate limiting, CORS, error handling)
```

### 3.2 Middleware Stack

```javascript
app.use(cors({ origin: ['http://localhost:5176', ...], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 1000 }));
app.use('/api/auth', authRoutes);
app.use('/api/ml', mlRoutesFactory(pool));
app.use('/api/payments', paymentRoutes);
// ... additional routes
```

### 3.3 Database Connection

```javascript
// server/db/client.js
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
});
```

### 3.4 WebSocket Server

Mounted on the same HTTP server as Express. Used for:
- Real-time work order status updates
- Technician location streaming
- Dispatch notifications
- Agent orchestration events

---

## 4. Database Design

### 4.1 PostgreSQL Configuration

| Property | Value |
|----------|-------|
| Version | 14+ |
| Connection pooling | pg.Pool (max 20 connections) |
| SSL | Required (rejectUnauthorized: false for dev) |
| Tenant isolation | `tenant_id` column on all tenant-scoped tables |

### 4.2 Core Schema

#### Users & Authentication

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'guest',
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  role TEXT,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  tenant_id UUID,
  UNIQUE(user_id, role, tenant_id)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE role_permissions (
  role VARCHAR(50) NOT NULL,
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role, permission_id)
);
```

#### Operations

```sql
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  repair_type VARCHAR(50),          -- used as priority proxy
  check_out_at TIMESTAMP,           -- completion timestamp
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_serial VARCHAR(100),
  customer VARCHAR(255),
  symptom TEXT,
  status VARCHAR(50) DEFAULT 'open',
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE asset_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,           -- references equipment
  event_type VARCHAR(50),           -- maintenance, failure, inspection
  event_time TIMESTAMP,
  tenant_id UUID
);
```

#### ML Models

```sql
CREATE TABLE ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL,  -- equipment_failure, sla_breach
  framework VARCHAR(50),            -- logistic_regression
  status VARCHAR(50) DEFAULT 'deployed',
  accuracy_score DECIMAL,
  precision_score DECIMAL,
  recall_score DECIMAL,
  f1_score DECIMAL,
  training_data_size INTEGER,
  features JSONB,                   -- feature names, means, stds
  hyperparameters JSONB,            -- weights, bias, normalization params
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT ml_models_name_tenant_uq UNIQUE (model_name, tenant_id)
);

CREATE TABLE forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR(50),
  model_name VARCHAR(100),
  algorithm VARCHAR(50),
  frequency VARCHAR(20),
  accuracy_score DECIMAL,
  config JSONB,                     -- full Holt-Winters parameters
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Key Constraints

- `ml_models(model_name, tenant_id)` — UNIQUE: prevents duplicate models on retrain (upsert)
- `forecast_models` — delete-before-insert pattern (no unique constraint)
- All tenant-scoped tables include `tenant_id` foreign key

---

## 5. Machine Learning Pipeline

### 5.1 Architecture

```
Training Flow:
  POST /api/ml/train/{type}
    → orchestrator.js: trainModel(pool, modelType, config)
    → Query training data from PostgreSQL
    → If insufficient data → generate synthetic data
    → Feature engineering (normalize, encode)
    → Train/test split (80/20)
    → Gradient descent (logistic regression) or grid search (Holt-Winters)
    → Cross-validation (5-fold)
    → Store weights as JSONB in ml_models/forecast_models
    → Return metrics

Inference Flow:
  POST /api/ml/predict/{type}
    → Load model weights from ml_models table
    → Query current entity data (work orders, equipment)
    → Normalize features using stored means/stds
    → Dot product with weights + sigmoid activation
    → Return predictions with risk levels
```

### 5.2 Logistic Regression Implementation

```javascript
// server/ml/utils.js
function logisticRegressionTrain(X, y, options = {}) {
  const { learningRate = 0.1, epochs = 500, lambda = 0.01 } = options;
  const [nSamples, nFeatures] = [X.length, X[0].length];
  let w = new Array(nFeatures).fill(0);
  let b = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < nSamples; i++) {
      const z = dotProduct(X[i], w) + b;
      const pred = sigmoid(z);
      const error = pred - y[i];
      for (let j = 0; j < nFeatures; j++) {
        w[j] -= learningRate * (error * X[i][j] / nSamples + lambda * w[j]);
      }
      b -= learningRate * error / nSamples;
    }
  }
  return { weights: w, bias: b };
}
```

**Key functions:** `sigmoid(z)`, `dotProduct(a, b)`, `normalizeMatrix(X)`, `trainTestSplit(X, y, testSize)`, `crossValidate(X, y, k, trainFn)`, `computeClassificationMetrics(yTrue, yPred)`

### 5.3 Holt-Winters Implementation

```javascript
// server/ml/forecasting.js
function holtWintersTrain(data, seasonLength = 7) {
  // Grid search over alpha, beta, gamma (step 0.1)
  // Minimize MSE on training data
  // Returns: { alpha, beta, gamma, level, trend, seasonal[], residualStd, metrics }
}

function holtWintersPredict(weights, horizon) {
  // Extrapolate from last level/trend/seasonal state
  // Confidence intervals: forecast ± z * residualStd * sqrt(h)
  // Returns: [{ step, value, lower, upper }]
}
```

### 5.4 Anomaly Detection Implementation

```javascript
// server/ml/anomaly.js — uses simple-statistics library
// Four methods run independently, consensus if >= 2 agree:

detectZScore(values, threshold = 2.5)
  → Flag if |z-score| > threshold

detectModifiedZScore(values, threshold = 3.5)
  → MAD = median(|xi - median|)
  → Modified z = 0.6745 * (xi - median) / MAD
  → Flag if |modified_z| > threshold

detectIQR(values, multiplier = 1.5)
  → Q1, Q3, IQR = Q3 - Q1
  → Flag if value < Q1 - 1.5*IQR or value > Q3 + 1.5*IQR

detectSlidingWindow(values, windowSize = 5, threshold = 2.0)
  → Local mean/std in sliding window
  → Flag if |value - localMean| > threshold * localStd
```

### 5.5 Model Storage Strategy

| Model Type | Table | Conflict Strategy |
|-----------|-------|------------------|
| equipment_failure | `ml_models` | `ON CONFLICT (model_name, tenant_id) DO UPDATE` |
| sla_breach | `ml_models` | `ON CONFLICT (model_name, tenant_id) DO UPDATE` |
| forecast | `forecast_models` | `DELETE WHERE model_name = $1` then `INSERT` |

### 5.6 Synthetic Data Generation

When training data is insufficient:

| Model | Threshold | Synthetic Size | Strategy |
|-------|-----------|---------------|----------|
| Equipment Failure | < 50 events | 100 samples | Random features with failure probability weighted by days_since_maintenance |
| SLA Breach | < 10 work orders | 500 samples | Random work orders with breach probability weighted by priority |
| Forecast | < 14 data points | 180 days | Trend + sinusoidal seasonal + Gaussian noise |

---

## 6. Edge Functions

### 6.1 Runtime

- **Runtime:** Deno (Supabase Edge)
- **Language:** TypeScript
- **Invocation:** HTTP POST via Supabase client or Express proxy
- **Count:** 131 functions

### 6.2 Function Categories

| Category | Count | Key Functions |
|----------|-------|---------------|
| Agent/AI | 9 | agent-orchestrator, agent-runtime, agent-processor, agent-worker |
| Analytics | 20+ | analytics-aggregator, analytics-anomaly-detector, analytics-ml-orchestrator |
| Forecasting | 8 | forecast-engine (uses Holt-Winters weights from DB), forecast-worker |
| Compliance | 8 | compliance-policy-enforcer, compliance-evidence-collector, compliance-siem-forwarder |
| Financial | 6 | calculate-penalties, billing-reconciler, dispute-manager |
| Auth/Access | 7 | auth-me, request-mfa, verify-mfa, assign-role |
| Workflow | 4 | workflow-executor, workflow-orchestrator, precheck-orchestrator |
| Operations | 15+ | check-warranty, check-inventory, predict-sla-breach, predict-equipment-failure |
| Admin/System | 10+ | seed-demo-data, health-monitor, security-monitor |
| Data/Integration | 8 | external-data-sync, mobile-sync, webhook-delivery-manager |

### 6.3 ML-Integrated Edge Functions

These functions load trained model weights from the database and perform lightweight inference:

**predict-equipment-failure/index.ts:**
```typescript
// Load model: SELECT * FROM ml_models WHERE model_type='equipment_failure' AND status='deployed'
// Inference: normalize features → dot product with weights → sigmoid → risk level
// Fallback: heuristic thresholds if no model found
```

**predict-sla-breach/index.ts:**
```typescript
// Load model: SELECT * FROM ml_models WHERE model_type='sla_breach' AND status='deployed'
// Inference: same logistic regression pattern
// Fallback: point-based scoring (+30 for age>5d, +20 for urgent)
```

**forecast-engine/index.ts:**
```typescript
// Load model: SELECT config FROM forecast_models WHERE model_type = $1
// If Holt-Winters weights available → generateHoltWintersForecast(weights, horizon)
// Else → simple moving average fallback
```

**analytics-anomaly-detector/index.ts:**
```typescript
// Inline statistical detection (no model loading needed)
// Z-score + Modified Z-score + IQR detection
// Consensus voting (>= 2 methods agree)
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

```
1. Client POST /api/auth/signin { email, password }
2. Server: query users table, bcrypt.compare(password, hash)
3. Server: generate JWT { userId, email, role, tenantId } (7-day expiry)
4. Client: store token in localStorage
5. Client: attach token to all requests (Authorization: Bearer <token>)
6. Server: verify JWT on protected endpoints
7. Session restore: POST /api/auth/me with existing token
```

### 7.2 JWT Payload

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "sys_admin",
  "tenantId": "uuid",
  "iat": 1706500000,
  "exp": 1707104800
}
```

### 7.3 RBAC Implementation

**Server-side** (`/api/auth/me` response):
```json
{
  "user": { "id": "...", "email": "...", "role": "sys_admin" },
  "roles": ["sys_admin"],
  "permissions": ["ticket.read", "ticket.write", "wo.read", "wo.write", ...]
}
```

**Client-side** (`RBACContext`):
```typescript
const { hasRole, hasAnyRole, hasPermission, hasAnyPermission } = useRBAC();
```

### 7.4 Permission Matrix

| Permission | sys_admin | tenant_admin | ops_manager | dispatcher | technician | finance_manager | customer |
|-----------|:---------:|:------------:|:-----------:|:----------:|:----------:|:---------------:|:--------:|
| ticket.read | x | x | x | x | x | | x |
| ticket.write | x | x | x | x | x | | |
| wo.read | x | x | x | x | x | | |
| wo.write | x | x | x | x | | | |
| wo.assign | x | x | x | x | | | |
| finance.view | x | x | | | | x | |
| finance.write | x | | | | | x | |
| invoice.view | x | x | x | | | x | |
| fraud.view | x | | | | | | |
| admin.config | x | x | | | | | |
| analytics:view | x | x | x | | | x | |
| mlops.view | x | | | | | | |

---

## 8. Payment Integration

### 8.1 Gateway Architecture

```javascript
// server/routes/payments.js
// Abstract PaymentGateway interface:
class PaymentGateway {
  createIntent(amount, currency, metadata) → { intentId, clientSecret }
  confirmPayment(intentId) → { status, transactionId }
  refund(transactionId, amount) → { refundId, status }
  getStatus(intentId) → { status, amount, currency }
}

// Implementations:
class StripeGateway extends PaymentGateway { ... }
class PayPalGateway extends PaymentGateway { ... }
class RazorpayGateway extends PaymentGateway { ... }
```

### 8.2 Gateway Configuration

| Gateway | API Version | Endpoints |
|---------|------------|-----------|
| Stripe | v1 | `/v1/payment_intents`, `/v1/refunds` |
| PayPal | v2 | `/v2/checkout/orders`, `/v2/payments/captures` |
| Razorpay | v1 | `/v1/orders`, `/v1/payments` |

---

## 9. Testing Architecture

### 9.1 Test Pyramid

```
        ┌──────────────┐
        │   E2E (91)   │  Playwright / Chromium
        │  Full flows   │  Auth, navigation, pages
        ├──────────────┤
        │  API (25)    │  Jest + Supertest
        │  Endpoints   │  Auth, DB, REST
        ├──────────────┤
        │ Component(5+)│  Vitest + RTL
        │ UI units     │  Dialogs, forms
        ├──────────────┤
        │  Load (k6)   │  50 VUs, 700+ iterations
        │  Stress      │  Throughput, latency
        ├──────────────┤
        │  ML Stress   │  300 rapid-fire requests
        │  Endpoints   │  All ML APIs
        └──────────────┘
```

### 9.2 E2E Test Configuration

```typescript
// playwright.config.ts
{
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5176',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5176,
    reuseExistingServer: true,
  }
}
```

### 9.3 Test Coverage by Domain

| Domain | E2E Specs | Tests |
|--------|-----------|-------|
| Authentication | auth.spec.ts | 7 tests (login, register, MFA, redirect) |
| Core Operations | core-operations.spec.ts | 21 tests (WO, tickets, dispatch, scheduling) |
| Financial | financial.spec.ts | 11 tests (invoicing, payments, penalties) |
| AI/ML | ai-ml.spec.ts | 12 tests (forecast, analytics, agents, NLP) |
| Fraud/Security | fraud-security.spec.ts | 5 tests (forgery, anomaly, MFA) |
| Compliance | compliance-audit.spec.ts | 8 tests (audit, compliance, training) |
| Developer | developer-integration.spec.ts | 12 tests (console, webhooks, marketplace) |
| Admin | platform-admin.spec.ts | 10 tests (admin, RBAC, documents) |
| Mobile/Field | mobile-field.spec.ts | 2 tests (photo, geolocation) |
| Workflow | workflow.test.ts | 3 tests (WO, tickets, forecast navigation) |

### 9.4 Load Test Configuration

```javascript
// tests/load/stress-test.js (k6)
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Ramp up
    { duration: '20s', target: 30 },   // Increase
    { duration: '10s', target: 50 },   // Peak
    { duration: '20s', target: 30 },   // Cool down
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'errors': ['rate<0.01'],
    'http_req_duration': ['p(95)<3000'],
  },
};
```

### 9.5 Current Test Results (Jan 29, 2026)

| Suite | Result | Details |
|-------|--------|---------|
| E2E | 91/91 passed | 22.6s total |
| API | 25/25 passed | 0.36s total |
| Load (k6) | 692 iterations | 50 VUs, 0 errors, 108 req/s, p95=1.52s |
| ML Stress | 300/300 passed | avg 5-17ms, 0 failures |

---

## 10. Deployment & Infrastructure

### 10.1 Development Environment

```bash
# Frontend (Vite dev server)
npm run dev                    # Port 5176

# Backend (Express + WebSocket)
cd server && node server.js    # Port 3001

# Database
# PostgreSQL via Supabase or local instance

# Edge Functions
supabase functions serve       # Local Deno runtime
```

### 10.2 Production Environment

| Component | Infrastructure |
|-----------|---------------|
| Frontend | Static build (Vite) → CDN/Vultr |
| Backend | Node.js 18+ → Vultr VPS |
| Database | PostgreSQL 14+ → Supabase/Vultr |
| Edge Functions | Supabase Edge (Deno) |
| Storage | Supabase Storage |

### 10.3 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# AI/ML
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Payments
STRIPE_SECRET_KEY=sk_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...

# Auth
JWT_SECRET=...
```

### 10.4 Build & Deploy

```bash
# Build frontend
npm run build                  # Output: dist/

# Build check
npx tsc --noEmit              # TypeScript validation

# Run all tests
npx playwright test            # E2E
npx jest tests/api/            # API
npx k6 run tests/load/stress-test.js  # Load
```

---

## 11. Security Considerations

### 11.1 Authentication Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiry (no refresh token — stateless)
- MFA support for sensitive operations
- Rate limiting: 1000 requests per 15-minute window

### 11.2 Input Validation

- Zod schema validation on all form inputs
- DOMPurify for HTML sanitization
- Parameterized SQL queries (no string interpolation)
- Express JSON body limit (10MB)

### 11.3 Access Control

- Route-level: ProtectedRoute + RoleGuard
- API-level: JWT verification middleware
- Database-level: tenant_id isolation
- Default-deny: sidebar items without explicit permissions are hidden

### 11.4 Data Protection

- SSL/TLS for database connections
- CORS whitelist for allowed origins
- No secrets in client-side code
- Audit logging for all state-changing operations

---

## 12. Performance Characteristics

### 12.1 Measured Performance

| Metric | Value | Conditions |
|--------|-------|-----------|
| E2E page load | 1.1-3.8s | Playwright, includes auth |
| API response (ML) | 5-17ms | Express, local PostgreSQL |
| ML model training | 4-46ms | Logistic regression / Holt-Winters |
| Anomaly detection | 5.9ms avg | 100 rapid-fire requests |
| Forecast inference | 5.8ms avg | 50 rapid-fire requests |
| SLA prediction | 17.4ms avg | 50 rapid-fire requests (includes DB query) |
| Load test throughput | 108 req/s | 50 concurrent VUs |
| Load test p95 | 1.52s | Includes auth-heavy requests |

### 12.2 Bottlenecks & Optimization Notes

- SLA prediction is slowest ML endpoint (17ms) due to work order DB query per request
- Load test p95 elevated by Supabase auth round-trips (~1.5-2.5s)
- Holt-Winters grid search is O(n * grid_size^3) — fast for daily data, may slow for hourly
- DB connection pool max=20; may need increase under heavy concurrent load

---

## 13. Dependencies

### 13.1 Frontend (key dependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| typescript | 5.8.3 | Type safety |
| vite | 5.4.19 | Build tool |
| tailwindcss | 3.4.17 | Utility-first CSS |
| @tanstack/react-query | 5.83.0 | Server state management |
| react-router-dom | 6.30.1 | Client-side routing |
| react-hook-form | 7.61.1 | Form management |
| zod | 3.25.76 | Schema validation |
| recharts | 3.3.0 | Data visualization |
| jspdf | 3.0.3 | PDF generation |
| dompurify | 3.3.0 | HTML sanitization |

### 13.2 Backend (key dependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.18.2 | HTTP framework |
| pg | 8.17.2 | PostgreSQL driver |
| jsonwebtoken | 9.0.2 | JWT auth |
| bcryptjs | 2.4.3 | Password hashing |
| ws | 8.16.0 | WebSocket |
| simple-statistics | 7.8.8 | Statistical calculations |
| express-rate-limit | 7.1.5 | Rate limiting |
| multer | 1.4.5 | File uploads |
| cors | 2.8.5 | Cross-origin requests |

### 13.3 Testing

| Package | Version | Purpose |
|---------|---------|---------|
| @playwright/test | 1.58.0 | E2E testing |
| jest | 30.2.0 | API testing |
| vitest | 1.6.1 | Unit testing |
| supertest | 7.2.2 | HTTP assertions |
| k6 | (CLI) | Load testing |

---

*End of Technical Requirements Document*
