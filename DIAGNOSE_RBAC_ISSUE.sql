-- DIAGNOSTIC: Check Current RBAC State
-- Run this to see what's actually in the database

-- 1. Check if user has partner_admin role
SELECT 
    ur.id,
    ur.role::text as role_name,
    ur.tenant_id,
    u.email,
    p.full_name,
    ur.granted_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE u.email LIKE '%partner%' OR u.email LIKE '%admin%'
ORDER BY ur.role, u.email
LIMIT 20;

-- 2. Check if partner_admin has ANY permissions mapped
SELECT 
    rp.role::text as role_name,
    COUNT(p.id) as permission_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as sample_permissions
FROM public.role_permissions rp
LEFT JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'partner_admin'::app_role
GROUP BY rp.role;

-- 3. Check what permissions SHOULD exist for partner_admin categories
SELECT 
    p.category,
    COUNT(*) as available_permissions,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permission_names
FROM public.permissions p
WHERE p.category IN ('ticketing', 'work_order', 'inventory', 'warranty', 'attachments', 'photos', 'service_orders', 'sapos', 'finance', 'overrides')
GROUP BY p.category
ORDER BY p.category;

-- 4. Check if permissions table even exists and has data
SELECT 
    COUNT(*) as total_permissions,
    COUNT(DISTINCT category) as category_count
FROM public.permissions;

-- 5. Check if role_permissions table has ANY data
SELECT 
    rp.role::text as role_name,
    COUNT(*) as mapped_permissions
FROM public.role_permissions rp
GROUP BY rp.role
ORDER BY rp.role;

-- 6. Check current logged-in user (replace email if different)
SELECT 
    u.id,
    u.email,
    ur.role::text as role,
    ur.tenant_id,
    p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'partner.admin@servicepro.com'
   OR u.email LIKE '%partner%'
ORDER BY u.email;

