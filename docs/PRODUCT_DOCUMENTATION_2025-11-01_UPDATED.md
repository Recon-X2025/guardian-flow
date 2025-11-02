# Guardian Flow - Product Documentation
## Industry-Agnostic AI-Powered Enterprise Operations Platform

**Version:** 6.1.0  
**Last Updated:** November 1, 2025  
**Status:** Production Ready with PRD Alignment Plan  
**Document Type:** Complete Product Documentation

---

## Executive Summary

Guardian Flow is an AI-powered enterprise operations platform that orchestrates intelligent workflows across industries. Starting as a field service management solution, the platform has evolved into a comprehensive **Operational Intelligence PaaS** combining agentic automation, predictive forecasting, compliance automation, and developer-ready APIs.

### Current Platform State

**Production Capabilities:**
- **87 Integrated Modules** for complete operational management
- **77 Edge Functions** providing robust backend services
- **131 Database Tables** with full row-level security
- **95% Automation** achieved in core workflows
- **SOC 2 & ISO 27001** compliance ready

**Positioning & Vision:**
- **Current:** Enterprise Field Service Intelligence Platform + PaaS
- **Target:** Industry-Agnostic Operational Intelligence PaaS
- **Gap:** 70% progress toward PRD vision (70% complete)

---

## Product Positioning

### Current Market Position

Guardian Flow is currently positioned as a **Field Service Management (FSM) platform** with Platform-as-a-Service (PaaS) capabilities. The platform serves enterprise customers in field operations, asset management, compliance automation, and financial reconciliation.

### Strategic Direction

**Future Positioning (Target PRD):**
Guardian Flow aims to become the **industry-agnostic operational intelligence platform** for modern enterprises, adaptable across:
- Healthcare & Medical Equipment
- Manufacturing & Industrial Operations
- Utilities & Energy Infrastructure
- Logistics & Transportation
- Finance & Insurance
- Retail & Supply Chain
- Government & Public Sector

### Market Differentiation

1. **AI-First Architecture**: 5 specialized agents with cognitive loops
2. **Compliance Automation**: SOC 2/ISO 27001 ready with 40+ compliance tables
3. **Predictive Intelligence**: 7-level hierarchical forecasting with 85%+ accuracy
4. **Modular Design**: 87 configurable modules for flexible deployment
5. **Developer Platform**: REST APIs, sandbox environments, usage-based billing

---

## Core Platform Capabilities

### 1. Operations Orchestration Engine

**Description:** Multi-stage automation engine for ticketing, asset management, work orders, compliance, financial, and custom workflows.

**Key Features:**
- ✅ Work order lifecycle management (create, assign, release, complete)
- ✅ Ticket-to-work-order conversion
- ✅ Automated precheck orchestration
- ✅ Service order generation
- ✅ Invoice and payment processing
- ✅ Photo capture and validation
- 🔄 Custom workflow builder (in progress)

**Modules:**
- Work Orders (`/work-orders`)
- Tickets (`/tickets`)
- Dispatch (`/dispatch`)
- Schedule Optimizer (`/schedule-optimizer`)
- Route Optimization (`/route-optimization`)

**API Endpoints:**
- `POST /api/agent/ops/create_work_order`
- `POST /api/agent/ops/list_work_orders`
- `POST /api/agent/ops/release_work_order`
- `POST /api/agent/ops/complete_work_order`

---

### 2. Agentic Automation System

**Description:** AI- and rule-driven agents for auto-validation, exception handling, approval routing, pre-checks, fraud detection, and SLA monitoring.

**Specialized Agents:**

#### Ops Agent
- Auto-release work orders based on forecasts
- Intelligent technician assignment
- Capacity planning and SLA optimization
- Exception handling and escalation

#### Fraud Agent
- ML-powered anomaly detection
- Photo forgery validation (SHA256, GPS, timestamps)
- Risk scoring and investigation workflows
- Pattern recognition across transactions

#### Finance Agent
- Automated penalty calculation
- Dynamic invoicing
- Revenue reconciliation
- SAPOS offer generation

#### Quality Agent
- Predictive failure analysis
- Quality scoring
- Preventive maintenance scheduling
- Root cause analysis

#### Knowledge Agent
- RAG-powered search
- Documentation assistant
- Context-aware recommendations
- Training content generation

**Features:**
- Policy-as-code governance
- MFA for sensitive operations
- Audit logging with correlation IDs
- Cognitive loops with escalation
- Forecast-driven decision making

**API Endpoints:**
- `POST /functions/v1/agent-orchestrator`
- `POST /functions/v1/agent-processor`
- `POST /functions/v1/agent-runtime`

---

### 3. Hierarchical Forecasting Engine

**Description:** Enterprise-grade predictive analytics with 7-level geographic hierarchy and product-level forecasting.

**Geographic Hierarchy:**
1. Country
2. Region
3. State
4. District
5. City
6. Partner Hub
7. Pin Code

**Capabilities:**
- ✅ Multi-level demand forecasting
- ✅ Product segmentation
- ✅ Bottom-up reconciliation (MinT algorithm)
- ✅ 85%+ accuracy at pin-code × product level
- ✅ 30-day forecast horizon
- ✅ 18-month historical retention
- ✅ Automated daily generation (3 AM)
- ✅ Real-time reconciliation (every 30 min)

**Forecast Types:**
- Volume forecasting
- Revenue forecasting
- Capacity forecasting
- Repair volume forecasting

**UI:**
- Forecast Center (`/forecast`)
- Drill-down navigation
- Time-series charts
- Confidence bands
- Export capabilities

**API Endpoints:**
- `POST /api/agent/forecast/get_forecasts`
- `POST /api/agent/forecast/get_forecast_metrics`
- `POST /functions/v1/generate-forecast`
- `POST /functions/v1/reconcile-forecast`

---

### 4. Extensible API Gateway

**Description:** Unified, multi-tenant-secure gateway with key management, rate limiting, audit trails, and developer analytics.

**Features:**
- ✅ Multi-tenant API key management
- ✅ Rate limiting (tiered: 500-5000 calls/day)
- ✅ Request/response logging
- ✅ Correlation ID tracing
- ✅ Secure internal routing
- ✅ Usage analytics
- 🔄 Webhook event system (in progress)
- 🔄 OAuth 2.0 support (planned)

**Authentication:**
- API Key + Tenant ID headers
- Internal secret for gateway routing
- JWT for user sessions

**Rate Limits:**
| Tier | Daily Limit | Overage Action |
|------|-------------|----------------|
| Sandbox | 500 calls/day | Block + log |
| Standard | 1,000 calls/day | Block + log |
| Premium | 5,000 calls/day | Block + log |
| Enterprise | Custom | Negotiable |

**API Endpoints:**
- `POST /functions/v1/api-gateway`
- `GET /developer-console`
- `POST /functions/v1/create-sandbox-tenant`

---

### 5. Observability & Telemetry

**Description:** Real-time tracing, logging, performance metrics, error monitoring, system health dashboards, and alerting.

**Features:**
- ✅ Audit logs (immutable, 7-year retention)
- ✅ Correlation ID tracing
- ✅ Platform metrics dashboard
- ✅ Error tracking and alerting
- ✅ System health monitoring
- ✅ Performance metrics
- 🔄 External observability integration (Datadog, Splunk) (planned)
- 🔄 Distributed tracing (planned)

**Dashboards:**
- Observability (`/observability`)
- Platform Metrics (`/platform-metrics`) - admin only
- System Health (`/system-health`)
- Compliance Dashboard (`/compliance-dashboard`)

**Metrics Tracked:**
- API call volume
- Success/error rates
- Response times
- Tenant usage analytics
- Endpoint performance
- Critical alerts

---

### 6. Compliance & Security

**Description:** SOC 2, ISO 27001, HIPAA-ready controls, audit logs, multi-factor authentication, and JIT access.

**Compliance Tables (40+):**
- Access reviews
- Vulnerability management
- SIEM integration
- Incident response
- Training management
- Evidence collection
- Audit logging
- Compliance metrics

**Features:**
- ✅ Immutable audit logs with tamper-proof hashing
- ✅ JIT access control with auto-expiration
- ✅ Quarterly access review campaigns
- ✅ Vulnerability tracking (24h-90d SLA)
- ✅ Incident response (P0-P3 severity)
- ✅ Security awareness training
- ✅ Phishing simulation campaigns
- ✅ Evidence collection automation
- ✅ 100% RLS coverage

**Edge Functions:**
- `automated-access-reviews`
- `vulnerability-management`
- `siem-integration`
- `evidence-collection`
- `incident-management`
- `training-management`

**Certifications:**
- SOC 2 Type II: Audit-ready framework ✅
- ISO 27001:2022: Infrastructure complete ✅
- HIPAA: Privacy controls in place ✅

---

### 7. Global RBAC & Tenant Isolation

**Description:** Flexible role hierarchies, row-level security, and permission matrix for granular data/functionality access segregation.

**Role System (16 Roles):**
1. sys_admin
2. tenant_admin
3. ops_manager
4. financial_manager
5. quality_manager
6. fraud_analyst
7. customer_service
8. field_tech
9. partner_admin
10. account_manager
11. procurement_officer
12. warehouse_manager
13. compliance_officer
14. auditor
15. partner_engineer
16. customer_user

**Permissions:**
- Central permission store
- Role-permission matrix
- Context-aware checks
- Override workflows
- MFA integration

**Features:**
- ✅ Tenant-level data isolation
- ✅ Row-Level Security (RLS) on all tables
- ✅ Security definer functions
- ✅ Frontend + backend validation
- ✅ Audit logging for all actions
- ✅ MFA for sensitive operations

**Testing:**
- ✅ Playwright E2E tests
- ✅ Tenant isolation validation
- ✅ Cross-tenant access prevention

---

### 8. Financial & SLA Automation

**Description:** Penalty engines, dynamic billing, AI-pricing/offers, auto-invoice, payout, and settlement modules.

**Modules:**
- Finance (`/finance`)
- Invoicing (`/invoicing`)
- Payments (`/payments`)
- Penalties (`/penalties`)
- Offers (SAPOS) (`/sapos`)
- Dispute Management (`/disputes`)

**Features:**
- ✅ Automated penalty calculation
- ✅ AI-powered service offers
- ✅ Dynamic invoicing
- ✅ Payment processing
- ✅ Revenue reconciliation
- ✅ Multi-currency support (14 currencies)
- ✅ Usage-based billing for APIs
- 🔄 Stripe integration (Phase 2)

**Pricing:**
- Per-call API pricing (₹0.25 per request)
- Subscription tiers (Starter, Professional, Enterprise)
- Module-based pricing
- Usage-based billing

---

## Pre-Built Modules (Configurable by Tenant)

### Core Modules

1. **Field Service Management**
   - Work order lifecycle
   - Ticket management
   - Dispatch & scheduling
   - Route optimization

2. **Asset Lifecycle Management**
   - Equipment tracking
   - Predictive maintenance
   - Warranty management
   - Compliance tracking

3. **Inventory Management**
   - Multi-hub inventory
   - Cascade checks
   - Procurement
   - Stock level monitoring

4. **Fraud Detection & Compliance**
   - Anomaly detection
   - Photo forensics
   - Investigation workflows
   - Compliance center

5. **Analytics & BI Integration**
   - Real-time dashboards
   - Custom reports
   - Forecast center
   - Export capabilities

6. **AI Forecasting & Scheduling**
   - Hierarchical forecasting
   - Schedule optimization
   - Capacity planning
   - Predictive analytics

7. **Marketplace & Extensions**
   - Third-party integrations
   - Extension management
   - Partner ecosystem
   - Custom workflows

8. **Customer Portal**
   - Self-service portal
   - Order tracking
   - Payment processing
   - Account management

9. **Training & Knowledge Base**
   - Video training system
   - Documentation library
   - RAG-powered search
   - AI assistant

10. **Developer Platform**
    - API gateway
    - Developer console
    - Sandbox environment
    - SDKs and docs

### Module Activation

**Current State:** Module foundation exists but not fully dynamic
- ✅ `available_modules` table
- ✅ `ModulePicker` UI during onboarding
- ✅ Subscription-based limits
- 🔄 Runtime activation/deactivation (planned)
- 🔄 Dynamic sidebar filtering (planned)
- 🔄 Module health checks (planned)

---

## Industry Support

### Current Industry Focus

**Primary:** Field Service Operations
- Multi-tenant work order management
- Technician dispatch and tracking
- Equipment maintenance
- Compliance automation

**Secondary Verticals (Developing):**
- Healthcare (medical equipment maintenance)
- Utilities (infrastructure servicing)
- Manufacturing (production equipment)
- Logistics (fleet management)

### Industry Adaptation

**Current Capabilities:**
- ✅ Industry selector in onboarding (`IndustryOnboarding.tsx`)
- ✅ 9 industry types supported
- ✅ Industry-specific auth routing
- 🔄 Terminology customization (planned)
- 🔄 Workflow templates by industry (planned)
- 🔄 Entity naming customization (planned)

**Target Industries (PRD Vision):**
1. Healthcare: HIPAA workflows, patient consent
2. Utilities: Safety compliance, outage protocols
3. Insurance: Claims processing, adjuster workflows
4. Logistics: Route optimization, customs clearance
5. Government: Facility management, public safety
6. Finance: Regulatory compliance, audit workflows

---

## Developer Platform (PaaS)

### Developer Console

**Features:**
- ✅ API key generation
- ✅ Usage analytics (30-day charts)
- ✅ Billing summary
- ✅ Key management (revoke, renew)
- ✅ Real-time usage updates
- 🔄 Interactive API explorer (planned)
- 🔄 SDK downloads (planned)

**UI:** `/developer-console`

### Sandbox Environment

**Features:**
- ✅ 7-day trial tenants
- ✅ Pre-loaded demo data (10 work orders)
- ✅ Instant provisioning
- ✅ 500 API calls/day limit
- ✅ Auto-expiry
- 🔄 Extended trials for enterprise (planned)

**Endpoint:** `POST /functions/v1/create-sandbox-tenant`

### API Documentation

**Current:**
- ✅ `public/API_DOCUMENTATION.md`
- ✅ OpenAPI/Swagger referenced
- ✅ Code examples in README
- 🔄 Interactive Swagger UI (planned)
- 🔄 Postman collection (planned)

### Usage-Based Billing

**Model:**
- ₹0.25 per successful API call
- Daily reconciliation
- Billing cycle tracking
- Free tier: 1,000 calls/month

**Monitoring:**
- Platform metrics dashboard
- Per-tenant usage tracking
- Cost analysis
- Alerts for overages

---

## User Interface & Experience

### Design Philosophy

- **Clean & Minimalist:** Modern, uncluttered layouts
- **Role-Aware:** Dynamic content based on permissions
- **Responsive:** Mobile-first design
- **Accessible:** WCAG 2.1 AA compliant

### Navigation

**Current Structure:**
- Sidebar navigation with module links
- Top bar with user menu and notifications
- Breadcrumbs for deep navigation
- Quick actions on dashboards

**Planned Enhancements:**
- Dynamic module filtering
- Industry context switcher
- Personalized layouts
- Widget builder

### Dashboards

**Role-Based Dashboards:**
- Sys Admin: Platform-wide metrics
- Tenant Admin: Organization overview
- Ops Manager: Work order operations
- Field Tech: Personal assignments
- Finance Manager: Financial KPIs
- Quality Manager: Compliance metrics

**Widgets:**
- Work order trends
- Status distribution
- Revenue charts
- Compliance scores
- Real-time alerts

---

## Security & Compliance

### Data Security

- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Authentication:** Multi-factor authentication (MFA)
- **Authorization:** Role-Based Access Control (RBAC)
- **Isolation:** Row-Level Security (RLS) per tenant
- **Audit:** Immutable logs with tamper-proof hashing

### Compliance Frameworks

**SOC 2:**
- Controls automation (40+ tables)
- Quarterly access reviews
- Vulnerability management
- Evidence collection
- Audit-ready framework

**ISO 27001:**
- ISMS implementation
- Risk management
- Security controls
- Continuous improvement

**HIPAA:**
- Privacy controls
- Access logs
- Encryption standards
- Business associate agreements

### Certifications & Audits

- **Status:** Framework complete, audit-ready
- **Target:** SOC 2 Type II certification (Q4 2026)
- **Target:** ISO 27001 certification (Q4 2026)

---

## Technical Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- shadcn/ui components
- TanStack Query
- React Router v6

**Backend:**
- Supabase (PostgreSQL 15)
- Deno Edge Functions (77 functions)
- Row-Level Security (RLS)
- pg_cron for scheduling

**AI/ML:**
- Lovable AI Gateway
- Gemini 2.5 Flash
- GPT-4 integration
- Custom ML models

**Infrastructure:**
- Supabase Edge Network
- CDN for static assets
- Automated backups
- Multi-region support (planned)

### Database

**Tables:** 131 total
- Core operations: 30 tables
- AI/ML: 15 tables
- Compliance: 40+ tables
- User management: 10 tables
- Financial: 12 tables
- Analytics: 8 tables
- Extensibility: 16 tables

**RLS Coverage:** 100% (all tables secured)

### Edge Functions

**Count:** 77 operational functions
- Agent services: 10 functions
- Compliance automation: 6 functions
- Forecasting: 4 functions
- API gateway: 1 function
- Sandbox provisioning: 1 function
- Webhooks: 2 functions (basic)
- Audit & monitoring: 10+ functions
- Core operations: 40+ functions

---

## Performance & Scalability

### Current Metrics

- **Forecast Generation:** ~3 min for all 7 levels
- **Reconciliation:** ~15 sec
- **Agent Query Latency:** ~50ms
- **UI Drill-Down:** ~120ms
- **Data Retention:** 18 months (configurable)

### Scalability Targets

- **Geography Cells:** Unlimited (indexed queries)
- **Products:** Unlimited
- **Daily Forecast Points:** 10M+ (tested)
- **Concurrent Users:** 1,000+ (tested)
- **API Throughput:** 10,000+ requests/min

### Uptime & Reliability

- **Current Uptime:** 99.9%
- **SLA Targets:** 99.95% (Enterprise tier)
- **Redundancy:** Multi-AZ deployment
- **Backup Strategy:** Daily snapshots + WAL

---

## Roadmap & Future Enhancements

### Q4 2025 (Current Quarter)

**In Progress:**
- Webhook event system
- Module activation UI
- External observability integration
- Photo validation UI completion

**Planned:**
- Terminology engine
- Industry workflow templates
- API SDKs (Python, Node.js)

### Q1 2026

**Target:**
- Industry-agnostic positioning launch
- Marketplace functionality
- Visual workflow designer
- Distributed tracing

### Q2 2026

**Target:**
- Adaptive UX with AI
- Cross-tenant analytics (opt-in)
- Extension marketplace
- Partner certification program

### Q3-Q4 2026

**Target:**
- SOC 2 Type II certification
- ISO 27001 certification
- Global expansion
- White-label deployment

---

## Support & Resources

### Documentation

- **Product Specs:** `public/PRODUCT_SPECIFICATIONS_2025-11-01.md`
- **API Docs:** `public/API_DOCUMENTATION.md`
- **Implementation Status:** `DAY1_TO_TODAY_COMPREHENSIVE_STATUS.md`
- **RBAC Guide:** `docs/RBAC_TENANT_ISOLATION.md`
- **Forecasting Guide:** `docs/INDIA_FORECASTING_SYSTEM.md`

### Community

- GitHub: (repository)
- Documentation Portal: (link)
- Developer Forum: (link)
- Support Portal: `/contact`

### Training

- Video tutorials
- Interactive guides
- Knowledge base
- AI assistant

---

## Pricing

### Subscription Tiers

**Starter:** $2,500/month
- Field Service Management
- Customer Portal
- Basic Analytics
- Up to 50 users

**Professional:** $6,000/month
- All Starter features
- Asset Lifecycle Management
- AI Forecasting & Scheduling
- Advanced Analytics
- Up to 200 users

**Enterprise:** $12,000/month
- All Professional features
- Fraud Detection & Compliance
- Marketplace & Extensions
- White-label options
- Unlimited users
- Custom SLAs

### Add-Ons

- Compliance Suite: +$99/user/month
- AI/ML Features: +$149/user/month
- Additional Modules: $500-2000/month each

---

## Appendix

### Glossary

- **Agent:** Autonomous AI-powered decision maker
- **Forecast:** Predictive demand/capacity estimate
- **RLS:** Row-Level Security for tenant isolation
- **SAPOS:** Service-as-a-Product Offer System
- **JIT Access:** Just-in-time temporary access
- **MinT:** Minimum Trace reconciliation algorithm

### Change Log

**v6.1.0 (Nov 1, 2025):** Compliance suite launch  
**v6.0.1 (Oct 31, 2025):** Technical stability improvements  
**v6.0 (Oct 9, 2025):** PaaS transformation  
**v5.0 (Oct 7, 2025):** Hierarchical forecasting  
**v4.0 (Sep 30, 2025):** Advanced analytics  
**v3.0 (Sep 15, 2025):** Agentic automation

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Next Review:** December 1, 2025  
**Owner:** Product Team

