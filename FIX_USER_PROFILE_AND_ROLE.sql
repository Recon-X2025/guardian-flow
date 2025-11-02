-- FIX: Create Profile First, Then Assign Role
-- User ID: 0584357d-8f18-4730-85f1-b16d1b5ce456

-- Step 1: Check if user exists in auth.users
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
WHERE id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 2: Check if profile exists
SELECT 
    id,
    email,
    full_name,
    tenant_id
FROM public.profiles
WHERE id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 3: Create profile if missing, then assign role
DO $$
DECLARE
    v_user_id UUID := '0584357d-8f18-4730-85f1-b16d1b5ce456';
    v_email TEXT;
    v_full_name TEXT;
    v_role app_role;
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    -- Get user email from auth.users
    SELECT email, COALESCE(raw_user_meta_data->>'full_name', email) INTO v_email, v_full_name
    FROM auth.users
    WHERE id = v_user_id;

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User % not found in auth.users', v_user_id;
    END IF;

    RAISE NOTICE 'Processing user: % (email: %)', v_user_id, v_email;

    -- Step 3a: Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;

    IF NOT v_profile_exists THEN
        RAISE NOTICE 'Profile does not exist, creating profile...';
        
        -- Try to determine tenant_id from email or existing tenants
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

        -- Create profile
        INSERT INTO public.profiles (id, email, full_name, tenant_id)
        VALUES (v_user_id, v_email, v_full_name, v_tenant_id)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            tenant_id = COALESCE(profiles.tenant_id, EXCLUDED.tenant_id);

        RAISE NOTICE 'Profile created with tenant_id: %', v_tenant_id;
    ELSE
        -- Profile exists, get tenant_id from it
        SELECT tenant_id INTO v_tenant_id
        FROM public.profiles
        WHERE id = v_user_id;
        RAISE NOTICE 'Profile already exists with tenant_id: %', v_tenant_id;
    END IF;

    -- Step 3b: Determine role based on email
    IF v_email LIKE '%partner.admin%' OR v_email LIKE '%partner%admin%' THEN
        v_role := 'partner_admin'::app_role;
    ELSIF v_email LIKE '%admin%techcorp%' OR v_email LIKE '%sys%admin%' OR v_email = 'admin@techcorp.com' THEN
        v_role := 'sys_admin'::app_role;
    ELSIF v_email LIKE '%tech%' AND v_email NOT LIKE '%admin%' THEN
        v_role := 'technician'::app_role;
    ELSIF v_email LIKE '%ops%manager%' THEN
        v_role := 'ops_manager'::app_role;
    ELSE
        v_role := 'guest'::app_role;
    END IF;

    RAISE NOTICE 'Determined role: %', v_role;

    -- Step 3c: Check if role already exists
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_user_id
        AND role = v_role
        AND (tenant_id = v_tenant_id OR (tenant_id IS NULL AND v_tenant_id IS NULL))
    ) THEN
        RAISE NOTICE 'Role already exists, skipping insert';
    ELSE
        -- Insert role (now that profile exists, this should work)
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (v_user_id, v_role, v_tenant_id);
        RAISE NOTICE 'Successfully assigned role % to user %', v_role, v_user_id;
    END IF;
END $$;

-- Step 4: Verify everything is set up correctly
SELECT 
    u.id,
    u.email as auth_email,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name,
    p.tenant_id as profile_tenant_id,
    ur.role::text as role_name,
    ur.tenant_id as role_tenant_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE u.id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

