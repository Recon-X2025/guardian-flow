-- Setup cron job for ops agent auto-release
-- This should be run in the Supabase SQL Editor

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule ops-agent-processor to run every 5 minutes
SELECT cron.schedule(
  'ops-agent-auto-release',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/ops-agent-processor',
    headers:='{"Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'ops-agent-auto-release';

-- View job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ops-agent-auto-release')
ORDER BY start_time DESC 
LIMIT 10;

-- To manually unschedule (if needed):
-- SELECT cron.unschedule('ops-agent-auto-release');

-- Manual trigger for testing:
-- SELECT net.http_post(
--   url:='https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/ops-agent-processor',
--   headers:='{"Content-Type": "application/json"}'::jsonb
-- );
