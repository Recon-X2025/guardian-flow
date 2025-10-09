-- Phase 1: API Infrastructure Tables

-- Tenant API Keys table
CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- API Usage Logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  api_key_id UUID REFERENCES public.tenant_api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_size INTEGER,
  response_time INTEGER,
  status_code INTEGER NOT NULL,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  correlation_id UUID
);

-- API Overage Logs table
CREATE TABLE IF NOT EXISTS public.api_overage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  api_key_id UUID REFERENCES public.tenant_api_keys(id) ON DELETE SET NULL,
  daily_limit INTEGER NOT NULL,
  actual_usage INTEGER NOT NULL,
  overage_count INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Billing Usage table
CREATE TABLE IF NOT EXISTS public.billing_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  api_calls INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start DATE NOT NULL,
  billing_cycle_end DATE NOT NULL,
  rate_per_call NUMERIC(10,2) NOT NULL DEFAULT 0.25,
  amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  stripe_invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sandbox Tenants table
CREATE TABLE IF NOT EXISTS public.sandbox_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_overage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_api_keys
CREATE POLICY "Tenant admins manage API keys"
ON public.tenant_api_keys
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.tenant_id = tenant_api_keys.tenant_id
    AND ur.role IN ('tenant_admin', 'sys_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.tenant_id = tenant_api_keys.tenant_id
    AND ur.role IN ('tenant_admin', 'sys_admin')
  )
);

-- RLS Policies for api_usage_logs
CREATE POLICY "Tenant admins view usage logs"
ON public.api_usage_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.tenant_id = api_usage_logs.tenant_id
    AND ur.role IN ('tenant_admin', 'sys_admin', 'partner_admin')
  )
);

CREATE POLICY "System can insert usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for api_overage_logs
CREATE POLICY "Tenant admins view overage logs"
ON public.api_overage_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.tenant_id = api_overage_logs.tenant_id
    AND ur.role IN ('tenant_admin', 'sys_admin')
  )
);

CREATE POLICY "System can insert overage logs"
ON public.api_overage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for billing_usage
CREATE POLICY "Tenant admins view billing"
ON public.billing_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.tenant_id = billing_usage.tenant_id
    AND ur.role IN ('tenant_admin', 'sys_admin', 'finance_manager')
  )
);

CREATE POLICY "System manages billing"
ON public.billing_usage
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'sys_admin'))
WITH CHECK (has_role(auth.uid(), 'sys_admin'));

-- RLS Policies for sandbox_tenants
CREATE POLICY "Users view own sandbox"
ON public.sandbox_tenants
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'sys_admin'));

CREATE POLICY "System creates sandbox"
ON public.sandbox_tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_api_usage_tenant ON public.api_usage_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_api_usage_endpoint ON public.api_usage_logs(endpoint, timestamp DESC);
CREATE INDEX idx_api_keys_tenant ON public.tenant_api_keys(tenant_id, status);
CREATE INDEX idx_api_keys_key ON public.tenant_api_keys(api_key) WHERE status = 'active';
CREATE INDEX idx_billing_tenant_cycle ON public.billing_usage(tenant_id, billing_cycle_start, billing_cycle_end);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_api_keys_updated_at
BEFORE UPDATE ON public.tenant_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_usage_updated_at
BEFORE UPDATE ON public.billing_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();