-- Fix can_release column to be a generated column based on precheck results
-- Drop the column first to recreate it properly
ALTER TABLE work_order_prechecks DROP COLUMN IF EXISTS can_release;

-- Add can_release as a generated column
ALTER TABLE work_order_prechecks 
ADD COLUMN can_release boolean GENERATED ALWAYS AS (
  inventory_status = 'passed' 
  AND warranty_status = 'passed' 
  AND photo_status = 'passed'
) STORED;