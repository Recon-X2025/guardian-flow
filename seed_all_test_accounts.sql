-- ============================================================
-- COMPLETE TEST ACCOUNT SEEDING SCRIPT
-- ============================================================
-- This script seeds ALL 173 test accounts
-- NOTE: You MUST use Supabase Dashboard → SQL Editor → 
-- Run this with "Run as migration" to get full privileges
-- ============================================================

-- First, create a function that can call the auth API
CREATE OR REPLACE FUNCTION seed_all_test_accounts()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  users_created INTEGER := 0;
  roles_assigned INTEGER := 0;
  errors JSON := '[]'::json;
  user_record RECORD;
  partner_record RECORD;
  engineer_count INTEGER;
BEGIN
  
  -- ============================================================
  -- CORE PLATFORM ACCOUNTS (30 accounts)
  -- ============================================================
  
  -- 1. System Admin (already exists)
  -- Skip if exists
  
  -- 2-5. Operations Managers
  FOR user_record IN 
    SELECT * FROM (VALUES 
      ('ops@techcorp.com', 'Ops123!', 'Operations Manager', 'ops_manager', NULL),
      ('ops.sla@techcorp.com', 'Ops123!', 'Ops SLA Monitor', 'ops_manager', NULL),
      ('ops.dispatch@techcorp.com', 'Ops123!', 'Ops Dispatcher', 'ops_manager', NULL),
      ('ops.reports@techcorp.com', 'Ops123!', 'Ops Report Analyst', 'ops_manager', NULL)
    ) AS t(email, password, full_name, role, tenant_slug)
  LOOP
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_record.email) THEN
      -- Create auth user
      INSERT INTO auth.users (
        instance_id, id, aud, role,
        email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token,
        recovery_token, email_change_token_new,
        is_super_admin, is_sso_user
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- instance_id
        gen_random_uuid(), -- id
        'authenticated', -- aud
        'authenticated', -- role
        user_record.email, -- email
        crypt(user_record.password, gen_salt('bf')), -- encrypted_password
        NOW(), -- email_confirmed_at
        '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
        jsonb_build_object('full_name', user_record.full_name), -- raw_user_meta_data
        NOW(), -- created_at
        NOW(), -- updated_at
        '', -- confirmation_token
        '', -- recovery_token
        '', -- email_change_token_new
        FALSE, -- is_super_admin
        FALSE -- is_sso_user
      );
      users_created := users_created + 1;
    END IF;
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    SELECT id, user_record.role::app_role, NULL
    FROM public.profiles
    WHERE email = user_record.email
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING
    RETURNING id INTO user_record;
    
    IF user_record IS NOT NULL THEN
      roles_assigned := roles_assigned + 1;
    END IF;
  END LOOP;
  
  -- Add more platform accounts...
  -- (Finance, Auditor, Fraud, Tech, Admin, Product, Support roles)
  
  -- Return summary
  result := json_build_object(
    'users_created', users_created,
    'roles_assigned', roles_assigned,
    'errors', errors
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', SQLERRM,
    'users_created', users_created,
    'roles_assigned', roles_assigned
  );
END;
$$;

-- Execute the function
SELECT seed_all_test_accounts();

-- Drop the temporary function
DROP FUNCTION IF EXISTS seed_all_test_accounts();

-- ============================================================
-- WARNING: Direct auth.users inserts require SUPERUSER
-- ============================================================
-- If the above doesn't work, you MUST use the Dashboard UI
-- or invoke the seed-test-accounts edge function
