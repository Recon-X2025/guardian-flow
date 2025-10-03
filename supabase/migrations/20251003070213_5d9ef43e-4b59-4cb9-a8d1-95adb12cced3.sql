-- Drop the constraint if it exists (using IF EXISTS to avoid errors)
ALTER TABLE public.work_orders 
DROP CONSTRAINT IF EXISTS work_orders_technician_id_fkey;

-- Add the foreign key constraint
ALTER TABLE public.work_orders 
ADD CONSTRAINT work_orders_technician_id_fkey 
FOREIGN KEY (technician_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';