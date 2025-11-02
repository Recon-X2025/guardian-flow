-- Assign ops_manager role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles
WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign finance_manager role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM public.profiles
WHERE email = 'finance@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign fraud_investigator role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM public.profiles
WHERE email = 'fraud@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign auditor role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM public.profiles
WHERE email = 'auditor@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify they were assigned
SELECT email, role FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE email IN ('ops@techcorp.com', 'finance@techcorp.com', 'fraud@techcorp.com', 'auditor@techcorp.com');

