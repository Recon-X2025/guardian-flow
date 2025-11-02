-- ============================================================
-- COMPREHENSIVE ROLE PERMISSION FIXES
-- This ensures all roles have the correct permissions mapped
-- ============================================================

-- ============================================================
-- 1. TECHNICIAN - Fix Work Orders Access
-- ============================================================
-- Technician MUST have wo.read to access /work-orders route
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'technician'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'wo.read',           -- CRITICAL: Required for /work-orders route access
  'wo.update',         -- Update work order status
  'wo.complete',       -- Mark work orders complete
  'inventory.view',    -- View inventory
  'attachment.upload', -- Upload photos/attachments
  'attachment.view',   -- View attachments
  'photo.validate',    -- Validate photos
  'so.view',          -- View service orders
  'so.sign'           -- Sign service orders
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 2. DISPATCHER - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'dispatcher'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'ticket.read',       -- View tickets
  'ticket.update',     -- Update tickets
  'ticket.assign',     -- Assign tickets
  'wo.read',           -- View work orders
  'wo.create',         -- Create work orders
  'wo.assign',         -- Assign work orders
  'inventory.view'     -- View inventory
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 3. OPS_MANAGER - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager'::app_role, id 
FROM public.permissions 
WHERE category IN ('ticketing', 'work_order', 'inventory', 'warranty', 'photos', 'service_orders', 'overrides')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Ensure ops_manager has specific permissions needed
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'wo.read',           -- Required for /work-orders
  'wo.create',
  'wo.update',
  'wo.assign',
  'wo.precheck',
  'wo.override',
  'ticket.read',
  'ticket.update',
  'dispatcher.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 4. FINANCE_MANAGER - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance_manager'::app_role, id 
FROM public.permissions 
WHERE category IN ('finance', 'penalties', 'audit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Ensure finance_manager has specific permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance_manager'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'finance.view',      -- Required for /finance route
  'invoice.view',
  'invoice.create',
  'invoice.update',
  'penalty.calculate',
  'penalty.apply',
  'penalty.dispute',
  'audit.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 5. FRAUD_INVESTIGATOR - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fraud_investigator'::app_role, id 
FROM public.permissions 
WHERE category IN ('fraud', 'audit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Ensure fraud_investigator has specific permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fraud_investigator'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'fraud.view',        -- Required for /fraud route
  'fraud.investigate',
  'fraud.label',
  'fraud.resolve',
  'audit.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 6. AUDITOR - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor'::app_role, id 
FROM public.permissions 
WHERE category IN ('compliance', 'audit')
   OR name IN ('audit.read', 'warranty.view', 'warranty.check')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Ensure auditor has read-only fraud access for compliance
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor'::app_role, id 
FROM public.permissions 
WHERE name = 'fraud.view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 7. PARTNER_ADMIN - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id 
FROM public.permissions 
WHERE category IN ('ticketing', 'work_order', 'inventory', 'warranty', 'attachments', 'photos', 'service_orders', 'sapos', 'finance', 'overrides')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 8. PARTNER_USER - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_user'::app_role, id 
FROM public.permissions 
WHERE name IN ('wo.read', 'wo.update', 'wo.complete', 'inventory.view', 'attachment.upload', 'attachment.view', 'photo.validate', 'so.view', 'so.sign')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 9. CUSTOMER - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'customer'::app_role, id 
FROM public.permissions 
WHERE name IN ('ticket.create', 'ticket.read', 'wo.read', 'so.view', 'sapos.view', 'sapos.accept', 'sapos.decline', 'quote.view', 'invoice.view', 'invoice.pay')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 10. ML_OPS - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ml_ops'::app_role, id 
FROM public.permissions 
WHERE category IN ('ml_ops')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Ensure ml_ops has analytics access
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ml_ops'::app_role, id 
FROM public.permissions 
WHERE name IN (
  'mlops.view',
  'mlops.deploy',
  'mlops.register',
  'fraud.create_alert',
  'sapos.configure'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 11. BILLING_AGENT - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'billing_agent'::app_role, id 
FROM public.permissions 
WHERE name IN ('invoice.create', 'invoice.view', 'invoice.adjust', 'quote.create', 'quote.view', 'penalty.calculate', 'penalty.apply')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 12. PRODUCT_OWNER - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'product_owner'::app_role, id 
FROM public.permissions 
WHERE category IN ('admin', 'ml_ops')
   OR name IN ('admin.config', 'admin.features')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Product Owner may need analytics access for metrics
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'product_owner'::app_role, id 
FROM public.permissions 
WHERE name LIKE 'audit.read' OR name LIKE 'analytics%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 13. SUPPORT_AGENT - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'support_agent'::app_role, id 
FROM public.permissions 
WHERE name IN ('ticket.read', 'ticket.update', 'wo.read', 'so.view')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 14. TENANT_ADMIN - Ensure Complete Permissions
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tenant_admin'::app_role, id 
FROM public.permissions 
WHERE category NOT IN ('admin')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check technician has wo.read
SELECT 
    'TECHNICIAN WO.READ CHECK' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS: Technician has wo.read'
        ELSE '❌ FAIL: Technician missing wo.read permission'
    END as status
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'technician'::app_role
AND p.name = 'wo.read';

-- Count permissions per role
SELECT 
    rp.role::text as role_name,
    COUNT(*) as permission_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as sample_permissions
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role IN ('technician', 'dispatcher', 'ops_manager', 'finance_manager', 'fraud_investigator', 'auditor', 'partner_admin', 'partner_user')
GROUP BY rp.role
ORDER BY rp.role;

