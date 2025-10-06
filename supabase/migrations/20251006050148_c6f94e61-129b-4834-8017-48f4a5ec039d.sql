-- Fix search_path for part status validation function
CREATE OR REPLACE FUNCTION validate_part_status_transition()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow any transition if old status is NULL or 'not_required'
  IF OLD.part_status IS NULL OR OLD.part_status = 'not_required' THEN
    RETURN NEW;
  END IF;

  -- Validate logical transitions
  IF OLD.part_status = 'reserved' AND NEW.part_status NOT IN ('issued', 'received', 'unutilized') THEN
    RAISE EXCEPTION 'Invalid transition from reserved to %', NEW.part_status;
  END IF;

  IF OLD.part_status = 'issued' AND NEW.part_status NOT IN ('received', 'consumed') THEN
    RAISE EXCEPTION 'Invalid transition from issued to %', NEW.part_status;
  END IF;

  IF OLD.part_status = 'received' AND NEW.part_status NOT IN ('consumed', 'unutilized') THEN
    RAISE EXCEPTION 'Invalid transition from received to %', NEW.part_status;
  END IF;

  IF OLD.part_status = 'buffer_consumption' AND NEW.part_status != 'buffer_consumed_replacement_requested' THEN
    RAISE EXCEPTION 'Invalid transition from buffer_consumption to %', NEW.part_status;
  END IF;

  RETURN NEW;
END;
$$;