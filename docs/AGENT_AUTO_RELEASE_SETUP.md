# Agent Auto-Release Setup Guide

## Overview
The Ops Agent automatically releases work orders that pass precheck validation when the agent toggle is enabled.

## How It Works

### 1. Precheck Orchestration Auto-Release
When a precheck is run and passes, the system automatically:
- Checks if the `agent_ops_autonomous` feature toggle is enabled
- If enabled, immediately releases the work order to the field
- Updates work order status to `assigned`
- Logs the auto-release event

### 2. Background Agent Processor
A scheduled background processor runs every 5 minutes to catch any missed releases:
```sql
-- Schedule agent processor to run every 5 minutes
select cron.schedule(
  'ops-agent-auto-release',
  '*/5 * * * *',
  $$
  select net.http_post(
    url:='https://PROJECT_REF.supabase.co/functions/v1/ops-agent-processor',
    headers:='{"Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);
```

## Enable/Disable Agent

### Via UI
1. Navigate to **Pending Validation** page
2. Toggle "Agent Auto-Release" switch
3. When enabled, the agent will automatically release eligible work orders

### Via Database
```sql
-- Enable agent auto-release
UPDATE feature_toggles 
SET enabled = true 
WHERE feature_key = 'agent_ops_autonomous';

-- Disable agent auto-release
UPDATE feature_toggles 
SET enabled = false 
WHERE feature_key = 'agent_ops_autonomous';
```

## Eligibility Criteria
A work order is eligible for auto-release when:
1. Status is `pending_validation` or `draft`
2. Precheck has been completed (`work_order_prechecks` exists)
3. `can_release` flag is `true` (inventory and warranty passed)
4. Agent toggle is enabled

## Monitoring

### Check Agent Status
```sql
SELECT 
  feature_key,
  enabled,
  updated_at
FROM feature_toggles
WHERE feature_key = 'agent_ops_autonomous';
```

### View Auto-Released Work Orders
```sql
SELECT 
  wo.wo_number,
  wo.released_at,
  el.created_at as auto_release_time,
  el.payload
FROM work_orders wo
JOIN events_log el ON el.entity_id = wo.id
WHERE el.event_type = 'work_order_auto_released'
ORDER BY el.created_at DESC
LIMIT 20;
```

### Check Pending Work Orders
```sql
SELECT 
  wo.wo_number,
  wo.status,
  wop.can_release,
  wop.inventory_status,
  wop.warranty_status
FROM work_orders wo
LEFT JOIN work_order_prechecks wop ON wop.work_order_id = wo.id
WHERE wo.status IN ('pending_validation', 'draft')
ORDER BY wo.created_at DESC;
```

## Troubleshooting

### Agent Not Releasing Work Orders
1. Check if agent is enabled:
   ```sql
   SELECT enabled FROM feature_toggles WHERE feature_key = 'agent_ops_autonomous';
   ```

2. Check if work orders are eligible:
   ```sql
   SELECT * FROM work_order_prechecks WHERE can_release = true;
   ```

3. Check agent processor logs in Supabase Dashboard

### Manual Trigger
You can manually trigger the agent processor:
```bash
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/ops-agent-processor
```

## Architecture

```
┌─────────────────┐
│  Precheck Run   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Can Release?   │────▶│ Agent ON?    │
└─────────────────┘  No └──────┬───────┘
         │                     │ Yes
         │ Yes                 ▼
         │              ┌──────────────┐
         │              │ Auto-Release │
         └──────────────┤   Work Order │
                        └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Status:     │
                        │  "assigned"  │
                        └──────────────┘
```

## Safety Features
- Only processes work orders that have passed precheck
- Logs all auto-release actions for audit
- Can be disabled instantly via toggle
- Background processor has rate limits (10 WOs per run)
- Runs every 5 minutes to prevent system overload
