-- Check Partner Admin Permissions
-- Run this to diagnose why partner_admin has no access

-- 1. Check if partner_admin role exists in user_roles
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.tenant_id,
    p.email,
    p.full_name
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'partner_admin';

-- 2. Check if partner_admin has any permissions mapped
SELECT 
    rp.role::text as role_name,
    COUNT(p.id) as permission_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permissions
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'partner_admin'::app_role
GROUP BY rp.role;

-- 3. Check what permissions should be assigned based on categories
SELECT 
    p.name,
    p.category,
    p.description
FROM public.permissions p
WHERE p.category IN ('work_order', 'inventory', 'warranty', 'attachments', 'photos', 'service_orders', 'sapos', 'finance')
ORDER BY p.category, p.name;

-- 4. Verify if permissions exist for partner_admin
SELECT 
    'Expected Permissions' as check_type,
    COUNT(*) as count
FROM public.permissions
WHERE category IN ('work_order', 'inventory', 'warranty', 'attachments', 'photos', 'service_orders', 'sapos', 'finance');

-- 5. Check actual mapped permissions for partner_admin
SELECT 
    'Mapped Permissions' as check_type,
    COUNT(*) as count
FROM public.role_permissions rp
WHERE rp.role = 'partner_admin'::app_role;

