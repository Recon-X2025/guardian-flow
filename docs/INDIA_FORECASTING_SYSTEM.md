# Forecasting System

**Version:** 7.0 | **Date:** April 2026

## Overview

Guardian Flow includes a hierarchical forecasting system for predicting service demand, technician utilisation, and revenue projections. Forecasts operate at three levels: national, regional, and local (branch/district).

The system uses statistical methods (moving average, trend decomposition) by default, and upgrades to LLM-enhanced narrative explanations and confidence scoring when `OPENAI_API_KEY` is configured.

---

## 1. Architecture

```
Historical Data (work_orders, invoices, analytics_events)
    │
    ▼
Forecast Engine (server/routes/forecasting.js)
    │
    ├── Statistical baseline: moving average + seasonal decomposition
    ├── Hierarchy reconciliation: Top-down and bottom-up aggregation
    └── [Optional] LLM narrative: AI-generated explanation + confidence score
                                   (requires OPENAI_API_KEY)
    │
    ▼
ForecastCenter UI (src/domains/analytics/pages/ForecastCenter.tsx)
at /forecast
```

---

## 2. Forecast Levels

| Level | Scope | Primary Use |
|-------|-------|-------------|
| National | All tenants (sys_admin) | Platform-level capacity planning |
| Regional | Tenant + region | Regional resource allocation |
| Local | Branch / district | Day-to-day technician scheduling |

---

## 3. Forecast Dimensions

The system produces forecasts across:

- **Work order volume** — predicted number of new WOs per day/week/month
- **Technician utilisation** — predicted percentage of available hours used
- **Revenue** — projected invoice value
- **SLA breach risk** — probability of SLA failures given predicted volume
- **Parts demand** — predicted inventory consumption

---

## 4. India-Market Specifics

The forecasting system includes India-specific adjustments:

### Regional Hierarchy

```
National (India)
├── North (Delhi NCR, Punjab, Haryana, UP, Uttarakhand, HP, J&K)
├── South (Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana)
├── East (West Bengal, Odisha, Bihar, Jharkhand, Northeast)
└── West (Maharashtra, Gujarat, Rajasthan, Goa, MP)
```

### India-Specific Factors Applied to Forecasts

| Factor | Impact |
|--------|--------|
| National holidays (Republic Day, Independence Day, Gandhi Jayanti) | Volume dip ±30% |
| Regional festivals (Diwali, Pongal, Durga Puja, Onam, Eid) | Adjusted by region |
| Monsoon season (June–September) | Travel time increase; outdoor WO volume dip |
| Regional salary cycles (salary credited dates) | Payment collection timing |
| Bharat Bandh / regional strikes | Stochastic volume disruption |

Holiday and regional calendar data is maintained in `server/data/india-calendar.js`.

---

## 5. Running the Forecast Cron Job

### Manual trigger (ad-hoc)

```bash
POST /api/scheduled-reports/run
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "job": "forecast-refresh",
  "tenantId": "<tenant_id>"
}
```

### Scheduled (automated)

Forecasts refresh automatically via the scheduled reports runner. Default schedule: **daily at 02:00 UTC**.

To change the schedule, update the cron expression in `server/routes/scheduled-reports.js`:

```javascript
const FORECAST_CRON = '0 2 * * *';  // daily at 02:00 UTC
```

---

## 6. Forecast API

```
GET  /api/analytics/forecast?level=national&horizon=30d
GET  /api/analytics/forecast?level=regional&region=south&horizon=7d
GET  /api/analytics/forecast?level=local&branch=chennai-central&horizon=7d
```

Parameters:
- `level`: `national`, `regional`, `local`
- `region`: `north`, `south`, `east`, `west` (required for regional/local)
- `branch`: branch identifier (required for local)
- `horizon`: `7d`, `30d`, `90d`

Response:
```json
{
  "level": "regional",
  "region": "south",
  "horizon": "30d",
  "forecast": [
    { "date": "2026-04-13", "predicted_wo_volume": 142, "confidence": 0.82 },
    ...
  ],
  "narrative": "...",    // populated when AI_PROVIDER=openai
  "model": "statistical" // or "openai" when LLM is used
}
```

---

## 7. AI-Enhanced Forecasting

When `OPENAI_API_KEY` is set and `AI_PROVIDER=openai`:

1. Statistical forecast is computed first
2. LLM generates a plain-language narrative explaining the forecast drivers
3. Confidence interval explanation is added to the response
4. LLM call is logged to `ai_governance_logs` and FlowSpace

Without the API key, the statistical baseline is returned without a narrative.

---

## 8. Data Requirements

Forecast quality improves significantly with more historical data. Minimum recommended:

| Data | Minimum | Recommended |
|------|---------|-------------|
| Work orders (completed) | 30 days | 12 months |
| Invoice history | 30 days | 12 months |
| Technician shift records | 14 days | 6 months |

New tenants will see lower forecast confidence scores until sufficient data is accumulated.

---

## 9. Forecast Accuracy Monitoring

The `PlatformMetrics` page (`/platform-metrics`) shows forecast vs actual comparison charts. Run the comparison query manually:

```bash
GET /api/analytics/forecast/accuracy?tenantId=<id>&period=last_30d
Authorization: Bearer <admin_token>
```

Target MAPE (Mean Absolute Percentage Error): < 15% for 7-day horizon, < 25% for 30-day horizon.
