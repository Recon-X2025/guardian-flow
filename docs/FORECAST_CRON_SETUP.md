# Forecast System Cron Setup

## Daily Forecast Generation

To run hierarchical forecasts daily at 3 AM, enable `pg_cron` extension and create the schedule:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily forecast generation at 3 AM
SELECT cron.schedule(
  'daily-hierarchical-forecast',
  '0 3 * * *', -- At 3:00 AM every day
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-forecast',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"geography_levels": ["country","region","state","district","city","partner_hub","pin_code"]}'::jsonb
  ) as request_id;
  $$
);

-- Schedule forecast reconciliation 30 minutes after generation
SELECT cron.schedule(
  'daily-forecast-reconciliation',
  '30 3 * * *', -- At 3:30 AM every day
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/reconcile-forecast',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := jsonb_build_object(
      'target_date', current_date::text,
      'forecast_type', 'volume'
    )
  ) as request_id;
  $$
);

-- Weekly forecast worker execution (processes queued jobs)
SELECT cron.schedule(
  'weekly-forecast-worker',
  '0 2 * * 0', -- At 2:00 AM every Sunday
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/forecast-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

## Monitoring Cron Jobs

Check cron job status:

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Unschedule a job
SELECT cron.unschedule('daily-hierarchical-forecast');
```

## Manual Triggers

For testing or manual runs:

```bash
# Generate forecasts manually
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-forecast \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"geography_levels": ["country","city","pin_code"]}'

# Check forecast status
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/forecast-status \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Reconcile forecasts
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/reconcile-forecast \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_date": "2025-10-08", "forecast_type": "volume"}'
```

## Architecture Notes

- **Hierarchical Pipeline**: Country → Region → State → District → City → Hub → Pin Code
- **Reconciliation**: Bottom-up aggregation with MinT variance correction (±3% threshold)
- **Agent Integration**: Agents query forecasts by geography_key + product_id
- **Retention**: 18 months of forecast_outputs, older records archived
- **Model Retraining**: Monthly automatic retrain if accuracy drops below 80%
