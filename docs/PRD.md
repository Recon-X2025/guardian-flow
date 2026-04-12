# Guardian Flow — Product Requirements Document (PRD)

**Version:** 7.0  
**Date:** April 2026  
**Status:** Living document — updated to reflect actual build state as of v6.1  

> **Honesty note:** This document distinguishes between features that are *production-ready*, features that are *code-complete but require configuration* (e.g., an API key), and features that are *stubs or not yet built*. Previous versions did not make this distinction clearly enough.

---

## 1. Executive Summary

Guardian Flow is a multi-tenant enterprise field service management (FSM) platform with PaaS capabilities. It covers work order orchestration, financial management, CRM, analytics, compliance, AI/ML services, developer extensibility, and ESG reporting in a single product.

**Current parity vs enterprise market leaders:** ~37% (see `PLATFORM_COMPREHENSIVE_AUDIT.md` for full breakdown).

### 1.1 Vision

Become the preferred enterprise FSM platform for organisations that require deep compliance auditability, multi-domain coverage in a single product, and a developer-extensible PaaS layer — at a price point below ServiceNow and Salesforce Field Service.

### 1.2 Target Users

| Persona | Role | Primary Needs |
|---------|------|---------------|
| Operations Manager | `ops_manager` | Work order oversight, SLA monitoring, resource allocation |
| Dispatcher | `dispatcher` | Technician assignment, route optimisation, real-time tracking |
| Field Technician | `technician` | Work orders, photo capture, parts validation |
| Finance Manager | `finance_manager` | Invoicing, payment tracking, penalty enforcement |
| System Administrator | `sys_admin` | Platform configuration, RBAC, tenant management |
| Tenant Administrator | `tenant_admin` | User management within a tenant |
| Fraud Investigator | `fraud_investigator` | Image forensics, anomaly detection, compliance |
| Customer | `customer` | Self-service portal, service booking, ticket tracking |
| Developer / Partner | `partner_admin` | API access, marketplace extensions, webhooks |
| ML Engineer | `ml_ops` | Model training, performance monitoring, experimentation |

---

## 2. Feature Inventory & Status

Status legend:
- ✅ **Production-ready** — fully implemented, tested, tenant-isolated
- 🔑 **Needs API key** — code-complete but requires an environment variable to activate live mode
- 🔧 **Partial / Simplified** — implemented with known limitations noted below
- 🔲 **Stub** — route/service scaffolding exists but no real logic
- ❌ **Not built** — no implementation exists

### 2.1 Field Service Management (FSM Core)

| Feature | Status | Notes |
|---------|--------|-------|
| Work Order lifecycle (create → complete) | ✅ | Full status progression, tenant-isolated |
| Ticket management | ✅ | Linked to work orders |
| Dispatch board | ✅ | Map-based, real-time assignment |
| Schedule optimiser | 🔧 | Greedy constraint solver — skill match, SLA urgency, proximity; uses Euclidean distance (not real driving time) |
| Route optimisation | 🔧 | Nearest-neighbour TSP using haversine distance at 50 km/h assumption — no Google Maps API |
| Predictive maintenance | 🔑 | Scaffold complete; predictions require ML model data; IoT sensor ingestion is stub |
| Asset / Equipment management | ✅ | Registration, serial numbers, warranty tracking |
| Inventory & procurement | ✅ | Stock levels, low-stock alerts, purchase orders |
| Technician management | ✅ | Skills, certifications, availability |
| Service orders (SaPOS) | ✅ | Generation, PDF export |
| Photo capture & validation | 🔲 | Upload works; defect analysis is mock (`Math.random()`) — not real CV |
| IoT telemetry ingestion | 🔲 | MQTT stub — activates only when `MQTT_BROKER_URL` env var is set; no real broker |
| Mobile / Offline PWA | ❌ | `vite-plugin-pwa` in devDependencies but not configured; no offline sync |

### 2.2 Financial Management

| Feature | Status | Notes |
|---------|--------|-------|
| Invoicing | ✅ | Create, edit, PDF generation |
| Payments (Stripe / PayPal / Razorpay) | 🔑 | Code-complete; activates with payment provider API keys |
| Quotes | ✅ | |
| Penalties | ✅ | |
| Dispute management | ✅ | |
| General ledger | ✅ | Double-entry bookkeeping |
| Accounts payable | ✅ | |
| Bank reconciliation | ✅ | |
| Budgeting | ✅ | |
| Pricing calculator | ✅ | |
| Warranty management | ✅ | |
| Revenue recognition (ASC 606 / IFRS 15) | ❌ | Not built |
| Recurring / subscription billing | ❌ | Not built |
| Multi-jurisdiction tax engine | ❌ | Not built |

### 2.3 CRM

| Feature | Status | Notes |
|---------|--------|-------|
| Accounts | ✅ | |
| Contacts | ✅ | |
| Leads (with server-side scoring) | ✅ | Lead convert endpoint: `POST /api/crm/leads/:id/convert` |
| Deals | ✅ | |
| Pipeline (Kanban drag-and-drop) | ✅ | dnd-kit based |
| Email / Calendar sync (Gmail, Outlook) | ❌ | Not built |
| Marketing automation | ❌ | Not built |

### 2.4 AI / ML Platform

| Feature | Status | Notes |
|---------|--------|-------|
| LLM assistant (chat) | 🔑 | Real GPT-4o when `OPENAI_API_KEY` is set; keyword-match mock otherwise |
| Work order summarisation | 🔑 | Activates with LLM |
| SaPOS offer generation (AI) | 🔑 | Activates with LLM |
| RAG knowledge search | 🔑 | Cosine similarity on stored embeddings; requires `OPENAI_API_KEY` for real embedding generation |
| Anomaly detection (statistical) | ✅ | Real z-score analysis on work order completion times and financial transactions |
| Computer vision / photo defect detection | 🔲 | **Stub — `Math.random()` defect generator; no real vision model** |
| NLP query interface | 🔑 | Activates with LLM |
| ML model training / experimentation | 🔧 | AutoML scaffolding; no production-grade training pipeline |
| Model performance monitoring | 🔧 | Metrics endpoint exists; mock data |
| Explainable AI (XAI) | 🔧 | Route exists; simplified outputs |
| Federated learning coordinator | 🔲 | Route stub only |
| AI governance / audit logs | ✅ | `ai_governance_logs` collection; all LLM calls logged to FlowSpace |
| Fine-tuning interface | 🔧 | Route exists; simplified |

### 2.5 Compliance & Security

| Feature | Status | Notes |
|---------|--------|-------|
| 7-year immutable audit trail | ✅ | Partitioned `audit_logs` collection |
| RBAC (8 roles, action-level) | ✅ | Backend + frontend enforcement |
| Multi-tenant isolation (application-level) | ✅ | All queries tenant-scoped |
| MFA for high-risk operations | ✅ | `mfa_tokens` collection |
| Compliance policy framework | ✅ | `policy_registry`, `agent_policy_bindings` |
| Fraud / anomaly investigation | ✅ | Real z-score detection; investigation UI |
| Image forensics (forgery detection) | 🔑 | Activates with LLM vision; basic tamper scoring |
| Incident response system (P0–P3) | ✅ | |
| JIT privileged access control | ✅ | |
| Automated quarterly access reviews | ✅ | |
| SIEM integration | 🔑 | Webhook-based; requires SIEM endpoint configuration |
| SOC 2 Type II certification | ❌ | Infrastructure ready; formal audit not yet initiated |
| ISO 27001 certification | ❌ | Infrastructure ready; formal audit not yet initiated |

### 2.6 Customer & Partner Portals

| Feature | Status | Notes |
|---------|--------|-------|
| Customer self-service portal | ✅ | Booking, ticket tracking |
| Customer 360 view | ✅ | |
| Partner portal | ✅ | |
| Customer communications (in-app, email) | 🔑 | Requires SMTP/email provider configuration |
| Customer satisfaction surveys | 🔲 | Route stub |
| Customer health scoring (real-time) | 🔲 | Stub |

### 2.7 Developer Platform / PaaS

| Feature | Status | Notes |
|---------|--------|-------|
| Developer portal & API docs | ✅ | |
| Partner API gateway (rate-limited) | ✅ | |
| Webhooks (delivery + retry) | ✅ | |
| Serverless functions (`/api/functions`) | ✅ | |
| Custom dashboard builder | ✅ | |
| Marketplace (listing/installation) | ✅ | Frontend complete |
| Marketplace extension backend | 🔲 | Route stub — no submission/certification workflow |
| GraphQL API | ❌ | Not built; REST only |
| Auto-generated OpenAPI spec | ❌ | Not built |
| ERP connectors (SAP, Salesforce, QB) | 🔲 | **Stubs — service classes exist but make no real API calls** |

### 2.8 Analytics & Reporting

| Feature | Status | Notes |
|---------|--------|-------|
| Analytics dashboards | ✅ | |
| Forecasting (hierarchical, India-market) | ✅ | Statistical + LLM-powered (activates with API key) |
| Anomaly detection dashboards | ✅ | Real z-score backed |
| Custom report builder | ✅ | |
| Observability (platform metrics) | ✅ | |
| A/B test manager | ✅ | |
| Advanced BI / embedded analytics | 🔧 | Charts powered by Recharts; no Tableau/Looker integration |

### 2.9 Knowledge Management

| Feature | Status | Notes |
|---------|--------|-------|
| Knowledge base (CRUD) | ✅ | |
| FAQ management | ✅ | |
| RAG query engine | 🔑 | Real cosine similarity search when embeddings are generated |
| AI-powered answers | 🔑 | Requires OPENAI_API_KEY |
| Article indexing (embeddings) | 🔑 | Requires OPENAI_API_KEY |

### 2.10 ESG / Sustainability

| Feature | Status | Notes |
|---------|--------|-------|
| ESG dashboards | ✅ | Carbon, waste, energy metrics |
| ESG route backend | ✅ | |
| Scope 1 / 2 / 3 emissions methodology | ❌ | Not built |
| GRI / SASB / TCFD report generation | ❌ | Not built |
| Regulatory submission automation | ❌ | Not built |

### 2.11 Unique Platform Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| **FlowSpace decision ledger** | ✅ | Append-only, tenant-scoped, lineage-traced; no competitor equivalent |
| **DEX ExecutionContext state machine** | ✅ | Formal workflow orchestration with auditable stage transitions |
| **Multi-tenant PaaS architecture** | ✅ | White-label capable; tenant isolation across all collections |
| Industry workflow templates | ✅ | Semantic versioning, template library |
| Org Management Console (MAC) | ✅ | sys_admin + tenant_admin at `/org-console` |
| SSO / SAML | ✅ | `server/routes/sso.js`; requires SAML provider configuration |

### 2.12 Internationalisation

| Feature | Status | Notes |
|---------|--------|-------|
| i18n scaffolding (`src/i18n/`) | ✅ | Directory and framework in place |
| Translation strings | 🔲 | Only English strings wired |
| RTL / multi-locale support | ❌ | Not configured |

---

## 3. Non-Functional Requirements

### 3.1 Security (Implemented)
- JWT authentication on all protected routes
- Helmet.js HTTP security headers
- CORS policy enforcement
- express-rate-limit on all API routes
- Zod input validation on all endpoints
- Bcrypt password hashing
- Correlation IDs on all requests

### 3.2 Performance (Targets)
- API response time p95 < 300 ms for list operations
- Build time < 30 s (currently 16.6 s)
- Frontend bundle < 4 MB (currently ~3.3 MB)

### 3.3 Scalability
- MongoDB Atlas (default) or PostgreSQL (set `DB_ADAPTER=postgresql`)
- Stateless Express.js backend — horizontal scaling via load balancer
- WebSocket server for real-time updates

### 3.4 Compliance Targets
- SOC 2 Type II — Q4 2026 target (infrastructure ready, audit not yet started)
- ISO 27001:2022 — Q1 2027 target
- GDPR data residency — architecture supports; formal review pending

---

## 4. Roles & Access

| Role | Key Capabilities |
|------|-----------------|
| `sys_admin` | All modules, all tenants |
| `tenant_admin` | All modules, own tenant |
| `ops_manager` | View-only across operations, no write actions |
| `dispatcher` | Create/assign work orders; view-only on finance |
| `technician` | Own assigned work orders; no finance/admin |
| `finance_manager` | Full finance; read-only operations |
| `fraud_investigator` | Fraud/compliance modules; read-only operations |
| `support_agent` | Tickets, customer portal |
| `partner_admin` | Tenant-scoped tickets, work orders, invoices |
| `ml_ops` | ML studio, model monitoring |
| `customer` | Self-service portal only |

Full action-level permission matrix: see `RBAC_ACTION_PERMISSIONS.md`.

---

## 5. Environment Configuration

| Variable | Purpose | Required for |
|----------|---------|-------------|
| `OPENAI_API_KEY` | Real LLM, embeddings, RAG, vision | AI features (mock otherwise) |
| `AI_PROVIDER` | `mock` (default) or `openai` | AI mode selection |
| `DB_ADAPTER` | `mongodb` (default) or `postgresql` | DB selection |
| `MONGODB_URI` | MongoDB connection | MongoDB mode |
| `POSTGRES_URI` | PostgreSQL connection | PostgreSQL mode |
| `STRIPE_SECRET_KEY` | Payment processing | Stripe payments |
| `MQTT_BROKER_URL` | IoT telemetry ingestion | IoT features |
| `JWT_SECRET` | Token signing | Auth (required) |
| `VITE_API_URL` | Frontend → backend URL | Frontend (required) |

---

*Document updated April 2026. Source of truth: `docs/PLATFORM_COMPREHENSIVE_AUDIT.md` for gap analysis; codebase for implementation status.*
