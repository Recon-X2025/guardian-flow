# PR: Guardian Flow — Honest Gap Assessment vs Enterprise Market Leaders

> **Source:** This PR description was generated from a direct source-code audit of
> `src/domains/`, `server/routes/`, and `server/services/`. The full detail is in
> [`docs/MARKET_COMPARISON.md`](./MARKET_COMPARISON.md).

---

## Summary

Guardian Flow currently covers approximately **30 % of enterprise feature parity** across
10 product modules when benchmarked against the leading enterprise SaaS vendors in each
vertical (ServiceNow / IFS for FSM, Salesforce / HubSpot for CRM, SAP / Oracle / NetSuite
for Finance, Power BI / Tableau for BI, Azure IoT Hub / PTC ThingWorx for IoT, Okta /
Microsoft Entra for Auth).

---

## Methodology

Four-tier classification per feature, applied purely from source code:

| Symbol | Meaning |
|---|---|
| ✅ | Production-grade — fully implemented |
| 🟡 | Partial — real logic exists but key production depth is missing |
| 🔴 | POC-stub — UI shell or hardcoded mock data; < 50 lines of real business logic |
| ❌ | Absent — does not exist in the codebase |

---

## Module Scores

| # | Module | Score |
|---|---|---|
| 7 | Platform / Identity / Governance | 50 % |
| 9 | ESG & Compliance | 42 % |
| 10 | Partner / Developer Ecosystem | 38 % |
| 3 | Finance & Accounting | 36 % |
| 1 | FSM (WO + Dispatch + Scheduler) | 30 % |
| 5 | Analytics & Business Intelligence | 28 % |
| 2 | CRM / Sales Pipeline | 25 % |
| 4 | Inventory & Procurement | 22 % |
| 6 | IoT / Digital Twin / PdM | 16 % |
| 8 | AI / ML Studio | 16 % |
| | **Overall** | **~30 %** |

---

## Key Findings

### Critical stubs (🔴 POC-only)
- **IoT Dashboard** — 100 % hardcoded mock data; no backend, no MQTT, no WebSocket
- **AutoML Studio** — "training run" writes a metadata record only; no ML computation
- **CRM** — `accountId` is a free-text string; no Account or Contact entity in the DB
- **AP 3-way match** — UI exists but PO and Goods Receipt objects do not
- **Analytics export** — button present, no implementation
- **Predictive Maintenance** — vibration chart is `Math.random()` in a `setInterval`

### Dead-stub routes (❌ no implementation behind the path)
`/api/intercompany`, `/api/supplier-portal`, `/api/federated-learning`,
`/api/cbm`, `/api/neuro-console`, `/api/sdk`

---

## Priority Remediation Roadmap

### P0 — Core FSM & Finance gaps
- WO file attachments (S3 / object-store upload)
- Drag-and-drop Gantt scheduler
- Map view on Dispatch Board (Leaflet or Google Maps)
- Customer signature capture on WO completion
- WO templates & checklists
- Journal reversal
- Period-close lock
- Payment-run bank-file export (BACs / SEPA)
- Vendor master object in DB
- Goods receipt workflow

### P1 — CRM, Analytics & Platform
- SLA template engine (instead of hardcoded targets)
- Shift / resource calendar
- Account & Contact objects (CRM foundation)
- IoT real backend wiring (MQTT broker → WebSocket → UI)
- P&L and Balance Sheet reports
- JWT server-side revocation list
- Analytics date-range picker + CSV export

### P2 — Advanced capabilities
- Subcontractor management module
- Bank reconciliation
- Multi-currency FX revaluation
- Custom dashboard builder (drag-and-drop widgets)
- Real MQTT telemetry pipeline
- GHG Protocol emission-factor library
- Developer portal (API keys, webhook management, SDK docs)

---

## Files Changed by This PR

This PR adds only this document; no source-code changes are included.

| File | Change |
|---|---|
| `docs/PR_GAP_ASSESSMENT.md` | New — saved PR description |
| `docs/MARKET_COMPARISON.md` | Existing — full detail (not modified) |
