-- FIX: Check and Assign Roles to User
-- Replace USER_ID_HERE with: 0584357d-8f18-4730-85f1-b16d1b5ce456

-- Step 1: Check if user exists
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 2: Check if user has any roles
SELECT 
    ur.*,
    ur.role::text as role_name
FROM public.user_roles ur
WHERE ur.user_id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 3: Check user's email to determine what role they should have
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.tenant_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 4: If no roles exist, assign based on email pattern
-- This will assign partner_admin role if email contains 'partner'
DO $$
DECLARE
    v_user_id UUID := '0584357d-8f18-4730-85f1-b16d1b5ce456';
    v_email TEXT;
    v_role app_role;
    v_tenant_id UUID;
BEGIN
    -- Get user email
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = v_user_id;

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

    -- Get tenant_id from profile or create default
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = v_user_id;

    -- If no tenant_id, try to find from tenants table or create one
    IF v_tenant_id IS NULL THEN
        -- Try to find a matching tenant by slug
        SELECT id INTO v_tenant_id
        FROM public.tenants
        WHERE slug LIKE '%servicepro%' OR slug LIKE '%techcorp%'
        LIMIT 1;
    END IF;

    -- Insert role if it doesn't exist
    -- Note: Unique constraint is on (user_id, role, tenant_id)
    -- If tenant_id is NULL, we need to handle that
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (v_user_id, v_role, v_tenant_id)
        ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
    ELSE
        -- For NULL tenant_id, check if role already exists with NULL tenant
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = v_user_id
            AND role = v_role
            AND tenant_id IS NULL
        ) THEN
            INSERT INTO public.user_roles (user_id, role, tenant_id)
            VALUES (v_user_id, v_role, NULL);
        END IF;
    END IF;

    RAISE NOTICE 'Assigned role % to user % (email: %)', v_role, v_user_id, v_email;
END $$;

-- Step 5: Verify role was assigned
SELECT 
    ur.id,
    ur.role::text as role_name,
    ur.tenant_id,
    u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.user_id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

