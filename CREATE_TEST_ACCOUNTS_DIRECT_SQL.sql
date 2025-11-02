-- ============================================================
-- CREATE TEST ACCOUNTS DIRECTLY IN SQL
-- ============================================================
-- This script creates auth users and assigns roles
-- Run this in Supabase Dashboard → SQL Editor

-- STEP 1: Create the auth users
-- Note: We need to use the Supabase Auth Admin API for this
-- But since we're in SQL, we'll insert into auth.users directly

-- WARNING: This requires SUPERUSER access!
-- If you get permission errors, you MUST use the Dashboard Auth UI

-- ============================================================
-- FIRST: Create users via Supabase Dashboard Auth UI
-- ============================================================

-- Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/auth/users
-- Click "Add user" → "Create new user"
-- Create these 4 users:

/*
1. Email: ops@techcorp.com
   Password: Ops123!
   Auto Confirm: YES

2. Email: finance@techcorp.com
   Password: Finance123!
   Auto Confirm: YES

3. Email: fraud@techcorp.com
   Password: Fraud123!
   Auto Confirm: YES

4. Email: auditor@techcorp.com
   Password: Auditor123!
   Auto Confirm: YES
*/

-- ============================================================
-- THEN: Run this SQL to assign roles
-- ============================================================

-- Assign ops_manager role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles
WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign finance_manager role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM public.profiles
WHERE email = 'finance@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign fraud_investigator role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM public.profiles
WHERE email = 'fraud@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign auditor role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM public.profiles
WHERE email = 'auditor@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify all users have roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.granted_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY p.email;

-- You should see 5 users total now (including admin)

