-- Phase 2: Add geography and product fields to work_orders

ALTER TABLE public.work_orders 
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS partner_hub text,
  ADD COLUMN IF NOT EXISTS pin_code text;

-- Create index for geography-based queries
CREATE INDEX IF NOT EXISTS idx_work_orders_geography 
  ON public.work_orders(country, region, state, city, partner_hub, pin_code);

-- Create products table for product-level forecasting
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  sku text UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view products
CREATE POLICY "All authenticated view products"
  ON public.products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Admins can manage products
CREATE POLICY "Admins manage products"
  ON public.products
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));