-- Create analytics exports tracking table
CREATE TABLE IF NOT EXISTS public.analytics_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  dataset TEXT NOT NULL,
  format TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  correlation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_exports_tenant ON public.analytics_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_exports_created ON public.analytics_exports(created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_exports ENABLE ROW LEVEL SECURITY;

-- Policy: Users view own tenant exports
CREATE POLICY "Users view tenant analytics exports"
  ON public.analytics_exports
  FOR SELECT
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) OR
    has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
  );

-- Policy: System inserts exports
CREATE POLICY "System insert analytics exports"
  ON public.analytics_exports
  FOR INSERT
  WITH CHECK (true);

-- Create applied_penalties table for penalty automation
CREATE TABLE IF NOT EXISTS public.applied_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_code TEXT NOT NULL,
  work_order_id UUID,
  technician_id UUID,
  severity_level TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  penalty_percentage NUMERIC NOT NULL,
  penalty_amount NUMERIC NOT NULL,
  auto_applied BOOLEAN DEFAULT false,
  dispute_allowed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'applied',
  disputed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_applied_penalties_work_order ON public.applied_penalties(work_order_id);
CREATE INDEX IF NOT EXISTS idx_applied_penalties_technician ON public.applied_penalties(technician_id);
CREATE INDEX IF NOT EXISTS idx_applied_penalties_status ON public.applied_penalties(status);

-- Enable RLS
ALTER TABLE public.applied_penalties ENABLE ROW LEVEL SECURITY;

-- Policy: Admins manage penalties
CREATE POLICY "Admins manage applied penalties"
  ON public.applied_penalties
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role]));

-- Policy: Technicians view own penalties
CREATE POLICY "Technicians view own penalties"
  ON public.applied_penalties
  FOR SELECT
  USING (auth.uid() = technician_id);