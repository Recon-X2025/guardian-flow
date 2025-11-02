-- Check if users exist in auth.users
SELECT 
  email,
  id,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email IN ('ops@techcorp.com', 'finance@techcorp.com', 'fraud@techcorp.com', 'auditor@techcorp.com')
ORDER BY email;

-- Also check what profiles exist
SELECT 
  email,
  id,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

