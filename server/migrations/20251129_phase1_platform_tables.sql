-- Phase 1 Platform Transformation - Missing Tables Migration
-- Creates 19 tables needed for platform features
-- Generated: 2025-11-29

-- ============================================
-- 1. WORKFLOW TEMPLATES & EXECUTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT NOT NULL,
  workflow_definition JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS workflow_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  workflow_definition JSONB NOT NULL,
  change_description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  tenant_id UUID,
  entity_id UUID, -- work_order_id, ticket_id, etc.
  entity_type TEXT NOT NULL,
  current_state TEXT NOT NULL,
  execution_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- 2. DEVELOPER PORTAL & API MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS developer_portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'trial',
  api_quota_limit INTEGER DEFAULT 10000,
  api_quota_used INTEGER DEFAULT 0,
  trial_ends_at TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_account_id UUID REFERENCES developer_portal_accounts(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL, -- First 8 chars for display
  permissions JSONB DEFAULT '[]',
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(api_key_hash)
);

CREATE TABLE IF NOT EXISTS api_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_account_id UUID REFERENCES developer_portal_accounts(id),
  api_key_id UUID REFERENCES partner_api_keys(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  tenant_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS developer_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_account_id UUID REFERENCES developer_portal_accounts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES developer_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. FEDERATED LEARNING & ML OPS
-- ============================================

CREATE TABLE IF NOT EXISTS federated_learning_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  tenant_id UUID,
  model_metadata JSONB DEFAULT '{}',
  training_status TEXT DEFAULT 'pending',
  accuracy_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_name, model_version)
);

CREATE TABLE IF NOT EXISTS federated_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES federated_learning_models(id),
  job_status TEXT NOT NULL DEFAULT 'queued',
  participating_tenants UUID[],
  training_config JSONB NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: model_performance_metrics already exists in migration 20251031052721

-- ============================================
-- 4. COMPLIANCE & AUDIT
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL,
  policy_type TEXT NOT NULL, -- 'HIPAA', 'SOC2', 'ISO27001', etc.
  policy_rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_audit_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES compliance_policies(id),
  tenant_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  compliance_status TEXT NOT NULL, -- 'compliant', 'violation', 'warning'
  violation_details JSONB,
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- ============================================
-- 5. MARKETPLACE (some tables may already exist)
-- ============================================

-- Note: marketplace_extensions, extension_installations, marketplace_transactions
-- already exist in migration 20251031052721, but adding if not exists

CREATE TABLE IF NOT EXISTS marketplace_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID,
  metric_type TEXT NOT NULL, -- 'view', 'install', 'uninstall', 'rating'
  metric_value NUMERIC,
  tenant_id UUID,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. PLATFORM CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS platform_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL, -- 'system', 'tenant', 'feature_flag'
  tenant_id UUID,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workflow_templates_industry ON workflow_templates(industry, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_entity ON workflow_executions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status, started_at);

CREATE INDEX IF NOT EXISTS idx_developer_accounts_user ON developer_portal_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_account ON partner_api_keys(developer_account_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_account ON api_usage_analytics(developer_account_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_webhooks_account ON developer_webhooks(developer_account_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_federated_models_status ON federated_learning_models(training_status);
CREATE INDEX IF NOT EXISTS idx_federated_jobs_status ON federated_training_jobs(job_status, created_at);

CREATE INDEX IF NOT EXISTS idx_compliance_policies_type ON compliance_policies(policy_type, is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity ON compliance_audit_trails(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_status ON compliance_audit_trails(compliance_status, detected_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_extension ON marketplace_analytics(extension_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_platform_config_key ON platform_configurations(config_key);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_templates_updated_at 
  BEFORE UPDATE ON workflow_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_developer_accounts_updated_at 
  BEFORE UPDATE ON developer_portal_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_api_keys_updated_at 
  BEFORE UPDATE ON partner_api_keys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_developer_webhooks_updated_at 
  BEFORE UPDATE ON developer_webhooks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_federated_models_updated_at 
  BEFORE UPDATE ON federated_learning_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_policies_updated_at 
  BEFORE UPDATE ON compliance_policies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_config_updated_at 
  BEFORE UPDATE ON platform_configurations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

