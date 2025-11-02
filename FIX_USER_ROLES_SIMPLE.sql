-- SIMPLE FIX: Assign Role to User (No ON CONFLICT needed)
-- User ID: 0584357d-8f18-4730-85f1-b16d1b5ce456

-- Step 1: Check current state
SELECT 
    u.id,
    u.email,
    ur.role::text as role_name,
    ur.tenant_id,
    p.full_name,
    p.tenant_id as profile_tenant_id
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 2: Get or determine tenant_id
-- First, try to get tenant_id from profile
DO $$
DECLARE
    v_user_id UUID := '0584357d-8f18-4730-85f1-b16d1b5ce456';
    v_email TEXT;
    v_role app_role;
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    -- Get user email
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = v_user_id;

    RAISE NOTICE 'Processing user: % (email: %)', v_user_id, v_email;

    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;

    -- Get tenant_id from profile if exists
    IF v_profile_exists THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.profiles
        WHERE id = v_user_id;
        RAISE NOTICE 'Found tenant_id from profile: %', v_tenant_id;
    END IF;

    -- If no tenant_id, try to find one based on email
    IF v_tenant_id IS NULL THEN
        IF v_email LIKE '%servicepro%' OR v_email LIKE '%partner%' THEN
            SELECT id INTO v_tenant_id
            FROM public.tenants
            WHERE slug LIKE '%servicepro%' OR slug LIKE '%partner%'
            LIMIT 1;
        ELSIF v_email LIKE '%techcorp%' THEN
            SELECT id INTO v_tenant_id
            FROM public.tenants
            WHERE slug LIKE '%techcorp%'
            LIMIT 1;
        END IF;
        RAISE NOTICE 'Determined tenant_id from email: %', v_tenant_id;
    END IF;

    -- Determine role based on email
    IF v_email LIKE '%partner.admin%' OR v_email LIKE '%partner%admin%' THEN
        v_role := 'partner_admin'::app_role;
    ELSIF v_email LIKE '%admin%techcorp%' OR v_email LIKE '%sys%admin%' THEN
        v_role := 'sys_admin'::app_role;
    ELSIF v_email LIKE '%tech%' AND v_email NOT LIKE '%admin%' THEN
        v_role := 'technician'::app_role;
    ELSIF v_email LIKE '%ops%manager%' THEN
        v_role := 'ops_manager'::app_role;
    ELSE
        v_role := 'guest'::app_role;
    END IF;

    RAISE NOTICE 'Determined role: %', v_role;

    -- Check if role already exists (with or without tenant_id)
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_user_id
        AND role = v_role
        AND (tenant_id = v_tenant_id OR (tenant_id IS NULL AND v_tenant_id IS NULL))
    ) THEN
        RAISE NOTICE 'Role already exists, skipping insert';
    ELSE
        -- Insert role
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (v_user_id, v_role, v_tenant_id);
        RAISE NOTICE 'Successfully assigned role % to user %', v_role, v_user_id;
    END IF;
END $$;

-- Step 3: Verify role was assigned
SELECT 
    ur.id,
    ur.role::text as role_name,
    ur.tenant_id,
    u.email,
    p.full_name
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

