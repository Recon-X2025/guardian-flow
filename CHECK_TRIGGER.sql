-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check profiles for recent users
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  u.created_at as auth_created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

