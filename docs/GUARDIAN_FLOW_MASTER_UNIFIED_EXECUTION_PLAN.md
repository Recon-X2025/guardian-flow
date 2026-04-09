# Guardian Flow — Master Unified Execution Plan
## Combining: Master Execution Plan + DB-Agnostic + UI/UX Revamp

**Document Version:** 3.0
**Date:** 2026-04-08
**Status:** Ready for Execution
**Supersedes:** `GUARDIAN_FLOW_IMPLEMENTATION_PLAN_V2.md` (v2.0, 2025-10-31)
**Key Additions over V2:**
- ✅ **Track A — Database Abstraction Layer:** Decouples all route handlers from MongoDB, enabling zero-code-change switchover to PostgreSQL (or any future DB) via a repository interface
- ✅ **Track B — UI/UX Revamp:** Systematic design-system overhaul across every portal view — tokens, components, layouts, accessibility

---

## Executive Summary

This unified plan merges two previously separate execution documents into a single authoritative reference:

1. **Guardian Flow Master Execution Plan (V2)** — six-phase, 18-month delivery roadmap covering foundation, customer experience, asset/workforce intelligence, BI maturity, global expansion, and compliance automation.
2. **Guardian Flow DB-Agnostic + UI/UX Revamp Execution Plan** — two complementary engineering tracks that run *in parallel* with the phase roadmap, decoupling the data layer from MongoDB and overhauling the UI for consistency, accessibility, and polish.

### Strategic Principles
- ✅ **Security-First:** Pen-testing, OAuth/MFA, and security reviews from Day 1
- ✅ **Early Analytics Foundation:** Lightweight eventing system in Phase 1 feeds all future ML/BI work
- ✅ **Partner API Readiness:** Marketplace architecture starts Phase 2 for gradual partner onboarding
- ✅ **Asset Lifecycle Prep:** Schema design and compliance controls begin Phase 1
- ✅ **MVP Mindset:** Each phase delivers a testable minimum viable increment within 4 weeks
- ✅ **DB-Agnostic:** All route handlers talk to an adapter interface — switching databases requires only a config-env change
- ✅ **Design-System Driven:** Every UI component built from a shared token library; no hardcoded colours or spacing values

---

## Part I — Core Platform Delivery (18-Month Phase Roadmap)

---

## Phase 1: Foundation & Security Hardening (Months 1–3)

### 🎯 MVP Deliverables (Week 4)
- Telemetry on 20 critical Express.js route handlers
- Security scan automation operational
- Basic analytics eventing infrastructure
- Error boundary on top 5 pages
- OAuth/MFA foundation ready

---

### 1.1 Automated Database Seeding with Validation (P0)

#### Database Changes
```sql
-- Migration: Add seeding metadata table
CREATE TABLE IF NOT EXISTS public.seed_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  seed_type text NOT NULL, -- 'demo', 'test', 'performance'
  entities_created jsonb NOT NULL DEFAULT '{}',
  validation_results jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.seed_metadata -- application-level tenant isolation enforced;

CREATE POLICY "Users can view own tenant seeds" ON public.seed_metadata
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
```

#### Express.js Route Handlers
**File:** `server/routes/seed-validated-data/index.ts`
```typescript
interface SeedConfig {
  tenantId: string;
  seedType: 'demo' | 'test' | 'performance';
  counts: {
    customers?: number;
    technicians?: number;
    equipment?: number;
    tickets?: number;
    workOrders?: number;
    assets?: number;       // Early asset prep
  };
  includeCompliance?: boolean; // Seed compliance test data
}
```

---

### 1.2 Express.js Route Handler Testing & Telemetry (P1)

#### Database Changes
```sql
CREATE TABLE IF NOT EXISTS public.function_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  execution_time_ms integer NOT NULL,
  status text NOT NULL,        -- 'success', 'error', 'timeout'
  error_message text,
  request_payload jsonb,
  response_payload jsonb,
  security_level text,         -- 'public', 'authenticated', 'privileged'
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_telemetry_function ON public.function_telemetry(function_name, created_at DESC);
CREATE INDEX idx_telemetry_tenant   ON public.function_telemetry(tenant_id, created_at DESC);
CREATE INDEX idx_telemetry_security ON public.function_telemetry(security_level, created_at DESC);

ALTER TABLE public.function_telemetry -- application-level tenant isolation enforced;

CREATE POLICY "Admins view all telemetry" ON public.function_telemetry
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));
```

#### Shared Telemetry Module
**File:** `server/routes/_shared/telemetry.ts`
```typescript
export async function recordFunctionCall(params: {
  functionName: string;
  startTime: number;
  status: 'success' | 'error' | 'timeout';
  error?: Error;
  tenantId?: string;
  userId?: string;
  securityLevel: 'public' | 'authenticated' | 'privileged';
  req?: Request; // Extract IP / user-agent
}) { /* ... */ }
```

---

### 1.3 Foundational Analytics & Eventing System

#### Database Changes
```sql
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_category text NOT NULL, -- 'operational', 'financial', 'security', 'user_action'
  entity_type text,
  entity_id uuid,
  user_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_events_tenant   ON public.analytics_events(tenant_id, created_at DESC);
CREATE INDEX idx_analytics_events_type     ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_category ON public.analytics_events(event_category, created_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_hourly_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  hour_start timestamptz NOT NULL,
  event_type text NOT NULL,
  event_count integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, hour_start, event_type)
);
```

#### Shared Analytics Module
**File:** `server/routes/_shared/analytics.ts`
```typescript
export async function trackEvent(params: {
  tenantId: string;
  eventType: string;
  eventCategory: 'operational' | 'financial' | 'security' | 'user_action';
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) { /* insert into analytics_events */ }
```

---

### 1.4 Security Hardening & OAuth/MFA Foundation

#### Database Changes
```sql
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  event_type text NOT NULL,
  severity text NOT NULL, -- 'low', 'medium', 'high', 'critical'
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oauth_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google', 'microsoft', 'okta'
  client_id text NOT NULL,
  client_secret_encrypted text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled boolean DEFAULT false,
  mfa_method text, -- 'totp', 'sms', 'email'
  backup_codes_encrypted text,
  last_verified timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### Express.js Route Handlers
- **`server/routes/security-monitor/index.ts`** (New) — Real-time security event detection, anomaly detection, automated alerting
- **`server/routes/oauth-callback/index.ts`** (New) — OAuth provider integration, SAML/SSO foundation

#### UI Components
- `src/components/SecurityDashboard.tsx` — Real-time security monitoring
- `src/components/MFASetup.tsx` — User MFA enrollment

---

### 1.5 Asset Lifecycle Schema Design (Early Prep)

```sql
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_number text NOT NULL UNIQUE,
  asset_name text NOT NULL,
  asset_type text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_cost numeric(12,2),
  warranty_expiry date,
  location_id uuid,
  status text NOT NULL DEFAULT 'active',
  lifecycle_stage text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date timestamptz NOT NULL,
  cost numeric(12,2),
  notes text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

> **Note:** Asset CRUD deferred to Phase 3. Schema exists for demo data and stakeholder discussions.

---

### 1.6 Compliance Controls Foundation (Early Prep)

```sql
CREATE TABLE IF NOT EXISTS public.compliance_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name text NOT NULL,
  version text NOT NULL,
  requirements jsonb NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid REFERENCES public.compliance_frameworks(id),
  control_id text NOT NULL,
  control_name text NOT NULL,
  description text,
  evidence_requirements jsonb,
  automation_supported boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.compliance_frameworks (framework_name, version, requirements) VALUES
  ('SOC2 Type II', '2023', '{"controls": ["access_control", "change_management", "data_encryption"]}'),
  ('ISO27001',     '2022', '{"controls": ["risk_assessment", "incident_response", "business_continuity"]}');
```

> **Note:** Full automation deferred to Phase 6.

---

### 1.7 Full UI Error Boundary Implementation (P2)

```sql
CREATE TABLE IF NOT EXISTS public.frontend_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  error_stack text,
  component_name text,
  user_id uuid REFERENCES auth.users(id),
  tenant_id uuid REFERENCES public.tenants(id),
  browser_info jsonb,
  url text,
  severity text DEFAULT 'error',
  created_at timestamptz DEFAULT now()
);
```

**File:** `server/routes/log-frontend-error/index.ts`

---

### 1.8 Enhanced API Gateway Controls (P2)

```sql
CREATE TABLE IF NOT EXISTS public.api_usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  requests_count integer DEFAULT 0,
  total_response_time_ms bigint DEFAULT 0,
  error_count integer DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint_pattern text NOT NULL,
  requests_per_minute integer NOT NULL DEFAULT 60,
  requests_per_hour integer NOT NULL DEFAULT 1000,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

### 1.9 Extended Observability with Distributed Tracing (P3)

```sql
CREATE TABLE IF NOT EXISTS public.trace_spans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid NOT NULL,
  parent_span_id uuid,
  span_name text NOT NULL,
  service_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_ms integer,
  status text,
  attributes jsonb,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);
```

---

### Phase 1 Testing & Security Review

**Continuous Security (Weeks 1–12)**
- Weeks 1–4: OWASP ZAP automated scans on all APIs
- Weeks 5–8: Manual penetration testing on authentication flows
- Weeks 9–12: Security code review for all Express.js route handlers

**MVP Testing (Week 4)**
- Unit tests for telemetry module
- Integration tests for analytics eventing
- Security event simulation tests
- Tenant isolation policy verification

---

## Phase 2: Customer Experience & Partner Prep (Months 4–6)

### 🎯 MVP Deliverables (Week 4)
- SLA prediction model running on 100 test work orders
- Customer portal with ticket viewing
- Partner API specification published
- Mobile PWA installable

---

### 2.1 SLA Breach Prediction & Alerting

```sql
CREATE TABLE IF NOT EXISTS public.sla_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  predicted_completion timestamptz NOT NULL,
  sla_deadline timestamptz NOT NULL,
  breach_probability numeric(5,2) NOT NULL,
  contributing_factors jsonb,
  confidence_score numeric(5,2),
  model_version text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sla_predictions_high_risk ON public.sla_predictions(breach_probability DESC)
  WHERE breach_probability > 70;

CREATE TABLE IF NOT EXISTS public.sla_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  breach_probability numeric(5,2),
  escalated_to uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### Express.js Route Handlers
- **`server/routes/predict-sla-breach/index.ts`** (Enhanced) — ML model integration (uses Phase 1 `analytics_events`), historical data analysis, real-time risk scoring
- **`server/routes/sla-monitor/index.ts`** (New) — Continuous monitoring cron job, automatic alert generation, escalation workflow

---

### 2.2 Customer Self-Service Portal

```sql
CREATE TABLE IF NOT EXISTS public.customer_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'viewer',
  enabled boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  resource_type text,
  resource_id uuid,
  created_at timestamptz DEFAULT now()
);
```

#### UI Pages
- `src/pages/CustomerPortal.tsx`
- `src/pages/CustomerTickets.tsx`
- `src/pages/CustomerQuotes.tsx`
- `src/pages/CustomerReports.tsx`

---

### 2.3 Partner Ecosystem API Foundation

```sql
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  partner_type text NOT NULL,
  certification_level text,
  status text NOT NULL DEFAULT 'pending',
  contact_email text NOT NULL,
  api_key_hash text,
  api_quota_daily integer DEFAULT 1000,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  created_at timestamptz DEFAULT now()
);
```

#### Express.js Route Handlers
- **`server/routes/partner-api-gateway/index.ts`** (New) — Partner auth, rate limiting, usage metering, webhook delivery
- **`server/routes/partner-onboard/index.ts`** (Enhanced) — API key generation, sandbox provisioning, doc access

#### API Documentation
**File:** `public/PARTNER_API_SPEC.md` — REST spec, auth guide, rate limits, webhook docs, code examples

---

### 2.4 Mobile PWA Foundation

**Files:**
- `public/manifest.json` — enhanced with icons, standalone display mode, theme colour
- `public/service-worker.js` — offline caching strategy, background sync, push notifications

```sql
CREATE TABLE IF NOT EXISTS public.offline_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  payload jsonb NOT NULL,
  synced boolean DEFAULT false,
  sync_attempts integer DEFAULT 0,
  last_sync_attempt timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

### Phase 2 Testing & Security Review
- OAuth/SAML integration pen-testing
- Customer portal tenant isolation verification
- Partner API security audit
- SLA prediction accuracy tests against historical data

---

## Phase 3: Asset & Workforce Intelligence (Months 7–9)

### 🎯 MVP Deliverables (Week 4)
- Asset registry with 1,000 test assets
- AI scheduling recommendations for 10 technicians
- Predictive maintenance alerts operational

---

### 3.1 Asset Lifecycle Management (Full Implementation)

> Schema exists from Phase 1. Phase 3 adds CRUD operations and UI.

#### Express.js Route Handlers
- `server/routes/asset-create/index.ts` (New)
- `server/routes/asset-update/index.ts` (New)
- `server/routes/asset-maintenance-scheduler/index.ts` (New) — Automated maintenance scheduling, warranty expiration alerts, lifecycle event automation

#### UI Pages
- `src/pages/AssetManagement.tsx` — Asset registry CRUD
- `src/pages/AssetLifecycle.tsx` — Lifecycle tracking
- `src/pages/AssetMaintenance.tsx` — Maintenance scheduling

---

### 3.2 AI-Driven Workforce Optimization

```sql
CREATE TABLE IF NOT EXISTS public.technician_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES public.technicians(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  available_hours numeric(4,2),
  utilization_percentage numeric(5,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  recommended_technician_id uuid REFERENCES public.technicians(id),
  recommended_start_time timestamptz,
  confidence_score numeric(5,2),
  reasoning jsonb,
  accepted boolean,
  created_at timestamptz DEFAULT now()
);
```

**File:** `server/routes/optimize-scheduling/index.ts` (uses Phase 1 analytics) — ML-based technician assignment, route optimisation, capacity forecasting

---

### Phase 3 Testing & Security Review
- Asset data access audits
- AI model bias testing
- Scheduling algorithm security review

---

## Phase 4: Business Intelligence & Analytics Maturity (Months 10–12)

### 🎯 MVP Deliverables (Week 4)
- PowerBI connector operational
- 5 pre-built dashboard templates
- Real-time data export working

---

### 4.1 Native Analytics & BI Integration

> Uses Phase 1 `analytics_events` and `analytics_hourly_aggregates` for all exports.

```sql
CREATE TABLE IF NOT EXISTS public.bi_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_type text NOT NULL, -- 'powerbi', 'tableau', 'looker', 'datastudio'
  configuration jsonb NOT NULL,
  api_credentials_encrypted text,
  enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency text DEFAULT 'hourly',
  created_at timestamptz DEFAULT now()
);

CREATE MATERIALIZED VIEW public.mv_daily_operations AS
SELECT
  tenant_id,
  date_trunc('day', created_at) AS date,
  COUNT(*) AS total_work_orders,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_work_orders,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) AS avg_completion_hours
FROM public.work_orders
GROUP BY tenant_id, date_trunc('day', created_at);

CREATE UNIQUE INDEX ON public.mv_daily_operations(tenant_id, date);
```

**File:** `server/routes/bi-connector-sync/index.ts` — OAuth integration for BI platforms, data export and transformation, scheduled sync jobs

---

### Phase 4 Testing & Security Review
- BI data export encryption audit
- OAuth token security review
- Data masking verification

---

## Phase 5: Global Expansion & Partner Ecosystem (Months 13–15)

### 🎯 MVP Deliverables (Week 4)
- 3 languages supported (EN, ES, FR)
- 10 partners onboarded
- 5 marketplace extensions live

---

### 5.1 Globalization & Localization

```sql
CREATE TABLE IF NOT EXISTS public.tenant_localization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en-US',
  timezone text NOT NULL DEFAULT 'UTC',
  date_format text NOT NULL DEFAULT 'MM/DD/YYYY',
  currency_code text NOT NULL DEFAULT 'USD',
  number_format jsonb DEFAULT '{"decimal": ".", "thousand": ","}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL,
  context text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(key, locale)
);
```

---

### 5.2 Partner Marketplace Expansion

> Uses Phase 2 partner API foundation.

```sql
CREATE TABLE IF NOT EXISTS public.marketplace_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  extension_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  version text NOT NULL,
  pricing_model text NOT NULL, -- 'free', 'subscription', 'usage_based'
  price_amount numeric(12,2),
  status text NOT NULL DEFAULT 'pending',
  install_count integer DEFAULT 0,
  rating numeric(3,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  extension_id uuid REFERENCES public.marketplace_extensions(id) ON DELETE CASCADE,
  installed_at timestamptz DEFAULT now(),
  enabled boolean DEFAULT true,
  configuration jsonb DEFAULT '{}'
);
```

---

### Phase 5 Testing & Security Review
- Extension sandboxing verification
- Partner API abuse monitoring
- Localization XSS testing

---

## Phase 6: Compliance Automation & Certification (Months 16–18)

### 🎯 MVP Deliverables (Week 4)
- SOC 2 evidence collection automated
- 90% of ISO 27001 controls automated
- Audit report generation operational

---

### 6.1 Regulatory Compliance Automation

> Uses Phase 1 `compliance_frameworks` and `compliance_controls`.

```sql
CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_id uuid REFERENCES public.compliance_controls(id),
  evidence_type text NOT NULL,
  evidence_data jsonb NOT NULL,
  evidence_date date NOT NULL,
  auditor_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  auto_collected boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**File:** `server/routes/compliance-collector/index.ts` (Enhanced) — Automated evidence collection from Phase 1 `security_events`, control testing automation, audit report generation

---

### Phase 6 Testing & Security Review
- SOC 2 Type II readiness audit
- ISO 27001 gap analysis
- Final penetration testing

---

## Part I — Success Metrics Summary

| Phase | Key Metrics |
|-------|-------------|
| **1 (Months 1–3)**   | 100% route handlers with telemetry · Zero critical CVEs · <500 ms avg API latency · Analytics eventing live · OAuth/MFA foundation ready |
| **2 (Months 4–6)**   | 95% SLA breach prediction accuracy · 50% reduction in manual customer support · Partner API spec published · PWA Lighthouse >90 |
| **3 (Months 7–9)**   | 30% reduction in asset downtime · 25% improvement in technician utilisation · Full asset lifecycle tracking operational |
| **4 (Months 10–12)** | 5+ BI platform integrations · 100% data accuracy in BI exports · <5 min dashboard refresh time |
| **5 (Months 13–15)** | 10+ languages · 50+ marketplace extensions · 20+ certified partners |
| **6 (Months 16–18)** | SOC 2 Type II certification · ISO 27001 compliance · 100% automated evidence collection |

---

## Part I — Risk Management

### Technical Risks
| Risk | Mitigation | Owner | Phase |
|------|-----------|-------|-------|
| Database performance degradation | Caching layer, query optimisation, Phase 1 analytics aggregates | DBA Team | All |
| Third-party API failures | Circuit breakers in Phase 1 | Backend Team | Phase 1 |
| Mobile offline sync conflicts | Conflict resolution algorithms | Mobile Team | Phase 2 |
| Partner API abuse | Rate limiting from Phase 2 | Security Team | Phases 2–5 |

### Business Risks
| Risk | Mitigation | Owner | Phase |
|------|-----------|-------|-------|
| Feature scope creep | MVP mindset with 4-week checkpoints | Product Manager | All |
| Resource availability | Cross-training, contractor backup | Engineering Manager | All |
| Market timing | Phased MVP releases every 4 weeks | CEO/CTO | All |
| Partner ecosystem delayed | Early API prep in Phase 2 | Business Development | Phases 2–5 |

---

## Part I — Resource Requirements

| Phase | Headcount |
|-------|-----------|
| Phase 1 | 6 engineers (2 FE · 2 BE · 1 Security · 1 QA) |
| Phase 2 | 8 engineers (2 FE · 3 BE · 1 Mobile · 1 Security · 1 QA) |
| Phase 3 | 8 engineers (3 FE · 3 BE · 1 Mobile · 1 QA) |
| Phase 4 | 9 engineers (3 FE · 3 BE · 2 BI Specialists · 1 QA) |
| Phase 5 | 10 engineers (3 FE · 4 BE · 2 Mobile · 1 QA) |
| Phase 6 | 10 engineers (3 FE · 4 BE · 2 Compliance · 1 QA) |

**Infrastructure:** AWS/GCP multi-region production · Production-identical staging · OWASP ZAP, Burp Suite, Snyk · ~$18k/month by Phase 6

---

## Part I — Continuous Feedback Loops

| Cadence | Activity |
|---------|----------|
| **Weekly — Monday** | Sprint planning, MVP definition |
| **Weekly — Wednesday** | Mid-sprint check-in, blocker resolution |
| **Weekly — Friday** | Stakeholder demo, feedback collection |
| **Month N — Week 4** | MVP release to internal beta testers |
| **Month N — Week 8** | Extended beta release to pilot customers |
| **Month N — Week 12** | General availability with full documentation |
| **Quarterly** | Executive review of metrics and roadmap adjustments |

---

---

## Part II — DB-Agnostic Architecture (Track A)

> **Goal:** Decouple every route handler from MongoDB so that switching to PostgreSQL (or any future database) requires only a single environment-variable change. No route handler should import from `server/db/client.js` or `server/db/query.js` directly.

---

### Overview

The current database layer in `server/db/client.js` and `server/db/query.js` hard-codes MongoDB driver calls throughout the application. Track A introduces a **Repository Interface** pattern: both the existing MongoDB adapter and a new PostgreSQL adapter satisfy the same contract, and a factory selects the active adapter at startup based on `DB_ADAPTER=mongodb|postgresql`.

```
server/db/
├── interface.js          ← JSDoc-typed contract (A1)
├── adapters/
│   ├── mongodb.js        ← Existing code relocated here (A2)
│   └── postgresql.js     ← New pg-based adapter (A3)
├── factory.js            ← Reads DB_ADAPTER, exports active adapter (A4)
├── client.js             ← Kept for backward-compat; re-exports factory (A5)
└── query.js              ← Kept for backward-compat; re-exports factory (A5)
```

All route handlers that currently do:
```js
import { findMany, insertOne } from '../../db/query.js';
```
continue to work without any change because `query.js` is now a thin re-export of the factory.

---

### A1 — Design the Repository Interface

**File:** `server/db/interface.js`

Define a common JavaScript interface that **both** adapters must implement. This is the contract — neither MongoDB nor Postgres code leaks past this point into route handlers.

Methods to standardize:

| Method | Signature | Returns |
|--------|-----------|---------|
| `findMany` | `(collection, filter, opts)` | `{ rows: [], total }` |
| `findOne` | `(collection, filter)` | `doc \| null` |
| `insertOne` | `(collection, doc)` | inserted doc |
| `insertMany` | `(collection, docs)` | `inserted docs[]` |
| `updateOne` | `(collection, filter, update, opts)` | updated doc |
| `deleteMany` | `(collection, filter)` | `deletedCount` |
| `countDocuments` | `(collection, filter)` | `number` |
| `aggregate` | `(collection, pipeline)` | `results[]` |
| `transaction` | `(callback)` | `result` |
| `isConnected` | `()` | `boolean` |

```js
/**
 * @file server/db/interface.js
 * @description JSDoc-typed repository interface — both adapters must satisfy this contract.
 * Used for IDE hints and runtime duck-type validation.
 */

/**
 * @typedef {Object} DbAdapter
 * @property {(collection: string, filter: object, opts?: object) => Promise<{rows: any[], total: number}>} findMany
 * @property {(collection: string, filter: object) => Promise<any|null>} findOne
 * @property {(collection: string, doc: object) => Promise<any>} insertOne
 * @property {(collection: string, docs: object[]) => Promise<any[]>} insertMany
 * @property {(collection: string, filter: object, update: object, opts?: object) => Promise<any|null>} updateOne
 * @property {(collection: string, filter: object) => Promise<number>} deleteMany
 * @property {(collection: string, filter: object) => Promise<number>} countDocuments
 * @property {(collection: string, pipeline: object[]) => Promise<any[]>} aggregate
 * @property {(callback: Function) => Promise<any>} transaction
 * @property {() => boolean} isConnected
 */

/**
 * Validates that an object satisfies the DbAdapter interface at runtime.
 * Throws if any required method is missing.
 * @param {object} adapter
 * @returns {DbAdapter}
 */
export function validateAdapter(adapter) {
  const required = [
    'findMany', 'findOne', 'insertOne', 'insertMany',
    'updateOne', 'deleteMany', 'countDocuments', 'aggregate',
    'transaction', 'isConnected',
  ];
  const missing = required.filter(m => typeof adapter[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(`DB adapter is missing required methods: ${missing.join(', ')}`);
  }
  return adapter;
}
```

---

### A2 — MongoDB Adapter (Extract Existing Code)

**File:** `server/db/adapters/mongodb.js`

Move the entire contents of `server/db/client.js` and `server/db/query.js` into a single self-contained adapter module. No logic change — only relocation and wrapping into an exported object that satisfies the interface.

```js
// server/db/adapters/mongodb.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { validateDatabaseCredentials } from '../../config/dbValidation.js';
import { validateAdapter } from '../interface.js';

dotenv.config();

/* ── Connection ──────────────────────────────────────── */
try { validateDatabaseCredentials(); } catch (err) {
  console.error(err.message);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const DB_NAME     = process.env.DB_NAME || 'guardianflow';
const MAX_RETRIES = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
const RETRY_DELAY = parseInt(process.env.DB_RETRY_DELAY_MS  || '3000', 10);

const mongoClient = new MongoClient(MONGODB_URI, {
  maxPoolSize: parseInt(process.env.DB_POOL_MAX || '20', 10),
  connectTimeoutMS: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
  serverSelectionTimeoutMS: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
});

const db = mongoClient.db(DB_NAME);
let connected = false;

async function connectWithRetry(retries = MAX_RETRIES) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoClient.connect();
      connected = true;
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.error(`MongoDB attempt ${i}/${retries} failed:`, err.message);
      if (i < retries) await new Promise(r => setTimeout(r, RETRY_DELAY * i));
    }
  }
  if (process.env.NODE_ENV === 'production') process.exit(-1);
}

connectWithRetry();
mongoClient.on('serverHeartbeatSucceeded', () => { connected = true; });
mongoClient.on('serverHeartbeatFailed',    () => { connected = false; });

/* ── Adapter methods (same logic as current query.js) ── */
// ... (findMany, findOne, insertOne, insertMany, updateOne, deleteMany,
//      countDocuments, aggregate, transaction — identical to server/db/query.js)

const mongoAdapter = validateAdapter({
  findMany, findOne, insertOne, insertMany,
  updateOne, deleteMany, countDocuments, aggregate,
  transaction, isConnected: () => connected,
});

export default mongoAdapter;
```

> **No logic changes.** All existing behaviour — slow-query logging, duplicate-key handling, upsert semantics — is preserved unchanged.

---

### A3 — PostgreSQL Adapter (New)

**File:** `server/db/adapters/postgresql.js`

Create `server/db/adapters/postgresql.js` using the `pg` Node.js driver (already widely used in the ecosystem; no new risk).

Key mapping decisions:

| MongoDB concept | PostgreSQL equivalent |
|----------------|-----------------------|
| Collection name | Table name |
| `_id` (ObjectId) | `id` (uuid, `gen_random_uuid()`) |
| `filter` object | WHERE clause built via parameterised query builder |
| `aggregate` pipeline | Forwarded as raw SQL (JSONB operators for metadata fields) |
| `transaction` | `BEGIN / COMMIT / ROLLBACK` via `pg` client checkout |

```js
// server/db/adapters/postgresql.js
import pg from 'pg';
import dotenv from 'dotenv';
import { validateAdapter } from '../interface.js';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URI,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '5000', 10),
});

let connected = false;
pool.connect()
  .then(client => { client.release(); connected = true; console.log('✅ PostgreSQL connected'); })
  .catch(err => { console.error('PostgreSQL connection failed:', err.message); });

pool.on('error', err => { console.error('Unexpected PG error', err.message); connected = false; });

/* ── Helpers ────────────────────────────────────────── */
function buildWhere(filter) {
  const keys = Object.keys(filter);
  if (keys.length === 0) return { text: '', values: [] };
  const clauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
  return { text: 'WHERE ' + clauses.join(' AND '), values: Object.values(filter) };
}

/* ── Adapter methods ────────────────────────────────── */
async function findMany(table, filter = {}, opts = {}) {
  const { text: where, values } = buildWhere(filter);
  const order = opts.sort ? `ORDER BY "${Object.keys(opts.sort)[0]}"` : '';
  const limit = opts.limit ? `LIMIT ${opts.limit}` : '';
  const offset = opts.skip  ? `OFFSET ${opts.skip}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM "${table}" ${where} ${order} ${limit} ${offset}`, values
  );
  return rows;
}

async function findOne(table, filter = {}) {
  const { text: where, values } = buildWhere(filter);
  const { rows } = await pool.query(`SELECT * FROM "${table}" ${where} LIMIT 1`, values);
  return rows[0] || null;
}

async function insertOne(table, doc) {
  const keys = Object.keys(doc);
  const cols = keys.map(k => `"${k}"`).join(', ');
  const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING RETURNING *`,
    Object.values(doc)
  );
  return rows[0] || null;
}

async function insertMany(table, docs) {
  if (!docs || docs.length === 0) return [];
  const results = await Promise.all(docs.map(doc => insertOne(table, doc)));
  return results.filter(Boolean);
}

async function updateOne(table, filter, update, opts = {}) {
  const setData = update.$set || update;
  const setKeys = Object.keys(setData);
  const setClause = setKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const filterKeys = Object.keys(filter);
  const whereClause = filterKeys.map((k, i) => `"${k}" = $${setKeys.length + i + 1}`).join(' AND ');
  const upsert = opts.upsert
    ? `ON CONFLICT DO UPDATE SET ${setClause}`
    : '';
  const { rows } = await pool.query(
    `UPDATE "${table}" SET ${setClause} WHERE ${whereClause} ${upsert} RETURNING *`,
    [...Object.values(setData), ...Object.values(filter)]
  );
  return rows[0] || null;
}

async function deleteMany(table, filter = {}) {
  const { text: where, values } = buildWhere(filter);
  const { rowCount } = await pool.query(`DELETE FROM "${table}" ${where}`, values);
  return rowCount;
}

async function countDocuments(table, filter = {}) {
  const { text: where, values } = buildWhere(filter);
  const { rows } = await pool.query(`SELECT COUNT(*) FROM "${table}" ${where}`, values);
  return parseInt(rows[0].count, 10);
}

async function aggregate(table, pipeline) {
  // Forwarded as raw SQL string when pipeline[0].$rawSQL is set.
  // For MongoDB-style pipelines a compatibility shim is planned (Phase 2 of Track A).
  if (pipeline.length === 1 && pipeline[0].$rawSQL) {
    const { rows } = await pool.query(pipeline[0].$rawSQL, pipeline[0].$values || []);
    return rows;
  }
  throw new Error('PostgreSQL adapter: aggregate requires $rawSQL pipeline stage until MongoDB pipeline compatibility shim is implemented.');
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const postgresAdapter = validateAdapter({
  findMany, findOne, insertOne, insertMany,
  updateOne, deleteMany, countDocuments, aggregate,
  transaction, isConnected: () => connected,
});

export default postgresAdapter;
```

---

### A4 — Connection Factory

**File:** `server/db/factory.js`

Reads `process.env.DB_ADAPTER` (defaults to `'mongodb'`) and returns the appropriate adapter. Called once at server startup.

```js
// server/db/factory.js
import { validateAdapter } from './interface.js';

let _adapter = null;

export async function getAdapter() {
  if (_adapter) return _adapter;

  const adapterName = (process.env.DB_ADAPTER || 'mongodb').toLowerCase();
  console.log(`📦 Loading DB adapter: ${adapterName}`);

  switch (adapterName) {
    case 'mongodb': {
      const { default: mongoAdapter } = await import('./adapters/mongodb.js');
      _adapter = mongoAdapter;
      break;
    }
    case 'postgresql':
    case 'postgres': {
      const { default: pgAdapter } = await import('./adapters/postgresql.js');
      _adapter = pgAdapter;
      break;
    }
    default:
      throw new Error(`Unknown DB_ADAPTER: "${adapterName}". Valid values: mongodb, postgresql`);
  }

  return validateAdapter(_adapter);
}
```

---

### A5 — Backward-Compatible Re-exports

**Files:** `server/db/client.js` and `server/db/query.js` (updated, not replaced)

These files become thin re-exports so that every existing route handler that imports from them continues to work without modification.

```js
// server/db/query.js  (updated)
import { getAdapter } from './factory.js';

const adapter = await getAdapter();

export const findMany        = adapter.findMany.bind(adapter);
export const findOne         = adapter.findOne.bind(adapter);
export const insertOne       = adapter.insertOne.bind(adapter);
export const insertMany      = adapter.insertMany.bind(adapter);
export const updateOne       = adapter.updateOne.bind(adapter);
export const deleteMany      = adapter.deleteMany.bind(adapter);
export const countDocuments  = adapter.countDocuments.bind(adapter);
export const aggregate       = adapter.aggregate.bind(adapter);
export const transaction     = adapter.transaction.bind(adapter);
```

```js
// server/db/client.js  (updated)
import { getAdapter } from './factory.js';

const adapter = await getAdapter();

export const isConnected = adapter.isConnected.bind(adapter);
export const db          = null;     // MongoDB-only; consumers should migrate to adapter methods
export const client      = null;     // MongoDB-only; use transaction() for session-based ops
export default adapter;
```

---

### A6 — Environment Configuration

New environment variables required for Track A:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_ADAPTER` | `mongodb` | Active adapter. Values: `mongodb`, `postgresql` |
| `MONGODB_URI` | (existing) | Used when `DB_ADAPTER=mongodb` |
| `DB_NAME` | (existing) | MongoDB database name |
| `POSTGRES_URI` | *(none)* | Full connection string for PostgreSQL (e.g. `postgres://user:pass@host:5432/guardianflow`) |
| `DB_POOL_MAX` | `20` | Shared connection pool size |
| `DB_POOL_CONNECT_TIMEOUT` | `5000` | Connection timeout (ms) |
| `DB_CONNECT_RETRIES` | `5` | Retry count on startup failure |
| `DB_RETRY_DELAY_MS` | `3000` | Base retry delay (ms) |

---

### A7 — Migration & Testing

**Testing checklist for adapter switch:**
- [ ] Run `DB_ADAPTER=mongodb` — all existing integration tests pass
- [ ] Run `DB_ADAPTER=postgresql` — all integration tests pass against a local Postgres instance
- [ ] Verify `validateAdapter()` throws on incomplete adapter implementations
- [ ] Verify `transaction()` rolls back correctly on error in both adapters
- [ ] Benchmark: `findMany` latency <10 ms difference between adapters on 10k-row collections
- [ ] Confirm no route handler file imports `mongodb` driver directly (grep audit)

**PostgreSQL schema bootstrap:**  
A migration file `server/scripts/pg-schema-bootstrap.sql` should be created that maps the existing MongoDB collections to PostgreSQL tables with equivalent schemas (id → uuid, _id handling, indexes).

---

---

## Part III — UI/UX Revamp (Track B)

> **Goal:** Replace ad-hoc inline styles, scattered colour literals, and inconsistent layouts with a single design system. Every rendered component draws from shared tokens. All primary user flows meet WCAG 2.1 AA accessibility standards.

---

### B1 — Design Token System

**File:** `src/styles/tokens.css` (and `src/styles/tokens.ts` for JS consumers)

Establish a complete token vocabulary before touching any component.

#### Colour Tokens
```css
:root {
  /* Brand */
  --gf-color-primary-50:  #eff6ff;
  --gf-color-primary-500: #3b82f6;
  --gf-color-primary-600: #2563eb;
  --gf-color-primary-700: #1d4ed8;

  /* Semantic */
  --gf-color-success: #16a34a;
  --gf-color-warning: #d97706;
  --gf-color-danger:  #dc2626;
  --gf-color-info:    #0891b2;

  /* Neutrals */
  --gf-color-bg:           #ffffff;
  --gf-color-bg-subtle:    #f8fafc;
  --gf-color-border:       #e2e8f0;
  --gf-color-text-primary: #0f172a;
  --gf-color-text-muted:   #64748b;

  /* Dark-mode overrides applied via [data-theme="dark"] */
}

[data-theme="dark"] {
  --gf-color-bg:           #0f172a;
  --gf-color-bg-subtle:    #1e293b;
  --gf-color-border:       #334155;
  --gf-color-text-primary: #f1f5f9;
  --gf-color-text-muted:   #94a3b8;
}
```

#### Spacing & Typography Tokens
```css
:root {
  --gf-space-1:  0.25rem;
  --gf-space-2:  0.5rem;
  --gf-space-4:  1rem;
  --gf-space-6:  1.5rem;
  --gf-space-8:  2rem;
  --gf-space-12: 3rem;
  --gf-space-16: 4rem;

  --gf-font-size-xs:   0.75rem;
  --gf-font-size-sm:   0.875rem;
  --gf-font-size-base: 1rem;
  --gf-font-size-lg:   1.125rem;
  --gf-font-size-xl:   1.25rem;
  --gf-font-size-2xl:  1.5rem;
  --gf-font-size-3xl:  1.875rem;

  --gf-font-weight-normal:   400;
  --gf-font-weight-medium:   500;
  --gf-font-weight-semibold: 600;
  --gf-font-weight-bold:     700;

  --gf-radius-sm: 0.25rem;
  --gf-radius-md: 0.375rem;
  --gf-radius-lg: 0.5rem;
  --gf-radius-xl: 0.75rem;

  --gf-shadow-sm: 0 1px 2px rgba(0,0,0,.05);
  --gf-shadow-md: 0 4px 6px rgba(0,0,0,.07);
  --gf-shadow-lg: 0 10px 15px rgba(0,0,0,.10);
}
```

---

### B2 — Core Component Library

All components live in `src/components/ui/`. Each is built exclusively from tokens — no hardcoded values.

#### B2.1 — Button
**File:** `src/components/ui/Button.tsx`

Variants: `primary` · `secondary` · `ghost` · `danger`
Sizes: `sm` · `md` · `lg`
States: default · hover · focus (visible ring) · disabled · loading (spinner)

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

#### B2.2 — Input & Form Controls
**Files:** `src/components/ui/Input.tsx`, `TextArea.tsx`, `Select.tsx`, `Checkbox.tsx`, `RadioGroup.tsx`

All support: `label`, `helperText`, `error`, `required`, `disabled`, accessible `aria-describedby` wiring.

#### B2.3 — Card
**File:** `src/components/ui/Card.tsx`

Variants: `default` · `elevated` · `bordered` · `ghost`
Sub-components: `Card.Header`, `Card.Body`, `Card.Footer`

#### B2.4 — Data Table
**File:** `src/components/ui/DataTable.tsx`

Features: sortable columns · pagination · row selection · column visibility toggle · export button hook · loading skeleton · empty state slot

```tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationConfig;
  onSortChange?: (sort: SortConfig) => void;
  emptyState?: React.ReactNode;
}
```

#### B2.5 — Modal / Dialog
**File:** `src/components/ui/Modal.tsx`

Focus trap on open · Escape key closes · scroll lock · backdrop click configurable · `aria-modal`, `role="dialog"`, `aria-labelledby`

#### B2.6 — Toast Notifications
**File:** `src/components/ui/Toast.tsx` + `src/hooks/useToast.ts`

Types: `success` · `error` · `warning` · `info`
Behaviour: auto-dismiss (configurable timeout) · manual dismiss · stack up to 5 · accessible live region (`role="status"`)

#### B2.7 — Badge & Status Indicator
**File:** `src/components/ui/Badge.tsx`

Variants map to semantic token colours. Used for work-order status, SLA risk level, user roles.

#### B2.8 — Navigation Components
**Files:** `src/components/ui/Sidebar.tsx`, `Breadcrumbs.tsx`, `TabBar.tsx`, `MobileNav.tsx`

Sidebar: collapsible · role-filtered menu items · active state · keyboard navigable
Breadcrumbs: auto-generated from React Router location
MobileNav: bottom tab bar on viewports <768 px

---

### B3 — Page-Level Layout System

**File:** `src/layouts/AppLayout.tsx`

```tsx
// Shell used by every authenticated page
<AppLayout>
  <AppLayout.Sidebar />      {/* Collapsible; role-filtered nav */}
  <AppLayout.Main>
    <AppLayout.PageHeader    {/* Title, breadcrumb, primary action button */}
      title="Work Orders"
      action={<Button>New Work Order</Button>}
    />
    <AppLayout.Content>
      {children}
    </AppLayout.Content>
  </AppLayout.Main>
</AppLayout>
```

Additional layouts:
- `src/layouts/AuthLayout.tsx` — centred card for login, MFA, password reset
- `src/layouts/PortalLayout.tsx` — lighter branding for customer and partner portals
- `src/layouts/PrintLayout.tsx` — stripped, print-optimised for invoices and reports

---

### B4 — Page-by-Page Revamp Checklist

Each page below must be migrated to use only token-based `ui/` components, verified in mobile/tablet/desktop breakpoints, and confirmed accessible at WCAG 2.1 AA.

#### Operations Module
- [ ] Work Orders list & detail
- [ ] Tickets list & detail
- [ ] Schedule / dispatch board
- [ ] Technician map view

#### Customer Portal
- [ ] Login / password reset
- [ ] Dashboard (open tickets, recent invoices)
- [ ] Ticket detail + chat thread
- [ ] Invoice history & download

#### Partner Portal
- [ ] Dashboard (earnings, penalties, SLA scores)
- [ ] Technician allocation table
- [ ] Invoice dispute flow
- [ ] Performance analytics

#### Admin Console
- [ ] Tenant settings
- [ ] User & role management
- [ ] Audit log viewer
- [ ] Security events dashboard

#### Finance Module
- [ ] Invoices list & preview
- [ ] Payments & reconciliation
- [ ] Penalty ledger

#### Analytics & Reporting
- [ ] Executive dashboard (widget builder)
- [ ] Scheduled report configurator
- [ ] BI connector settings

---

### B5 — Accessibility Audit

Run the following checklist before each phase MVP release:

| Check | Tool | Pass Criteria |
|-------|------|---------------|
| Colour contrast | axe DevTools / Lighthouse | AA (4.5:1 normal text, 3:1 large text) |
| Keyboard navigation | Manual + axe | All interactive elements reachable and operable via keyboard |
| Screen reader | NVDA (Windows), VoiceOver (macOS) | All form fields labelled; table headers announced; modal focus trap works |
| Focus indicators | Manual | Visible focus ring on all interactive elements (no `outline: none` without replacement) |
| Error identification | Manual | Form errors state the field name and describe the problem in text |
| Motion sensitivity | Manual | No essential functionality requires animation; `prefers-reduced-motion` respected |

---

### B6 — Dark Mode

- Token overrides applied via `[data-theme="dark"]` attribute on `<html>`.
- Toggle stored in `localStorage` and `prefers-color-scheme` media query respected on first visit.
- **File:** `src/hooks/useTheme.ts` — exposes `{ theme, setTheme, toggleTheme }`.
- All images and charts provide dark-mode-appropriate palette variants.

---

### B7 — Design System Governance

- Storybook (`src/storybook/`) documents every `ui/` component with interactive knobs for variant, size, and state.
- Visual regression tests (Chromatic or Percy) run on every PR touching `src/components/ui/`.
- A `design-token-audit` CI step flags any PR that introduces a hardcoded colour, spacing value, or font size.

---

---

## Part IV — Cross-Cutting Next Steps

**Immediate Actions (Week 1):**
1. ✅ Review and approve this unified plan
2. ⏳ **Track A:** Create `server/db/interface.js` and stub both adapter files
3. ⏳ **Track A:** Update `server/db/query.js` to re-export from factory (zero breaking changes)
4. ⏳ **Track B:** Publish design tokens as the first PR; enforce via CI token-audit script
5. ⏳ Assign security lead for continuous Phase 1 reviews
6. ⏳ Provision security tooling (OWASP ZAP, pen-testing suite)
7. ⏳ Begin Phase 1 Sprint 1 with MVP mindset

**Document Status:** READY FOR EXECUTION
**Approval Required:** Yes
**Estimated Start Date:** 2026-04-08
**First MVP Release:** ~4 weeks from kick-off (Phase 1 / Week 4 checkpoint)

---

*This document supersedes `GUARDIAN_FLOW_IMPLEMENTATION_PLAN_V2.md` (v2.0). The source documents are retained in the repository for historical reference.*
