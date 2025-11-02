-- FIX: 406 Error on Profiles Table
-- The 406 error usually means RLS is blocking or there's a data format issue

-- Step 1: Check if profile exists for this user
SELECT 
    id,
    email,
    full_name,
    tenant_id,
    created_at
FROM public.profiles
WHERE id = '0584357d-8f18-4730-85f1-b16d1b5ce456';

-- Step 2: Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Step 3: Ensure profile exists (create if missing)
-- Get user info from auth.users and create profile
INSERT INTO public.profiles (id, email, full_name, tenant_id)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
    -- Try to find matching tenant based on email
    COALESCE(
        (SELECT t.id FROM public.tenants t 
         WHERE (u.email LIKE '%' || t.slug || '%' OR t.slug LIKE '%servicepro%' OR t.slug LIKE '%techcorp%')
         LIMIT 1),
        NULL
    ) as tenant_id
FROM auth.users u
WHERE u.id = '0584357d-8f18-4730-85f1-b16d1b5ce456'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    tenant_id = COALESCE(profiles.tenant_id, EXCLUDED.tenant_id);

-- Step 4: Check if tenant_id needs to be set
UPDATE public.profiles p
SET tenant_id = (
    SELECT t.id
    FROM public.tenants t
    WHERE t.slug LIKE '%servicepro%' OR t.slug LIKE '%techcorp%'
    LIMIT 1
)
WHERE p.id = '0584357d-8f18-4730-85f1-b16d1b5ce456'
  AND p.tenant_id IS NULL;

-- Step 5: Verify RLS allows SELECT for this user
-- Check if there's a policy that allows users to read their own profile
DO $$
BEGIN
    -- Check if policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname LIKE '%own%' OR policyname LIKE '%select%'
    ) THEN
        RAISE NOTICE 'Creating RLS policy for profiles table';
        
        -- Create policy if missing
        CREATE POLICY IF NOT EXISTS "Users can view own profile" 
        ON public.profiles
        FOR SELECT
        USING (auth.uid() = id);
    END IF;
END $$;

