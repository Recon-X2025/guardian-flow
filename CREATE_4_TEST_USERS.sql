-- Create the 4 critical test users that are missing
-- Run this in Supabase SQL Editor

-- 1. Ops Manager
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('ops@techcorp.com', crypt('Ops123!', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- 2. Finance Manager  
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('finance@techcorp.com', crypt('Finance123!', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- 3. Fraud Investigator
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('fraud@techcorp.com', crypt('Fraud123!', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- 4. Auditor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('auditor@techcorp.com', crypt('Auditor123!', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- Create their profiles
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  id,
  email,
  CASE 
    WHEN email = 'ops@techcorp.com' THEN 'Operations Manager'
    WHEN email = 'finance@techcorp.com' THEN 'Finance Manager'
    WHEN email = 'fraud@techcorp.com' THEN 'Fraud Investigator'
    WHEN email = 'auditor@techcorp.com' THEN 'Auditor'
  END as full_name,
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('ops@techcorp.com', 'finance@techcorp.com', 'fraud@techcorp.com', 'auditor@techcorp.com')
ON CONFLICT (id) DO NOTHING;

-- Assign their roles
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM auth.users WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM auth.users WHERE email = 'finance@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM auth.users WHERE email = 'fraud@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM auth.users WHERE email = 'auditor@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify the results
SELECT 
  p.email,
  p.full_name,
  ur.role,
  COUNT(*) OVER (PARTITION BY p.email) as role_count
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email IN ('ops@techcorp.com', 'finance@techcorp.com', 'fraud@techcorp.com', 'auditor@techcorp.com')
ORDER BY p.email, ur.role;

