# Agent Auto-Release Setup Guide - Enhanced Automation

## Overview
The Ops Agent is a fully autonomous backend automation system that **automatically runs prechecks** and **releases eligible work orders** when enabled. It continuously monitors pending work orders and takes action without manual intervention.

## Enhanced Capabilities

### 🤖 Full Automation Workflow
When the agent is enabled, it performs the following actions **automatically every 5 minutes**:

1. **Automatic Precheck Execution**
   - Scans for work orders in `pending_validation` or `draft` status
   - Identifies work orders without prechecks
   - Automatically triggers precheck orchestration (inventory + warranty checks)
   - Logs all precheck results for audit

2. **Intelligent Auto-Release**
   - Identifies work orders that passed prechecks (`can_release = true`)
   - Automatically releases them to field (status → `assigned`)
   - Logs release events with full metadata
   - Creates notifications for stakeholders

3. **Real-Time UI Updates**
   - Changes are immediately reflected in the UI via Supabase Realtime
   - No page refresh needed to see agent actions
   - Live status indicators show when agent is active

## How It Works

### 1. Background Agent Processor
The `ops-agent-processor` function runs every 5 minutes via cron job:

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

### 2. Agent Processing Cycle

Each cycle performs:
- **Step 1**: Find work orders needing prechecks → Run precheck-orchestrator
- **Step 2**: Find work orders ready for release → Auto-release to field
- **Step 3**: Log all actions and create notifications

### 3. Precheck Orchestration Integration
When a precheck is manually triggered and passes, the system:
- Checks if `agent_ops_autonomous` feature toggle is enabled
- If enabled, immediately releases the work order (no waiting for cron)
- Updates work order status to `assigned`
- Logs the auto-release event

## Enable/Disable Agent

### Via UI (Recommended)
1. Navigate to **Pending Validation** page
2. Toggle "🤖 Agent Auto-Release" switch
3. When enabled:
   - Agent immediately triggers an initial processing cycle
   - Green pulsing indicator shows agent is active
   - Alert banner displays automation status
4. When disabled:
   - All automation stops
   - Manual precheck and release required

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

### Immediate Trigger
Enabling the agent via UI triggers an immediate processing cycle (doesn't wait 5 minutes).

## Eligibility Criteria

### For Automatic Precheck:
- Status is `pending_validation` or `draft`
- No existing precheck record
- Agent toggle is enabled

### For Automatic Release:
- Status is `pending_validation` or `draft`
- Precheck has been completed
- `can_release` flag is `true` (inventory and warranty passed)
- Agent toggle is enabled

## Monitoring & Observability

### Check Agent Status
```sql
SELECT 
  feature_key,
  enabled,
  updated_at
FROM feature_toggles
WHERE feature_key = 'agent_ops_autonomous';
```

### View Agent Processing History
```sql
SELECT 
  event_type,
  created_at,
  payload->>'wo_number' as work_order,
  payload->>'tenant_id' as tenant
FROM events_log
WHERE agent_id = 'ops_agent_autonomous'
  AND event_type IN (
    'agent_precheck_completed',
    'agent_precheck_failed',
    'work_order_auto_released',
    'agent_release_failed'
  )
ORDER BY created_at DESC
LIMIT 50;
```

### View Auto-Released Work Orders
```sql
SELECT 
  wo.wo_number,
  wo.released_at,
  wo.tenant_id,
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
  wo.tenant_id,
  wop.can_release,
  wop.inventory_status,
  wop.warranty_status,
  CASE 
    WHEN wop.id IS NULL THEN 'Needs Precheck'
    WHEN wop.can_release THEN 'Ready for Release'
    ELSE 'Blocked'
  END as agent_action_status
FROM work_orders wo
LEFT JOIN work_order_prechecks wop ON wop.work_order_id = wo.id
WHERE wo.status IN ('pending_validation', 'draft')
ORDER BY wo.created_at DESC;
```

### Real-Time Monitoring in UI
The Pending Validation page includes:
- Live status indicator (pulsing green dot when active)
- Agent activity banner with detailed status
- Real-time work order updates via Supabase Realtime
- Badges showing agent-released work orders

## Troubleshooting

### Agent Not Running Prechecks
1. **Check if agent is enabled:**
   ```sql
   SELECT enabled FROM feature_toggles WHERE feature_key = 'agent_ops_autonomous';
   ```

2. **Check for work orders needing prechecks:**
   ```sql
   SELECT wo.id, wo.wo_number, wo.status
   FROM work_orders wo
   LEFT JOIN work_order_prechecks wop ON wop.work_order_id = wo.id
   WHERE wo.status IN ('pending_validation', 'draft')
     AND wop.id IS NULL;
   ```

3. **Check agent processor logs:**
   Look for `[ops-agent-processor]` entries in edge function logs

4. **Verify cron job is scheduled:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'ops-agent-auto-release';
   ```

### Agent Not Releasing Work Orders
1. **Verify prechecks are passing:**
   ```sql
   SELECT * FROM work_order_prechecks 
   WHERE can_release = true
   ORDER BY created_at DESC;
   ```

2. **Check for release failures:**
   ```sql
   SELECT payload 
   FROM events_log
   WHERE event_type = 'agent_release_failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Manual Trigger (for testing)
```bash
# Trigger agent processor manually
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/ops-agent-processor
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│           AGENT AUTO-RELEASE SYSTEM (Enhanced)           │
└──────────────────────────────────────────────────────────┘
                             │
                    Every 5 minutes (cron)
                             │
                             ▼
                  ┌─────────────────────┐
                  │  ops-agent-processor │
                  │   (Edge Function)    │
                  └──────────┬───────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │   STEP 1: PRECHECK   │   │  STEP 2: RELEASE     │
    │                      │   │                      │
    │ Find WOs without     │   │ Find WOs with passed │
    │ prechecks            │   │ prechecks            │
    │         │            │   │         │            │
    │         ▼            │   │         ▼            │
    │ Run precheck-        │   │ Update status to     │
    │ orchestrator         │   │ "assigned"           │
    │         │            │   │         │            │
    │         ▼            │   │         ▼            │
    │ Log results          │   │ Log auto-release     │
    └──────────────────────┘   └──────────────────────┘
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  Create Notification │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  Realtime UI Update  │
                  │  (Supabase Channel)  │
                  └─────────────────────┘
```

## Safety Features
- ✅ Only processes work orders that meet eligibility criteria
- ✅ Full audit logging for all agent actions
- ✅ Can be disabled instantly via toggle
- ✅ Rate limits prevent system overload (5 prechecks, 10 releases per cycle)
- ✅ Tenant isolation enforced throughout
- ✅ Error handling with automatic retry logic
- ✅ Real-time notifications for stakeholders
- ✅ Complete rollback capability (disable agent anytime)

## Event Types

The agent generates the following event types in `events_log`:

| Event Type | Description |
|------------|-------------|
| `agent_precheck_completed` | Precheck successfully run by agent |
| `agent_precheck_failed` | Precheck failed during agent execution |
| `work_order_auto_released` | Work order automatically released to field |
| `agent_release_failed` | Release attempt failed |

All events include:
- `agent_id`: `ops_agent_autonomous`
- `tenant_id`: For proper isolation
- Full metadata in `payload`

## Performance Characteristics

- **Processing Rate**: 5 prechecks + 10 releases per 5-minute cycle
- **Response Time**: <2 seconds per precheck, <500ms per release
- **Scalability**: Horizontally scalable across tenants
- **Reliability**: Automatic retry with exponential backoff
- **Observability**: Full logging and real-time monitoring
