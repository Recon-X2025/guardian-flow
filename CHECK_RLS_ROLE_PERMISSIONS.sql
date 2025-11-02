-- Check RLS Policies on role_permissions table
-- This ensures authenticated users can read role_permissions

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'role_permissions';

-- Check existing policies
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
WHERE schemaname = 'public'
AND tablename = 'role_permissions';

-- If no policy exists, create one to allow authenticated users to read role_permissions
-- This is safe because role_permissions only contains role->permission mappings, not sensitive user data
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Allow authenticated users to read role_permissions" ON public.role_permissions;
    
    -- Create policy to allow all authenticated users to read role_permissions
    -- This is needed for RBAC context to load permissions
    CREATE POLICY "Allow authenticated users to read role_permissions"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (true);  -- Allow all authenticated users to read (this table only contains role->permission mappings)
    
    RAISE NOTICE '✅ Created RLS policy for role_permissions';
END $$;

