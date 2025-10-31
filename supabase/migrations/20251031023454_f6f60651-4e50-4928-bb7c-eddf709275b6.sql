-- Add geo-tagging columns to work_orders
ALTER TABLE public.work_orders 
  ADD COLUMN IF NOT EXISTS check_in_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS check_in_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS check_in_address TEXT,
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS check_out_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS check_out_address TEXT,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS travel_distance_km DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS travel_duration_minutes INTEGER;

-- Create index for geo queries
CREATE INDEX IF NOT EXISTS idx_work_orders_location ON public.work_orders(check_in_latitude, check_in_longitude);

-- Add comment
COMMENT ON COLUMN public.work_orders.check_in_latitude IS 'Latitude when engineer checked in at customer location';
COMMENT ON COLUMN public.work_orders.check_in_longitude IS 'Longitude when engineer checked in at customer location';
COMMENT ON COLUMN public.work_orders.check_in_address IS 'Reverse geocoded address from check-in location';
COMMENT ON COLUMN public.work_orders.travel_distance_km IS 'Distance traveled to reach the site';
COMMENT ON COLUMN public.work_orders.travel_duration_minutes IS 'Time taken to reach the site';