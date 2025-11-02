-- Fix All Technician Accounts
-- This ensures all technician test accounts have the role assigned and can access work orders

-- Step 1: Find all technician test accounts
SELECT 
    u.id,
    u.email,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'technician'::app_role) 
        THEN '✅ HAS ROLE'
        ELSE '❌ MISSING ROLE'
    END as role_status
FROM auth.users u
WHERE u.email LIKE '%tech%@techcorp.com'
ORDER BY u.email;

-- Step 2: Fix all technician accounts - ensure they have role assigned
DO $$
DECLARE
    v_user_record RECORD;
    v_tenant_id UUID := NULL;  -- You may want to set this to a specific tenant
BEGIN
    -- Loop through all technician test accounts
    FOR v_user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' as full_name
        FROM auth.users u
        WHERE u.email LIKE '%tech%@techcorp.com'
    LOOP
        RAISE NOTICE 'Processing user: % (ID: %)', v_user_record.email, v_user_record.id;
        
        -- Ensure profile exists
        INSERT INTO public.profiles (id, email, full_name, tenant_id)
        VALUES (
            v_user_record.id,
            v_user_record.email,
            COALESCE(v_user_record.full_name, 'Technician User'),
            v_tenant_id
        )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            tenant_id = COALESCE(profiles.tenant_id, EXCLUDED.tenant_id);
        
        -- Assign technician role if not already assigned
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (v_user_record.id, 'technician'::app_role, v_tenant_id)
        ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
        
        RAISE NOTICE '✅ Ensured technician role for: %', v_user_record.email;
    END LOOP;
    
    RAISE NOTICE '✅ Completed fixing all technician accounts';
END $$;

-- Step 3: Verify all technician accounts now have the role
SELECT 
    u.email,
    ur.role,
    ur.tenant_id,
    -- Verify they can get wo.read permission through their role
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = ur.role AND p.name = 'wo.read'
        ) THEN '✅ CAN ACCESS /work-orders'
        ELSE '❌ CANNOT ACCESS /work-orders'
    END as access_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%tech%@techcorp.com'
AND ur.role = 'technician'::app_role
ORDER BY u.email;

