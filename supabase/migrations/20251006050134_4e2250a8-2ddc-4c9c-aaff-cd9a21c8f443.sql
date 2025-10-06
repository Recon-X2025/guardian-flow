-- Add wo.update permission for technicians
INSERT INTO role_permissions (role, permission_id)
SELECT 'technician'::app_role, id 
FROM permissions 
WHERE name = 'wo.update'
ON CONFLICT DO NOTHING;

-- Add part_status enum type with proper lifecycle states
DO $$ BEGIN
  CREATE TYPE part_status AS ENUM (
    'not_required',
    'reserved',
    'issued',
    'received',
    'consumed',
    'unutilized',
    'buffer_consumption',
    'buffer_consumed_replacement_requested'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add part_status column to work_orders if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'part_status'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN part_status part_status DEFAULT 'not_required';
  END IF;
END $$;

-- Add part_notes column for tracking part movement details
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'part_notes'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN part_notes TEXT;
  END IF;
END $$;

-- Update existing completed work orders with parts_reserved=true to show consumed status
UPDATE work_orders 
SET part_status = 'consumed' 
WHERE status = 'completed' AND parts_reserved = true;

-- Update existing in_progress work orders with parts_reserved=true to show reserved status
UPDATE work_orders 
SET part_status = 'reserved' 
WHERE status != 'completed' AND parts_reserved = true;

-- Create function to validate part status transitions
CREATE OR REPLACE FUNCTION validate_part_status_transition()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for part status validation
DROP TRIGGER IF EXISTS validate_part_status ON work_orders;
CREATE TRIGGER validate_part_status
  BEFORE UPDATE OF part_status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_part_status_transition();