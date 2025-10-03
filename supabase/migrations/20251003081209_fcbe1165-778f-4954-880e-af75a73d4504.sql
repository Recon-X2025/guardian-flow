-- Enable INSERT permissions for tickets and work orders
CREATE POLICY "Users can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update tickets"
ON public.tickets
FOR UPDATE
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'dispatcher'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

CREATE POLICY "Users can update work orders"
ON public.work_orders
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'dispatcher'::app_role, 'technician'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
  OR auth.uid() = technician_id
);

-- Enable INSERT for prechecks
CREATE POLICY "Users can create prechecks"
ON public.work_order_prechecks
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'dispatcher'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

CREATE POLICY "Users can update prechecks"
ON public.work_order_prechecks
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

-- Enable INSERT for service orders
CREATE POLICY "Users can create service orders"
ON public.service_orders
FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

-- Enable INSERT for invoices
CREATE POLICY "Users can create invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['finance_manager'::app_role, 'billing_agent'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

CREATE POLICY "Users can update invoices"
ON public.invoices
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['finance_manager'::app_role, 'billing_agent'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

-- Enable INSERT for attachments (photo uploads)
CREATE POLICY "Users can upload attachments"
ON public.attachments
FOR INSERT
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can update own attachments"
ON public.attachments
FOR UPDATE
USING (auth.uid() = uploader_id);

-- Enable INSERT for photo validations
CREATE POLICY "Users can create photo validations"
ON public.photo_validations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

-- Enable INSERT for fraud alerts (for ML system)
CREATE POLICY "System can create fraud alerts"
ON public.fraud_alerts
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ml_ops'::app_role, 'sys_admin'::app_role])
);

CREATE POLICY "Investigators can update fraud alerts"
ON public.fraud_alerts
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['fraud_investigator'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role])
);

-- Enable INSERT for SaPOS offers
CREATE POLICY "Users can create sapos offers"
ON public.sapos_offers
FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update sapos offers"
ON public.sapos_offers
FOR UPDATE
USING (auth.role() = 'authenticated'::text);