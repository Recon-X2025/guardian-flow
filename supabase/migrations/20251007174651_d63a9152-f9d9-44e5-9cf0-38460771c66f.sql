-- Phase 1: Hierarchical Geography & Forecast Foundation

-- Create geography hierarchy table
CREATE TABLE IF NOT EXISTS public.geography_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  region text,
  state text,
  district text,
  city text,
  partner_hub text,
  pin_code text,
  geography_key text GENERATED ALWAYS AS (
    coalesce(pin_code, partner_hub, city, district, state, region, country)
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add geography and product columns to forecast_outputs
ALTER TABLE public.forecast_outputs 
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS partner_hub text,
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS geography_level text,
  ADD COLUMN IF NOT EXISTS geography_key text;

-- Add model_key to forecast_models for hierarchical identification
ALTER TABLE public.forecast_models
  ADD COLUMN IF NOT EXISTS hierarchy_level text,
  ADD COLUMN IF NOT EXISTS product_scope text;

-- Create optimized index for hierarchical forecast lookups
CREATE INDEX IF NOT EXISTS idx_forecast_hierarchical_lookup 
  ON public.forecast_outputs(tenant_id, product_id, geography_level, geography_key, forecast_type, target_date);

-- Create index on geography_key for joins
CREATE INDEX IF NOT EXISTS idx_geography_key 
  ON public.geography_hierarchy(geography_key);

-- Enable RLS on geography_hierarchy
ALTER TABLE public.geography_hierarchy ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view geography hierarchy
CREATE POLICY "All authenticated view geography"
  ON public.geography_hierarchy
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Admins can manage geography hierarchy
CREATE POLICY "Admins manage geography"
  ON public.geography_hierarchy
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));