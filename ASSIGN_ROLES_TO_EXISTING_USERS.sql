-- ============================================================
-- Assign Roles to Existing Users
-- ============================================================
-- Run this in Supabase SQL Editor
-- Make sure you have these 4 users created first via Auth tab

-- Assign ops_manager role to ops@techcorp.com (IF IT EXISTS)
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign finance_manager role to finance@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM public.profiles WHERE email = 'finance@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign fraud_investigator role to fraud@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM public.profiles WHERE email = 'fraud@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign auditor role to auditor@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM public.profiles WHERE email = 'auditor@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify
SELECT p.email, ur.role FROM profiles p JOIN user_roles ur ON ur.user_id = p.id ORDER BY p.email;

