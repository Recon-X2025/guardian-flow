# Guardian Flow Monitoring & Self-Healing System

**Version**: 1.0  
**Date**: October 31, 2025  
**Status**: Production Ready

---

## 📋 Overview

Automated monitoring system for Guardian Flow using Lovable Cloud edge functions and Supabase cron scheduling. Performs health checks, workflow validations, and self-healing actions without infrastructure overhead.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Supabase pg_cron Scheduler                 │
│  • Every 5 minutes: health-monitor                      │
│  • Every 15 minutes: workflow-validator                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Edge Functions                          │
│  ┌─────────────────┐    ┌───────────────────┐          │
│  │ health-monitor  │    │ workflow-validator│          │
│  │  • HTTP checks  │    │  • Critical flows │          │
│  │  • DB queries   │    │  • E2E validation │          │
│  └─────────────────┘    └───────────────────┘          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Database Logging                         │
│  • health_check_logs                                     │
│  • workflow_validation_logs                              │
│  • self_healing_logs                                     │
│  • system_incidents                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Self-Healing Actions                        │
│  • Clear query cache                                     │
│  • Create incident tickets                               │
│  • Log remediation attempts                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Instructions

### Step 1: Enable Required Extensions

Run in Supabase SQL Editor:

```sql
-- Enable cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable HTTP requests from cron
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Configure Cron Jobs

**Health Monitor (Every 5 minutes)**:

```sql
SELECT cron.schedule(
  'health-monitor-every-5min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/health-monitor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdnJmenltZWVyZWZzZHdxaG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzU1NDMsImV4cCI6MjA3NTAxMTU0M30.hKqz5ZaEB0plQj3Gs9q3tiyaA8VQgVm-qmfRw0ThvBY"}'::jsonb
    ) as request_id;
  $$
);
```

**Workflow Validator (Every 15 minutes)**:

```sql
SELECT cron.schedule(
  'workflow-validator-every-15min',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/workflow-validator',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdnJmenltZWVyZWZzZHdxaG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzU1NDMsImV4cCI6MjA3NTAxMTU0M30.hKqz5ZaEB0plQj3Gs9q3tiyaA8VQgVm-qmfRw0ThvBY"}'::jsonb
    ) as request_id;
  $$
);
```

**Monitoring Summary Refresh (Every 5 minutes)**:

```sql
SELECT cron.schedule(
  'refresh-monitoring-summary',
  '*/5 * * * *',
  $$
  SELECT refresh_monitoring_summary();
  $$
);
```

### Step 3: Verify Cron Jobs

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- View recent job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Step 4: Test Manual Execution

```bash
# Test health monitor
curl -X POST https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/health-monitor \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test workflow validator
curl -X POST https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/workflow-validator \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 📊 Monitoring Dashboard Queries

### Health Check Summary (Last 24 Hours)

```sql
SELECT
  check_name,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
  COUNT(*) FILTER (WHERE status = 'unhealthy') as unhealthy_count,
  AVG(response_time_ms)::INTEGER as avg_response_time,
  MAX(response_time_ms) as max_response_time
FROM health_check_logs
WHERE checked_at > now() - INTERVAL '24 hours'
GROUP BY check_name
ORDER BY check_name;
```

### Recent Failed Checks

```sql
SELECT
  check_name,
  status,
  response_time_ms,
  error_message,
  checked_at
FROM health_check_logs
WHERE status != 'healthy'
  AND checked_at > now() - INTERVAL '24 hours'
ORDER BY checked_at DESC
LIMIT 20;
```

### Workflow Validation Status

```sql
SELECT
  workflow_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'passed') as passed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  AVG(execution_time_ms)::INTEGER as avg_execution_time,
  MAX(executed_at) as last_run
FROM workflow_validation_logs
WHERE executed_at > now() - INTERVAL '24 hours'
GROUP BY workflow_name
ORDER BY workflow_name;
```

### Open System Incidents

```sql
SELECT
  id,
  title,
  severity,
  component,
  detected_at,
  description
FROM system_incidents
WHERE status IN ('open', 'investigating')
ORDER BY severity DESC, detected_at DESC;
```

### Self-Healing Activity

```sql
SELECT
  component,
  action,
  status,
  metadata,
  created_at,
  completed_at
FROM self_healing_logs
WHERE created_at > now() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
```

### Overall System Health (Materialized View)

```sql
SELECT * FROM monitoring_summary;
```

---

## 🛠️ Self-Healing Actions

### Automatic Remediation

The system performs these **stateless** self-healing actions:

1. **Database Query Cache Clear**
   - Triggered on: Database connection failures
   - Action: Execute dummy query to refresh connection pool

2. **Incident Ticket Creation**
   - Triggered on: Any critical failure
   - Action: Auto-create ticket in `system_incidents` table

3. **Self-Healing Log Tracking**
   - Triggered on: Any remediation attempt
   - Action: Log action in `self_healing_logs` table

### Manual Intervention Required

Some failures require human intervention:
- Edge function deployment issues
- Database schema corruption
- Authentication service outages
- Storage bucket permission issues

Check `system_incidents` table for open issues requiring manual resolution.

---

## 📈 Health Check Endpoints Monitored

| Check Name | Endpoint | Expected Status | Timeout |
|------------|----------|-----------------|---------|
| API Gateway | `/functions/v1/auth-me` | 401 | 5s |
| Database Connection | `/rest/v1/system_health` | 200 | 5s |
| Precheck Orchestrator | `/functions/v1/precheck-orchestrator` | 401 | 10s |
| Forecast Engine | `/functions/v1/forecast-status` | 401 | 5s |

---

## 🔄 Critical Workflows Validated

1. **Ticket to Work Order Creation**
   - Creates test ticket
   - Converts to work order
   - Verifies precheck auto-creation
   - Cleanup after test

2. **Precheck Orchestration**
   - Validates precheck function accessibility
   - Checks draft work orders exist
   - Creates test work order if needed

3. **Forecast Generation**
   - Validates forecast queue table
   - Checks forecast outputs table
   - Verifies table accessibility

4. **Invoice Creation**
   - Validates invoice table queries
   - Checks invoice structure
   - Verifies data integrity

---

## 🚨 Alert Integration (Optional)

### Slack Webhook (Future)

```typescript
// Add to health-monitor/index.ts
const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');

if (criticalFailures.length > 0 && SLACK_WEBHOOK_URL) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Critical Health Check Failures`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${criticalFailures.length} critical checks failed*\n${
              criticalFailures.map(f => `• ${f.check_name}: ${f.error_message}`).join('\n')
            }`,
          },
        },
      ],
    }),
  });
}
```

### Email Alerts via Resend (Future)

```typescript
// Add secret: RESEND_API_KEY
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

await resend.emails.send({
  from: 'alerts@yourdomain.com',
  to: ['ops-team@yourdomain.com'],
  subject: 'Guardian Flow: Critical Alert',
  html: `<h1>Health Check Failures</h1>...`,
});
```

---

## 🔍 Troubleshooting

### Cron Jobs Not Running

```sql
-- Check job status
SELECT * FROM cron.job WHERE jobname LIKE '%monitor%';

-- Check recent errors
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;

-- Manually unschedule and reschedule
SELECT cron.unschedule('health-monitor-every-5min');
-- Then run schedule command again
```

### Edge Function Timeouts

- Increase timeout in health checks (currently 5-10s)
- Check edge function logs: `supabase functions logs health-monitor`
- Verify Supabase service status

### Missing Data in Logs

- Verify RLS policies allow service role to insert
- Check edge function execution logs
- Ensure cron jobs are executing (check `cron.job_run_details`)

---

## 📊 Metrics & KPIs

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Health Check Success Rate | ≥99% | TBD |
| Workflow Validation Pass Rate | ≥95% | TBD |
| Average Response Time | ≤500ms | TBD |
| Incident Resolution Time | ≤30 min | TBD |
| Self-Healing Success Rate | ≥80% | TBD |

### Data Retention

- Health check logs: 30 days
- Workflow validation logs: 30 days
- Self-healing logs: 90 days
- System incidents: 1 year

---

## 🎯 Next Steps

1. **Week 1**: Monitor baseline metrics for 7 days
2. **Week 2**: Tune check intervals and thresholds
3. **Week 3**: Add Slack/Email alerting integration
4. **Week 4**: Integrate external SaaS monitoring (Uptime Robot, Checkly)

---

## 📞 Support

- **View Logs**: Check `health_check_logs`, `workflow_validation_logs` tables
- **Open Incidents**: Query `system_incidents` WHERE status = 'open'
- **Recent Activity**: Query `self_healing_logs` for last 24 hours

---

**Document Owner**: Platform Operations Team  
**Last Updated**: October 31, 2025  
**Next Review**: November 30, 2025
