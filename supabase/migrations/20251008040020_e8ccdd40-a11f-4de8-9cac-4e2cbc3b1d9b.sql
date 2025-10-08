-- Create staging and queue tables for robust seeding

-- Staging table for bulk imports
CREATE TABLE IF NOT EXISTS public.staging_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  wo_number TEXT,
  product_category TEXT,
  country TEXT,
  region TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  partner_hub TEXT,
  pin_code TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Seed queue for job tracking
CREATE TABLE IF NOT EXISTS public.seed_queue (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  seed_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'queued',
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  trace_id UUID,
  rows_processed BIGINT DEFAULT 0
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_staging_wo_tenant ON public.staging_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staging_wo_created ON public.staging_work_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_seed_queue_status ON public.seed_queue(status);
CREATE INDEX IF NOT EXISTS idx_seed_queue_tenant ON public.seed_queue(tenant_id);

-- RLS policies
ALTER TABLE public.staging_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System manages staging" ON public.staging_work_orders FOR ALL USING (true);
CREATE POLICY "System manages seed queue" ON public.seed_queue FOR ALL USING (true);

-- Update seed_info to track validation
ALTER TABLE public.seed_info ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'passed';
ALTER TABLE public.seed_info ADD COLUMN IF NOT EXISTS validation_notes JSONB DEFAULT '{}'::jsonb;