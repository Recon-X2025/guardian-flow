# Guardian Flow Implementation Plan V2
## Optimized Technical Execution Guide with Parallel Workstreams

**Document Version:** 2.0  
**Date:** 2025-10-31  
**Status:** Ready for Execution  
**Key Improvements:** Overlapping critical paths, incremental MVPs, continuous security, early partner prep, foundational analytics

---

## Executive Summary

This updated plan accelerates delivery through parallel workstreams, continuous security hardening, and incremental MVP releases. Critical dependencies are addressed earlier, reducing bottlenecks and enabling faster feedback loops.

### Key Strategic Changes
- ✅ **Security-First:** Pen-testing, OAuth/MFA, and security reviews from Day 1
- ✅ **Early Analytics Foundation:** Lightweight eventing system in Phase 1 feeds all future ML/BI work
- ✅ **Partner API Readiness:** Marketplace architecture starts Phase 2 for gradual partner onboarding
- ✅ **Asset Lifecycle Prep:** Schema design and compliance controls begin Phase 1
- ✅ **MVP Mindset:** Each phase delivers a testable minimum viable increment within 4 weeks

---

## Phase 1: Foundation & Security Hardening (Months 1-3)

### 🎯 MVP Deliverables (Week 4)
- Telemetry on 20 critical edge functions
- Security scan automation operational
- Basic analytics eventing infrastructure
- Error boundary on top 5 pages
- OAuth/MFA foundation ready

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

ALTER TABLE public.seed_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant seeds" ON public.seed_metadata
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
```

#### Edge Functions
**File:** `supabase/functions/seed-validated-data/index.ts`
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
    assets?: number; // NEW: Early asset prep
  };
  includeCompliance?: boolean; // NEW: Seed compliance test data
}
```

---

### 1.2 Complete Edge Function Testing & Telemetry (P1)

#### Database Changes
```sql
-- Migration: Function telemetry with security events
CREATE TABLE IF NOT EXISTS public.function_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  execution_time_ms integer NOT NULL,
  status text NOT NULL, -- 'success', 'error', 'timeout'
  error_message text,
  request_payload jsonb,
  response_payload jsonb,
  security_level text, -- NEW: 'public', 'authenticated', 'privileged'
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet, -- NEW: Security tracking
  user_agent text, -- NEW: Security tracking
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_telemetry_function ON public.function_telemetry(function_name, created_at DESC);
CREATE INDEX idx_telemetry_tenant ON public.function_telemetry(tenant_id, created_at DESC);
CREATE INDEX idx_telemetry_security ON public.function_telemetry(security_level, created_at DESC); -- NEW

ALTER TABLE public.function_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all telemetry" ON public.function_telemetry
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));
```

#### Shared Telemetry Module (Enhanced)
**File:** `supabase/functions/_shared/telemetry.ts`
```typescript
export async function recordFunctionCall(params: {
  functionName: string;
  startTime: number;
  status: 'success' | 'error' | 'timeout';
  error?: Error;
  tenantId?: string;
  userId?: string;
  securityLevel: 'public' | 'authenticated' | 'privileged'; // NEW
  req?: Request; // NEW: Extract IP/UA
}) {
  // Log to function_telemetry with security context
  // Emit analytics event for downstream processing
  // Alert on suspicious patterns
}
```

---

### 1.3 🆕 Foundational Analytics & Eventing System

#### Database Changes
```sql
-- Migration: Lightweight event stream for analytics
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'work_order.created', 'ticket.assigned', 'sla.warning', etc.
  event_category text NOT NULL, -- 'operational', 'financial', 'security', 'user_action'
  entity_type text, -- 'work_order', 'ticket', 'invoice', etc.
  entity_id uuid,
  user_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_events_tenant ON public.analytics_events(tenant_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_category ON public.analytics_events(event_category, created_at DESC);

-- Time-series aggregates for fast queries
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

CREATE INDEX idx_analytics_hourly_tenant_time ON public.analytics_hourly_aggregates(tenant_id, hour_start DESC);
```

#### Shared Analytics Module
**File:** `supabase/functions/_shared/analytics.ts`
```typescript
export async function trackEvent(params: {
  tenantId: string;
  eventType: string;
  eventCategory: 'operational' | 'financial' | 'security' | 'user_action';
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}) {
  // Insert into analytics_events
  // Used by SLA prediction, BI exports, forecasting
}
```

#### Edge Function
**File:** `supabase/functions/analytics-aggregator/index.ts` (Enhanced)
- Hourly aggregation cron job
- Real-time stream processing
- Feeds into Phase 2 SLA models and Phase 4 BI exports

---

### 1.4 🆕 Security Hardening & OAuth/MFA Foundation

#### Database Changes
```sql
-- Migration: Enhanced security tracking
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  event_type text NOT NULL, -- 'login_failure', 'privilege_escalation', 'data_export', 'mfa_bypass_attempt'
  severity text NOT NULL, -- 'low', 'medium', 'high', 'critical'
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_security_events_severity ON public.security_events(severity, created_at DESC);
CREATE INDEX idx_security_events_tenant ON public.security_events(tenant_id, created_at DESC);

-- OAuth provider configuration
CREATE TABLE IF NOT EXISTS public.oauth_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google', 'microsoft', 'okta'
  client_id text NOT NULL,
  client_secret_encrypted text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- MFA configuration
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

#### Edge Functions
**File:** `supabase/functions/security-monitor/index.ts` (New)
- Real-time security event detection
- Anomaly detection for suspicious patterns
- Automated alerting for critical events

**File:** `supabase/functions/oauth-callback/index.ts` (New)
- OAuth provider integration
- SAML/SSO support foundation

#### UI Components
- `src/components/SecurityDashboard.tsx` - Real-time security monitoring
- `src/components/MFASetup.tsx` - User MFA enrollment

---

### 1.5 🆕 Asset Lifecycle Schema Design (Early Prep)

#### Database Changes
```sql
-- Migration: Asset management foundation (read-only in Phase 1)
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
  status text NOT NULL DEFAULT 'active', -- 'active', 'maintenance', 'decommissioned'
  lifecycle_stage text NOT NULL, -- 'procurement', 'deployment', 'operation', 'maintenance', 'retirement'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'purchased', 'deployed', 'maintained', 'upgraded', 'decommissioned'
  event_date timestamptz NOT NULL,
  cost numeric(12,2),
  notes text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_assets_tenant ON public.assets(tenant_id, status);
CREATE INDEX idx_asset_events_asset ON public.asset_lifecycle_events(asset_id, event_date DESC);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Tenant users view own assets" ON public.assets
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users view own asset events" ON public.asset_lifecycle_events
  FOR SELECT USING (
    asset_id IN (SELECT id FROM public.assets WHERE tenant_id = get_user_tenant_id(auth.uid()))
  );
```

**Note:** Asset CRUD functionality deferred to Phase 3, but schema exists for demo data and discussions.

---

### 1.6 🆕 Compliance Controls Foundation (Early Prep)

#### Database Changes
```sql
-- Migration: Compliance framework foundation
CREATE TABLE IF NOT EXISTS public.compliance_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name text NOT NULL, -- 'SOC2', 'ISO27001', 'GDPR', 'HIPAA'
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

-- Seed initial frameworks (SOC2, ISO27001)
INSERT INTO public.compliance_frameworks (framework_name, version, requirements) VALUES
  ('SOC2 Type II', '2023', '{"controls": ["access_control", "change_management", "data_encryption"]}'),
  ('ISO27001', '2022', '{"controls": ["risk_assessment", "incident_response", "business_continuity"]}');
```

**Note:** Full automation deferred to Phase 6, but schema exists for compliance discussions.

---

### 1.7 Full UI Error Boundary Implementation (P2)

#### Database Changes
```sql
-- Migration: Frontend error logging
CREATE TABLE IF NOT EXISTS public.frontend_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  error_stack text,
  component_name text,
  user_id uuid REFERENCES auth.users(id),
  tenant_id uuid REFERENCES public.tenants(id),
  browser_info jsonb,
  url text,
  severity text DEFAULT 'error', -- NEW: 'warning', 'error', 'critical'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_frontend_errors_tenant ON public.frontend_errors(tenant_id, created_at DESC);
CREATE INDEX idx_frontend_errors_severity ON public.frontend_errors(severity, created_at DESC);
```

#### Edge Function
**File:** `supabase/functions/log-frontend-error/index.ts`

---

### 1.8 Enhanced API Gateway Controls (P2)

#### Database Changes
```sql
-- Migration: API rate limiting and metering
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

CREATE INDEX idx_api_usage_tenant_period ON public.api_usage_metrics(tenant_id, period_start DESC);

-- Rate limit configuration
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

#### Database Changes
```sql
-- Migration: Distributed tracing
CREATE TABLE IF NOT EXISTS public.trace_spans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid NOT NULL,
  parent_span_id uuid,
  span_name text NOT NULL,
  service_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_ms integer,
  status text, -- 'ok', 'error'
  attributes jsonb,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_traces_trace_id ON public.trace_spans(trace_id, start_time);
CREATE INDEX idx_traces_tenant ON public.trace_spans(tenant_id, start_time DESC);
```

---

### Phase 1 Testing & Security Review

#### Continuous Security (Week 1-12)
- **Week 1-4:** OWASP ZAP automated scans on all APIs
- **Week 5-8:** Manual penetration testing on authentication flows
- **Week 9-12:** Security code review for all edge functions

#### MVP Testing (Week 4)
- Unit tests for telemetry module
- Integration tests for analytics eventing
- Security event simulation tests
- RLS policy verification

---

## Phase 2: Customer Experience & Partner Prep (Months 4-6)

### 🎯 MVP Deliverables (Week 4)
- SLA prediction model running on 100 test work orders
- Customer portal with ticket viewing
- Partner API specification published
- Mobile PWA installable

### 2.1 SLA Breach Prediction & Alerting

#### Database Changes
```sql
-- Migration: SLA prediction models (uses Phase 1 analytics)
CREATE TABLE IF NOT EXISTS public.sla_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  predicted_completion timestamptz NOT NULL,
  sla_deadline timestamptz NOT NULL,
  breach_probability numeric(5,2) NOT NULL, -- 0-100%
  contributing_factors jsonb,
  confidence_score numeric(5,2),
  model_version text, -- NEW: Track ML model versions
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sla_predictions_wo ON public.sla_predictions(work_order_id);
CREATE INDEX idx_sla_predictions_high_risk ON public.sla_predictions(breach_probability DESC) 
  WHERE breach_probability > 70;

-- SLA breach alerts
CREATE TABLE IF NOT EXISTS public.sla_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'warning', 'critical', 'breach'
  breach_probability numeric(5,2),
  escalated_to uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### Edge Functions
**File:** `supabase/functions/predict-sla-breach/index.ts` (Enhanced)
- ML model integration (uses analytics_events from Phase 1)
- Historical data analysis
- Real-time risk scoring

**File:** `supabase/functions/sla-monitor/index.ts` (New)
- Continuous monitoring cron job
- Automatic alert generation
- Escalation workflow

---

### 2.2 Customer Self-Service Portal

#### Database Changes
```sql
-- Migration: Customer portal access
CREATE TABLE IF NOT EXISTS public.customer_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'viewer', -- 'viewer', 'requester', 'approver'
  enabled boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Portal activity tracking (feeds Phase 1 analytics)
CREATE TABLE IF NOT EXISTS public.portal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  resource_type text,
  resource_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own portal users" ON public.customer_portal_users
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE tenant_id = get_user_tenant_id(auth.uid())
    )
  );
```

#### UI Pages
- `src/pages/CustomerPortal.tsx` (Enhanced)
- `src/pages/CustomerTickets.tsx`
- `src/pages/CustomerQuotes.tsx`
- `src/pages/CustomerReports.tsx`

---

### 2.3 🆕 Partner Ecosystem API Foundation

#### Database Changes
```sql
-- Migration: Partner management (early prep for Phase 5)
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  partner_type text NOT NULL, -- 'technology', 'reseller', 'implementation'
  certification_level text, -- 'bronze', 'silver', 'gold', 'platinum'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'suspended'
  contact_email text NOT NULL,
  website text,
  revenue_share_percentage numeric(5,2),
  api_key_hash text, -- NEW: Partner API authentication
  api_quota_daily integer DEFAULT 1000, -- NEW: Rate limiting
  created_at timestamptz DEFAULT now()
);

-- Partner API usage tracking
CREATE TABLE IF NOT EXISTS public.partner_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_partner_api_usage_partner ON public.partner_api_usage(partner_id, created_at DESC);
```

#### Edge Functions
**File:** `supabase/functions/partner-api-gateway/index.ts` (New)
- Partner authentication (API key validation)
- Rate limiting per partner
- Usage metering
- Webhook delivery

**File:** `supabase/functions/partner-onboard/index.ts` (Enhanced)
- API key generation
- Sandbox tenant provisioning
- Documentation access

#### API Documentation
**File:** `public/PARTNER_API_SPEC.md` (New)
- REST API specification
- Authentication guide
- Rate limits and quotas
- Webhook documentation
- Example code snippets

---

### 2.4 Mobile PWA Foundation

#### PWA Configuration
**File:** `public/manifest.json` (Enhanced)
```json
{
  "name": "Guardian Flow",
  "short_name": "GuardianFlow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### Service Worker
**File:** `public/service-worker.js` (New)
```javascript
// Offline caching strategy
// Background sync
// Push notifications
```

#### Database Changes
```sql
-- Migration: Offline data queue
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

#### Continuous Security (Week 13-24)
- OAuth/SAML integration pen-testing
- Customer portal RLS verification
- Partner API security audit

#### MVP Testing (Week 16)
- SLA prediction accuracy tests (historical data)
- Customer portal load testing
- Partner API integration tests

---

## Phase 3: Asset & Workforce Intelligence (Months 7-9)

### 🎯 MVP Deliverables (Week 4)
- Asset registry with 1000 test assets
- AI scheduling recommendations for 10 technicians
- Predictive maintenance alerts operational

### 3.1 Asset Lifecycle Management (Full Implementation)

**Note:** Schema exists from Phase 1, now adding CRUD operations and UI.

#### Edge Functions
**File:** `supabase/functions/asset-create/index.ts` (New)
**File:** `supabase/functions/asset-update/index.ts` (New)
**File:** `supabase/functions/asset-maintenance-scheduler/index.ts` (New)
- Automated maintenance scheduling
- Warranty expiration alerts
- Lifecycle event automation

#### UI Pages
- `src/pages/AssetManagement.tsx` - Asset registry CRUD
- `src/pages/AssetLifecycle.tsx` - Lifecycle tracking
- `src/pages/AssetMaintenance.tsx` - Maintenance scheduling

---

### 3.2 AI-Driven Workforce Optimization

#### Database Changes
```sql
-- Migration: Workforce optimization
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

#### Edge Functions
**File:** `supabase/functions/optimize-scheduling/index.ts` (uses Phase 1 analytics)
- ML-based technician assignment
- Route optimization
- Capacity forecasting

---

### Phase 3 Testing & Security Review

#### Continuous Security (Week 25-36)
- Asset data access audits
- AI model bias testing
- Scheduling algorithm security review

---

## Phase 4: Business Intelligence & Analytics Maturity (Months 10-12)

### 🎯 MVP Deliverables (Week 4)
- PowerBI connector operational
- 5 pre-built dashboard templates
- Real-time data export working

### 4.1 Native Analytics & BI Integration

**Note:** Uses Phase 1 analytics_events and Phase 1 analytics_hourly_aggregates for all exports.

#### Database Changes
```sql
-- Migration: BI connector configuration
CREATE TABLE IF NOT EXISTS public.bi_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_type text NOT NULL, -- 'powerbi', 'tableau', 'looker', 'datastudio'
  configuration jsonb NOT NULL,
  api_credentials_encrypted text,
  enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency text DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily'
  created_at timestamptz DEFAULT now()
);

-- Pre-aggregated analytics views (uses Phase 1 data)
CREATE MATERIALIZED VIEW public.mv_daily_operations AS
SELECT 
  tenant_id,
  date_trunc('day', created_at) as date,
  COUNT(*) as total_work_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours
FROM public.work_orders
GROUP BY tenant_id, date_trunc('day', created_at);

CREATE UNIQUE INDEX ON public.mv_daily_operations(tenant_id, date);
```

#### Edge Functions
**File:** `supabase/functions/bi-connector-sync/index.ts`
- OAuth integration for BI platforms
- Data export and transformation
- Scheduled sync jobs

---

### Phase 4 Testing & Security Review

#### Continuous Security (Week 37-48)
- BI data export encryption audit
- OAuth token security review
- Data masking verification

---

## Phase 5: Global Expansion & Partner Ecosystem (Months 13-15)

### 🎯 MVP Deliverables (Week 4)
- 3 languages supported (EN, ES, FR)
- 10 partners onboarded
- 5 marketplace extensions live

### 5.1 Globalization & Localization

#### Database Changes
```sql
-- Migration: Localization support
CREATE TABLE IF NOT EXISTS public.tenant_localization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en-US',
  timezone text NOT NULL DEFAULT 'UTC',
  date_format text NOT NULL DEFAULT 'MM/DD/YYYY',
  time_format text NOT NULL DEFAULT 'hh:mm A',
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

**Note:** Uses Phase 2 partner API foundation.

#### Database Changes
```sql
-- Migration: Marketplace extensions
CREATE TABLE IF NOT EXISTS public.marketplace_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  extension_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  version text NOT NULL,
  pricing_model text NOT NULL, -- 'free', 'subscription', 'usage_based'
  price_amount numeric(12,2),
  price_currency text DEFAULT 'USD',
  icon_url text,
  documentation_url text,
  support_url text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'published', 'deprecated'
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

#### Continuous Security (Week 49-60)
- Extension sandboxing verification
- Partner API abuse monitoring
- Localization XSS testing

---

## Phase 6: Compliance Automation & Certification (Months 16-18)

### 🎯 MVP Deliverables (Week 4)
- SOC 2 evidence collection automated
- 90% of ISO27001 controls automated
- Audit report generation operational

### 6.1 Regulatory Compliance Automation

**Note:** Uses Phase 1 compliance_frameworks and Phase 1 compliance_controls.

#### Database Changes
```sql
-- Migration: Compliance evidence (schema exists, adding automation)
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
  auto_collected boolean DEFAULT false, -- NEW: Track automated collection
  created_at timestamptz DEFAULT now()
);
```

#### Edge Functions
**File:** `supabase/functions/compliance-collector/index.ts` (Enhanced)
- Automated evidence collection from Phase 1 security_events
- Control testing automation
- Audit report generation

---

### Phase 6 Testing & Security Review

#### Continuous Security (Week 61-72)
- SOC 2 Type II readiness audit
- ISO 27001 gap analysis
- Final penetration testing

---

## Success Metrics by Phase

### Phase 1 (Months 1-3)
- ✅ 100% edge functions with telemetry
- ✅ Zero critical security vulnerabilities
- ✅ < 500ms average API response time
- ✅ Analytics eventing operational on all core entities
- ✅ OAuth/MFA foundation ready

### Phase 2 (Months 4-6)
- ✅ 95% SLA breach prediction accuracy
- ✅ 50% reduction in manual customer support
- ✅ Partner API specification published, 5 test partners onboarded
- ✅ Mobile PWA lighthouse score > 90

### Phase 3 (Months 7-9)
- ✅ 30% reduction in asset downtime
- ✅ 25% improvement in technician utilization
- ✅ Complete asset lifecycle tracking operational

### Phase 4 (Months 10-12)
- ✅ 5+ BI platform integrations
- ✅ 100% data accuracy in BI exports
- ✅ < 5min dashboard refresh time

### Phase 5 (Months 13-15)
- ✅ Support for 10+ languages
- ✅ 50+ marketplace extensions
- ✅ 20+ certified partners

### Phase 6 (Months 16-18)
- ✅ SOC 2 Type II certification
- ✅ ISO 27001 compliance
- ✅ 100% automated evidence collection

---

## Risk Management

### Technical Risks
| Risk | Mitigation | Owner | Phase |
|------|-----------|-------|-------|
| Database performance degradation | Caching layer, query optimization, Phase 1 analytics aggregates | DBA Team | All |
| Third-party API failures | Circuit breakers in Phase 1 | Backend Team | Phase 1 |
| Mobile offline sync conflicts | Conflict resolution algorithms | Mobile Team | Phase 2 |
| Partner API abuse | Rate limiting from Phase 2 | Security Team | Phase 2-5 |

### Business Risks
| Risk | Mitigation | Owner | Phase |
|------|-----------|-------|-------|
| Feature scope creep | MVP mindset with 4-week checkpoints | Product Manager | All |
| Resource availability | Cross-training, contractor backup | Engineering Manager | All |
| Market timing | Phased MVP releases every 4 weeks | CEO/CTO | All |
| Partner ecosystem delayed | Early API prep in Phase 2 | Business Development | Phase 2-5 |

---

## Resource Requirements

### Team Structure (Updated)
- **Phase 1:** 6 engineers (2 frontend, 2 backend, 1 security, 1 QA)
- **Phase 2:** 8 engineers (2 frontend, 3 backend, 1 mobile, 1 security, 1 QA)
- **Phase 3:** 8 engineers (3 frontend, 3 backend, 1 mobile, 1 QA)
- **Phase 4:** 9 engineers (3 frontend, 3 backend, 2 BI specialists, 1 QA)
- **Phase 5:** 10 engineers (3 frontend, 4 backend, 2 mobile, 1 QA)
- **Phase 6:** 10 engineers (3 frontend, 4 backend, 2 compliance, 1 QA)

### Infrastructure
- Production environment: AWS/GCP with multi-region support
- Staging environment: Identical to production
- Development environments: Per developer
- Security tools: OWASP ZAP, Burp Suite, Snyk
- Cost: ~$18k/month by Phase 6 (increased for security/compliance tools)

---

## Continuous Feedback Loops

### Weekly Feedback (All Phases)
- **Monday:** Sprint planning, MVP definition
- **Wednesday:** Mid-sprint check-in, blocker resolution
- **Friday:** Demo to stakeholders, feedback collection

### Monthly Releases (All Phases)
- **Week 4:** MVP release to internal beta testers
- **Week 8:** Extended beta release to pilot customers
- **Week 12:** General availability with full documentation

### Quarterly Business Reviews (All Phases)
- **Month 3, 6, 9, 12, 15, 18:** Executive review of metrics, roadmap adjustments

---

## Next Steps

**Immediate Actions (Week 1):**
1. ✅ Review and approve V2 implementation plan
2. ⏳ Assign security lead for continuous reviews
3. ⏳ Set up analytics infrastructure (Phase 1 foundation)
4. ⏳ Design partner API specification (Phase 2 prep)
5. ⏳ Provision security tools (OWASP ZAP, pen-testing suite)
6. ⏳ Begin Phase 1 Sprint 1 with MVP mindset

**Ready to Begin:**
This V2 plan addresses all strategic improvements:
- ✅ Overlapping critical paths (asset/compliance schemas in Phase 1)
- ✅ Incremental MVPs with 4-week feedback loops
- ✅ Continuous security hardening from Day 1
- ✅ Partner API prep starting Phase 2
- ✅ Foundational analytics feeding all future work

Select Phase 1 to begin execution immediately.

---

**Document Status:** READY FOR EXECUTION  
**Approval Required:** Yes  
**Estimated Start Date:** 2025-11-01  
**First MVP Release:** 2025-11-29 (Week 4 of Phase 1)
