-- ============================================================
-- Fix Test Account Roles - Assign Missing Roles to Users
-- ============================================================
-- This script assigns the correct roles to all test accounts
-- that were created without role assignments

-- First, let's see what users we have without roles
-- Run this to see which users exist:
SELECT id, email, full_name FROM profiles WHERE id NOT IN (SELECT user_id FROM user_roles) LIMIT 50;

-- Now assign roles to all test accounts based on their email patterns

-- Operations Manager accounts
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles
WHERE email IN (
  'ops@techcorp.com',
  'ops.sla@techcorp.com',
  'ops.dispatch@techcorp.com',
  'ops.reports@techcorp.com'
)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Finance Manager accounts
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM public.profiles
WHERE email IN (
  'finance@techcorp.com',
  'finance.invoicing@techcorp.com',
  'finance.forecast@techcorp.com',
  'finance.disputes@techcorp.com'
)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Auditor accounts
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM public.profiles
WHERE email IN (
  'auditor@techcorp.com',
  'auditor.evidence@techcorp.com',
  'auditor.vuln@techcorp.com',
  'auditor.logs@techcorp.com'
)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Fraud Investigator accounts
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM public.profiles
WHERE email IN (
  'fraud@techcorp.com',
  'fraud.anomaly@techcorp.com',
  'fraud.cases@techcorp.com'
)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Technician accounts
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'technician'::app_role, NULL
FROM public.profiles
WHERE email IN (
  'tech.mobile@techcorp.com',
  'tech.photos@techcorp.com',
  'tech.complete@techcorp.com'
)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Dispatcher
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'dispatcher'::app_role, NULL
FROM public.profiles
WHERE email = 'dispatch@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Customer
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'customer'::app_role, NULL
FROM public.profiles
WHERE email = 'customer@example.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- ML Ops
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ml_ops'::app_role, NULL
FROM public.profiles
WHERE email = 'mlops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Billing Agent
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'billing_agent'::app_role, NULL
FROM public.profiles
WHERE email = 'billing@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Support Agent
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'support_agent'::app_role, NULL
FROM public.profiles
WHERE email = 'support@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Product Owner accounts
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'product_owner'::app_role, NULL
FROM public.profiles
WHERE email IN (
  'product.api@techcorp.com',
  'product.webhooks@techcorp.com',
  'product.marketplace@techcorp.com'
)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify results
SELECT 
  rp.role,
  COUNT(*) as user_count
FROM user_roles rp
GROUP BY rp.role
ORDER BY user_count DESC;

-- Check specific account
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.granted_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email = 'ops@techcorp.com'
ORDER BY p.email;

