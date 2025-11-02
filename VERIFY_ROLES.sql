-- Verify users and roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  p.tenant_id
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY p.email
LIMIT 30;

-- Count by role
SELECT 
  ur.role,
  COUNT(*) as user_count
FROM public.user_roles ur
GROUP BY ur.role
ORDER BY user_count DESC;

