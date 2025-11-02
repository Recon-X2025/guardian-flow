-- Verify current user count
SELECT COUNT(*) as total_users FROM auth.users;

-- Show breakdown by creation time
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as user_count
FROM auth.users
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC
LIMIT 10;

-- Show some examples
SELECT 
  email,
  created_at,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

