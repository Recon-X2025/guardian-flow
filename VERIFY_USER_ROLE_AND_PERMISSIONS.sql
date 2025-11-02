-- Verify User Role and Permissions
-- Use this to check if a specific user has the technician role and permissions

-- Replace 'USER_EMAIL_HERE' with the actual technician email (e.g., 'tech.mobile@techcorp.com')
-- Or replace 'USER_ID_HERE' with the actual user UUID from auth.users

-- Option 1: Check by Email
SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' as full_name,
    ur.role,
    ur.tenant_id,
    ur.granted_at,
    -- Get permissions for this role
    (
        SELECT STRING_AGG(p.name, ', ' ORDER BY p.name)
        FROM public.role_permissions rp
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE rp.role = ur.role
    ) as role_permissions,
    -- Check specifically for wo.read
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = ur.role AND p.name = 'wo.read'
        ) THEN '✅ HAS wo.read'
        ELSE '❌ MISSING wo.read'
    END as wo_read_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%tech%'  -- Change this to specific email
ORDER BY u.email, ur.role;

-- Option 2: Check by User ID
-- Replace 'USER_ID_HERE' with actual UUID
/*
SELECT 
    u.id as user_id,
    u.email,
    ur.role,
    ur.tenant_id,
    (
        SELECT STRING_AGG(p.name, ', ')
        FROM public.role_permissions rp
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE rp.role = ur.role
    ) as permissions
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.id = 'USER_ID_HERE';
*/

-- Option 3: Check all technician accounts
SELECT 
    u.email,
    ur.role,
    ur.tenant_id,
    p.name as has_wo_read,
    CASE 
        WHEN p.name = 'wo.read' THEN '✅'
        ELSE '❌'
    END as status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.role_permissions rp ON rp.role = ur.role
LEFT JOIN public.permissions p ON p.id = rp.permission_id AND p.name = 'wo.read'
WHERE ur.role = 'technician'::app_role
ORDER BY u.email;

-- Option 4: Quick check - does user have technician role?
SELECT 
    u.email,
    COUNT(ur.role) as role_count,
    STRING_AGG(ur.role::text, ', ') as roles
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%tech%'
GROUP BY u.email;

