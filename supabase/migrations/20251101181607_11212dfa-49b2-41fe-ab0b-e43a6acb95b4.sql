-- Analytics Platform Core Tables

-- 1. Analytics Workspaces
CREATE TABLE IF NOT EXISTS public.analytics_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workspace_type TEXT NOT NULL DEFAULT 'custom',
  storage_quota_gb INTEGER NOT NULL DEFAULT 1000,
  query_quota_per_day INTEGER NOT NULL DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces in their tenant"
  ON public.analytics_workspaces FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create workspaces in their tenant"
  ON public.analytics_workspaces FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND created_by = auth.uid());

-- 2. Analytics Data Sources
CREATE TABLE IF NOT EXISTS public.analytics_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  connection_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  sync_frequency TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view data sources in their tenant"
  ON public.analytics_data_sources FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data sources in their tenant"
  ON public.analytics_data_sources FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Analytics Pipelines
CREATE TABLE IF NOT EXISTS public.analytics_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_id UUID REFERENCES public.analytics_data_sources(id) ON DELETE SET NULL,
  config JSONB NOT NULL DEFAULT '{}',
  schedule TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipelines in their tenant"
  ON public.analytics_pipelines FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage pipelines in their tenant"
  ON public.analytics_pipelines FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Analytics Pipeline Runs
CREATE TABLE IF NOT EXISTS public.analytics_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.analytics_pipelines(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  execution_logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipeline runs in their tenant"
  ON public.analytics_pipeline_runs FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

-- 5. Analytics Data Quality Rules
CREATE TABLE IF NOT EXISTS public.analytics_data_quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  data_source_id UUID REFERENCES public.analytics_data_sources(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  column_name TEXT,
  rule_definition JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  threshold_value NUMERIC,
  schedule_cron TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_data_quality_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quality rules in their tenant"
  ON public.analytics_data_quality_rules FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage quality rules in their tenant"
  ON public.analytics_data_quality_rules FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Analytics Data Quality Results
CREATE TABLE IF NOT EXISTS public.analytics_data_quality_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.analytics_data_quality_rules(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  execution_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  passed BOOLEAN NOT NULL,
  score NUMERIC,
  records_tested INTEGER,
  records_failed INTEGER,
  details JSONB DEFAULT '{}',
  error_samples JSONB DEFAULT '[]',
  remediation_suggestions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_data_quality_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quality results in their tenant"
  ON public.analytics_data_quality_results FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "System can insert quality results"
  ON public.analytics_data_quality_results FOR INSERT
  WITH CHECK (true);

-- 7. Analytics Data Profiles
CREATE TABLE IF NOT EXISTS public.analytics_data_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES public.analytics_data_sources(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  column_name TEXT,
  data_type TEXT,
  row_count BIGINT,
  null_count BIGINT,
  null_percentage NUMERIC,
  distinct_count BIGINT,
  distinct_percentage NUMERIC,
  min_value TEXT,
  max_value TEXT,
  avg_value NUMERIC,
  value_distribution JSONB DEFAULT '{}',
  pattern_analysis JSONB DEFAULT '{}',
  profiled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_data_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view data profiles in their tenant"
  ON public.analytics_data_profiles FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

-- 8. Analytics Anomalies
CREATE TABLE IF NOT EXISTS public.analytics_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  data_source_id UUID REFERENCES public.analytics_data_sources(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  detected_value NUMERIC,
  expected_value NUMERIC,
  deviation_score NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  context JSONB DEFAULT '{}',
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view anomalies in their tenant"
  ON public.analytics_anomalies FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can acknowledge anomalies in their tenant"
  ON public.analytics_anomalies FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "System can insert anomalies"
  ON public.analytics_anomalies FOR INSERT
  WITH CHECK (true);

-- 9. Analytics ML Models
CREATE TABLE IF NOT EXISTS public.analytics_ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL,
  framework TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'training',
  training_data_source_id UUID REFERENCES public.analytics_data_sources(id) ON DELETE SET NULL,
  config JSONB NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  artifact_uri TEXT,
  deployed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_ml_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ML models in their tenant"
  ON public.analytics_ml_models FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage ML models in their tenant"
  ON public.analytics_ml_models FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 10. Analytics Query History
CREATE TABLE IF NOT EXISTS public.analytics_query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  data_source_id UUID REFERENCES public.analytics_data_sources(id) ON DELETE SET NULL,
  execution_time_ms INTEGER,
  rows_returned INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_query_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own query history"
  ON public.analytics_query_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own query history"
  ON public.analytics_query_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 11. Analytics JIT Access Requests
CREATE TABLE IF NOT EXISTS public.analytics_jit_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  requested_permissions TEXT[] NOT NULL,
  justification TEXT NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_jit_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view JIT requests in their workspace"
  ON public.analytics_jit_access_requests FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can create JIT requests"
  ON public.analytics_jit_access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- 12. Analytics Security Scans
CREATE TABLE IF NOT EXISTS public.analytics_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  findings JSONB DEFAULT '[]',
  risk_score NUMERIC,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_security_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view security scans in their tenant"
  ON public.analytics_security_scans FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

-- 13. Analytics Compliance Checks
CREATE TABLE IF NOT EXISTS public.analytics_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.analytics_workspaces(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  control_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'compliant',
  evidence JSONB DEFAULT '{}',
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance checks in their tenant"
  ON public.analytics_compliance_checks FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.analytics_workspaces WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

-- Indexes for performance
CREATE INDEX idx_analytics_workspaces_tenant ON public.analytics_workspaces(tenant_id);
CREATE INDEX idx_analytics_data_sources_workspace ON public.analytics_data_sources(workspace_id);
CREATE INDEX idx_analytics_pipelines_workspace ON public.analytics_pipelines(workspace_id);
CREATE INDEX idx_analytics_anomalies_workspace ON public.analytics_anomalies(workspace_id);
CREATE INDEX idx_analytics_query_history_user ON public.analytics_query_history(user_id);