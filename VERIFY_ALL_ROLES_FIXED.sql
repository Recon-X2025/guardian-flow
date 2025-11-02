-- Comprehensive Verification: Are All Roles Fixed?
-- This checks if all roles have correct permissions and if there are any gaps

-- ============================================================
-- PART 1: Check Permission Mappings for All Roles
-- ============================================================

SELECT 
    rp.role::text as role_name,
    COUNT(*) as permission_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO PERMISSIONS'
        WHEN COUNT(*) < 5 THEN '⚠️ LOW PERMISSIONS'
        ELSE '✅ OK'
    END as status
FROM public.role_permissions rp
GROUP BY rp.role
ORDER BY rp.role;

-- ============================================================
-- PART 2: Verify Critical Permissions for Each Role
-- ============================================================

-- Technician: Must have wo.read
SELECT 
    'technician' as role,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = 'technician'::app_role AND p.name = 'wo.read'
        ) THEN '✅ HAS wo.read'
        ELSE '❌ MISSING wo.read'
    END as wo_read_status,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'technician'::app_role;

-- Dispatcher: Must have wo.read, wo.create, wo.assign
SELECT 
    'dispatcher' as role,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role = 'dispatcher'::app_role AND p.name = 'wo.read') THEN '✅' ELSE '❌' END as wo_read,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role = 'dispatcher'::app_role AND p.name = 'wo.create') THEN '✅' ELSE '❌' END as wo_create,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role = 'dispatcher'::app_role AND p.name = 'wo.assign') THEN '✅' ELSE '❌' END as wo_assign,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'dispatcher'::app_role;

-- Finance Manager: Must have finance.view
SELECT 
    'finance_manager' as role,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = 'finance_manager'::app_role AND p.name = 'finance.view'
        ) THEN '✅ HAS finance.view'
        ELSE '❌ MISSING finance.view'
    END as finance_view_status,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'finance_manager'::app_role;

-- Fraud Investigator: Must have fraud.view
SELECT 
    'fraud_investigator' as role,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = 'fraud_investigator'::app_role AND p.name = 'fraud.view'
        ) THEN '✅ HAS fraud.view'
        ELSE '❌ MISSING fraud.view'
    END as fraud_view_status,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'fraud_investigator'::app_role;

-- Partner Admin: Must have wo.read (at minimum)
SELECT 
    'partner_admin' as role,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = 'partner_admin'::app_role AND p.name = 'wo.read'
        ) THEN '✅ HAS wo.read'
        ELSE '❌ MISSING wo.read'
    END as wo_read_status,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'partner_admin'::app_role;

-- ML Ops: Should have mlops permissions
SELECT 
    'ml_ops' as role,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE rp.role = 'ml_ops'::app_role AND p.category = 'ml_ops'
        ) THEN '✅ HAS ml_ops permissions'
        ELSE '❌ MISSING ml_ops permissions'
    END as ml_ops_status,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'ml_ops'::app_role;

-- Customer: Must have ticket.create, wo.read
SELECT 
    'customer' as role,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role = 'customer'::app_role AND p.name = 'ticket.create') THEN '✅' ELSE '❌' END as ticket_create,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role = 'customer'::app_role AND p.name = 'wo.read') THEN '✅' ELSE '❌' END as wo_read,
    COUNT(*) as total_permissions
FROM public.role_permissions rp
WHERE rp.role = 'customer'::app_role;

-- ============================================================
-- PART 3: Check All Roles in Enum Have Permissions
-- ============================================================

SELECT 
    e.enumlabel as role_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.role_permissions WHERE role::text = e.enumlabel) THEN '✅ HAS PERMISSIONS'
        ELSE '❌ NO PERMISSIONS'
    END as status,
    COALESCE((
        SELECT COUNT(*) 
        FROM public.role_permissions 
        WHERE role::text = e.enumlabel
    ), 0) as permission_count
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'app_role'
ORDER BY e.enumlabel;

-- ============================================================
-- PART 4: Summary - Roles Status
-- ============================================================

SELECT 
    'SUMMARY' as check_type,
    COUNT(DISTINCT rp.role) as roles_with_permissions,
    (SELECT COUNT(*)::int FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role') as total_roles_in_enum,
    CASE 
        WHEN COUNT(DISTINCT rp.role) = (SELECT COUNT(*)::int FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role')
        THEN '✅ ALL ROLES HAVE PERMISSIONS'
        ELSE '⚠️ SOME ROLES MISSING PERMISSIONS'
    END as overall_status
FROM public.role_permissions rp;

