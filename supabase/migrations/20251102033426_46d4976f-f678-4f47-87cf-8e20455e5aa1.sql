-- Add module context to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS module_context TEXT DEFAULT 'platform';

-- Create index for module context queries
CREATE INDEX IF NOT EXISTS idx_tenants_module_context ON public.tenants(module_context);

-- Create sandbox_tenants tracking table if not exists
CREATE TABLE IF NOT EXISTS public.sandbox_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  module_context TEXT NOT NULL DEFAULT 'platform',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, module_context)
);

-- Enable RLS on sandbox_tenants
ALTER TABLE public.sandbox_tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sandbox tenants
CREATE POLICY "Users can view own sandbox tenants"
ON public.sandbox_tenants
FOR SELECT
TO authenticated
USING (email = auth.jwt()->>'email');

-- Add module_context to profiles for tracking user's current module
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_module_context TEXT DEFAULT 'platform';

-- Create module_data_sources table for tracking ingested data
CREATE TABLE IF NOT EXISTS public.module_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  module_context TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'api', 'csv', 'demo', 'manual'
  source_name TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  ingested_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on module_data_sources
ALTER TABLE public.module_data_sources ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view data sources for their tenant
CREATE POLICY "Users can view tenant data sources"
ON public.module_data_sources
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Policy: Admins can insert data sources
CREATE POLICY "Admins can insert data sources"
ON public.module_data_sources
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['sys_admin', 'tenant_admin', 'partner_admin']::app_role[])
  AND tenant_id = get_user_tenant_id(auth.uid())
);

COMMENT ON TABLE public.sandbox_tenants IS 'Tracks module-specific sandbox environments with automatic expiry';
COMMENT ON TABLE public.module_data_sources IS 'Tracks data ingestion sources per module for audit and management';
COMMENT ON COLUMN public.tenants.module_context IS 'Module context: platform, fsm, asset, fraud, analytics, training, marketplace, customer';
COMMENT ON COLUMN public.profiles.current_module_context IS 'Current active module context for the user session';