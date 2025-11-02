-- Verify the 4 critical test users and their roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  '✅' as status
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email IN ('ops@techcorp.com', 'finance@techcorp.com', 'fraud@techcorp.com', 'auditor@techcorp.com')
ORDER BY p.email, ur.role;

