-- ============================================
-- RECON-X v3.0 ADAPTIVE ARCHITECTURE TABLES
-- ============================================

-- 1. System Configuration (stores db_mode detection)
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default db_mode (will be detected on first run)
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('db_mode', '"RESTRICTED_DB"', 'Database capability mode: SUPABASE_FULL or RESTRICTED_DB'),
  ('vector_enabled', 'false', 'Whether pgvector extension is available'),
  ('autonomy_index_target', '0.60', 'Target percentage of agent-executed workflows');

-- 2. Policy Registry (Policy-as-Code)
CREATE TABLE IF NOT EXISTS policy_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL, -- 'security', 'finance', 'operations', 'governance'
  policy_type text NOT NULL, -- 'rbac', 'rate_limit', 'approval_required', 'cost_cap'
  conditions jsonb NOT NULL, -- { "operator": "AND", "rules": [...] }
  actions jsonb NOT NULL, -- { "allow": true, "require_mfa": false, "notify": [] }
  priority integer DEFAULT 100,
  active boolean DEFAULT true,
  tenant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default security policies
INSERT INTO policy_registry (policy_id, name, category, policy_type, conditions, actions, priority) VALUES
  ('sec_001', 'High-Value Transaction MFA', 'security', 'approval_required', 
   '{"operator": "AND", "rules": [{"field": "transaction_amount", "operator": ">", "value": 10000}]}',
   '{"allow": true, "require_mfa": true, "notify": ["finance_manager"]}', 10),
  ('sec_002', 'Agent Cost Cap', 'governance', 'cost_cap',
   '{"operator": "AND", "rules": [{"field": "agent_daily_cost", "operator": ">", "value": 1000}]}',
   '{"allow": false, "suspend_agent": true, "notify": ["sys_admin"]}', 5),
  ('ops_001', 'Auto-Release Authorization', 'operations', 'rbac',
   '{"operator": "AND", "rules": [{"field": "precheck_status", "operator": "=", "value": "passed"}]}',
   '{"allow": true, "auto_execute": true}', 50);

-- 3. Workflow Definitions (declarative workflow graphs)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  version integer DEFAULT 1,
  graph jsonb NOT NULL, -- { "nodes": [], "edges": [] }
  trigger_events text[], -- ['work_order_created', 'sla_violation']
  input_schema jsonb,
  output_schema jsonb,
  timeout_seconds integer DEFAULT 300,
  retry_policy jsonb DEFAULT '{"max_attempts": 3, "backoff": "exponential"}',
  active boolean DEFAULT true,
  tenant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default workflows
INSERT INTO workflow_definitions (workflow_id, name, description, graph, trigger_events) VALUES
  ('wf_precheck', 'Work Order Pre-Check', 'Orchestrates photo validation, warranty check, and inventory check',
   '{"nodes": [{"id": "photo_val", "type": "tool", "tool": "validate-photos"}, {"id": "warranty", "type": "tool", "tool": "check-warranty"}, {"id": "inventory", "type": "tool", "tool": "check-inventory"}, {"id": "decision", "type": "decision", "conditions": {"all_passed": true}}], "edges": [{"from": "start", "to": "photo_val"}, {"from": "start", "to": "warranty"}, {"from": "start", "to": "inventory"}, {"from": "photo_val", "to": "decision"}, {"from": "warranty", "to": "decision"}, {"from": "inventory", "to": "decision"}]}',
   ARRAY['work_order_created']),
  ('wf_fraud_detect', 'Fraud Detection Pipeline', 'Analyzes work order patterns for fraud indicators',
   '{"nodes": [{"id": "pattern_check", "type": "tool", "tool": "fraud-pattern-analysis"}, {"id": "anomaly", "type": "tool", "tool": "anomaly-detection"}, {"id": "alert", "type": "action", "action": "create_fraud_alert"}], "edges": [{"from": "start", "to": "pattern_check"}, {"from": "start", "to": "anomaly"}, {"from": "pattern_check", "to": "alert", "condition": "score > 0.7"}, {"from": "anomaly", "to": "alert", "condition": "detected"}]}',
   ARRAY['work_order_completed']),
  ('wf_invoice_gen', 'Auto-Invoice Generation', 'Generates and reconciles invoices with penalty calculations',
   '{"nodes": [{"id": "calc_cost", "type": "tool", "tool": "calculate-cost"}, {"id": "penalties", "type": "tool", "tool": "calculate-penalties"}, {"id": "create_inv", "type": "tool", "tool": "create-invoice"}], "edges": [{"from": "start", "to": "calc_cost"}, {"from": "calc_cost", "to": "penalties"}, {"from": "penalties", "to": "create_inv"}]}',
   ARRAY['work_order_completed']);

-- 4. Workflow Runtime (execution state tracking)
CREATE TABLE IF NOT EXISTS workflow_runtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id text NOT NULL REFERENCES workflow_definitions(workflow_id),
  execution_id text UNIQUE NOT NULL,
  agent_id text,
  current_node text,
  state jsonb DEFAULT '{}',
  status text DEFAULT 'running', -- 'running', 'completed', 'failed', 'suspended'
  input_data jsonb,
  output_data jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  correlation_id uuid,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_workflow_runtime_status ON workflow_runtime(status);
CREATE INDEX idx_workflow_runtime_agent ON workflow_runtime(agent_id);
CREATE INDEX idx_workflow_runtime_correlation ON workflow_runtime(correlation_id);

-- 5. Model Registry (AI model tracking and selection)
CREATE TABLE IF NOT EXISTS model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text UNIQUE NOT NULL,
  provider text NOT NULL, -- 'lovable_ai', 'openai', 'anthropic'
  model_name text NOT NULL, -- 'google/gemini-2.5-flash', 'gpt-4'
  capabilities text[], -- ['text', 'vision', 'reasoning', 'structured_output']
  task_types text[], -- ['classification', 'generation', 'analysis']
  avg_latency_ms integer,
  avg_cost_per_1k_tokens numeric(10, 4),
  accuracy_score numeric(3, 2), -- 0.00 to 1.00
  usage_count integer DEFAULT 0,
  success_rate numeric(5, 2),
  active boolean DEFAULT true,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Register Lovable AI models
INSERT INTO model_registry (model_id, provider, model_name, capabilities, task_types, avg_cost_per_1k_tokens, active) VALUES
  ('gemini-2.5-flash', 'lovable_ai', 'google/gemini-2.5-flash', 
   ARRAY['text', 'vision', 'reasoning'], ARRAY['classification', 'generation', 'analysis'], 0.002, true),
  ('gemini-2.5-pro', 'lovable_ai', 'google/gemini-2.5-pro',
   ARRAY['text', 'vision', 'reasoning', 'complex_reasoning'], ARRAY['analysis', 'generation'], 0.008, true),
  ('gpt-5-mini', 'lovable_ai', 'openai/gpt-5-mini',
   ARRAY['text', 'vision', 'reasoning'], ARRAY['classification', 'generation', 'analysis'], 0.003, true);

-- 6. Feature Toggles (for gradual agent rollouts)
CREATE TABLE IF NOT EXISTS feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0, -- 0-100
  tenant_allowlist uuid[],
  tenant_blocklist uuid[],
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Initial feature flags
INSERT INTO feature_toggles (feature_key, name, description, enabled, rollout_percentage) VALUES
  ('agent_ops_autonomous', 'Ops Agent Autonomous Mode', 'Allow ops agent to auto-release work orders', false, 0),
  ('agent_fraud_realtime', 'Fraud Agent Real-Time', 'Enable real-time fraud detection', true, 100),
  ('agent_finance_auto_invoice', 'Finance Agent Auto-Invoice', 'Automatically generate and send invoices', false, 25),
  ('agent_governance_auto_suspend', 'Governance Auto-Suspend', 'Auto-suspend agents on policy violations', true, 100),
  ('vector_memory_enabled', 'Vector Memory', 'Use vector embeddings for agent memory', false, 0);

-- 7. Events Log (universal event stream)
CREATE TABLE IF NOT EXISTS events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  agent_id text,
  user_id uuid,
  tenant_id uuid,
  payload jsonb NOT NULL,
  correlation_id uuid,
  trace_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_type ON events_log(event_type);
CREATE INDEX idx_events_entity ON events_log(entity_type, entity_id);
CREATE INDEX idx_events_agent ON events_log(agent_id);
CREATE INDEX idx_events_correlation ON events_log(correlation_id);
CREATE INDEX idx_events_created ON events_log(created_at DESC);

-- 8. Agent Memory Pointers (for external vector stores)
CREATE TABLE IF NOT EXISTS agent_memory_pointers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  memory_type text NOT NULL, -- 'episodic', 'semantic', 'procedural'
  external_id text, -- ID in external vector store (Pinecone/Weaviate)
  summary text,
  importance_score numeric(3, 2),
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_memory_pointers_agent ON agent_memory_pointers(agent_id);
CREATE INDEX idx_memory_pointers_type ON agent_memory_pointers(memory_type);

-- 9. Agent Policies (link agents to policies)
CREATE TABLE IF NOT EXISTS agent_policy_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  policy_id text NOT NULL REFERENCES policy_registry(policy_id),
  priority integer DEFAULT 100,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_policies ON agent_policy_bindings(agent_id);

-- Bind default policies to agents
INSERT INTO agent_policy_bindings (agent_id, policy_id, priority) VALUES
  ('ops_agent', 'ops_001', 10),
  ('fraud_agent', 'sec_002', 5),
  ('finance_agent', 'sec_001', 10),
  ('finance_agent', 'sec_002', 5);

-- 10. Observability Traces (OpenTelemetry-style tracing)
CREATE TABLE IF NOT EXISTS observability_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid NOT NULL,
  span_id uuid NOT NULL,
  parent_span_id uuid,
  operation_name text NOT NULL,
  agent_id text,
  service_name text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_ms integer,
  status text, -- 'ok', 'error'
  attributes jsonb,
  events jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_traces_trace_id ON observability_traces(trace_id);
CREATE INDEX idx_traces_agent ON observability_traces(agent_id);
CREATE INDEX idx_traces_start_time ON observability_traces(start_time DESC);

-- Enable RLS on all new tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_pointers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_policy_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability_traces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for v3.0 tables

-- System Config: Only admins can view/modify
CREATE POLICY "Admins manage system config"
  ON system_config FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

-- Policy Registry: Admins manage, all authenticated can view
CREATE POLICY "All authenticated view policies"
  ON policy_registry FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage policies"
  ON policy_registry FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

-- Workflow Definitions: Similar to policies
CREATE POLICY "All authenticated view workflows"
  ON workflow_definitions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage workflows"
  ON workflow_definitions FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role]));

-- Workflow Runtime: Authenticated can view, system/agents can manage
CREATE POLICY "Authenticated view workflow runtime"
  ON workflow_runtime FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System manage workflow runtime"
  ON workflow_runtime FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'ml_ops'::app_role]));

-- Model Registry: All can view, admins manage
CREATE POLICY "All authenticated view models"
  ON model_registry FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage models"
  ON model_registry FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'ml_ops'::app_role]));

-- Feature Toggles: All can view, admins manage
CREATE POLICY "All authenticated view features"
  ON feature_toggles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage features"
  ON feature_toggles FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

-- Events Log: Tenant-scoped viewing
CREATE POLICY "Users view tenant events"
  ON events_log FOR SELECT
  USING (
    CASE
      WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'auditor'::app_role]) THEN true
      WHEN has_role(auth.uid(), 'tenant_admin'::app_role) THEN 
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      ELSE false
    END
  );

CREATE POLICY "System create events"
  ON events_log FOR INSERT
  WITH CHECK (true); -- Events can be created by anyone (will be secured in application layer)

-- Agent Memory Pointers: Agent-scoped access
CREATE POLICY "Agents access own memory"
  ON agent_memory_pointers FOR ALL
  USING (auth.role() = 'authenticated');

-- Agent Policy Bindings: All can view, admins manage
CREATE POLICY "All authenticated view agent policies"
  ON agent_policy_bindings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage agent policies"
  ON agent_policy_bindings FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

-- Observability Traces: Admins and ops view
CREATE POLICY "Ops view traces"
  ON observability_traces FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role, 'ml_ops'::app_role]));

CREATE POLICY "System create traces"
  ON observability_traces FOR INSERT
  WITH CHECK (true);

-- Update triggers for updated_at
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policy_registry_updated_at BEFORE UPDATE ON policy_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_registry_updated_at BEFORE UPDATE ON model_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_toggles_updated_at BEFORE UPDATE ON feature_toggles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();