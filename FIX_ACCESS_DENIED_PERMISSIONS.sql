-- Fix Access Denied Issues Across Multiple Roles
-- This script adds missing permissions to roles that should have access to various modules

-- ============================================================
-- 1. Add admin.config permission to tenant_admin and partner_admin
-- ============================================================
-- tenant_admin should have admin.config (they manage their tenant's config)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tenant_admin'::app_role, id 
FROM public.permissions 
WHERE name = 'admin.config'
ON CONFLICT (role, permission_id) DO NOTHING;

-- partner_admin should have admin.config (they manage marketplace and partner settings)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id 
FROM public.permissions 
WHERE name = 'admin.config'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ops_manager should have admin.config (they configure operational settings)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager'::app_role, id 
FROM public.permissions 
WHERE name = 'admin.config'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 2. Add marketplace-related permissions to partner_admin
-- ============================================================
-- Add marketplace permissions if they exist
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id 
FROM public.permissions 
WHERE name LIKE 'marketplace.%' OR name LIKE 'partner.%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 3. Add missing category permissions to roles
-- ============================================================

-- Add 'marketplace' category permissions to partner_admin (if category exists)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id 
FROM public.permissions 
WHERE category = 'marketplace'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Add 'developer' category permissions to partner_admin and tenant_admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id 
FROM public.permissions 
WHERE category IN ('developer', 'marketplace')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tenant_admin'::app_role, id 
FROM public.permissions 
WHERE category IN ('developer', 'marketplace')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 4. Ensure ops_manager has access to common operational routes
-- ============================================================
-- ops_manager should have analytics permissions for operational dashboards
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager'::app_role, id 
FROM public.permissions 
WHERE category = 'analytics' OR name LIKE 'analytics.%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 5. Add ml_ops permissions if missing
-- ============================================================
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ml_ops'::app_role, id 
FROM public.permissions 
WHERE category IN ('ml_ops', 'ml') OR name LIKE 'mlops.%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 6. VERIFICATION QUERIES
-- ============================================================

-- Check if admin.config is now assigned to the roles
SELECT 
    rp.role::text as role_name,
    p.name as permission_name,
    p.category
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE p.name = 'admin.config'
ORDER BY rp.role;

-- Check permission counts per role
SELECT 
    rp.role::text as role_name,
    COUNT(*) as permission_count,
    STRING_AGG(DISTINCT p.category, ', ' ORDER BY p.category) as categories
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
GROUP BY rp.role
ORDER BY rp.role;

-- List all permissions for partner_admin
SELECT 
    p.name,
    p.category,
    p.description
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'partner_admin'::app_role
ORDER BY p.category, p.name;

