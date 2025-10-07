-- Create seed_info table to track data seeding
CREATE TABLE IF NOT EXISTS public.seed_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  seed_type TEXT NOT NULL,
  total_records INTEGER NOT NULL,
  months_covered INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  product_splits JSONB NOT NULL,
  geography_coverage JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seed_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins view seed info"
ON public.seed_info FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ml_ops'::app_role])
);

CREATE POLICY "System creates seed info"
ON public.seed_info FOR INSERT
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_seed_info_tenant_id ON public.seed_info(tenant_id);
CREATE INDEX idx_seed_info_created_at ON public.seed_info(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_seed_info_updated_at
BEFORE UPDATE ON public.seed_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();