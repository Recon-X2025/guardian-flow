-- Check app_role enum and count roles
SELECT 'Total app_role values:' as check, COUNT(*) as count
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype;

-- List ALL app_role values
SELECT enumlabel as role_name
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype
ORDER BY enumlabel;

-- Check if client roles exist
SELECT 'Client roles count:' as check, COUNT(*) as count
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%';

-- Show client roles specifically
SELECT 'Client roles:' as check, enumlabel as role_name
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%'
ORDER BY enumlabel;

