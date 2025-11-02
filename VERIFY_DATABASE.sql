-- Quick verification queries for Guardian Flow database setup

-- 1. Check if app_role enum exists and has all roles
SELECT '✅ CLIENT ROLES:' as check_type, COUNT(*) as count
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%';

-- 2. Check all app_role values
SELECT 'Total app_role values:' as check_type, COUNT(*) as count
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype;

-- 3. Check client-vendor tables exist
SELECT '✅ CLIENT TABLES:' as check_type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals');

-- 4. Check client permissions were added
SELECT '✅ CLIENT PERMISSIONS:' as check_type, COUNT(*) as count
FROM public.permissions 
WHERE category IN ('vendor', 'contract', 'sla', 'rfp');

-- 5. Check role-permission mappings for client roles
SELECT '✅ CLIENT ROLE MAPPINGS:' as check_type, COUNT(DISTINCT role) as client_role_count
FROM role_permissions 
WHERE role::text LIKE 'client_%';

-- 6. List all client roles
SELECT 'All Client Roles:' as check_type, enumlabel as role_name
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%'
ORDER BY enumlabel;

-- 7. Check all tables created
SELECT 'All Tables:' as check_type, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

