# Guardian Flow Monitoring & Self-Healing System

**Version**: 1.0
**Date**: April 12, 2026
**Status**: Production Ready

---

## 📋 Overview

Automated monitoring system for Guardian Flow using scheduled jobs for health checks, workflow validations, and self-healing actions.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Scheduled Job Monitoring                    │
│  • Every 5 minutes: health-monitor                      │
│  • Every 15 minutes: workflow-validator                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Monitoring Services                      │
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

### Step 1: Configure Scheduled Jobs

Set up monitoring jobs using your preferred scheduler (node-cron, AWS EventBridge, or similar):

**Health Monitor (Every 5 minutes)**:

```javascript
// Schedule health monitor
schedule.scheduleJob('*/5 * * * *', async () => {
  await fetch('http://localhost:3001/api/monitoring/health-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MONITORING_TOKEN}`
    }
  });
});
```

**Workflow Validator (Every 15 minutes)**:

```javascript
// Schedule workflow validator
schedule.scheduleJob('*/15 * * * *', async () => {
  await fetch('http://localhost:3001/api/monitoring/workflow-validation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MONITORING_TOKEN}`
    }
  });
});
```

**Monitoring Summary Refresh (Every 5 minutes)**:

```javascript
// Schedule monitoring summary refresh
schedule.scheduleJob('*/5 * * * *', async () => {
  await refreshMonitoringSummary();
});
```

### Step 2: Verify Scheduled Jobs

```javascript
// Check job status
console.log('Scheduled jobs:', schedule.scheduledJobs);
```

### Step 3: Test Manual Execution

```bash
# Test health monitor
curl -X POST http://localhost:3001/api/monitoring/health-check \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test workflow validator
curl -X POST http://localhost:3001/api/monitoring/workflow-validation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Monitoring Dashboard Queries

### Health Check Summary (Last 24 Hours)

```javascript
// MongoDB query
db.health_check_logs.aggregate([
  {
    $match: {
      checked_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: "$check_name",
      total_checks: { $sum: 1 },
      healthy_count: {
        $sum: { $cond: [{ $eq: ["$status", "healthy"] }, 1, 0] }
      },
      unhealthy_count: {
        $sum: { $cond: [{ $ne: ["$status", "healthy"] }, 1, 0] }
      },
      avg_response_time: { $avg: "$response_time_ms" },
      max_response_time: { $max: "$response_time_ms" }
    }
  },
  { $sort: { _id: 1 } }
]);
```

### Recent Failed Checks

```javascript
db.health_check_logs.find({
  status: { $ne: "healthy" },
  checked_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
})
.sort({ checked_at: -1 })
.limit(20);
```

### Workflow Validation Status

```javascript
db.workflow_validation_logs.aggregate([
  {
    $match: {
      executed_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: "$workflow_name",
      total_runs: { $sum: 1 },
      passed_count: {
        $sum: { $cond: [{ $eq: ["$status", "passed"] }, 1, 0] }
      },
      failed_count: {
        $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
      },
      avg_execution_time: { $avg: "$execution_time_ms" },
      last_run: { $max: "$executed_at" }
    }
  },
  { $sort: { _id: 1 } }
]);
```

### Open System Incidents

```javascript
db.system_incidents.find({
  status: { $in: ["open", "investigating"] }
})
.sort({ severity: -1, detected_at: -1 });
```

### Self-Healing Activity

```javascript
db.self_healing_logs.find({
  created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
})
.sort({ created_at: -1 })
.limit(50);
```

### Overall System Health

```javascript
db.monitoring_summary.find();
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
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

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

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'alerts@yourdomain.com',
  to: ['ops-team@yourdomain.com'],
  subject: 'Guardian Flow: Critical Alert',
  html: `<h1>Health Check Failures</h1>...`,
});
```

---

## 🔍 Troubleshooting

### Scheduled Jobs Not Running

```bash
# Check job status in your scheduler
# For node-cron:
console.log('Active jobs:', Object.keys(schedule.scheduledJobs));

# Check for errors in application logs
tail -f logs/monitoring.log
```

### Function Timeouts

- Increase timeout in health checks (currently 5-10s)
- Check application logs for timeout errors
- Verify MongoDB Atlas connectivity

### Missing Data in Logs

- Verify database write permissions
- Check application execution logs
- Ensure scheduled jobs are running correctly

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
**Last Updated**: April 12, 2026  
**Next Review**: May 31, 2026
