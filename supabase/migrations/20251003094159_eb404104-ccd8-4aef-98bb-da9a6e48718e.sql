-- Add missing permissions if they don't exist and map them to appropriate roles
-- 1) Ensure permissions exist
INSERT INTO public.permissions (name, category, description)
SELECT 'service_orders.generate', 'service_orders', 'Generate service order documents'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'service_orders.generate');

INSERT INTO public.permissions (name, category, description)
SELECT 'sapos.generate', 'sapos', 'Generate SaPOS offers with AI'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'sapos.generate');

INSERT INTO public.permissions (name, category, description)
SELECT 'photos.validate', 'photos', 'Validate required work order photos'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'photos.validate');

-- 2) Map permissions to roles if not already mapped
-- Helper CTE to get permission ids
WITH p AS (
  SELECT id, name FROM public.permissions WHERE name IN (
    'service_orders.generate', 'sapos.generate', 'photos.validate'
  )
)
-- service_orders.generate -> sys_admin, tenant_admin, ops_manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.role, p.id
FROM p
JOIN (
  SELECT 'sys_admin'::app_role AS role UNION ALL
  SELECT 'tenant_admin'::app_role UNION ALL
  SELECT 'ops_manager'::app_role
) r ON p.name = 'service_orders.generate'
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role = r.role AND rp.permission_id = p.id
);

-- sapos.generate -> sys_admin, tenant_admin, ops_manager, partner_admin
WITH p AS (
  SELECT id FROM public.permissions WHERE name = 'sapos.generate'
)
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.role, p.id
FROM p, (
  SELECT 'sys_admin'::app_role AS role UNION ALL
  SELECT 'tenant_admin'::app_role UNION ALL
  SELECT 'ops_manager'::app_role UNION ALL
  SELECT 'partner_admin'::app_role
) r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role = r.role AND rp.permission_id = p.id
);

-- photos.validate -> sys_admin, tenant_admin, technician
WITH p AS (
  SELECT id FROM public.permissions WHERE name = 'photos.validate'
)
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.role, p.id
FROM p, (
  SELECT 'sys_admin'::app_role AS role UNION ALL
  SELECT 'tenant_admin'::app_role UNION ALL
  SELECT 'technician'::app_role
) r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role = r.role AND rp.permission_id = p.id
);

-- 3) Add SELECT policy for fraud_alerts so investigators/admins can view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fraud_alerts' AND policyname = 'Investigators can view fraud alerts'
  ) THEN
    CREATE POLICY "Investigators can view fraud alerts" ON public.fraud_alerts
    FOR SELECT
    USING (has_any_role(auth.uid(), ARRAY['fraud_investigator'::app_role, 'sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role]));
  END IF;
END $$;

-- 4) Broaden SELECT visibility on user_roles for admins/ops so they can list technicians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can view all roles'
  ) THEN
    CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT
    USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]));
  END IF;
END $$;