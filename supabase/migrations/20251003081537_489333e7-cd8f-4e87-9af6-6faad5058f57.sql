-- Enable quotes CRUD permissions
CREATE POLICY "Users can create quotes"
ON public.quotes
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'partner_admin'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

CREATE POLICY "Users can update quotes"
ON public.quotes
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'partner_admin'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);