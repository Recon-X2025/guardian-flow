-- Check which permissions are assigned to each role
SELECT 
    r.role::text as role_name,
    COUNT(p.id) as permission_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permissions
FROM public.user_roles r
LEFT JOIN public.role_permissions rp ON rp.role = r.role
LEFT JOIN public.permissions p ON p.id = rp.permission_id
GROUP BY r.role
ORDER BY r.role;

-- Check specific roles that might be missing
SELECT 
    ur.role::text,
    u.email,
    COUNT(rp.id) as permission_count
FROM public.user_roles ur
JOIN public.profiles u ON u.id = ur.user_id
LEFT JOIN public.role_permissions rp ON rp.role = ur.role
GROUP BY ur.role, u.email
ORDER BY ur.role, permission_count DESC;

