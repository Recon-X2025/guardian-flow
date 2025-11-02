-- ============================================================
-- CREATE ONE TEST USER WITH ROLE - SIMPLE WAY
-- ============================================================
-- This creates ONE user for testing

-- You CANNOT create auth users via SQL directly!
-- You MUST use Supabase Dashboard or the app!

-- ============================================================
-- OPTION 1: Use Supabase Dashboard
-- ============================================================
-- 1. Go to your Supabase project dashboard
-- 2. Click "Authentication" in left sidebar
-- 3. Click "Users"
-- 4. Click "Add user" button
-- 5. Fill in:
--    - Email: ops@techcorp.com
--    - Password: Ops123!
--    - Auto Confirm User: YES
-- 6. Click "Create user"

-- ============================================================
-- OPTION 2: Use the app signup form
-- ============================================================
-- 1. Go to localhost:8080/auth
-- 2. Click "Create Account" tab
-- 3. Fill in:
--    - Email: ops@techcorp.com
--    - Password: Ops123!
--    - Full Name: Operations Manager
-- 4. Click "Create Account"

-- ============================================================
-- AFTER CREATING USER, RUN THIS:
-- ============================================================
-- This assigns the ops_manager role

INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles 
WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify
SELECT p.email, ur.role 
FROM profiles p 
JOIN user_roles ur ON ur.user_id = p.id 
WHERE p.email = 'ops@techcorp.com';

