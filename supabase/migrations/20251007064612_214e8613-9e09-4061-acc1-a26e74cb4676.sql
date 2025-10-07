-- Add agent queue for async processing
CREATE TABLE IF NOT EXISTS public.agent_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  correlation_id UUID NOT NULL,
  priority INTEGER DEFAULT 100,
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add SLA awareness to model registry
ALTER TABLE public.model_registry ADD COLUMN IF NOT EXISTS target_sla_ms INTEGER DEFAULT 2000;

-- Add compensation logic to workflow definitions
ALTER TABLE public.workflow_definitions ADD COLUMN IF NOT EXISTS compensation_graph JSONB;

-- Create agent trace logs for partial progress
CREATE TABLE IF NOT EXISTS public.agent_trace_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  correlation_id UUID NOT NULL,
  step TEXT NOT NULL,
  input JSONB,
  output JSONB,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_agent_queue_status ON public.agent_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_agent_queue_correlation ON public.agent_queue(correlation_id);
CREATE INDEX IF NOT EXISTS idx_trace_logs_correlation ON public.agent_trace_logs(correlation_id);

-- Enable RLS
ALTER TABLE public.agent_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_trace_logs ENABLE ROW LEVEL SECURITY;

-- Policies for agent queue
CREATE POLICY "System can manage agent queue" ON public.agent_queue
FOR ALL USING (true);

CREATE POLICY "Admins view agent queue" ON public.agent_queue
FOR SELECT USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ml_ops'::app_role]));

-- Policies for trace logs
CREATE POLICY "System can create trace logs" ON public.agent_trace_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Ops view trace logs" ON public.agent_trace_logs
FOR SELECT USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role, 'ml_ops'::app_role]));

-- Update model registry with sample SLA data
UPDATE public.model_registry SET target_sla_ms = 1000 WHERE model_id LIKE '%flash%';
UPDATE public.model_registry SET target_sla_ms = 2000 WHERE model_id LIKE '%pro%';
UPDATE public.model_registry SET target_sla_ms = 500 WHERE model_id LIKE '%nano%';