-- Enable INSERT/UPDATE/DELETE for inventory_items
CREATE POLICY "Admins can manage inventory"
ON public.inventory_items
FOR ALL
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['sys_admin', 'tenant_admin', 'ops_manager']::app_role[])
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['sys_admin', 'tenant_admin', 'ops_manager']::app_role[])
);

-- Enable INSERT/UPDATE for penalty_matrix
CREATE POLICY "Admins can manage penalty rules"
ON public.penalty_matrix
FOR ALL
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['sys_admin', 'tenant_admin', 'finance_manager']::app_role[])
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['sys_admin', 'tenant_admin', 'finance_manager']::app_role[])
);