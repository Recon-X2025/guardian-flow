# Guardian Flow — Product Specification

**Version:** 6.1
**Date:** January 29, 2026
**Classification:** Internal

---

## 1. Product Overview

Guardian Flow is an enterprise-grade Field Service Management (FSM) platform that unifies work order lifecycle management, predictive maintenance, financial operations, fraud detection, and AI-powered analytics into a single multi-tenant SaaS/PaaS solution.

The platform serves organizations managing field service operations — from dispatching technicians and tracking equipment to forecasting demand, detecting anomalies, and enforcing SLA compliance.

---

## 2. System Architecture

### 2.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3, TypeScript 5.8, Vite 5.4, TailwindCSS 3.4, shadcn/ui (Radix) |
| State Management | TanStack React Query 5.83, React Context |
| Routing | React Router DOM 6.30 |
| Backend API | Express.js 4.18, Node.js 18+ |
| Database | PostgreSQL 14+ (SSL in production) |
| Edge Functions | Supabase Deno Runtime (131 functions) |
| Authentication | JWT (1h access + 30-day refresh tokens), bcryptjs, MFA |
| Token Security | JTI-based revocation, blacklist table, signout-all |
| Email | Nodemailer (SMTP), password reset delivery |
| Real-Time | WebSocket (ws 8.16) |
| ML/AI | Custom JS models (logistic regression, Holt-Winters, statistical anomaly detection) |
| LLM Integration | Google Gemini 2.5 Flash, OpenAI (fallback) |
| Payments | Stripe, PayPal, Razorpay |
| Reverse Proxy | nginx (TLS 1.2/1.3 termination, static asset CDN) |
| Monitoring | Prometheus-compatible /metrics endpoint, structured JSON logging |
| Caching | Optional Redis (falls back to in-memory) |
| Infrastructure | AWS Terraform (VPC, RDS, ECS Fargate, ALB, CloudFront, Secrets Manager) |
| CI/CD | GitHub Actions (API + E2E tests) |
| Containerization | Docker (multi-stage), Docker Compose (nginx, server, postgres, backup, redis) |
| Input Validation | Zod schemas on API endpoints |
| Testing | Playwright 1.58, Jest 30.2, Vitest 1.6, k6 |
| PDF/Reports | jsPDF 3.0 |
| Charts | Recharts 3.3 |

### 2.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│   React SPA → Vite Dev Server (:5176) / Static Build       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
              ┌────────▼────────┐
              │  nginx (:443)   │  TLS termination, static CDN,
              │  Reverse Proxy  │  rate limiting, gzip
              └────────┬────────┘
                       │
          ┌────────────┼────────────────┐
          │            │                │
          ▼            ▼                ▼
┌──────────────┐ ┌───────────┐ ┌──────────────────┐
│ Express API  │ │ Supabase  │ │ Supabase Edge    │
│ (:3001)      │ │ Auth/DB   │ │ Functions (131)  │
│ - Auth+JWT   │ │ - RLS     │ │ - Business logic │
│ - ML/AI      │ │ - Storage │ │ - Agents         │
│ - Payments   │ │           │ │ - Workflows      │
│ - Metrics    │ │           │ │                  │
└──────┬───────┘ └─────┬─────┘ └────────┬─────────┘
       │               │                │
       └───────────────┼────────────────┘
                       ▼
              ┌─────────────────┐     ┌──────────┐
              │  PostgreSQL 14+ │     │  Redis   │
              │  30+ tables     │     │ (optional)│
              │  SSL, backups   │     │  cache   │
              └─────────────────┘     └──────────┘
```

---

## 3. Domain Architecture

The codebase is organized into 12 domains under `src/domains/`:

| Domain | Description | Key Pages |
|--------|------------|-----------|
| **auth** | Authentication, RBAC, session management | Login, MFA, role guards |
| **tickets** | Support ticket lifecycle | Ticket creation, assignment, tracking |
| **workOrders** | Field service work order management | WO creation, dispatch, scheduling, route optimization, predictive maintenance |
| **customers** | Customer and partner management | Customer portal, partner portal |
| **financial** | Billing, invoicing, penalties, disputes | Finance dashboard, quotes, invoicing, payments, warranties, penalties |
| **inventory** | Equipment, stock, procurement | Inventory management, equipment registry, procurement |
| **analytics** | BI, forecasting, anomaly detection | Forecast center, analytics platform, custom reports, A/B testing |
| **fraud** | Fraud investigation, compliance | Forgery detection, compliance dashboard, compliance center |
| **knowledge** | Knowledge base, FAQ, RAG | KB management, FAQ, RAG engine |
| **marketplace** | Extension marketplace | Marketplace, marketplace management |
| **training** | Training and help content | Training platform, help center |
| **shared** | Cross-cutting: layout, dashboard, admin, dev tools | Dashboard, settings, admin console, developer console |

---

## 4. Feature Inventory

### 4.1 Core Operations (15 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `/dashboard` | Real-time operational overview with KPIs |
| Tickets | `/tickets` | Create, assign, track support tickets |
| Work Orders | `/work-orders` | Full work order lifecycle with precheck gating |
| Service Orders | `/service-orders` | Service order creation and management |
| Pending Validation | `/pending-validation` | Parts and photo validation queue |
| Dispatch | `/dispatch` | Technician dispatch with geolocation |
| Scheduler | `/scheduler` | Appointment and job scheduling |
| Schedule Optimizer | `/schedule-optimizer` | AI-assisted schedule optimization |
| Maintenance Calendar | `/maintenance-calendar` | Preventive maintenance planning |
| Route Optimization | `/route-optimization` | Multi-stop route planning |
| Predictive Maintenance | `/predictive-maintenance` | ML-driven failure prediction |
| Photo Capture | `/photo-capture` | Multi-angle photo validation for work orders |
| Technicians | `/technicians` | Technician profiles and tracking |
| Customers | `/customers` | Customer management |
| Equipment | `/equipment` | Equipment registry and lifecycle |

### 4.2 Financial Operations (11 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Finance Dashboard | `/finance` | Financial overview and reporting |
| Quotes | `/quotes` | Service quote generation |
| Invoicing | `/invoicing` | Invoice creation and management |
| Payments | `/payments` | Multi-gateway payment processing (Stripe, PayPal, Razorpay) |
| Warranties | `/warranty` | Warranty tracking and validation |
| Penalties | `/penalties` | SLA penalty calculation and application |
| Disputes | `/disputes` | Dispute management and resolution |
| Pricing Calculator | `/pricing-calculator` | Dynamic pricing tool |
| Contracts | `/contracts` | Service contract management |
| Procurement | `/procurement` | Purchase order management |
| Inventory | `/inventory` | Stock level tracking and alerts |

### 4.3 AI & Machine Learning (12 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Forecast Center | `/forecast` | Holt-Winters time series forecasting |
| Anomaly Detection | `/anomaly` | Statistical anomaly detection (Z-score, MAD, IQR) |
| Predictive Maintenance | `/predictive-maintenance` | Logistic regression failure prediction |
| SLA Breach Prediction | — (API) | Logistic regression SLA risk scoring |
| Model Orchestration | `/models` | ML model management and training |
| Agent Dashboard | `/agent-dashboard` | Autonomous agent monitoring |
| NLP Query | `/nlp-query` | Natural language database querying |
| RAG Engine | `/rag` | Retrieval-augmented generation |
| Assistant | `/assistant` | AI assistant (Gemini 2.5 Flash) |
| Offer AI (SAPOS) | `/sapos` | AI-generated service offers |
| Prompts | `/prompts` | Prompt template management |
| A/B Test Manager | `/ab-tests` | Experiment management |

### 4.4 Fraud & Compliance (6 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Fraud Investigation | `/fraud` | Fraud case management |
| Forgery Detection | `/forgery-detection` | Image forensics and forgery analysis |
| Compliance Dashboard | `/compliance-dashboard` | Compliance metrics overview |
| Compliance Center | `/compliance` | Policy registry, evidence collection, vulnerability management |
| Observability | `/observability` | Audit logs, system monitoring |
| System Health | `/system-health` | Infrastructure health monitoring |

### 4.5 Analytics & Reporting (7 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Analytics | `/analytics` | Core analytics with SLA tracking |
| Analytics Platform | `/analytics-platform` | Advanced BI platform |
| Custom Reports | `/custom-reports` | Report builder |
| Platform Metrics | `/platform-metrics` | API usage and platform KPIs |
| Analytics Integrations | `/analytics-integrations` | BI connector sync |
| Forecast Center | `/forecast` | Demand forecasting |
| A/B Test Manager | `/ab-tests` | Experiment analytics |

### 4.6 Developer & Platform (9 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Developer Console | `/developer-console` | API key management, usage metrics |
| Developer Portal | `/developer-portal` | API documentation |
| Webhooks | `/webhooks` | Webhook configuration and delivery |
| Marketplace | `/marketplace` | Extension marketplace |
| Marketplace Management | `/marketplace-management` | Extension publisher tools |
| Industry Workflows | `/industry-workflows` | Pre-built industry templates |
| Admin Console | `/admin` | Multi-tenant administration |
| Settings | `/settings` | User and system settings |
| Training Platform | `/training` | User training and certification |

### 4.7 Portals (3 features)

| Feature | Route | Description |
|---------|-------|-------------|
| Customer Portal | `/customer-portal` | Self-service customer interface |
| Partner Portal | `/partner-portal` | Partner management interface |
| Help & Training | `/help` | Help center and documentation |

---

## 5. Database Schema

### 5.1 Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | id, email, full_name, role, tenant_id |
| `users` | Local auth accounts | id, email, password_hash, role |
| `user_roles` | Role assignments | user_id, role, tenant_id |
| `permissions` | Permission definitions | id, name, description |
| `role_permissions` | Role-permission mapping | role, permission_id |
| `tenants` | Multi-tenant isolation | id, name, config |
| `tickets` | Support tickets | id, unit_serial, customer, symptom, status |
| `work_orders` | Work orders | id, wo_number, status, repair_type, check_out_at |
| `service_orders` | Service orders | id, work_order_id, status |
| `equipment` | Equipment registry | id, serial_number, model, status |
| `inventory_items` | Inventory SKUs | id, name, quantity, location |
| `invoices` | Billing invoices | id, total_amount, status, created_at |
| `ml_models` | ML model metadata | id, model_name, model_type, accuracy_score, hyperparameters |
| `forecast_models` | Forecast model storage | id, model_type, algorithm, config |
| `audit_logs` | Audit trail | id, action, user_id, timestamp |
| `fraud_alerts` | Fraud detection alerts | id, type, severity, status |

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

1. User submits credentials → Express `/api/auth/signin` (Zod-validated)
2. Server validates against PostgreSQL `users` table (bcrypt)
3. Access token (1h, includes JTI) + refresh token (30d, SHA-256 hashed in DB) issued
4. On access token expiry → `POST /api/auth/refresh` with refresh token → new rotated pair
5. Session restored on app load via `/api/auth/me`
6. Password reset via email (`POST /api/auth/forgot-password` → nodemailer SMTP)
7. Token revocation: individual (`/signout`) or all sessions (`/signout-all`) via JTI blacklist
8. MFA available for sensitive operations

### 6.2 Role-Based Access Control

**16 roles** with **40+ granular permissions** enforced at:
- **Route level**: `ProtectedRoute` (auth gate) + `RoleGuard` (role/permission check)
- **Sidebar level**: Items filtered by `canAccessItem()` based on user permissions
- **API level**: Server-side JWT validation + role verification
- **Database level**: Tenant isolation via `tenant_id`

| Role | Scope |
|------|-------|
| sys_admin | Full platform access |
| tenant_admin | Tenant-level administration |
| ops_manager | Operations management |
| finance_manager | Financial operations |
| fraud_investigator | Fraud and compliance |
| dispatcher | Dispatch and scheduling |
| technician | Field operations |
| support_agent | Customer support |
| customer | Self-service portal |
| auditor | Audit and compliance |
| ml_ops | ML model management |
| billing_agent | Billing operations |
| partner_admin | Partner management |
| partner_user | Partner portal access |
| product_owner | Product oversight |
| guest | Read-only access |

---

## 7. ML Model Specifications

### 7.1 Equipment Failure Prediction

| Property | Value |
|----------|-------|
| Algorithm | Logistic Regression (gradient descent) |
| Features | days_since_maintenance, failure_rate, maintenance_count, equipment_age, events_per_month, days_since_last_failure |
| Output | Risk probability (0-1), Risk level (CRITICAL/HIGH/MEDIUM/LOW) |
| Training data | Asset lifecycle events from PostgreSQL |
| Accuracy | ~85% |
| Inference | Dot product + sigmoid on normalized features |

### 7.2 SLA Breach Prediction

| Property | Value |
|----------|-------|
| Algorithm | Logistic Regression (gradient descent) |
| Features | age_hours, priority_numeric, has_technician, day_of_week, hour_of_day |
| Output | Breach probability (0-1) |
| Training data | Completed work orders with resolution times |
| Accuracy | ~83% |
| Threshold | Configurable SLA threshold in days (default: 7) |

### 7.3 Demand Forecasting

| Property | Value |
|----------|-------|
| Algorithm | Holt-Winters Triple Exponential Smoothing |
| Parameters | alpha (level), beta (trend), gamma (seasonal) — grid search optimized |
| Season length | 7 days (configurable) |
| Output | Point forecast + confidence intervals per step |
| R-squared | ~0.79 |
| Forecast types | repair_volume, spend_revenue, engineer_shrinkage |

### 7.4 Anomaly Detection

| Property | Value |
|----------|-------|
| Methods | Z-Score, Modified Z-Score (MAD), IQR, Sliding Window |
| Consensus | Anomaly flagged if >=2 methods agree |
| Output | isAnomaly, confidence, severity (low/medium/high), anomalyType |
| Deterministic | Yes (no random components) |

---

## 8. Edge Functions (131)

Organized into functional groups:

| Group | Count | Examples |
|-------|-------|---------|
| Agent/AI | 9 | agent-orchestrator, agent-runtime, agent-processor |
| Analytics | 20+ | analytics-aggregator, analytics-anomaly-detector, analytics-ml-orchestrator |
| Forecasting | 8 | forecast-engine, forecast-worker, generate-forecast |
| Compliance | 8 | compliance-policy-enforcer, compliance-evidence-collector |
| Financial | 6 | calculate-penalties, billing-reconciler, dispute-manager |
| Auth/Access | 7 | auth-me, request-mfa, assign-role, grant-temporary-access |
| Workflow | 4 | workflow-executor, workflow-orchestrator, precheck-orchestrator |
| Data Sync | 4 | external-data-sync, mobile-sync, offline-sync-processor |
| Fraud | 5 | detect-image-forgery, analyze-image-forensics |
| Operations | 15+ | check-warranty, check-inventory, predict-sla-breach |
| Admin/System | 10+ | seed-demo-data, health-monitor, security-monitor |
| Other | 35+ | webhook-trigger, notification-send, template-render |

---

## 9. API Endpoints

### 9.1 Express Server Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | User registration (Zod-validated) |
| POST | `/api/auth/signin` | Authentication (Zod-validated) |
| POST | `/api/auth/me` | Current user + RBAC |
| POST | `/api/auth/refresh` | Rotate access + refresh tokens |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/signout` | Invalidate refresh tokens |
| POST | `/api/auth/signout-all` | Revoke all tokens (JTI blacklist) |
| POST | `/api/auth/request-mfa` | Request MFA code |
| POST | `/api/auth/verify-mfa` | Verify MFA code |
| GET | `/api/ml/models` | List trained models |
| GET | `/api/ml/models/:id` | Get model details |
| POST | `/api/ml/train/failure` | Train equipment failure model |
| POST | `/api/ml/train/sla` | Train SLA breach model |
| POST | `/api/ml/train/forecast` | Train forecast model |
| POST | `/api/ml/predict/failure` | Predict equipment failure |
| POST | `/api/ml/predict/sla` | Predict SLA breach |
| POST | `/api/ml/predict/forecast` | Generate forecast |
| POST | `/api/ml/detect/anomalies` | Detect anomalies |
| GET | `/api/knowledge-base/*` | Knowledge base CRUD |
| GET | `/api/faqs` | FAQ management |
| GET | `/api/payments/gateways` | List payment gateways |
| POST | `/api/payments/create-intent` | Create payment intent |
| POST | `/api/payments/confirm-payment` | Confirm payment |
| POST | `/api/payments/refund` | Process refund |
| POST | `/api/functions/:name` | Edge function proxy |
| GET | `/api/health` | Health check (DB status, uptime, version) |
| GET | `/metrics` | Prometheus-compatible metrics |
| GET | `/metrics/json` | JSON metrics for dashboards |

---

## 10. Testing Infrastructure

| Suite | Framework | Tests | Coverage |
|-------|-----------|-------|----------|
| E2E | Playwright (Chromium) | 91 | All pages, auth, navigation, RBAC |
| API | Vitest | 25 | Auth, database, endpoints |
| Load (basic) | k6 | 50 VUs, 700+ iterations | Throughput, latency, error rates |
| Load (production) | k6 | 500 VUs | Sustained production traffic simulation |
| Load (spike) | k6 | 2000 VUs | Sudden traffic spike resilience |
| Component | Vitest + React Testing Library | 5+ | Key UI components |
| ML Stress | Custom (curl) | 300 requests | All ML endpoints |
| CI/CD | GitHub Actions | Auto | API + E2E on push/PR to main |

---

## 11. Multi-Tenant & PaaS Architecture

- **Data isolation**: Every table includes `tenant_id` foreign key
- **Sandbox provisioning**: 7-day trial tenants via `create-sandbox-tenant`
- **API gateway**: Rate limiting (1000 calls/day), API key management
- **White-label**: Custom branding via `white_label_configs` table
- **Usage billing**: ₹0.25 per API call, tracked in `api_usage_metrics`
- **Developer console**: API key generation, usage dashboards

---

## 12. Payment Processing

Three payment gateways integrated:

| Gateway | Markets | Features |
|---------|---------|----------|
| Stripe | Global | Payment intents, refunds, webhooks |
| PayPal | Global | Orders, captures, refunds, sandbox mode |
| Razorpay | India | Orders, payment verification, refunds |

---

## 13. Real-Time Capabilities

- **WebSocket server** on Express backend
- Live work order status updates
- Technician location streaming
- Dispatch notifications
- Agent orchestration events
- Mobile offline sync queue with conflict resolution

---

## 14. Integrations

| Integration | Purpose |
|-------------|---------|
| Google Gemini 2.5 Flash | Primary LLM for AI assistant, NLP queries, offer generation |
| OpenAI | Secondary/fallback LLM |
| Stripe/PayPal/Razorpay | Payment processing |
| Google/Outlook Calendar | Calendar sync |
| SIEM | Security event forwarding |
| BI Connectors | External BI tool integration |

---

*End of Product Specification*
