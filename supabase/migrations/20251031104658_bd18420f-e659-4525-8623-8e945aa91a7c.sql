-- Enforce business rule: Draft work orders cannot have parts reserved/assigned/consumed
-- Create validation function and trigger on public.work_orders

CREATE OR REPLACE FUNCTION public.validate_work_order_parts()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'draft' THEN
    IF COALESCE(NEW.part_status, 'not_required') <> 'not_required' THEN
      RAISE EXCEPTION 'Parts cannot be assigned or consumed when work order status is draft';
    END IF;
    IF COALESCE(NEW.parts_reserved, false) = true THEN
      RAISE EXCEPTION 'Parts cannot be reserved when work order status is draft';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_validate_work_order_parts ON public.work_orders;
CREATE TRIGGER trg_validate_work_order_parts
BEFORE INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_work_order_parts();