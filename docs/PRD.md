# Guardian Flow — Product Requirements Document (PRD)

**Version:** 6.0
**Date:** January 29, 2026
**Author:** Engineering Team
**Status:** Active

---

## 1. Executive Summary

Guardian Flow is a unified enterprise platform for field service management that replaces fragmented tooling with an integrated solution spanning operations, finance, AI/ML intelligence, compliance, and developer extensibility. The platform serves mid-to-large enterprises managing field technicians, equipment assets, and service contracts across geographies.

### 1.1 Vision

Eliminate operational inefficiency in field service organizations by combining real-time dispatch, predictive analytics, automated compliance, and self-service portals into a single multi-tenant platform.

### 1.2 Target Users

| Persona | Role | Primary Needs |
|---------|------|---------------|
| Operations Manager | `ops_manager` | Work order oversight, SLA monitoring, resource allocation |
| Dispatcher | `dispatcher` | Technician assignment, route optimization, real-time tracking |
| Field Technician | `technician` | Mobile work orders, photo capture, parts validation |
| Finance Manager | `finance_manager` | Invoicing, payment tracking, penalty enforcement |
| System Administrator | `sys_admin` | Platform configuration, RBAC, tenant management |
| Fraud Investigator | `fraud_investigator` | Image forensics, anomaly detection, compliance |
| Customer | `customer` | Self-service portal, service booking, ticket tracking |
| Developer/Partner | `partner_admin` | API access, marketplace extensions, webhooks |
| ML Engineer | `ml_ops` | Model training, performance monitoring, experimentation |

---

## 2. Product Requirements

### 2.1 Core Operations

#### REQ-OPS-001: Work Order Management
- **Priority:** P0 (Critical)
- **Description:** Full work order lifecycle from creation through completion with precheck gating, technician assignment, and photo validation.
- **Acceptance Criteria:**
  - Users can create work orders with required fields (unit serial, customer, repair type)
  - Work orders follow status progression: Draft → Assigned → In Progress → Pending Validation → Completed
  - Precheck validation blocks progression until all required steps pass
  - Photo validation requires multi-angle captures
  - Work orders are tenant-isolated
- **Roles:** sys_admin, tenant_admin, ops_manager, dispatcher, technician, partner_admin

#### REQ-OPS-002: Ticket Management
- **Priority:** P0
- **Description:** Support ticket creation, assignment, and resolution tracking.
- **Acceptance Criteria:**
  - Create tickets with unit serial, customer, symptom description
  - Tickets link to work orders
  - Status tracking with assignment history
- **Roles:** sys_admin, tenant_admin, ops_manager, dispatcher, technician, support_agent

#### REQ-OPS-003: Dispatch & Scheduling
- **Priority:** P0
- **Description:** Real-time technician dispatch with geolocation, route optimization, and schedule management.
- **Acceptance Criteria:**
  - Map-based technician location display
  - Route optimization for multi-stop assignments
  - Schedule optimizer with conflict detection
  - Maintenance calendar for preventive scheduling
- **Roles:** sys_admin, ops_manager, dispatcher

#### REQ-OPS-004: Equipment & Inventory Management
- **Priority:** P1
- **Description:** Equipment registry, lifecycle tracking, inventory stock management, and procurement.
- **Acceptance Criteria:**
  - Equipment registration with serial numbers and warranty info
  - Stock level tracking by location
  - Low-stock alerts
  - Purchase order creation
  - Warranty validation before service
- **Roles:** sys_admin, ops_manager, technician

#### REQ-OPS-005: Service Orders
- **Priority:** P1
- **Description:** Formalized service order generation from work orders with template support.
- **Acceptance Criteria:**
  - Generate service orders from work order data
  - Template-based document generation
  - PDF export capability
- **Roles:** sys_admin, tenant_admin, ops_manager

---

### 2.2 Financial Operations

#### REQ-FIN-001: Invoicing & Payments
- **Priority:** P0
- **Description:** Invoice generation, multi-gateway payment processing, and reconciliation.
- **Acceptance Criteria:**
  - Create invoices linked to work orders/service orders
  - Process payments via Stripe, PayPal, or Razorpay
  - Payment status tracking and receipt generation
  - Refund processing
- **Roles:** finance_manager, billing_agent

#### REQ-FIN-002: SLA Penalty Management
- **Priority:** P1
- **Description:** Automated SLA breach detection and penalty calculation.
- **Acceptance Criteria:**
  - Configurable SLA thresholds per contract/tenant
  - Automated penalty calculation based on breach severity
  - Penalty application with audit trail
  - Dispute mechanism for contested penalties
- **Roles:** finance_manager, ops_manager

#### REQ-FIN-003: Quotes & Contracts
- **Priority:** P1
- **Description:** Service quote generation and contract lifecycle management.
- **Acceptance Criteria:**
  - Generate quotes with line items and pricing
  - Contract management with renewal tracking
  - Warranty record management
- **Roles:** finance_manager, ops_manager

---

### 2.3 AI & Machine Learning

#### REQ-ML-001: Equipment Failure Prediction
- **Priority:** P1
- **Description:** Predict equipment failure probability using logistic regression on maintenance history.
- **Acceptance Criteria:**
  - Train on asset lifecycle events (maintenance, failures, inspections)
  - Output risk level (CRITICAL/HIGH/MEDIUM/LOW) with probability score
  - Accuracy >= 80%
  - Fallback to heuristic rules when no trained model exists
  - Model weights stored in `ml_models` table as JSONB
- **Current Performance:** 85% accuracy

#### REQ-ML-002: SLA Breach Prediction
- **Priority:** P1
- **Description:** Predict probability of SLA breach for open work orders.
- **Acceptance Criteria:**
  - Features: work order age, priority, technician assignment, day/time patterns
  - Output breach probability per work order
  - Accuracy >= 80%
  - Configurable SLA threshold (default 7 days)
- **Current Performance:** 83% accuracy

#### REQ-ML-003: Demand Forecasting
- **Priority:** P1
- **Description:** Time series forecasting for repair volume, spend, and resource planning.
- **Acceptance Criteria:**
  - Holt-Winters triple exponential smoothing with seasonal decomposition
  - Configurable forecast horizon (default 30 days)
  - Confidence intervals that widen with forecast distance
  - Forecast types: repair_volume, spend_revenue, engineer_shrinkage
  - R-squared >= 0.70
- **Current Performance:** R-squared = 0.79

#### REQ-ML-004: Anomaly Detection
- **Priority:** P1
- **Description:** Statistical anomaly detection on operational metrics.
- **Acceptance Criteria:**
  - Four detection methods: Z-Score, Modified Z-Score (MAD), IQR, Sliding Window
  - Consensus voting: anomaly if >= 2 methods agree
  - Deterministic (no random components)
  - Severity classification (low/medium/high)
  - Anomaly type classification (spike, outlier, etc.)
- **Status:** Fully implemented

#### REQ-ML-005: AI Assistant & NLP
- **Priority:** P2
- **Description:** Natural language interface for database queries and operational assistance.
- **Acceptance Criteria:**
  - Natural language to SQL query translation
  - AI-powered service offer generation (SAPOS)
  - RAG engine for knowledge base queries
  - Prompt template management
- **Integration:** Google Gemini 2.5 Flash

#### REQ-ML-006: Model Management
- **Priority:** P1
- **Description:** ML model lifecycle management including training, versioning, and deployment.
- **Acceptance Criteria:**
  - Train models via API (`POST /api/ml/train/{type}`)
  - Model versioning with upsert (no duplicates)
  - Performance metrics stored (accuracy, precision, recall, F1)
  - Synthetic data fallback when insufficient real data
  - Model listing and status via API

---

### 2.4 Fraud & Compliance

#### REQ-SEC-001: Image Forensics
- **Priority:** P2
- **Description:** Detect forged or manipulated images in work order photo submissions.
- **Acceptance Criteria:**
  - Forgery detection with confidence scores
  - Batch processing capability
  - Feedback loop for model improvement
- **Roles:** fraud_investigator

#### REQ-SEC-002: Compliance Management
- **Priority:** P1
- **Description:** Policy enforcement, evidence collection, vulnerability management, and audit trails.
- **Acceptance Criteria:**
  - Policy registry with enforcement rules
  - Automated compliance evidence collection
  - Vulnerability tracking and management
  - SIEM integration for security event forwarding
  - Complete audit trail for all operations
  - Incident management and tracking
- **Roles:** sys_admin, auditor, fraud_investigator

#### REQ-SEC-003: Multi-Factor Authentication
- **Priority:** P1
- **Description:** MFA for sensitive operations.
- **Acceptance Criteria:**
  - MFA code generation and verification
  - Configurable per-role MFA requirements
- **Roles:** All roles

---

### 2.5 Analytics & Reporting

#### REQ-ANA-001: Operational Analytics
- **Priority:** P1
- **Description:** Real-time dashboards with SLA tracking, KPIs, and trend analysis.
- **Acceptance Criteria:**
  - SLA compliance metrics
  - Work order throughput and aging
  - Technician utilization
  - Revenue and cost tracking
- **Roles:** sys_admin, ops_manager, finance_manager

#### REQ-ANA-002: Custom Report Builder
- **Priority:** P2
- **Description:** User-defined reports with flexible data selection and visualization.
- **Acceptance Criteria:**
  - Drag-and-drop report builder
  - Multiple chart types (bar, line, pie via Recharts)
  - PDF export
  - Scheduled report generation
- **Roles:** sys_admin, ops_manager, finance_manager

#### REQ-ANA-003: A/B Testing
- **Priority:** P3
- **Description:** Experiment management for feature rollouts and workflow optimization.
- **Acceptance Criteria:**
  - Experiment creation with variants
  - Traffic splitting
  - Statistical significance calculation
- **Roles:** product_owner, sys_admin

---

### 2.6 Platform & Developer Experience

#### REQ-PLT-001: Multi-Tenant Architecture
- **Priority:** P0
- **Description:** Complete data isolation between tenants with tenant-scoped RBAC.
- **Acceptance Criteria:**
  - All database tables include `tenant_id`
  - API responses filtered by tenant context
  - Tenant provisioning (sandbox with 7-day trial)
  - White-label branding support
- **Status:** Implemented

#### REQ-PLT-002: Developer Console & API
- **Priority:** P2
- **Description:** Self-service developer platform with API key management and documentation.
- **Acceptance Criteria:**
  - API key generation and management
  - Usage metrics and rate limiting (1000 calls/day default)
  - API documentation portal
  - Webhook configuration and delivery management
  - Marketplace for extensions
- **Roles:** partner_admin, partner_user, sys_admin

#### REQ-PLT-003: Workflow Automation
- **Priority:** P2
- **Description:** Configurable workflow definitions with runtime execution.
- **Acceptance Criteria:**
  - Workflow template definition
  - Runtime execution engine
  - Policy enforcement integration
  - Override request mechanism with approval flow
- **Roles:** sys_admin, ops_manager

---

### 2.7 Self-Service Portals

#### REQ-PRT-001: Customer Portal
- **Priority:** P1
- **Description:** Self-service interface for customers to book services, track tickets, and view history.
- **Acceptance Criteria:**
  - Service booking form
  - Ticket status tracking
  - Service history view
- **Roles:** customer

#### REQ-PRT-002: Partner Portal
- **Priority:** P2
- **Description:** Partner management interface for authorized service partners.
- **Acceptance Criteria:**
  - Partner onboarding flow
  - Work order visibility for assigned jobs
  - Performance metrics
- **Roles:** partner_admin, partner_user

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Metric | Target | Current |
|--------|--------|---------|
| Page load time | < 3s | ~1.2s (E2E tests) |
| API response (p95) | < 500ms | 6-17ms (ML endpoints) |
| Load capacity | 50 concurrent users | Verified (k6: 50 VUs, 0 errors) |
| Throughput | > 100 req/s | 108 req/s |
| ML training time | < 5s per model | 4-46ms |
| ML inference time | < 50ms | 5-17ms |

### 3.2 Security

- JWT authentication with 7-day expiry
- bcrypt password hashing (10 rounds)
- RBAC with 16 roles and 40+ permissions
- MFA support
- Rate limiting (Express Rate Limit)
- CORS configuration
- HTML sanitization (DOMPurify)
- Input validation (Zod schemas)
- Audit logging for all operations

### 3.3 Reliability

- Graceful ML fallback (heuristic rules when no model)
- Synthetic data generation when insufficient training data
- Error boundaries in React UI
- WebSocket reconnection handling
- Offline sync queue for mobile operations

### 3.4 Scalability

- Multi-tenant data isolation
- Stateless API (JWT, no server sessions)
- Database connection pooling (pg)
- Edge function distribution (Supabase)
- API rate limiting per tenant

---

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| E2E test pass rate | 100% (currently 91/91) |
| API test pass rate | 100% (currently 25/25) |
| ML model accuracy | >= 80% for all classification models |
| Forecast R-squared | >= 0.70 |
| Load test error rate | 0% at 50 VUs |
| Mean API response time | < 200ms |

---

## 5. Release History

| Version | Date | Highlights |
|---------|------|-----------|
| 6.0 | Jan 2026 | Real ML models, PaaS capabilities, 131 edge functions |
| 5.x | 2025 | Domain modularization, comprehensive testing |
| 4.x | 2025 | Multi-tenant architecture, payment gateways |
| 3.x | 2025 | AI assistant, anomaly detection |
| 2.x | 2024 | Core FSM features, work order lifecycle |
| 1.0 | 2024 | Initial release |

---

*End of Product Requirements Document*
