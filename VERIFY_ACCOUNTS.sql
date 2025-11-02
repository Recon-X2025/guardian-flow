-- Verify accounts were created properly

-- Check if users exist in auth
SELECT email, created_at, email_confirmed_at
FROM auth.users
ORDER BY email;

-- Check if profiles were created
SELECT p.email, p.full_name, p.tenant_id, t.name as tenant_name
FROM public.profiles p
LEFT JOIN public.tenants t ON t.id = p.tenant_id
ORDER BY p.email;

-- Check if roles were assigned
SELECT p.email, ur.role, t.name as tenant_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN public.tenants t ON t.id = ur.tenant_id
ORDER BY p.email, ur.role;

-- Check counts
SELECT 
    'Total auth users' as check_type, 
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
    'Total profiles', 
    COUNT(*) 
FROM public.profiles
UNION ALL
SELECT 
    'Total role assignments', 
    COUNT(*) 
FROM public.user_roles;

