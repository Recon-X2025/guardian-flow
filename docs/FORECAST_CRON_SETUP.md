# Forecast Cron Setup

**Version:** 7.0 | **Date:** April 2026

> Forecast scheduling details are covered in `docs/INDIA_FORECASTING_SYSTEM.md`. This file focuses specifically on the cron configuration.

---

## Scheduled Forecast Jobs

Forecasts run via the scheduled reports runner in `server/routes/scheduled-reports.js`.

| Job | Default Schedule (UTC) | Description |
|-----|------------------------|-------------|
| `forecast-refresh` | Daily at 02:00 | Recompute forecasts for all active tenants |
| `forecast-accuracy-check` | Weekly (Monday 03:00) | Compare forecast vs actuals for the prior week |
| `analytics-flush` | Hourly | Aggregate raw analytics events into hourly summaries |

---

## Changing the Forecast Schedule

Edit `server/routes/scheduled-reports.js`:

```javascript
// Daily at 02:00 UTC
const FORECAST_CRON = '0 2 * * *';

// Every 6 hours
const FORECAST_CRON = '0 */6 * * *';

// Every Monday at 03:00 UTC
const ACCURACY_CRON = '0 3 * * 1';
```

Standard cron format: `minute hour day-of-month month day-of-week`

---

## Manual Trigger

To run a forecast refresh immediately without waiting for the cron schedule:

```bash
POST /api/scheduled-reports/run
Authorization: Bearer <sys_admin_token>
Content-Type: application/json

{
  "job": "forecast-refresh",
  "tenantId": "<tenant_id>"
}
```

To run for all tenants:

```bash
POST /api/scheduled-reports/run
Authorization: Bearer <sys_admin_token>
Content-Type: application/json

{
  "job": "forecast-refresh",
  "all_tenants": true
}
```

---

## Monitoring Forecast Jobs

Job run history is stored in the `scheduled_job_log` collection. Query recent runs:

```bash
GET /api/scheduled-reports/log?job=forecast-refresh&limit=10
Authorization: Bearer <sys_admin_token>
```

Alerts: If a forecast job has not run within 25 hours, check the scheduled reports runner process is alive and the database connection is healthy.

---

## LLM-Enhanced Forecasts

When `AI_PROVIDER=openai` is set, each scheduled forecast refresh also generates a natural-language narrative summary. This increases the cost of each scheduled run by approximately:

- ~1,000–2,000 tokens per tenant per run
- At OpenAI pricing (~$0.002 / 1K tokens): < $0.01 per tenant per daily run

All LLM calls during scheduled forecasts are logged to `ai_governance_logs` and FlowSpace.
