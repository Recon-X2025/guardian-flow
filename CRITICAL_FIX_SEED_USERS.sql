-- ============================================================
-- CRITICAL: Create Test Users via Supabase Admin API
-- ============================================================
-- This script uses SQL to create auth users and assign roles
-- You MUST use the Supabase Dashboard to run the JavaScript below

-- ⚠️ COPY THIS TO SUPABASE DASHBOARD SQL EDITOR:

/*
-- Create auth users and assign roles in one go
-- This requires Supabase Admin functions

DO $$
DECLARE
  v_ops_user_id UUID;
  v_finance_user_id UUID;
  v_admin_user_id UUID;
  v_fraud_user_id UUID;
  v_auditor_user_id UUID;
BEGIN
  -- Create ops manager user
  SELECT id INTO v_ops_user_id
  FROM auth.users 
  WHERE email = 'ops@techcorp.com';
  
  IF v_ops_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'ops@techcorp.com',
      crypt('Ops123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Operations Manager"}',
      now(),
      now(),
      '',
      ''
    )
    RETURNING id INTO v_ops_user_id;
  END IF;
  
  -- Assign ops_manager role
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (v_ops_user_id, 'ops_manager', NULL)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created ops@techcorp.com user with ID: %', v_ops_user_id;
END $$;
*/

-- ⚠️ THE ABOVE DOESN'T WORK IN SQL EDITOR
-- YOU NEED TO USE SUPABASE DASHBOARD AUTH SECTION OR RUN THE EDGE FUNCTION

-- ============================================================
-- ACTUAL SOLUTION: Use the Supabase Dashboard Auth tab
-- ============================================================

-- 1. Go to Authentication → Users in Supabase Dashboard
-- 2. Click "Add user" → "Create new user"
-- 3. Create these users ONE BY ONE:

/*
User 1:
- Email: ops@techcorp.com
- Password: Ops123!
- Auto Confirm User: YES

User 2:
- Email: finance@techcorp.com
- Password: Finance123!
- Auto Confirm User: YES

User 3:
- Email: fraud@techcorp.com
- Password: Fraud123!
- Auto Confirm User: YES

User 4:
- Email: auditor@techcorp.com
- Password: Auditor123!
- Auto Confirm User: YES
*/

-- ============================================================
-- AFTER CREATING USERS, RUN THIS TO ASSIGN ROLES:
-- ============================================================

-- Assign ops_manager role to ops@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign finance_manager role to finance@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM public.profiles WHERE email = 'finance@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign fraud_investigator role to fraud@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM public.profiles WHERE email = 'fraud@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign auditor role to auditor@techcorp.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM public.profiles WHERE email = 'auditor@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- ============================================================
-- VERIFY
-- ============================================================

SELECT 
  p.email,
  ur.role,
  ur.granted_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
ORDER BY p.email;

-- Should show 5 users with roles now!

