-- Verify and update work_orders RLS policy to ensure proper access
-- Drop existing policy and recreate with explicit logic
DROP POLICY IF EXISTS "Users view own tenant work orders" ON public.work_orders;

CREATE POLICY "Users view own tenant work orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (
  -- sys_admin and tenant_admin can see ALL work orders
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
  OR
  -- partner_admin can see work orders where technician is in their tenant
  (
    has_role(auth.uid(), 'partner_admin'::app_role) 
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN profiles tech ON tech.id = work_orders.technician_id
      WHERE p.id = auth.uid() AND p.tenant_id = tech.tenant_id
    )
  )
  OR
  -- Technicians can see their own work orders
  (
    has_role(auth.uid(), 'technician'::app_role)
    AND technician_id = auth.uid()
  )
  OR
  -- Other authenticated users (ops_manager, dispatcher, etc.) can see all
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'dispatcher'::app_role])
);