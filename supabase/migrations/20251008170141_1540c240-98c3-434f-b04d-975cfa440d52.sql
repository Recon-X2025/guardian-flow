-- Create reporting tables
CREATE TABLE IF NOT EXISTS public.report_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  last_sent_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  tenant_id UUID,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  rows_count INTEGER,
  status TEXT NOT NULL,
  file_path TEXT,
  trace_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_user ON public.report_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_tenant ON public.report_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_tenant ON public.report_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_generated_at ON public.report_audit(generated_at);

-- Enable RLS
ALTER TABLE public.report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own subscriptions" ON public.report_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all report audits" ON public.report_audit
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role])
  );

-- Add trigger for updated_at
CREATE TRIGGER update_report_subscriptions_updated_at
  BEFORE UPDATE ON public.report_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();