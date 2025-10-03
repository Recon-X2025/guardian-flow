-- Fix search path for generate_wo_number function
CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'WO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0')
  INTO new_number
  FROM public.work_orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  RETURN new_number;
END;
$$;