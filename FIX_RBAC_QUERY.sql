-- FIX: Ensure RBAC Query Works Correctly
-- This adds better error handling and ensures enum casting works

-- First, verify the app_role enum includes partner_admin
SELECT 
    enumlabel as role_name
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype
ORDER BY enumsortorder;

-- If partner_admin is missing, it should already be in migrations
-- But let's verify it exists:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'partner_admin' 
        AND enumtypid = 'app_role'::regtype
    ) THEN
        RAISE NOTICE 'WARNING: partner_admin role not in enum!';
    ELSE
        RAISE NOTICE 'OK: partner_admin role exists in enum';
    END IF;
END $$;

-- Test query that matches what the frontend does
-- Replace 'USER_ID_HERE' with actual user ID from auth.users
SELECT 
    ur.id,
    ur.user_id,
    ur.role::text as role,
    ur.tenant_id
FROM public.user_roles ur
WHERE ur.user_id = (SELECT id FROM auth.users WHERE email = 'partner.admin@servicepro.com' LIMIT 1);

-- Test permissions query (what frontend does)
SELECT 
    rp.role::text,
    p.name as permission_name,
    p.category
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role::text = 'partner_admin'
ORDER BY p.category, p.name
LIMIT 20;

