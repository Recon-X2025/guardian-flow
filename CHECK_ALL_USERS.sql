-- Check ALL users in the system
SELECT 
  email,
  id,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Also check profiles
SELECT 
  email,
  id,
  created_at,
  full_name
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

-- Check user_roles
SELECT 
  ur.user_id,
  p.email,
  ur.role
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
ORDER BY p.email;

