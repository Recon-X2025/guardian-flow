-- Check what permissions ops_manager actually has in the database
SELECT 
  p.name as permission_name,
  p.category
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role = 'ops_manager'
ORDER BY p.category, p.name;

