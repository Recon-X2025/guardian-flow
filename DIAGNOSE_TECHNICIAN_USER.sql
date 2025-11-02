-- Diagnose Technician User Access Issue
-- Run this to check if a specific technician user has the role and permissions

-- Step 1: Find technician test accounts
SELECT 
    u.id,
    u.email,
    u.created_at
FROM auth.users u
WHERE u.email LIKE '%tech%@techcorp.com'
ORDER BY u.email;

-- Step 2: Check if they have technician role assigned
-- Replace 'USER_EMAIL' with actual email from Step 1
SELECT 
    u.email,
    ur.role,
    ur.tenant_id,
    ur.granted_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'tech.mobile@techcorp.com'  -- Change this email
ORDER BY ur.role;

-- Step 3: If NO role found, check if user exists at all
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id) THEN '✅ HAS ROLE'
        ELSE '❌ NO ROLE ASSIGNED'
    END as role_status
FROM auth.users u
WHERE u.email = 'tech.mobile@techcorp.com';

-- Step 4: Check what permissions technician role SHOULD have (from role_permissions table)
SELECT 
    p.name as permission_name,
    p.category
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
ORDER BY p.category, p.name;

-- Step 5: Check if user can get permissions through their role
-- This simulates what the RBAC context query does
SELECT DISTINCT
    p.name as permission_name
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.role_permissions rp ON rp.role = ur.role
JOIN public.permissions p ON p.id = rp.permission_id
WHERE u.email = 'tech.mobile@techcorp.com'
ORDER BY p.name;

-- Step 6: Quick fix - Assign technician role if missing
-- ONLY RUN THIS IF Step 2 shows user has NO role
/*
DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID := NULL; -- Set to specific tenant_id if needed, or leave NULL
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'tech.mobile@techcorp.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: tech.mobile@techcorp.com';
    END IF;
    
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name, tenant_id)
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', 'Technician User'),
        v_tenant_id
    FROM auth.users u
    WHERE u.id = v_user_id
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        tenant_id = COALESCE(profiles.tenant_id, EXCLUDED.tenant_id);
    
    -- Assign technician role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_user_id, 'technician'::app_role, v_tenant_id)
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
    
    RAISE NOTICE '✅ Assigned technician role to user: tech.mobile@techcorp.com';
END $$;
*/

