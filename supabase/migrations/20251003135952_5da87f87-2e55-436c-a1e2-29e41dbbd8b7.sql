-- Add repair_type field to work_orders to track warranty-based assignment
ALTER TABLE work_orders 
ADD COLUMN repair_type TEXT CHECK (repair_type IN ('in_warranty', 'out_of_warranty'));

-- Update release-work-order logic will set this based on warranty_checked and warranty_result