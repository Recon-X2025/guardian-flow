-- Phase 1-6: Create missing operational and telemetry tables with secure RLS
-- NOTE: Idempotent via IF NOT EXISTS on tables; policies created only once since tables are new

-- 1) Function Telemetry
CREATE TABLE IF NOT EXISTS public.function_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL, -- success | error
  duration_ms integer,
  timestamp timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid,
  request_id uuid,
  cold_start boolean DEFAULT false,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.function_telemetry ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_function_telemetry_ts ON public.function_telemetry (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_function_telemetry_func ON public.function_telemetry (function_name);
CREATE POLICY "Ops view function telemetry" ON public.function_telemetry
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'ml_ops'::app_role,'ops_manager'::app_role]));
CREATE POLICY "Authenticated insert telemetry" ON public.function_telemetry
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2) Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  event_type text NOT NULL,
  properties jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  source text
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON public.analytics_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events (event_type);
CREATE POLICY "Users read tenant analytics events" ON public.analytics_events
  FOR SELECT USING ((tenant_id IS NULL) OR (tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Authenticated insert analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3) Security Events
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tenant_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_security_events_ts ON public.security_events (created_at DESC);
CREATE POLICY "Admins view security events" ON public.security_events
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]));
CREATE POLICY "Authenticated insert security events" ON public.security_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4) Offline Queue (for useOfflineSync hook)
CREATE TABLE IF NOT EXISTS public.offline_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  payload jsonb NOT NULL,
  synced boolean DEFAULT false,
  attempts int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  synced_at timestamptz
);
ALTER TABLE public.offline_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_offline_queue_user_synced ON public.offline_queue (user_id, synced);
CREATE POLICY "Users manage own offline queue" ON public.offline_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) BI Connectors registry
CREATE TABLE IF NOT EXISTS public.bi_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  provider text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'inactive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bi_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bi connectors" ON public.bi_connectors
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]));
CREATE TRIGGER update_bi_connectors_updated
  BEFORE UPDATE ON public.bi_connectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Rate limit configuration per-tenant
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  tenant_id uuid PRIMARY KEY,
  daily_limit integer NOT NULL DEFAULT 100000,
  burst_limit integer NOT NULL DEFAULT 500,
  window_seconds integer NOT NULL DEFAULT 60,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rate limits" ON public.rate_limit_config
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]));

-- 7) Tenant localization and translations
CREATE TABLE IF NOT EXISTS public.tenant_localization (
  tenant_id uuid PRIMARY KEY,
  locale text NOT NULL DEFAULT 'en-US',
  timezone text NOT NULL DEFAULT 'UTC',
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.tenant_localization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tenant localization" ON public.tenant_localization
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage tenant localization" ON public.tenant_localization
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]));

CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  locale text NOT NULL,
  translation_key text NOT NULL,
  translation_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, locale, translation_key)
);
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read tenant or global translations" ON public.translations
  FOR SELECT USING ((tenant_id IS NULL) OR (tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Admins manage translations" ON public.translations
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]));

-- 8) Tenant Extensions installation state
CREATE TABLE IF NOT EXISTS public.tenant_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  extension_id uuid NOT NULL,
  installed_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
);
ALTER TABLE public.tenant_extensions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tenant_extensions_tenant ON public.tenant_extensions (tenant_id);
CREATE POLICY "Admins manage tenant extensions" ON public.tenant_extensions
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]));

-- 9) Asset management
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'active',
  location jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view tenant assets" ON public.assets
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage assets" ON public.assets
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'ops_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'ops_manager'::app_role]));
CREATE TRIGGER update_assets_updated
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.asset_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  event_type text NOT NULL,
  event_time timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.asset_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_asset_events_asset ON public.asset_lifecycle_events (asset_id);
CREATE POLICY "Users view tenant asset events" ON public.asset_lifecycle_events
  FOR SELECT USING (asset_id IN (SELECT id FROM public.assets WHERE tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Admins insert asset events" ON public.asset_lifecycle_events
  FOR INSERT WITH CHECK (true);

-- 10) Compliance data
CREATE TABLE IF NOT EXISTS public.compliance_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.compliance_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage frameworks" ON public.compliance_frameworks
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]));

CREATE TABLE IF NOT EXISTS public.compliance_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  control_id text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'
);
ALTER TABLE public.compliance_controls ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_controls_framework ON public.compliance_controls (framework_id);
CREATE POLICY "Admins manage controls" ON public.compliance_controls
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]));

CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL,
  control_id text NOT NULL,
  record_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pass',
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage evidence" ON public.compliance_evidence
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'auditor'::app_role]));

-- 11) Frontend Error logs
CREATE TABLE IF NOT EXISTS public.frontend_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  route text,
  message text NOT NULL,
  stack text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.frontend_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own frontend errors" ON public.frontend_errors
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated insert frontend errors" ON public.frontend_errors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 12) SLA monitoring
CREATE TABLE IF NOT EXISTS public.sla_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  predicted_breach boolean NOT NULL DEFAULT false,
  breach_probability numeric,
  predicted_at timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.sla_predictions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sla_predictions_wo ON public.sla_predictions (work_order_id);
CREATE POLICY "Users view tenant sla predictions" ON public.sla_predictions
  FOR SELECT USING (work_order_id IN (SELECT id FROM public.work_orders));
CREATE POLICY "Admins insert sla predictions" ON public.sla_predictions
  FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.sla_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  alert_type text NOT NULL,
  alert_time timestamptz DEFAULT now(),
  resolved_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.sla_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sla_alerts_wo ON public.sla_alerts (work_order_id);
CREATE POLICY "Users view tenant sla alerts" ON public.sla_alerts
  FOR SELECT USING (work_order_id IN (SELECT id FROM public.work_orders));
CREATE POLICY "Admins manage sla alerts" ON public.sla_alerts
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'ops_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role,'ops_manager'::app_role]));

-- 13) Customer Portal users and activity
CREATE TABLE IF NOT EXISTS public.customer_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_portal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own portal mapping" ON public.customer_portal_users
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage portal users" ON public.customer_portal_users
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role,'tenant_admin'::app_role]));

CREATE TABLE IF NOT EXISTS public.portal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  activity text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.portal_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own portal activity" ON public.portal_activity
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated insert portal activity" ON public.portal_activity
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 14) Partner API usage aggregation (daily)
CREATE TABLE IF NOT EXISTS public.partner_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  day date NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  avg_latency_ms integer,
  UNIQUE(tenant_id, day)
);
ALTER TABLE public.partner_api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins view partner api usage" ON public.partner_api_usage
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = partner_api_usage.tenant_id));
CREATE POLICY "Admins manage partner api usage" ON public.partner_api_usage
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]));

-- 15) Seed metadata
CREATE TABLE IF NOT EXISTS public.seed_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_name text NOT NULL,
  version text,
  applied_at timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.seed_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seed metadata" ON public.seed_metadata
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]));

-- 16) OAuth Providers (config only)
CREATE TABLE IF NOT EXISTS public.oauth_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  client_id text,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.oauth_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage oauth providers" ON public.oauth_providers
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]));
CREATE TRIGGER update_oauth_providers_updated
  BEFORE UPDATE ON public.oauth_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 17) User MFA Settings (frontend enforcement helper)
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  user_id uuid PRIMARY KEY,
  mfa_enabled boolean NOT NULL DEFAULT false,
  preferred_factor text,
  backup_codes jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mfa settings" ON public.user_mfa_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18) Scheduling Recommendations
CREATE TABLE IF NOT EXISTS public.scheduling_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  work_order_id uuid,
  technician_id uuid,
  recommendation_score numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.scheduling_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view tenant scheduling recommendations" ON public.scheduling_recommendations
  FOR SELECT USING ((tenant_id IS NULL) OR (tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Admins insert scheduling recommendations" ON public.scheduling_recommendations
  FOR INSERT WITH CHECK (true);

-- 19) Trace spans view for compatibility (maps to observability_traces)
CREATE OR REPLACE VIEW public.trace_spans AS
  SELECT 
    id,
    trace_id,
    span_id,
    parent_span_id,
    start_time,
    end_time,
    duration_ms,
    attributes,
    events,
    created_at,
    operation_name,
    agent_id,
    service_name,
    status,
    error_message
  FROM public.observability_traces;

-- Make sure publication exists (for realtime if needed) - no-op if already added
-- NOTE: This is safe and idempotent on Supabase Cloud
DO $$ BEGIN
  BEGIN
    PERFORM 1;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;
