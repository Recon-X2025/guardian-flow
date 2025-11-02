-- ============================================================
-- Fix: Add wo.read permission to all client roles
-- ============================================================
-- The wildcard query in 20251101150000 didn't work properly
-- Need to explicitly add wo.read to all client roles

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_admin'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_operations_manager'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_finance_manager'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_compliance_officer'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_procurement_manager'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_executive'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_fraud_manager'::app_role, id FROM public.permissions 
WHERE name = 'wo.read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Verification query
SELECT 
  rp.role,
  COUNT(*) as permission_count
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role LIKE 'client_%' AND p.name = 'wo.read'
GROUP BY rp.role
ORDER BY rp.role;

