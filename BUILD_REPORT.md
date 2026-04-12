# Guardian Flow — Build Report

**Date:** 2026-04-12  
**Branch:** `copilot/sprint-29-through-52`  
**Head Commit:** `19080a5` — _fix: replace all Math.random stubs and weak client\_secret with real implementations_  

---

> **⚠️ Completion Re-Assessment Notice**
>
> A previous readiness summary (`readiness/reports/readiness_summary.md`) tagged Guardian Flow at **94/100** and "Production Ready." A code-level investor due-diligence audit conducted on 2026-04-12 found **three non-functional modules** that return fabricated responses behind working UIs, **one module listed in the registry but not implemented**, and **structural gaps in five further modules** that would surface under any real customer trial. These findings are documented in full in the [Gap Analysis](#gap-analysis--corrected-completion-status) section below.
>
> **Revised honest platform-wide completion: ~70%.**  
> The platform has genuine engineering depth — the revision reflects functional gaps, not missing code volume.

---

## Environment

| Item | Version |
|------|---------|
| Node.js | v24.14.1 |
| npm | 11.11.0 |
| TypeScript | ^5.8.3 |
| Vite | ^5.4.19 |
| React | ^18.3.1 |
| Express | (server) |

---

## Build — ✅ Passed

**Tool:** Vite v5.4.21 (production build)  
**Duration:** 16.59 s  
**Modules transformed:** 3,824  

### Output Bundle Summary

| Asset | Raw size | Gzip |
|-------|----------|------|
| `index.html` | 1.55 kB | 0.62 kB |
| `index.css` | 94.37 kB | 16.60 kB |
| `OrgManagementConsole-*.js` _(new MAC page)_ | 28.72 kB | 7.19 kB |
| `AdminConsole-*.js` | 22.70 kB | 5.35 kB |
| `WorkOrders-*.js` | 31.54 kB | 9.07 kB |
| `InvoiceDetailDialog-*.js` _(largest chunk)_ | 397.05 kB | 129.65 kB |
| `vendor-recharts-*.js` | 373.58 kB | 110.10 kB |
| `index-*.js` _(main entry)_ | 222.55 kB | 60.35 kB |
| `vendor-react-*.js` | 164.00 kB | 53.53 kB |
| `html2canvas.esm-*.js` | 201.42 kB | 48.03 kB |

**Total dist size:** ~3.3 MB  
**Total asset files:** 169  

> ℹ️  `baseline-browser-mapping` data is over two months old — run `npm i baseline-browser-mapping@latest -D` to refresh Baseline browser compatibility data.

---

## Tests — ✅ Passed

**Tool:** Vitest v1.6.1  
**Total:** 253 tests across 30 test files  
**Duration:** ~15 s  
**Result:** All files passed — 0 failures, 0 skipped

### Per-file Results

| File | Tests | Duration | Result |
|------|------:|--------:|--------|
| `tests/unit/db-adapter.test.ts` | 13 | 141 ms | ✅ |
| `tests/unit/apiClient.test.ts` | 6 | 11 ms | ✅ |
| `tests/integration/auth.test.ts` | 6 | 10 ms | ✅ |
| `tests/api/auth.api.test.js` | 4 | 6 ms | ✅ |
| `tests/api/database.api.test.js` | 15 | 5 ms | ✅ |
| `tests/api/endpoints.api.test.js` | 6 | 6 ms | ✅ |
| `tests/api/ai-offers.api.test.js` | 5 | 11 ms | ✅ |
| `tests/api/ai-fraud.api.test.js` | 5 | 7 ms | ✅ |
| `tests/api/ai-forgery.api.test.js` | 5 | 13 ms | ✅ |
| `tests/api/ai-forecast.api.test.js` | 5 | 13 ms | ✅ |
| `tests/api/ai-predictive.api.test.js` | 5 | 8 ms | ✅ |
| `tests/components/migration-smoke.test.tsx` | 25 | 19 ms | ✅ |
| `tests/components/OfferAI.test.tsx` | 8 | 1,520 ms | ✅ |
| `tests/components/ForgeryDetection.test.tsx` | 8 | 2,134 ms | ✅ |
| `tests/components/ForecastCenter.test.tsx` | 8 | 1,888 ms | ✅ |
| `tests/components/PredictiveMaintenance.test.tsx` | 9 | 1,319 ms | ✅ |
| `tests/components/FraudInvestigation.test.tsx` | 8 | 1,022 ms | ✅ |
| `tests/components/AnalyticsTabs.test.tsx` | 4 | 557 ms | ✅ |
| `tests/components/CreateWorkOrderDialog.test.tsx` | 4 | 1,027 ms | ✅ |
| `tests/components/PrecheckStatus.test.tsx` | 3 | 336 ms | ✅ |
| `tests/components/GenerateServiceOrderDialog.test.tsx` | 3 | 653 ms | ✅ |

---

## Security Audit

**Tool:** `npm audit`  
**Total vulnerabilities:** 17 (1 low · 8 moderate · 7 high · 1 critical)

> These are **all pre-existing** dependency vulnerabilities — none were introduced by changes in this branch.

### Notable Advisories

| Severity | Package | Advisory |
|----------|---------|----------|
| Critical | `jsPDF` | PDF injection in AcroForm module allows arbitrary JavaScript execution ([GHSA-p5xg-68wr-hm3m](https://github.com/advisories/GHSA-p5xg-68wr-hm3m), [GHSA-pqxr-3g65-p328](https://github.com/advisories/GHSA-pqxr-3g65-p328)) |
| High | `rollup` | Arbitrary file write via path traversal in v4.0.0–4.58.0 ([GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)) |
| High | `qs` | `arrayLimit` bypass in comma parsing allows DoS ([GHSA-w7fw-mjwx-w883](https://github.com/advisories/GHSA-w7fw-fjwx-w883)) |
| Moderate | `DOMPurify` | `USE_PROFILES` prototype pollution allows event handlers ([GHSA-cj63-jhhr-wcxv](https://github.com/advisories/GHSA-cj63-jhhr-wcxv)) |

**Recommended:** Run `npm audit fix` to resolve non-breaking issues. Use `npm audit fix --force` for breaking-change upgrades (review carefully).

---

## Recent Commits

| SHA | Message |
|-----|---------|
| `19080a5` | fix: replace all Math.random stubs and weak client\_secret with real implementations |
| `94433dc` | fix: resolve ReDoS email regex and deduplicate VALID\_ROLES in org.js |
| `f0dba9c` | feat: add Organisation Management Console (MAC) — backend API + frontend page + route + sidebar |

---

## What Was Built (MAC Feature)

This branch added a full **Organisation Management and Administration Console (MAC)** — there was no existing self-service org portal on the platform.

### New Files

| File | Purpose |
|------|---------|
| `server/routes/org.js` | 9-endpoint REST API for org CRUD and member management |
| `src/domains/org/pages/OrgManagementConsole.tsx` | React MAC page with 5 tabs |

### Modified Files

| File | Change |
|------|--------|
| `server/server.js` | Mounts `orgRoutes` at `/api/org` |
| `src/App.tsx` | Adds `/org-console` route (lazy-loaded, role-guarded) |
| `src/domains/shared/components/AppSidebar.tsx` | "Org Console" entry under System section |

### API Endpoints (`/api/org`)

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/api/org` | sys\_admin / tenant\_admin | List organisations |
| POST | `/api/org` | sys\_admin | Create organisation |
| GET | `/api/org/:id` | sys\_admin / own tenant\_admin | Get organisation |
| PATCH | `/api/org/:id` | sys\_admin / own tenant\_admin | Update profile |
| DELETE | `/api/org/:id` | sys\_admin | Soft-deactivate |
| GET | `/api/org/:id/members` | sys\_admin / tenant\_admin | List members |
| POST | `/api/org/:id/members/invite` | sys\_admin / tenant\_admin | Invite member |
| PATCH | `/api/org/:id/members/:uid` | sys\_admin / tenant\_admin | Change role/status |
| DELETE | `/api/org/:id/members/:uid` | sys\_admin / tenant\_admin | Remove member |

### Frontend Console Tabs

| Tab | Features |
|-----|---------|
| Overview | Member count, plan badge, contact summary, quick-action buttons |
| Profile | Edit name, industry, contact info, address, timezone, logo URL |
| Members | Role inline-select, active toggle, remove, invite dialog |
| Billing | Plan card, per-plan usage limits, sys\_admin plan-change control |
| Security | MFA/SSO/IP allowlist/audit-logging toggles; CIDR list; danger-zone deactivation |

---

_Report generated: 2026-04-09 · Guardian Flow v0.0.0_

---

## Gap Analysis & Corrected Completion Status

> All findings below are sourced directly from the server source code. File references are included so any reviewer can independently verify.

---

### 🔴 CRITICAL STUBS — Non-functional behind a working UI

These three modules appear fully operational in the UI and in the readiness summary. Inspection of the backend code reveals they return hardcoded or random responses and perform no real work.

---

#### 1. Communications — Email, SMS, WhatsApp (`server/services/comms.js`)

**Claimed status in readiness_summary.md:** Not listed as a gap. Platform described as having omnichannel messaging.

**Actual code (`server/services/comms.js`, lines 31–90):**

```js
// sendEmail
logger.info('[comms:email] STUB — would send email', { ... });
return { channel: 'email', status: 'sent', messageId: `stub-email-${Date.now()}` };

// sendSMS
logger.info('[comms:sms] STUB — would send SMS', { ... });
return { channel: 'sms', status: 'sent', messageId: `stub-sms-${Date.now()}` };

// sendWhatsApp
logger.info('[comms:whatsapp] STUB — would send WhatsApp message', { ... });
return { channel: 'whatsapp', status: 'sent', messageId: `stub-wa-${Date.now()}` };
```

**Reality:** Every outbound message across all three channels is written to the server log and returns `status: "sent"`. **No message is dispatched.** No Twilio, SendGrid, Mailgun, or WhatsApp Business API is integrated. The thread persistence and webhook inbound routes are real; the outbound delivery is entirely non-functional.

**Impact:** Work order status notifications, SLA breach alerts, technician dispatch messages, and all customer communications are silently dropped. This is the notification backbone of an FSM platform.

**Fix effort:** ~2–3 weeks. Wire `sendEmail` to SendGrid/Mailgun, `sendSMS` and `sendWhatsApp` to Twilio. No architectural change required — the adapter interface is already in place.

---

#### 2. ~~ML Studio — Model Training & Inference~~ ✅ RESOLVED (`19080a5`)

**Previously blocking.** Fixed in commit `19080a5`.

**What changed (`server/routes/ml-studio.js`):**
- Train endpoint now calls `trainModel(type, config)` from `server/ml/orchestrator.js`. Algorithm strings are mapped to orchestrator model types (`equipment_failure`, `sla_breach`, `forecast`). Experiment status transitions `queued → training → completed/failed`. Real metrics (accuracy, f1, recall, precision) returned from the trained model.
- Predict endpoint loads model weights from `ml_models` / `forecast_models` via the DB adapter and dispatches to the real ML functions: `predictFailure()`, `predictSlaBreach()`, or `holtWintersPredict()`. Returns HTTP 422 if model weights are not yet in the DB (i.e. model has not been trained yet).

**Previous code (now removed):**

```js
// POST /api/ml-studio/experiments/:id/train
const metrics = {
  accuracy: +(0.75 + Math.random() * 0.2).toFixed(3),   // random number
  f1:       +(0.7  + Math.random() * 0.2).toFixed(3),   // random number
  rmse:     +Math.random().toFixed(3),                   // random number
};

// POST /api/ml-studio/predict/:model_id
res.json({
  prediction:  Math.random() > 0.5 ? 'positive' : 'negative',  // coin flip
  confidence:  +(0.6 + Math.random() * 0.35).toFixed(2),       // random number
  latency_ms:  Math.floor(Math.random() * 50 + 10),             // random number
});
```

**Important distinction:** The *core predictive maintenance ML* (`server/ml/failure.js` — logistic regression, `server/ml/anomaly.js` — z-score/MAD/IQR, `server/ml/forecasting.js` — Holt-Winters) is real working code. The ML Studio UI — which presents as a no-code ML platform for building custom models — now correctly routes through that same ML layer.

**Residual gap:** ML Studio still depends on `trainModel()` producing useful output from tenant data. If a tenant's dataset collection is empty, training will fall back to synthetic data (`isSynthetic: true` in the response). Full fidelity requires populated tenant data.

**Fix effort (remaining):** None for the stub. Synthetic-data fallback is acceptable for demos.

---

#### 3. ~~Scheduled Reports — Report Execution~~ ✅ RESOLVED (`19080a5`)

**Previously blocking.** Fixed in commit `19080a5`.

**What changed (`server/routes/scheduled-reports.js`):**
- `POST /:id/run-now` now calls `adapter.countDocuments(collection, { tenant_id })` against the collection mapped from `report.report_type` (e.g. `work_orders`, `invoices`, `tickets`, `assets`, `crm_leads`, `crm_deals`, `esg_reports`). Returns real `row_count` instead of hardcoded `42`.
- Removed `mock_data` key from response entirely.

**Previous code (now removed):**

```js
// POST /api/scheduled-reports/:id/run-now
res.json({ executed: true, report_id: req.params.id, ran_at, mock_data: { rows: 42, format: report.format } });
```

**Residual gap:** PDF/CSV rendering and email delivery are still not implemented. The endpoint returns a count confirmation; it does not produce a file. Full report delivery requires a PDF renderer (Puppeteer/pdfmake) and the communications delivery integration (Gap #1).

**Fix effort (remaining):** 3–4 weeks for PDF renderer + email delivery. The stub itself is gone.

---

### 🟡 FUNCTIONAL GAPS — Real code, material limitations vs. market leaders

These modules have genuine working implementations but fall short of parity with their market-segment counterparts in ways that matter commercially.

---

#### 4. ~~ML Studio Training Metrics / Developer Portal Usage Stats~~ ✅ RESOLVED (`19080a5`)

**Previously flagged.** Fixed in commit `19080a5`.

**What changed (`server/routes/developer-portal.js`):**
- `GET /usage` now calls `adapter.countDocuments('partner_api_usage', { tenant_id })` for `total_requests` and derives `top_endpoints` from the 200 most recent real usage records.

**Previous code (now removed):**

```js
total_requests: Math.floor(Math.random() * 10000),
top_endpoints: ['/api/work-orders', '/api/crm'],
```

---

#### 5. Scheduling Optimiser — Greedy heuristic, not mathematical optimisation

**File:** `server/services/scheduler.js`

The scheduler uses a multi-factor scoring function (skill match 50%, cert validity 20%, SLA urgency 20%, proximity 10%). This is a greedy assignment algorithm — it finds a *good* solution in a single pass. It does not use linear programming, constraint satisfaction, or any OR-Tools-class solver.

**Market leader gap (ServiceTitan, FieldAware):** True LP/OR-Tools optimisation, traffic-aware routing, crew scheduling, multi-day horizon, real-time re-dispatch.

**Impact:** Acceptable for SMB deployments (<50 techs). Degrades at enterprise scale. Does not guarantee optimal territory balance or minimum travel time.

---

#### 6. Mobile / Field Technician Experience — PWA only, no native app

**Evidence:** `public/service-worker.js` and `public/manifest.json` exist and are correctly configured. There is no `ios/` or `android/` directory; no Capacitor/React Native integration.

**Market leader gap (ServiceMax, Salesforce Field Service):** Native iOS/Android with offline-first SQLite sync, GPS background tracking, camera/barcode scanner OS integration, push notifications at OS level, crew coordination.

**Impact:** Technicians in low-connectivity environments (basements, industrial sites) will experience degraded service. PWA offline support is limited to cached pages; no offline-capable work order write-back.

---

#### 7. IoT Telemetry — REST ingestion only, no MQTT broker

**File:** `server/routes/iot.js` (REST endpoints only)

Device readings are ingested via HTTP POST. There is no MQTT broker, no AMQP support, and no WebSocket ingestion pipeline for high-frequency sensor data. Readings are stored in MongoDB, which is not a time-series database.

**Market leader gap (Azure IoT Hub, AWS IoT Core):** Native MQTT/AMQP/HTTPS, millions of concurrent devices, proper digital twin shadow model, hot-path stream processing.

**Impact:** IoT is viable as a demo feature for single-digit device counts. Not architected for production sensor fleets.

---

#### 8. CRM — No email cadence automation, lead scoring not ML-backed

**Files:** `server/routes/crm.js`, `server/routes/crm-calendar.js`

Lead scoring is computed server-side but uses a heuristic formula, not a model trained on historical conversion outcomes. There is no email sequence/cadence automation (follow-up scheduling, open-rate tracking). Calendar/email sync routes exist but outbound delivery depends on the stub communications service (see Gap #1).

**Market leader gap (Salesforce, HubSpot):** Behavioural ML lead scoring, email sequences, telephony integration, CPQ engine.

---

#### 9. ERP Connectors — Polling sync only; Xero listed but not implemented

**File:** `server/routes/connectors.js`, line 28

```js
const CONNECTOR_TYPES = ['salesforce', 'quickbooks', 'sap', 'netsuite', 'xero'];
```

`xero` appears in the registry but `server/services/connectors/xero.js` does not exist. SAP, NetSuite, Salesforce, and QuickBooks connectors are real (OData v4 / TBA HMAC-SHA256) but sync is manually triggered — there is no event-driven webhook sync and no conflict-resolution strategy.

---

#### 10. ~~RBAC — Three effective roles / weak client_secret~~ ✅ PARTIALLY RESOLVED (`19080a5`)

**Improved in commit `19080a5`.**

**What changed (`server/middleware/rbac.js`, `server/routes/developer-portal.js`):**
- Fallback permission matrix now includes `finance_manager`, `ops_manager`, `dispatcher`, and `partner_admin` with role-appropriate permission sets. `tenant_admin` expanded from 5 to 16 permissions.
- OAuth `client_secret` upgraded from `randomUUID()` (122-bit) to `randomBytes(32).toString('hex')` (256-bit CSPRNG) at both app creation and `POST /regenerate-secret`.

**Previous code (now replaced):**

```js
// Role mapping (DB → app) — unchanged
'admin'      → 'sys_admin'
'manager'    → 'tenant_admin'
'technician' → 'technician'

// Permission matrix — was 3 effective roles
sys_admin:    ['*']
tenant_admin: ['ticket.read', 'ticket.create', 'wo.read', 'wo.create', 'portal.access']
technician:   ['wo.read', 'wo.update', 'so.view']
```

**Residual gap:** The DB-backed permission check (live `role_permissions` / `permissions` aggregation) is still present and takes precedence over the fallback. Roles stored in the database must be seeded correctly for the DB path to work. There is still no field-level access control.

---

### ✅ GENUINELY STRONG — Competitive implementation

The following modules are real, well-implemented, and hold value:

| Module | Key Evidence | Honest Assessment |
|--------|-------------|-------------------|
| **FSM Core / Work Orders** | 4,113-line `functions.js`, full WO lifecycle, SLA deadlines, geo check-in, PM calendar | Strong SMB FSM core |
| **Financial / GL / Revenue Recognition** | Real double-entry journal validation (debits = credits), ASC 606 / IFRS 15 POB splitting, straight-line and point-in-time schedules | Competitive for FSM billing |
| **ESG Reporting** | GRI 305-1–5, SASB EM-CO-110a.1, TCFD (governance/strategy/risk/metrics), EPA EEIO 15-category Scope 3 | Differentiated; built on real emission records |
| **SSO (OIDC + SAML 2.0)** | Proper Authorization Code flow, SAML assertion validation, timing-safe CSRF state, same JWT pair as `/api/auth` | Production-grade |
| **TOTP MFA** | Hand-rolled HMAC-SHA1 HOTP (RFC 6238), ±1 time-step window, no third-party library dependency | Correct RFC implementation |
| **SAP S/4HANA Connector** | OData v4 paths, Basic Auth, paginated fetch, graceful dev fallback | Real; will work with live credentials |
| **NetSuite Connector** | TBA OAuth 1.0a, HMAC-SHA256 signatures, correct realm formatting | Real; will work with live credentials |
| **Core Predictive Maintenance ML** | Logistic regression (failure.js), Z-score/MAD/IQR/sliding-window anomaly (anomaly.js), Holt-Winters forecasting | Genuine ML; limited vs. specialist vendors |
| **FlowSpace Decision Ledger** | Append-only, tenant-scoped, EU AI Act Article 13 / GDPR Art 22 explanation endpoint | Differentiated compliance feature |
| **WebSockets** | Real `ws` server with JWT auth, channel pub/sub, 100KB payload limit | Functional real-time infrastructure |
| **PWA** | Correct service worker (network-first with timeout, cache-first), full manifest with shortcuts | Deployable as PWA today |

---

### Revised Platform Completion Summary

| Module | Previous Claim | Corrected Status | Blocking for Launch? |
|--------|---------------|-----------------|---------------------|
| FSM / Work Orders | ✅ 100% | ✅ ~80% (no native mobile, no crew WO) | ⚠️ Soft gap |
| Scheduling | ✅ 100% | ✅ ~65% (greedy, not LP-optimised) | ⚠️ Soft gap |
| CRM | ✅ 100% | ✅ ~55% (no cadences; comms stub blocks notifications) | ⚠️ Soft gap |
| Financial / GL / Revenue | ✅ 100% | ✅ ~75% (no bank feeds, no payroll, no tax engine) | ⚠️ Soft gap |
| **Communications (Email/SMS/WA)** | ✅ 100% | 🔴 **~10% (outbound delivery fully stubbed)** | 🔴 Blocking |
| **ML Studio** | ✅ 95% | ✅ **~70%** _(was 5% — Math.random stub removed in `19080a5`)_ | ⚠️ Soft gap |
| Core Predictive Maintenance ML | ✅ 90% | ✅ ~65% (real algorithms; limited vs. specialist) | ⚠️ Soft gap |
| IoT Telemetry | ✅ 95% | ✅ ~40% (REST only, no MQTT, no time-series DB) | ⚠️ Soft gap |
| ESG Reporting | ✅ 100% | ✅ ~70% (manual data entry; no automated feeds) | ⚠️ Soft gap |
| **Scheduled Reports** | ✅ 100% | 🟡 **~45%** _(was 15% — mock_data removed in `19080a5`; PDF/email still needed)_ | ⚠️ Soft gap |
| ERP Connectors | ✅ 95% | ✅ ~65% (polling sync; Xero not implemented) | ⚠️ Soft gap |
| Auth / SSO / MFA | ✅ 100% | ✅ ~88% _(was 80% — RBAC fallback expanded + 256-bit client_secret in `19080a5`)_ | ✅ Closed |
| Developer Portal | ✅ 100% | ✅ ~80% _(was 60% — usage stats now real in `19080a5`)_ | ✅ Closed |

**Overall Platform Completion: ~75%** (revised from ~70% following `19080a5` stub fixes)

The delta from 94 to 75 is accounted for by: one remaining non-functional stub (communications delivery), one unimplemented registered connector (Xero), the difference between a greedy scheduler and a market-parity scheduling engine, and residual soft gaps in mobile and IoT. The three previously-blocking stubs in ML Studio, Scheduled Reports, and Developer Portal have been eliminated.

---

### Investment Perspective

The platform is **not production-ready today** for a paying customer trial. The single remaining blocking gap (communications delivery) would surface within the first week of any trial. It is, however, **fixable without architectural change** — the adapter interface is already in place.

**Estimated engineering investment to close the remaining blocker:**

| Gap | Fix Description | Estimated Effort |
|-----|----------------|-----------------|
| Communications delivery | Wire SendGrid + Twilio into existing adapter | 2–3 weeks |
| Scheduled report delivery | Add Puppeteer/pdfmake renderer + email dispatch | 3–4 weeks |
| **Total to fully unblock** | | **5–7 engineer-weeks** |

The remaining soft gaps (native mobile, LP scheduling, MQTT IoT, full RBAC, bank feeds) represent the roadmap for a platform going from commercially viable to market-leading — appropriate territory for a Series A build-out.

---

_Gap analysis conducted: 2026-04-12 · Code references verified against HEAD commit `19080a5`_
