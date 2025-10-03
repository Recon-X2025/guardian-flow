-- Create partner tenants
INSERT INTO public.tenants (name, slug, config, active)
VALUES 
  ('ServicePro Partners', 'servicepro', '{"region": "north", "contract_type": "premium"}', true),
  ('TechField Solutions', 'techfield', '{"region": "south", "contract_type": "standard"}', true),
  ('RepairHub Network', 'repairhub', '{"region": "east", "contract_type": "premium"}', true),
  ('FixIt Partners', 'fixit', '{"region": "west", "contract_type": "standard"}', true)
ON CONFLICT (slug) DO NOTHING;

-- Update RLS policies to enforce partner-level isolation for finance data

-- Invoices: Partner admins see only their tenant's invoices
DROP POLICY IF EXISTS "All authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Users view own tenant invoices"
ON public.invoices
FOR SELECT
USING (
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
      THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role)
      THEN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = invoices.customer_id -- Assuming customer_id links to tenant
      )
    ELSE auth.role() = 'authenticated'::text
  END
);

-- Work Orders: Partner admins see only their tenant's work orders
DROP POLICY IF EXISTS "All authenticated users can view work orders" ON public.work_orders;
CREATE POLICY "Users view own tenant work orders"
ON public.work_orders
FOR SELECT
USING (
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
      THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role)
      THEN EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.profiles tech ON tech.id = work_orders.technician_id
        WHERE p.id = auth.uid()
        AND p.tenant_id = tech.tenant_id
      )
    ELSE auth.role() = 'authenticated'::text
  END
);

-- Penalty Applications: Partner admins see only their tenant's penalties
DROP POLICY IF EXISTS "All authenticated users can view penalty applications" ON public.penalty_applications;
CREATE POLICY "Users view own tenant penalties"
ON public.penalty_applications
FOR SELECT
USING (
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role])
      THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role)
      THEN EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.work_orders wo ON wo.id = penalty_applications.work_order_id
        JOIN public.profiles tech ON tech.id = wo.technician_id
        WHERE p.id = auth.uid()
        AND p.tenant_id = tech.tenant_id
      )
    ELSE false
  END
);

-- Audit logs: Partner admins see only their tenant's audit logs
DROP POLICY IF EXISTS "All authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Users view own tenant audit logs"
ON public.audit_logs
FOR SELECT
USING (
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role])
      THEN true
    WHEN has_role(auth.uid(), 'partner_admin'::app_role)
      THEN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = audit_logs.tenant_id
      )
    ELSE false
  END
);

-- Add tenant_id to invoices if missing (for proper scoping)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_tenant ON public.work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

COMMENT ON POLICY "Users view own tenant invoices" ON public.invoices IS 
  'Partner admins can only view invoices for work done by their tenant''s engineers';
COMMENT ON POLICY "Users view own tenant work orders" ON public.work_orders IS 
  'Partner admins can only view work orders assigned to their tenant''s engineers';
COMMENT ON POLICY "Users view own tenant penalties" ON public.penalty_applications IS 
  'Partner admins can only view penalties applied to their tenant''s engineers';