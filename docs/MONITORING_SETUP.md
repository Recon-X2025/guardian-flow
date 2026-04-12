# Monitoring & Observability

**Version:** 7.0 | **Date:** April 2026

## Overview

Guardian Flow includes built-in observability infrastructure. Metrics are collected per-request via Express.js middleware, stored in the database, and exposed via the `/api/metrics` route. The platform also includes structured logging, correlation IDs, health endpoints, and SLA monitoring.

---

## 1. Built-in Health Endpoints

```
GET /health          — Basic liveness (no auth required)
GET /api/health      — Detailed health (no auth required)
```

Response format:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-12T04:00:00.000Z",
  "version": "6.1.0",
  "services": {
    "database": "connected",
    "ai": "mock"
  }
}
```

---

## 2. Request Metrics

Every HTTP request is instrumented by `metricsMiddleware` in `server/server.js`. Metrics include:

- Request count by route and method
- Response time (p50, p95, p99)
- Error rate by status code
- Tenant-level request breakdown

Metrics are stored in the `platform_metrics` collection and exposed at:
```
GET /api/metrics          — Admin metrics summary
GET /api/platform-metrics — Detailed platform-level stats
```

Frontend: `src/domains/analytics/pages/PlatformMetrics.tsx` at `/platform-metrics` (admin only).

---

## 3. Correlation IDs

Every request receives a `correlationId` (UUID) injected by middleware at entry. This ID propagates through:

- All log lines for the request
- All database writes triggered by the request
- All API error responses (`"correlationId"` field)
- FlowSpace decision records created during the request

This makes it possible to trace a complete request chain from the frontend error log to the backend service call.

---

## 4. Structured Logging

`server/utils/logger.js` provides a structured logger used across all routes and services.

Log levels: `info`, `warn`, `error`

All logs include:
```json
{
  "level": "info",
  "message": "Work order created",
  "correlationId": "req-abc-123",
  "tenantId": "tenant-uuid",
  "timestamp": "2026-04-12T04:00:00.000Z"
}
```

Frontend errors are forwarded to the backend via `POST /api/log-error` and stored in the `frontend_error_log` collection.

---

## 5. Analytics Event Tracking

`server/services/analytics.js` provides fire-and-forget event tracking:

```javascript
import { trackEvent, flushHourlyAggregate } from '../services/analytics.js';

// Safe to call from any route without try/catch
trackEvent({ tenantId, event: 'work_order.created', metadata: { woId } });
```

Events are aggregated hourly by `flushHourlyAggregate()` (called by the scheduled reports runner) and stored in `analytics_events`.

Frontend analytics: `src/domains/analytics/pages/Analytics.tsx`

---

## 6. SLA Monitoring

`server/routes/sla.js` at `/api/sla` provides:
- Active SLA breach alerts
- SLA attainment rate by tenant
- First-time fix rate (computed from `work_orders` collection — **not** a `Math.random()` stub)

SLA rules are configurable per tenant via `/api/sla-rules`.

Frontend: Observability dashboard at `/observability`.

---

## 7. Security Monitoring

`server/routes/security-monitor.js` at `/api/security` provides:
- Failed authentication attempt tracking
- Unusual access pattern detection
- Rate limit violation logs
- Cross-tenant access attempt alerts (should always be 0 except `sys_admin`)

Alerts can be forwarded to a SIEM via webhook (configure `SIEM_WEBHOOK_URL` env var).

---

## 8. Observability Dashboard

`src/domains/shared/pages/Observability.tsx` at `/observability`:
- System health overview
- Request volume and error rate charts
- SLA attainment metrics
- Active alerts

---

## 9. Scheduled Monitoring Jobs

`server/routes/scheduled-reports.js` runs recurring jobs:

| Job | Frequency | Purpose |
|-----|-----------|---------|
| `health-monitor` | Every 5 minutes | Health check + alert on degraded services |
| `sla-checker` | Every 15 minutes | Flag work orders approaching SLA breach |
| `analytics-flush` | Hourly | Aggregate raw events into hourly summaries |
| `access-review` | Quarterly (automated trigger) | Flag stale permissions for review |

---

## 10. Platform Metrics Available

| Metric | Source |
|--------|--------|
| Active tenants | `profiles` collection count |
| Work orders created / completed (24h) | `work_orders` collection |
| Invoice amount processed (30d) | `invoices` collection |
| AI requests (mock vs live) | `ai_governance_logs` |
| SLA attainment rate | `work_orders` completion vs deadline |
| First-time fix rate | `work_orders` callback analysis |
| Anomaly alerts triggered (24h) | `anomaly_cases` collection |

---

## 11. Alerting

No managed alerting service is currently integrated. Options for production:

| Tool | Integration method |
|------|--------------------|
| Datadog | Configure `SIEM_WEBHOOK_URL` to Datadog Log Intake |
| PagerDuty | Configure webhook in `security-monitor` route |
| Splunk | Configure `SIEM_WEBHOOK_URL` to Splunk HEC |
| Custom | Poll `/api/metrics` from external monitoring agent |

Manual on-call escalation is the current fallback for production incidents.

---

## 12. Key Metrics to Alert On (Recommendations)

| Alert | Threshold | Action |
|-------|-----------|--------|
| API error rate | > 5% of requests | Investigate route handler |
| Auth 403 spike | > 10 per minute | Possible credential stuffing |
| DB connection failures | Any | Check Atlas cluster status |
| SLA breach forecast | Any WO within 2h of deadline | Notify dispatcher |
| Cross-tenant access attempt | Any | Immediate security review |
| AI provider error rate | > 20% of AI requests | Check OPENAI_API_KEY validity |
