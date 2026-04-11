# Guardian Flow — Sprint Plan to Reach 100 % Parity and Beyond

> **Based on:** `docs/MARKET_COMPARISON.md` source-code gap audit (April 2026).  
> **Goal:** Move overall platform parity from ~30 % to **100 %+ enterprise parity** — matching and then surpassing every market-leader capability across all 10 modules.  
> **Cadence:** 2-week sprints · 6 phases · 48 sprints (~24 months).  
> **Effort key:** XS < 1 day · S = 1–2 days · M = 3–5 days · L = 1–2 weeks · XL = 2–3 weeks.

---

## Table of Contents

1. [Phase 1 — Foundation Fixes (Sprints 1–6)](#phase-1--foundation-fixes-sprints-16)  
2. [Phase 2 — Data-Model Completion (Sprints 7–12)](#phase-2--data-model-completion-sprints-712)  
3. [Phase 3 — Platform Depth (Sprints 13–18)](#phase-3--platform-depth-sprints-1318)  
4. [Phase 4 — Enterprise Capabilities (Sprints 19–24)](#phase-4--enterprise-capabilities-sprints-1924)  
5. [Phase 5 — Full Enterprise Parity (Sprints 25–36)](#phase-5--full-enterprise-parity-sprints-2536)  
6. [Phase 6 — Beyond Parity: Market-Leading Differentiation (Sprints 37–48)](#phase-6--beyond-parity-market-leading-differentiation-sprints-3748)  
7. [Module Parity Trajectory](#module-parity-trajectory)  
8. [Dependencies & Risks](#dependencies--risks)

---

## Phase 1 — Foundation Fixes (Sprints 1–6)

> **Objective:** Close all P0 gaps. Unlock basic daily operations for field teams and finance users.

---

### Sprint 1 — FSM: Work Order Depth (Attachments + Signature + Checklists)

**Target parity lift:** FSM 30 % → 40 %

| # | Task | Effort | File area |
|---|---|---|---|
| 1.1 | File/photo attachment on WO — S3/object-store upload endpoint + `FileUpload` UI component | L | `server/routes/work-orders.js`, `src/domains/fieldservice/` |
| 1.2 | Customer digital signature capture on WO completion — canvas component + base64 store | M | `src/domains/fieldservice/pages/WorkOrderDetail.tsx` |
| 1.3 | Work order template library — DB collection `wo_templates`; admin CRUD page; apply-template on WO create | L | `server/routes/work-orders.js`, new page `WOTemplates.tsx` |
| 1.4 | Checklist/task steps on WO — `wo_steps` sub-collection; step-by-step UI with pass/fail/NA + photo per step | L | `server/routes/work-orders.js`, `WorkOrderSteps.tsx` |
| 1.5 | Parts consumption tracking — replace free-text with structured line items linked to inventory SKU | M | `server/routes/work-orders.js`, `InventoryLookup` component |

**Definition of Done:** Technician can attach photos, collect a digital signature, and complete a checklist before closing a WO. Template library is accessible from WO create dialog.

---

### Sprint 2 — FSM: Dispatch Board (Gantt + Map)

**Target parity lift:** FSM 40 % → 52 %

| # | Task | Effort | File area |
|---|---|---|---|
| 2.1 | Drag-and-drop Gantt on Dispatch — replace CSS timeline with `@fullcalendar/resource-timeline`; persist assignment on drop | XL | `src/domains/fieldservice/pages/Dispatch.tsx` |
| 2.2 | Map view on Dispatch — integrate Leaflet.js + OpenStreetMap; plot technician last-known location pins and WO address pins | L | `src/domains/fieldservice/pages/Dispatch.tsx` |
| 2.3 | SLA countdown timer on Dispatch board — replace static red badge with live countdown using `sla_deadline`; visual escalation colour band | S | `Dispatch.tsx`, `WOCard` component |
| 2.4 | ETA notification to customer — `/api/work-orders/:id/notify-eta` endpoint; email/SMS stub via SendGrid/Twilio | M | `server/routes/work-orders.js`, new `notifications.js` service |
| 2.5 | Dispatch audit trail — log every assignment change (actor, fromTech, toTech, timestamp, reason) to `dispatch_audit` collection | S | `server/routes/dispatch.js` |

**Definition of Done:** Dispatcher can drag WOs across the Gantt, see technician pins on a map, and automatically notify the customer of ETA on assignment.

---

### Sprint 3 — Finance: General Ledger Foundations

**Target parity lift:** Finance 36 % → 46 %

| # | Task | Effort | File area |
|---|---|---|---|
| 3.1 | Journal entry reversal — one-click reversal creates auto counter-entry with cross-reference; `reversed_by` / `reverses` fields on JE | S | `server/routes/ledger.js` |
| 3.2 | Period-close lock — `accounting_periods` collection; `is_closed` flag; middleware blocks JE posts to closed periods | M | `server/routes/ledger.js`, new `server/middleware/periodLock.js` |
| 3.3 | Chart of Accounts hierarchy — add `parent_account_id` field; recursive tree rendering in GL page | M | `server/routes/ledger.js`, `GeneralLedger.tsx` |
| 3.4 | GL audit trail — immutable `gl_audit_log` collection records every JE creation/edit: user, timestamp, before/after | S | `server/routes/ledger.js` |
| 3.5 | Trial balance period filter + drill-down — add `?from=&to=` params; clickable account row opens filtered JE list | M | `server/routes/ledger.js`, `TrialBalance.tsx` |

**Definition of Done:** Finance users can close a period (blocking back-dated posts), reverse any JE, and drill through the trial balance to individual entries.

---

### Sprint 4 — Finance: Vendor Master + Payments + AP Depth

**Target parity lift:** Finance 46 % → 56 %

| # | Task | Effort | File area |
|---|---|---|---|
| 4.1 | Vendor master object — `vendors` DB collection: name, bank details, payment terms, tax code, contact; linked from AP invoices | M | `server/routes/vendors.js` (new), `AccountsPayable.tsx` |
| 4.2 | Payment run execution — select approved invoices; generate BACS/SEPA bank file (CSV/XML); mark invoices as `paid` | L | `server/routes/ap.js`, new `server/services/paymentFile.js` |
| 4.3 | 3-way match foundation — introduce `purchase_orders` and `goods_receipts` collections; wire 3-way match logic against real objects | L | `server/routes/procurement.js`, `server/routes/ap.js` |
| 4.4 | Duplicate invoice detection — check invoice\_number + vendor\_id + amount on POST `/api/ap/invoices`; return 409 with duplicate link | S | `server/routes/ap.js` |
| 4.5 | Multi-level invoice approval — amount-threshold rules in `ap_approval_policies`; approval chain with delegation | M | `server/routes/ap.js`, `APApproval.tsx` |

**Definition of Done:** Every AP invoice references a real vendor record. Finance can execute a payment run and download a bank file. 3-way match compares real PO and GR objects.

---

### Sprint 5 — Inventory: Goods Receipt + Stock Movement History

**Target parity lift:** Inventory 22 % → 36 %

| # | Task | Effort | File area |
|---|---|---|---|
| 5.1 | Goods receipt workflow — `goods_receipts` collection; receive against PO; partial receipts; update `qty_available`; trigger 3-way match | L | `server/routes/inventory.js`, `server/routes/procurement.js` |
| 5.2 | Stock movement history log — `stock_movements` collection; movement type (GR, GI, adjustment, transfer, return); all quantity changes append here | M | `server/routes/inventory.js` |
| 5.3 | Inter-warehouse transfer workflow — transfer order UI; deduct from source warehouse; add to destination; movement log entry | M | `server/routes/inventory.js`, `InventoryTransfer.tsx` |
| 5.4 | Remove hardcoded SKU-prefix filter — replace `['PRN-', 'LAP-']` prefix guard with proper category filter from item master | XS | `src/domains/inventory/pages/Inventory.tsx` |
| 5.5 | Purchase requisition → PO flow — `purchase_requisitions` collection; approval → auto-generate draft PO | M | `server/routes/procurement.js`, `PurchaseRequisition.tsx` |

**Definition of Done:** Inventory team can receive goods against a PO, view full stock movement history, and transfer stock between warehouses.

---

### Sprint 6 — Analytics Quick Wins + Auth Security

**Target parity lift:** Analytics 28 % → 38 % · Platform 50 % → 58 %

| # | Task | Effort | File area |
|---|---|---|---|
| 6.1 | Date-range picker on all analytics charts — shared `DateRangePicker` component wired to all 6 analytics tabs | S | `src/domains/analytics/pages/Analytics.tsx` |
| 6.2 | CSV/Excel export — implement the existing export button in `Analytics.tsx`; use `papaparse` for CSV; `xlsx` for Excel | M | `Analytics.tsx`, `src/domains/analytics/utils/export.ts` |
| 6.3 | Analytics cross-filter — clicking a chart segment filters all other charts on the same tab via shared filter context | M | `Analytics.tsx`, new `AnalyticsFilterContext` |
| 6.4 | Server-side JWT denylist / session revocation — `revoked_tokens` collection with `jti`; middleware checks on every request | M | `server/middleware/auth.js`, `server/routes/auth.js` |
| 6.5 | Authentication audit log — log every login / logout / MFA event / failed attempt to `auth_audit_log` | S | `server/routes/auth.js` |
| 6.6 | Analytics P&L and Balance Sheet generation — derive from posted GL entries; render in Finance tab of Analytics | L | `server/routes/analytics.js`, `Analytics.tsx` |

**Definition of Done:** Users can filter all charts by date range and export any tab to CSV. JWTs can be revoked server-side. P&L and Balance Sheet are auto-generated from the GL.

---

## Phase 2 — Data-Model Completion (Sprints 7–12)

> **Objective:** Close critical P1 data-model gaps. Unlock enterprise CRM, IoT real wiring, and advanced FSM features.

---

### Sprint 7 — CRM: Account + Contact Objects

**Target parity lift:** CRM 25 % → 42 %

| # | Task | Effort | File area |
|---|---|---|---|
| 7.1 | `accounts` collection — full Account object: company name, industry, billing/shipping address, website, assigned rep | M | `server/routes/crm.js`, new `Accounts.tsx` |
| 7.2 | `contacts` collection — Contact linked to Account: name, email, phone, title, primary flag | M | `server/routes/crm.js`, new `Contacts.tsx` |
| 7.3 | Migrate `accountId` on deals — replace free-text string with `$ref` to `accounts._id`; backfill migration script | M | `server/scripts/`, `server/routes/crm.js` |
| 7.4 | CRM drag-and-drop Kanban — replace "move to next stage" button with full drag-and-drop using `@dnd-kit/core` | L | `src/domains/crm/pages/Pipeline.tsx` |
| 7.5 | Pipeline stage configuration — admin UI to add/rename/reorder stages; persist in `crm_pipeline_stages` collection | M | new `PipelineSettings.tsx` |
| 7.6 | Lead object — `leads` collection; lead scoring; convert Lead → Deal/Contact/Account | L | `server/routes/crm.js`, `Leads.tsx` |

**Definition of Done:** CRM has real Account and Contact records. Deals are linked to Accounts. Drag-and-drop pipeline works in any direction. Lead management is live.

---

### Sprint 8 — IoT: Real Backend Wiring

**Target parity lift:** IoT 16 % → 38 %

| # | Task | Effort | File area |
|---|---|---|---|
| 8.1 | Remove all hardcoded mock data from IoT Dashboard — replace `const mockDevices` and `const mockReadings` with API calls to `/api/iot-telemetry` | S | `src/domains/analytics/pages/IoTDashboard.tsx` |
| 8.2 | Device registry API — CRUD `/api/iot-telemetry/devices`; `devices` collection with connection state, last-seen, metadata | M | `server/routes/iot-telemetry.js` |
| 8.3 | WebSocket telemetry stream — `ws` server broadcasting real-time readings from `/api/iot-telemetry`; IoT Dashboard subscribes | L | `server/server.js`, `IoTDashboard.tsx` |
| 8.4 | MQTT broker adapter — `mqtt` npm package; configurable broker URL env var; ingests device messages → stored in `telemetry_readings` | L | `server/services/mqttBroker.js` (new) |
| 8.5 | Threshold alerting engine — configurable threshold rules per device property; alert record created and pushed to dashboard on breach | M | `server/services/alertEngine.js` (new), `server/routes/iot-telemetry.js` |
| 8.6 | Telemetry history chart — time-series chart per device property with configurable window (1h / 24h / 7d) | M | `IoTDashboard.tsx`, `TelemetryChart.tsx` |

**Definition of Done:** IoT Dashboard shows real device data (not hardcoded). Devices can send readings via MQTT. Threshold alerts fire and appear in the dashboard.

---

### Sprint 9 — FSM: SLA Engine + Shift Calendar

**Target parity lift:** FSM 52 % → 62 %

| # | Task | Effort | File area |
|---|---|---|---|
| 9.1 | SLA template engine — `sla_templates` collection: response SLA, resolution SLA, pause conditions, escalation tiers | L | `server/routes/sla.js`, `SLATemplates.tsx` |
| 9.2 | SLA clock service — background worker that checks breached SLAs every 5 min; creates escalation record; sends notification | M | `server/services/slaMonitor.js` |
| 9.3 | SLA pause/resume on WO — `sla_pauses` events; total pause time excluded from SLA clock | M | `server/routes/work-orders.js` |
| 9.4 | Technician shift calendar — `shifts` collection: technician, date, start/end, shift type; leave/absence entries | L | `server/routes/shifts.js` (new), `ShiftCalendar.tsx` |
| 9.5 | Scheduler respects shift hours — auto-assignment solver reads `shifts` availability before assigning WO | M | `server/routes/schedule.js` |
| 9.6 | Recurring / preventive maintenance scheduling — `pm_schedules` collection with frequency rules; auto-generate WOs on due date | L | `server/services/pmScheduler.js` (new) |

**Definition of Done:** SLA template is applied at WO creation. The SLA clock pauses/resumes. Escalation fires on breach. The scheduler respects technician shift hours.

---

### Sprint 10 — Route Optimization: Real Maps + Driving Time

**Target parity lift:** FSM 62 % → 70 %

| # | Task | Effort | File area |
|---|---|---|---|
| 10.1 | Map view on Route Optimization page — replace text list with Leaflet map showing polyline routes per technician | L | `src/domains/fieldservice/pages/RouteOptimization.tsx` |
| 10.2 | Real driving-time matrix — replace Euclidean distance with OSRM/Google Maps Distance Matrix API call | M | `server/services/routeOptimizer.js` |
| 10.3 | Multi-stop VRP sequencing — extend solver to sequence WO stops within each technician's daily route | L | `server/routes/schedule.js` |
| 10.4 | Integrate route optimizer into Dispatch board — "Optimize Today" button on Dispatch applies optimal sequencing | M | `Dispatch.tsx`, `server/routes/schedule.js` |
| 10.5 | Turn-by-turn navigation link — deep link each WO address to Google Maps / Apple Maps with pre-filled destination | XS | `WOCard.tsx` |

**Definition of Done:** Dispatcher sees a real map with colour-coded routes. Solver uses actual driving time. "Optimize Today" produces a sequenced daily plan.

---

### Sprint 11 — CRM: Activity Timeline + Email Integration

**Target parity lift:** CRM 42 % → 56 %

| # | Task | Effort | File area |
|---|---|---|---|
| 11.1 | Activity timeline on deal/contact — unified feed: calls, emails, notes, tasks, meetings; filter by type | M | `src/domains/crm/pages/DealDetail.tsx`, `ContactDetail.tsx` |
| 11.2 | Task/activity creation — create call log, meeting note, task with due date from deal or contact; assign to rep | M | `server/routes/crm.js`, `ActivityForm.tsx` |
| 11.3 | Email send from CRM — compose email from deal/contact using SendGrid; auto-log sent email to activity timeline | L | `server/services/email.js`, `CRMEmailCompose.tsx` |
| 11.4 | Pipeline reporting dashboard — win rate; avg deal size; stage conversion funnel; rep leaderboard; time-in-stage | L | `src/domains/crm/pages/PipelineReport.tsx` |
| 11.5 | Opportunity → Work Order conversion — "Create WO from Deal" button; pre-fills WO fields from deal data | M | `DealDetail.tsx`, `server/routes/crm.js` |

**Definition of Done:** Reps have a full activity timeline per deal/contact. Emails can be sent and auto-logged. Pipeline reporting shows conversion funnel and rep performance.

---

### Sprint 12 — Finance: Financial Statements + Budgeting Depth

**Target parity lift:** Finance 56 % → 66 %

| # | Task | Effort | File area |
|---|---|---|---|
| 12.1 | P&L statement generator — aggregate revenue/expense accounts from GL by period; render as formatted P&L page | L | `server/routes/analytics.js`, `PnLStatement.tsx` |
| 12.2 | Balance Sheet generator — assets / liabilities / equity from GL account types; comparative period column | L | `server/routes/analytics.js`, `BalanceSheet.tsx` |
| 12.3 | Cash flow statement (indirect method) — derive from GL net income + adjustments | L | `server/routes/analytics.js`, `CashFlow.tsx` |
| 12.4 | Budget version management — `budget_versions` collection; clone/compare versions; approval workflow | M | `server/routes/budgeting.js`, `Budgeting.tsx` |
| 12.5 | Revenue recognition auto-trigger — auto-create deferred revenue JE when invoice is posted; recognize on schedule | M | `server/routes/rev-rec.js`, `server/routes/invoicing.js` |
| 12.6 | Invoice PDF branding — logo upload per tenant; branded letterhead template for jsPDF | S | `server/routes/invoicing.js`, `InvoicePDF.tsx` |

**Definition of Done:** Finance team can generate P&L, Balance Sheet, and Cash Flow from the GL with comparative periods. Budget versions can be submitted for approval.

---

## Phase 3 — Platform Depth (Sprints 13–18)

> **Objective:** Close all remaining P1 gaps and begin P2 enterprise capabilities.

---

### Sprint 13 — Inventory Advanced + Procurement Completion

**Target parity lift:** Inventory 36 % → 52 %

| # | Task | Effort | File area |
|---|---|---|---|
| 13.1 | Inventory costing (FIFO/WAC) — costing method per item; FIFO layer stack; WAC recalculation on receipt | L | `server/routes/inventory.js` |
| 13.2 | Inventory valuation report — current stock value by item, category, warehouse; slow-moving/obsolete flag | M | `server/routes/inventory.js`, `InventoryValuation.tsx` |
| 13.3 | Cycle counting workflow — generate count list; enter physical counts; post variance adjustments | M | `server/routes/inventory.js`, `CycleCount.tsx` |
| 13.4 | Technician van stock — `technician_stock` collection; allocation, consumption, replenishment workflow | M | `server/routes/inventory.js`, `TechnicianStock.tsx` |
| 13.5 | RFQ / tender management — create RFQ, send to vendor, receive quotes, compare, award | L | `server/routes/procurement.js`, `RFQ.tsx` |
| 13.6 | Spend analytics dashboard — spend by vendor, category, period; top vendors; budget vs actual | M | `server/routes/analytics.js`, `SpendAnalytics.tsx` |

---

### Sprint 14 — Finance: Bank Reconciliation + Multi-Currency

**Target parity lift:** Finance 66 % → 76 %

| # | Task | Effort | File area |
|---|---|---|---|
| 14.1 | Bank statement import — CSV/OFX/MT940 import parser; map to `bank_transactions` collection | L | `server/routes/banking.js` (new), `BankImport.tsx` |
| 14.2 | Bank reconciliation matching — auto-match bank transactions to GL entries by amount+date tolerance; manual match UI | L | `server/routes/banking.js`, `BankReconciliation.tsx` |
| 14.3 | FX rate engine — `fx_rates` collection; daily rate import from ECB/open-source API; rate lookup on transaction | M | `server/services/fxRates.js` (new) |
| 14.4 | Multi-currency FX revaluation — month-end revaluation JE for open foreign-currency balances | M | `server/routes/ledger.js` |
| 14.5 | Tax code engine — `tax_codes` collection; apply tax on invoices/AP; VAT return report | L | `server/routes/tax.js` (new), `TaxCodes.tsx` |
| 14.6 | Payment gateway integration — Stripe payment link on customer invoices; webhook to mark invoice paid; auto-reconcile | L | `server/routes/invoicing.js`, `server/services/stripe.js` |

---

### Sprint 15 — Platform: Security + RBAC Depth

**Target parity lift:** Platform 58 % → 70 %

| # | Task | Effort | File area |
|---|---|---|---|
| 15.1 | Field-level security — `field_permissions` per role; middleware strips restricted fields from API responses | L | `server/middleware/fieldSecurity.js` (new) |
| 15.2 | Record-level sharing rules — `sharing_rules` collection: owner, team, criteria-based access; query filter injection | L | `server/middleware/recordAccess.js` (new) |
| 15.3 | Custom role builder UI — create/edit roles in Org Console; assign granular permissions from permission registry | L | `src/domains/org/pages/RoleBuilder.tsx` (new) |
| 15.4 | Role hierarchy and delegation — `role_hierarchy` config; delegate approval authority to direct reports | M | `server/middleware/auth.js` |
| 15.5 | IP allowlisting per org — `ip_allowlist` on org record; middleware rejects requests from disallowed IPs | S | `server/middleware/ipAllowlist.js` (new) |
| 15.6 | Social login (Google OAuth) — Passport.js Google strategy; map to existing user by email | M | `server/routes/auth.js` |

---

### Sprint 16 — ESG + Compliance Depth

**Target parity lift:** ESG 42 % → 62 %

| # | Task | Effort | File area |
|---|---|---|---|
| 16.1 | Built-in GHG Protocol emission factor library — `emission_factors` collection seeded from GHG Protocol v7 (CSV import); auto-lookup on activity type | M | `server/scripts/seed-emission-factors.js`, `server/routes/esg.js` |
| 16.2 | ESG trend chart and period comparison — line chart of monthly CO₂e; vs previous year; vs target line | M | `src/domains/analytics/pages/ESG.tsx` |
| 16.3 | Science-Based Targets (SBTi) module — set reduction targets; track progress vs baseline; alert on trajectory deviation | M | `server/routes/esg.js`, `SBTiTargets.tsx` |
| 16.4 | CSRD / GRI report template — structured disclosure template; map emission/activity data to GRI standard disclosures | L | `server/routes/esg.js`, `ESGReport.tsx` |
| 16.5 | Risk register — `risks` collection: inherent/residual rating; treatment plans; heat map visualisation | M | `server/routes/compliance.js`, `RiskRegister.tsx` |
| 16.6 | Audit management workflow — create audit; assign auditor; fieldwork checklist; finding tracking; remediation | L | `server/routes/compliance.js`, `AuditManagement.tsx` |

---

### Sprint 17 — Analytics: Dashboard Builder + Scheduled Reports

**Target parity lift:** Analytics 38 % → 58 %

| # | Task | Effort | File area |
|---|---|---|---|
| 17.1 | Custom dashboard builder — drag-and-drop widget canvas using `react-grid-layout`; add chart/metric/table widgets; save to `dashboards` collection | XL | `src/domains/analytics/pages/DashboardBuilder.tsx` |
| 17.2 | Widget library — chart types: bar, line, pie, KPI card, table, funnel; data source picker per widget | L | `src/domains/analytics/components/widgets/` |
| 17.3 | Dashboard sharing and permissions — share dashboard with team/org; viewer vs editor permission | M | `server/routes/analytics.js` |
| 17.4 | Scheduled report delivery — cron job; send dashboard screenshot or CSV export to email list on schedule | M | `server/services/reportScheduler.js` (new) |
| 17.5 | NLP query enhancements — expand schema hint to all tables; add chart output option; save queries; share | M | `server/routes/analytics.js`, `NLPQuery.tsx` |
| 17.6 | Row-level security on analytics — analytics queries respect tenant + team-level data visibility | M | `server/routes/analytics.js`, `server/middleware/recordAccess.js` |

---

### Sprint 18 — AI / ML Studio: Real Training + Model Serving

**Target parity lift:** AI/ML 16 % → 42 %

| # | Task | Effort | File area |
|---|---|---|---|
| 18.1 | Real AutoML training pipeline — Python microservice (`server/ml/`); receives job from `/api/ml/experiments`; scikit-learn AutoML (TPOT or auto-sklearn); returns real metrics | XL | `server/ml/train.py`, `server/routes/ml.js` |
| 18.2 | Model evaluation metrics — compute accuracy, F1, ROC-AUC from real test split; store in `ml_runs`; display in UI | M | `server/ml/evaluate.py`, `AutoMLStudio.tsx` |
| 18.3 | Model serving endpoint — `/api/ml/models/:id/predict`; load serialised model; run inference on input JSON | L | `server/ml/serve.py`, `server/routes/ml.js` |
| 18.4 | Data pipeline — connect AutoML to real Guardian Flow data (WOs, inventory, finance) via configurable data source selector | L | `server/ml/datasource.py` |
| 18.5 | Predictive maintenance auto-WO creation — when RUL or risk threshold crossed, auto-create PM work order | M | `server/services/pmScheduler.js`, `server/routes/assets.js` |
| 18.6 | AI prompt version control + A/B testing — `ai_prompt_versions`; run both variants; compare output scores | M | `server/routes/ai.js`, `PromptManagement.tsx` |

---

## Phase 4 — Enterprise Capabilities (Sprints 19–24)

> **Objective:** Close all P2 gaps. Unlock enterprise sales conversations. Reach ~85 % parity.

---

### Sprint 19 — FSM: Subcontractor Management

**Target parity lift:** FSM 70 % → 78 %

| # | Task | Effort | File area |
|---|---|---|---|
| 19.1 | Subcontractor entity — `subcontractors` collection: company, contact, rate cards, service zones, certifications | M | `server/routes/subcontractors.js` (new), `Subcontractors.tsx` |
| 19.2 | Subcontractor dispatch — assign WO to subcontractor from Dispatch board; rate card cost estimate | M | `Dispatch.tsx`, `server/routes/work-orders.js` |
| 19.3 | Subcontractor portal — scoped JWT login; view assigned WOs; update status; upload completion evidence | L | `server/routes/subcontractors.js`, `SubcontractorPortal.tsx` |
| 19.4 | Subcontractor invoice reconciliation — auto-generate invoice from completed WOs × rate card; approve/reject | M | `server/routes/subcontractors.js` |
| 19.5 | Emergency job insertion — break-in WO with priority flag; suggest re-schedule impact; one-click cascade re-assign | M | `server/routes/schedule.js`, `Dispatch.tsx` |
| 19.6 | Multi-zone dispatch boards — territory-based board tabs; regional supervisor access scope | M | `Dispatch.tsx`, `server/middleware/auth.js` |

---

### Sprint 20 — CRM: Sales Automation + Mobile

**Target parity lift:** CRM 56 % → 70 %

| # | Task | Effort | File area |
|---|---|---|---|
| 20.1 | Sales workflow automation — rule engine: trigger (deal stage change / date / field value) → action (create task / send email / notify user) | XL | `server/services/workflowEngine.js` (new), `WorkflowBuilder.tsx` |
| 20.2 | Email sequences — automated multi-step email sequences with delay; enroll contact from deal | L | `server/services/emailSequence.js`, `EmailSequences.tsx` |
| 20.3 | Custom field builder for CRM — admin adds custom fields to Deal/Account/Contact; renders in forms | L | `server/routes/crm.js`, `CustomFieldBuilder.tsx` |
| 20.4 | Revenue forecasting with trend model — linear regression over historical deals by rep/period; confidence range | M | `server/routes/analytics.js`, `Forecast.tsx` |
| 20.5 | Mobile-responsive CRM views — optimise Pipeline, Deal detail, Contact pages for mobile breakpoints | M | CSS + component responsive fixes |
| 20.6 | Quote generation from CRM deal — generate invoice/quote draft pre-filled from deal line items | M | `DealDetail.tsx`, `server/routes/invoicing.js` |

---

### Sprint 21 — Partner & Developer Ecosystem

**Target parity lift:** Partner 38 % → 62 %

| # | Task | Effort | File area |
|---|---|---|---|
| 21.1 | Developer portal frontend — `/developer` route; API key management; app registration UI; usage stats | L | `src/domains/developer/pages/DevPortal.tsx` (new) |
| 21.2 | Interactive API explorer — Swagger UI or Redoc served at `/developer/api`; auto-generated from OpenAPI spec | M | `server/server.js`, `openapi.yaml` |
| 21.3 | SDK generation — generate TypeScript/JavaScript SDK from OpenAPI spec using `openapi-generator`; publish to `/api/sdk` as zip download | L | `server/scripts/generateSDK.js` |
| 21.4 | Webhook delivery dashboard — view delivery attempts, response codes, retry history per webhook | M | `server/routes/webhooks.js`, `WebhookDashboard.tsx` |
| 21.5 | White-label theme engine — runtime CSS variable injection from partner branding config; `/api/white-label` wired to frontend theme | M | `src/styles/tokens.css`, `server/routes/white-label.js` |
| 21.6 | Plan/tier feature enforcement — `FEATURE_FLAGS` map keyed by plan tier; middleware enforces on API routes | M | `server/middleware/planEnforcement.js` (new) |

---

### Sprint 22 — IoT: Full Telemetry Pipeline + Digital Twin

**Target parity lift:** IoT 38 % → 58 % · Digital Twin 16 % → 32 %

| # | Task | Effort | File area |
|---|---|---|---|
| 22.1 | MQTT → time-series storage pipeline — buffer incoming telemetry; batch-write to `telemetry_ts` collection with TTL index | L | `server/services/mqttBroker.js` |
| 22.2 | Downsampling + retention policy — aggregate 1-min buckets → 1-hour → 1-day; configurable retention per device | M | `server/services/telemetryAggregator.js` (new) |
| 22.3 | Device provisioning UI — onboard new device; generate certificate/token; assign to tenant | M | `IoTDashboard.tsx`, `server/routes/iot-telemetry.js` |
| 22.4 | Digital twin live sync — background worker subscribes to telemetry stream; updates `current_state` of matching twin | M | `server/services/twinSync.js` (new) |
| 22.5 | Twin anomaly detection — simple Z-score anomaly detection on twin property change; alert on deviation | M | `server/services/twinAnomalyDetector.js` (new) |
| 22.6 | Condition-based maintenance (CBM) frontend — wire `/api/cbm` to UI; show CBM rules; link breach to auto-WO | M | `server/routes/cbm.js`, `CBMDashboard.tsx` |

---

### Sprint 23 — Platform: DEX Observability + FlowSpace Export

**Target parity lift:** Platform 70 % → 80 %

| # | Task | Effort | File area |
|---|---|---|---|
| 23.1 | DEX execution timeline UI — visual workflow graph for each ExecutionContext; step durations; transition log | L | `src/domains/dex/pages/ExecutionTimeline.tsx` (new) |
| 23.2 | DEX retry/timeout policies — per-context retry config with exponential backoff; timeout event that sets status = `failed` | M | `server/routes/dex.js` |
| 23.3 | DEX child workflows — parent/child context linkage; child failure propagation policy | M | `server/routes/dex.js` |
| 23.4 | FlowSpace full-text search + aggregation — add MongoDB text index on `action` / `domain`; aggregation endpoint for audit stats | M | `server/routes/flowspace.js`, `server/services/flowspace.js` |
| 23.5 | FlowSpace streaming consumer API — SSE `/api/flowspace/stream`; real-time decision record push | M | `server/routes/flowspace.js` |
| 23.6 | AI bias/fairness detection — integrate `Fairlearn` (Python microservice); compute demographic parity on model predictions | L | `server/ml/fairness.py`, `server/routes/ai.js` |

---

### Sprint 24 — Final Polish, Integration Testing & Hardening

**Target parity lift:** All modules +2–3 %

| # | Task | Effort | Notes |
|---|---|---|---|
| 24.1 | End-to-end integration test suite — Playwright E2E tests for all P0 user journeys (WO create → dispatch → complete → invoice) | L | `tests/e2e/` |
| 24.2 | Performance profiling — identify and fix N+1 queries; add DB indexes for all new collections | M | All new routes |
| 24.3 | Security audit — run OWASP ZAP scan; address injection and auth issues in new routes | M | All new routes |
| 24.4 | Mobile responsiveness sweep — audit all new pages on 375 px viewport; fix layout breaks | M | All new pages |
| 24.5 | Accessibility (WCAG 2.1 AA) — keyboard nav, ARIA labels, focus rings on all new forms and interactive elements | M | All new components |
| 24.6 | Documentation update — update API_DOCUMENTATION.md, README, and MARKET_COMPARISON.md scores to reflect sprint completions | S | `docs/` |

---

---

## Phase 5 — Full Enterprise Parity (Sprints 25–36)

> **Objective:** Close every remaining ❌ and 🔴 gap across all modules. Reach **100 % feature parity** with the assessed market leaders. This phase requires native mobile apps, full ERP-grade finance, and complete IoT/AI production pipelines.

---

### Sprint 25 — Native Mobile App (iOS + Android)

**Target parity lift:** FSM 80 % → 88 % · CRM 70 % → 76 %

| # | Task | Effort |
|---|---|---|
| 25.1 | React Native (Expo) app scaffold — shared codebase for iOS + Android | L |
| 25.2 | Offline-first WO management — create, update, complete WOs while offline; sync on reconnect | XL |
| 25.3 | Mobile GPS check-in / check-out with background location | M |
| 25.4 | Mobile push notifications — WO assignment, SLA breach, ETA alerts via FCM/APNs | M |
| 25.5 | Mobile CRM — deal view, contact call/email, activity log from phone | M |
| 25.6 | Mobile parts lookup and consumption — barcode scan to consume part against WO | M |

**Definition of Done:** Field technicians can receive, complete, and sync WOs from a native mobile app with offline capability and barcode scanning.

---

### Sprint 26 — ERP-Grade Finance: Group Consolidation + Tax Engine

**Target parity lift:** Finance 82 % → 90 %

| # | Task | Effort |
|---|---|---|
| 26.1 | Group consolidation engine — `consolidation_groups`; elimination entries; minority interest; intra-group netting | XL |
| 26.2 | Intercompany reconciliation — match intercompany payables/receivables; auto-post elimination JEs | L |
| 26.3 | Full tax engine — tax code library (VAT/GST/WHT); apply to all invoice/AP/GL transactions; country-specific rules | L |
| 26.4 | VAT return generation — aggregate input/output tax per period; render HMRC MTD-compatible XML | L |
| 26.5 | IFRS 16 right-of-use asset — lease liability schedule; amortisation; ROU asset depreciation | M |
| 26.6 | Audit trail enforcement (SOD) — segregation of duties: prevent same user creating and approving JEs | M |

---

### Sprint 27 — FSM: Advanced Scheduling + Workforce Management

**Target parity lift:** FSM 88 % → 94 %

| # | Task | Effort |
|---|---|---|
| 27.1 | ML-based dispatch recommendation — train model on historical WO data; suggest technician with reason codes and confidence score | XL |
| 27.2 | Real-time GPS from mobile SDK — live technician pins on Dispatch map; breadcrumb trail; ETA recalculation | L |
| 27.3 | Parts availability pre-dispatch check — validate truck stock before WO assignment; flag shortfall | M |
| 27.4 | Emergency break-in job with cascade replanning — insert priority WO; solver automatically reschedules affected WOs | L |
| 27.5 | Customer self-service rebooking + rating — customer portal allows rescheduling, technician rating, in-app messaging | M |
| 27.6 | Overtime and break rules in scheduler — configurable work rules (max hours, mandatory breaks, overtime rate) | M |

---

### Sprint 28 — CRM: Full Sales Cloud Parity

**Target parity lift:** CRM 76 % → 88 %

| # | Task | Effort |
|---|---|---|
| 28.1 | CPQ (Configure Price Quote) — product catalogue with pricing tiers; discount rules; quote approval workflow | XL |
| 28.2 | Territory quota management — assign quota by rep/territory/period; track attainment vs target | L |
| 28.3 | AI lead scoring — train model on historical deal outcomes; score new leads on likelihood to convert | L |
| 28.4 | CRM mobile offline mode — offline deal and contact access; sync on reconnect | M |
| 28.5 | Sales forecast with ML confidence bands — time-series model; scenario planning (best/base/worst) | M |
| 28.6 | Customer 360 view — unified view: CRM deals + WOs + invoices + support tickets per customer | L |

---

### Sprint 29 — Full IoT Platform: Edge + Protocol Depth

**Target parity lift:** IoT 58 % → 76 %

| # | Task | Effort |
|---|---|---|
| 29.1 | Edge computing agent — lightweight containerised edge agent; runs threshold logic locally; works offline | XL |
| 29.2 | AMQP / HTTPS protocol support — multi-protocol ingestion alongside existing MQTT adapter | M |
| 29.3 | Device certificate management — issue/revoke per-device X.509 certificates; certificate rotation | L |
| 29.4 | Streaming anomaly detection on telemetry — Z-score + IQR; configurable window; real-time alert | M |
| 29.5 | Vibration / FFT signal analysis — spectral analysis on vibration readings; bearing fault pattern matching | L |
| 29.6 | Telemetry → ML feature pipeline — export time-series features from telemetry to AutoML feature store | M |

---

### Sprint 30 — AI / ML: Production-Grade MLOps

**Target parity lift:** AI/ML 50 % → 72 %

| # | Task | Effort |
|---|---|---|
| 30.1 | Feature store — `feature_store` service; feature versioning; point-in-time correct joins | L |
| 30.2 | Model registry with full model card — training data lineage; version history; bias scores; SHAP feature importance | L |
| 30.3 | A/B model deployment — route % of inference traffic to challenger model; automated promotion on metric threshold | L |
| 30.4 | Model monitoring + drift detection — data drift (PSI); concept drift; auto-retrain trigger | M |
| 30.5 | Federated learning engine — FL aggregation server; privacy-preserving gradient exchange; tenant participation | XL |
| 30.6 | LLM cost budget enforcement — per-tenant token budget; rate cap; model version pinning | M |

---

### Sprint 31 — Analytics: Embedded BI + Data Connectors

**Target parity lift:** Analytics 68 % → 80 %

| # | Task | Effort |
|---|---|---|
| 31.1 | Embed API — JavaScript embed SDK; `<iframe>` + `postMessage` API; row-level security for embedded dashboards | L |
| 31.2 | Data connector framework — pluggable connector registry; Salesforce, HubSpot, Stripe, PostgreSQL, REST API connectors | XL |
| 31.3 | DirectQuery mode — live query against external data source without import | L |
| 31.4 | Dashboard subscriptions — scheduled PDF snapshot email; Slack/Teams push; data alert notifications | M |
| 31.5 | Advanced chart types — waterfall, Gantt, sankey, heatmap, geo-choropleth | M |
| 31.6 | Collaborative annotations on dashboards — inline comments on chart data points; @mention team members | M |

---

### Sprint 32 — ESG: Full Regulatory Reporting + Supply Chain

**Target parity lift:** ESG 68 % → 84 %

| # | Task | Effort |
|---|---|---|
| 32.1 | CSRD regulatory disclosure builder — structured ESRS taxonomy; map GF data to required disclosures; export XBRL | XL |
| 32.2 | GRI Standards reporting — GRI 2021 framework; link activities to GRI indicators; narrative + quantitative sections | L |
| 32.3 | TCFD reporting — climate risk and opportunity disclosures; scenario analysis inputs | M |
| 32.4 | Supply chain Scope 3 automation — supplier data collection portal; automated Scope 3 calculation from procurement data | L |
| 32.5 | SBTi pathway tracking — set 1.5°C-aligned targets; near-term and long-term trajectories; deviation alerts | M |
| 32.6 | Carbon credit / offset registry integration — record offset purchases; net-zero accounting | M |

---

### Sprint 33 — Platform: Full Okta/Entra-Level Auth Parity

**Target parity lift:** Platform 80 % → 90 %

| # | Task | Effort |
|---|---|---|
| 33.1 | FIDO2 passkey support — WebAuthn registration and authentication; hardware security key fallback | L |
| 33.2 | SMS and push MFA — integrate Twilio for SMS OTP; push notification MFA via mobile app | M |
| 33.3 | Conditional access policies — access rules based on device trust, IP location, risk score | L |
| 33.4 | Adaptive risk-based authentication — flag anomalous logins (new device, unusual location); step-up MFA challenge | L |
| 33.5 | IDP-initiated SSO + JIT provisioning — SAML IdP-initiated flow; auto-create user on first SSO | M |
| 33.6 | LDAP / Active Directory sync — user provisioning via LDAP; incremental sync; deactivation on AD disable | L |

---

### Sprint 34 — Inventory: Full SAP MM Parity + Barcode

**Target parity lift:** Inventory 60 % → 78 %

| # | Task | Effort |
|---|---|---|
| 34.1 | Barcode / RFID scanning — mobile barcode scanner in React Native app; scan-to-receive, scan-to-consume | M |
| 34.2 | MRP (Material Requirements Planning) — demand-driven reorder suggestions; lead time + safety stock; auto-draft PO | XL |
| 34.3 | Batch / serial number tracking — lot management; FEFO picking; full traceability from PO to WO consumption | L |
| 34.4 | Bin / slot management within warehouse — warehouse map; put-away rules; directed picking | L |
| 34.5 | Vendor performance scorecard — on-time delivery; quality score; price variance; automated assessment on GR | M |
| 34.6 | Contract catalogue pricing — contracted price list per vendor; preferred vendor logic; auto-apply on PO | M |

---

### Sprint 35 — DEX + FlowSpace: Orchestration Platform Parity

**Target parity lift:** Platform 90 % → 96 %

| # | Task | Effort |
|---|---|---|
| 35.1 | DEX workflow visualisation — interactive DAG editor for multi-step workflows; drag-connect activities | XL |
| 35.2 | DEX activity library — reusable activity types (HTTP call, DB query, AI inference, notification, approval gate) | L |
| 35.3 | DEX scheduling — time-triggered and event-triggered workflow execution; cron and webhook triggers | M |
| 35.4 | DEX SLA and deadline enforcement — per-activity timeout; escalation on breach; auto-cancel on deadline | M |
| 35.5 | FlowSpace compliance export — export decision records as immutable PDF/CSV for regulatory submission | M |
| 35.6 | FlowSpace public attestation — cryptographic hash of decision record batch; optional blockchain anchoring | L |

---

### Sprint 36 — Partner Ecosystem: Full AppExchange-Level Portal

**Target parity lift:** Partner 64 % → 82 %

| # | Task | Effort |
|---|---|---|
| 36.1 | Marketplace / app listing — partner apps published to in-app marketplace; install / uninstall lifecycle | XL |
| 36.2 | OAuth 2.0 / PKCE connected app framework — full OAuth app with scoped access tokens; consent screen | L |
| 36.3 | Event streaming for partners — SSE/WebSocket consumer API; partner apps subscribe to Guardian Flow events | L |
| 36.4 | Sandbox environment provisioning — one-click partner sandbox with seed data; separate tenant; 30-day TTL | L |
| 36.5 | Partner revenue sharing and billing — track API call volume per partner app; billing integration | M |
| 36.6 | Developer certification program — automated API contract tests; compliance checks before marketplace listing | M |

---

## Phase 6 — Beyond Parity: Market-Leading Differentiation (Sprints 37–48)

> **Objective:** Surpass every assessed market leader with capabilities they do not natively offer. Introduce Guardian Flow–exclusive product differentiators that justify premium positioning and create switching costs.

---

### Sprint 37 — Unified Field-to-Finance Automation ("Zero-Touch Operations")

**Beyond:** ServiceNow FSM + SAP Finance have no native end-to-end automation connecting field completion directly to financial close without human touch.

| # | Task | Effort |
|---|---|---|
| 37.1 | Automated WO → Invoice → GL pipeline — WO completion triggers invoice draft; auto-GL posting on approval; no manual entry required | XL |
| 37.2 | Real-time margin dashboard — live P&L per work order and per technician; cost vs revenue per job type | L |
| 37.3 | Autonomous AP matching — ML model matches supplier invoices to POs and GRs with 95%+ accuracy; no human review needed for matched items | L |
| 37.4 | Predictive cash-flow forecasting — combine AR aging + outstanding WOs + PM schedule into 13-week cash flow projection | M |
| 37.5 | Automated period close checklist — system validates all reconciliations are complete before enabling period lock; no manual checklist | M |

---

### Sprint 38 — Conversational AI Operations Assistant

**Beyond:** No FSM or ERP market leader has a deeply integrated operations co-pilot that understands the full platform context.

| # | Task | Effort |
|---|---|---|
| 38.1 | Guardian AI assistant — conversational interface (sidebar + voice) with access to all platform data; GPT-4-class model | XL |
| 38.2 | Natural language WO creation — "Schedule a boiler inspection at Acme site next Tuesday, assign to Sarah" creates WO from voice/text | L |
| 38.3 | Proactive anomaly briefing — daily digest: unusual patterns detected across WOs, inventory, finance, IoT; explained in plain language | M |
| 38.4 | AI-powered report generation — "Show me last quarter's SLA performance by technician" generates chart + written summary | M |
| 38.5 | Contextual help and guided workflows — AI walks users through unfamiliar tasks step by step; context-aware inline help | M |
| 38.6 | AI governance log — every AI assistant interaction recorded to FlowSpace; explainable; auditable | S |

---

### Sprint 39 — Autonomous Predictive Operations (APO)

**Beyond:** PdM vendors (GE APM, Uptake) do not natively generate the full downstream chain from prediction → dispatch → completion → invoice.

| # | Task | Effort |
|---|---|---|
| 39.1 | Fully autonomous PM workflow — sensor threshold breach → ML risk score → auto-WO creation → auto-technician assignment → customer notification — no human touch | XL |
| 39.2 | Multi-asset portfolio risk dashboard — plant-wide risk heat map; priority ranking by business impact of failure | L |
| 39.3 | Digital twin simulation for maintenance planning — "what-if" degradation scenarios; optimal maintenance window recommendation | L |
| 39.4 | Condition-based contract pricing — API for OEM/service contract pricing based on real asset health data | M |
| 39.5 | RUL-based parts pre-positioning — order parts automatically when asset RUL crosses threshold; deliver to site before PM window | M |

---

### Sprint 40 — Guardian Flow Intelligence Platform (GFIP)

**Beyond:** Power BI and Tableau are standalone BI tools. GFIP is a deeply embedded, context-aware intelligence layer across the entire platform.

| # | Task | Effort |
|---|---|---|
| 40.1 | Cross-domain insight engine — correlates FSM, finance, inventory, IoT, CRM data automatically; surfaces hidden patterns | XL |
| 40.2 | Explainable AI (XAI) on every prediction — SHAP values shown inline for every ML recommendation (dispatch, risk, demand) | L |
| 40.3 | Benchmark mode — anonymised cross-tenant benchmarking; "your SLA rate is 12 % below similar orgs" | L |
| 40.4 | Prescriptive recommendations — not just "what happened" but "what you should do next" with estimated business impact | L |
| 40.5 | Custom AI model training on tenant data — tenant-specific models trained on their own historical data; federated privacy | L |
| 40.6 | GenAI data storytelling — auto-generate executive narrative from any analytics view; export as board-ready report | M |

---

### Sprint 41 — Sustainability-Linked Operations

**Beyond:** SAP Sustainability and Workiva ESG do not natively integrate ESG data into operational decision-making in real time.

| # | Task | Effort |
|---|---|---|
| 41.1 | Carbon-aware scheduling — scheduler factor; route optimiser minimises route-distance AND carbon emissions simultaneously | L |
| 41.2 | ESG KPIs embedded in WO cost calculation — show CO₂e cost alongside financial cost per WO | M |
| 41.3 | Real-time Scope 1/2 dashboard — live emissions from fleet GPS + energy meters + IoT sensors | L |
| 41.4 | Supplier ESG scoring — score suppliers on carbon intensity, labour, governance; weight in procurement decisions | M |
| 41.5 | Green contract clauses engine — auto-flag SLA contracts that violate emissions targets; suggest greener alternative | M |
| 41.6 | Net-zero progress tracker — real-time trajectory vs SBTi targets; monthly automated investor update email | M |

---

### Sprint 42 — Hyper-Personalisation and White-Label Platform-as-a-Service

**Beyond:** No current FSM/ERP vendor offers a true no-code configuration layer this deep.

| # | Task | Effort |
|---|---|---|
| 42.1 | No-code page builder — drag-and-drop UI builder for custom pages; component library; deploy to tenant subdomain | XL |
| 42.2 | No-code workflow builder — visual workflow designer (like Zapier/Power Automate) for business rules, approvals, notifications | XL |
| 42.3 | Custom object builder — create entirely new data entities with custom fields, relationships, UI, and API without code | XL |
| 42.4 | White-label mobile app — partner-branded native app builds from shared codebase; custom icons, splash, domain | L |
| 42.5 | Custom domain with SSL provisioning — automatic Let's Encrypt SSL for partner custom domains | M |
| 42.6 | Tenant-specific AI model customisation — partners can upload training data to fine-tune models for their industry | L |

---

### Sprint 43 — Global Enterprise: Multi-Region + Compliance

**Beyond:** Most mid-market platforms treat multi-region as an afterthought.

| # | Task | Effort |
|---|---|---|
| 43.1 | Multi-region deployment — data residency per tenant (EU/US/APAC); region-specific DB clusters; cross-region failover | XL |
| 43.2 | GDPR data subject rights automation — automated right-to-erasure; data export; consent record | L |
| 43.3 | HIPAA compliance mode — PHI field tagging; encrypted-at-rest per field; audit log; BAA support | L |
| 43.4 | SOC 2 Type II evidence automation — continuous control monitoring; automated evidence collection for all SOC 2 controls | L |
| 43.5 | ISO 27001 control library — pre-populated controls; automated testing; certification readiness dashboard | M |
| 43.6 | Data classification engine — auto-tag PII/sensitive fields across all collections; prevent leakage via API | M |

---

### Sprint 44 — Real-Time Collaboration and Communication

**Beyond:** Enterprise SaaS tools largely treat collaboration as an add-on (Salesforce Chatter, ServiceNow Connect). GF embeds it natively in workflows.

| # | Task | Effort |
|---|---|---|
| 44.1 | In-platform real-time messaging — per-WO chat, per-deal thread, per-project room; WebSocket-powered | L |
| 44.2 | Video call on WO — embedded WebRTC video for remote technician guidance; session recorded and attached to WO | L |
| 44.3 | Collaborative document editing — shared notes on WOs, deals, meetings; real-time multiplayer editing (CRDT) | L |
| 44.4 | @mention and notification system — cross-platform @mentions; notification centre with read/unread; digest email | M |
| 44.5 | External stakeholder portal — share a WO or deal view with external parties (customer, supplier) without requiring login | M |
| 44.6 | Meeting scheduler integration — Google Calendar / Outlook sync; create meetings from deal/WO with auto-invite | M |

---

### Sprint 45 — Advanced Financial Instruments

**Beyond:** Oracle and SAP Cloud require separate modules/licences for these.

| # | Task | Effort |
|---|---|---|
| 45.1 | Treasury management — cash position forecasting; bank account consolidation; FX hedging instruments | XL |
| 45.2 | Subscription billing and revenue recognition — recurring billing engine; complex contract schedules; ASC 606 auto-trigger | L |
| 45.3 | Project accounting — cost and revenue tracking per project; WIP accounting; percentage-of-completion | L |
| 45.4 | Intercompany netting and settlement — automated netting run; settlement journal; multi-currency netting | M |
| 45.5 | Dynamic discounting marketplace — supplier early-pay discount offers; dynamic rate calculation | M |
| 45.6 | Audit-ready consolidated statutory accounts — auto-prepare IFRS/GAAP consolidated accounts pack for auditors | L |

---

### Sprint 46 — Industry Cloud Accelerators

**Beyond:** Salesforce Industry Cloud and SAP Industry Solutions require expensive separate products.

| # | Task | Effort |
|---|---|---|
| 46.1 | Utilities & Energy sector pack — asset hierarchy (generation → substation → meter); regulatory compliance templates; outage management | XL |
| 46.2 | Healthcare / MedTech pack — medical device servicing workflows; FDA 21 CFR Part 11 compliance; calibration management | XL |
| 46.3 | Property / FM pack — building hierarchy; planned preventive maintenance; lease management; CAFM dashboard | L |
| 46.4 | Manufacturing pack — production order integration; OEE dashboard; FMEA library for industrial assets | L |
| 46.5 | Telecoms / Cable pack — network infrastructure assets; fault-to-fix workflow; SLA by service type | M |
| 46.6 | Sector-specific KPI libraries — pre-built KPI sets for each vertical; benchmarks seeded from industry data | M |

---

### Sprint 47 — Autonomous Finance Close ("Zero-Day Close")

**Beyond:** Even SAP and Oracle cannot close the books on the same day as period-end without manual intervention.

| # | Task | Effort |
|---|---|---|
| 47.1 | Continuous accounting — post accruals and deferrals in real time rather than at period-end; rolling trial balance | XL |
| 47.2 | AI-powered anomaly detection on GL — flag unusual postings, duplicate amounts, off-pattern entries in real time | L |
| 47.3 | Automated intercompany elimination | verify and eliminate intra-group entries without manual matching | L |
| 47.4 | One-click financial close package — generate TB, P&L, Balance Sheet, Cash Flow, notes package as XBRL + PDF | M |
| 47.5 | Auditor collaboration portal — auditors log in with scoped read-only access; submit queries; receive evidence | M |
| 47.6 | Predictive close timeline — ML model estimates close completion date based on outstanding items; flags bottlenecks | M |

---

### Sprint 48 — Guardian Trust Layer (Security + Assurance at Scale)

**Beyond:** No enterprise SaaS platform offers a fully customer-visible, real-time trust and security assurance layer at this depth.

| # | Task | Effort |
|---|---|---|
| 48.1 | Real-time security posture dashboard — live view of authentication anomalies, failed MFA, IP violations, unusual API activity | L |
| 48.2 | Autonomous threat response — auto-revoke JWT on detected session anomaly; lock account on credential stuffing pattern | L |
| 48.3 | Zero-trust network access model — per-request context evaluation; device posture check; least-privilege token scope | XL |
| 48.4 | Customer-managed encryption keys (CMEK) — tenant provides their own KMS key; GF never has plaintext access to tenant data | L |
| 48.5 | Immutable infrastructure audit trail (FlowSpace v2) — all platform state changes (schema, config, users, policies) hash-chained; tamper-evident | L |
| 48.6 | Public trust portal — customer-facing uptime, SLA, incident history, audit cert, and penetration test results dashboard | M |

---

## Module Parity Trajectory

| Module | Baseline | Ph 1 | Ph 2 | Ph 3 | Ph 4 | Ph 5 | Ph 6 (beyond) |
|---|---|---|---|---|---|---|---|
| 1. FSM | 30 % | 62 % | 70 % | 74 % | 80 % | **100 %** | 🚀 |
| 2. CRM | 25 % | 25 % | 52 % | 60 % | 72 % | **100 %** | 🚀 |
| 3. Finance | 36 % | 60 % | 68 % | 78 % | 82 % | **100 %** | 🚀 |
| 4. Inventory | 22 % | 38 % | 50 % | 55 % | 60 % | **100 %** | 🚀 |
| 5. Analytics | 28 % | 42 % | 46 % | 62 % | 68 % | **100 %** | 🚀 |
| 6. IoT / PdM | 16 % | 16 % | 40 % | 44 % | 60 % | **100 %** | 🚀 |
| 7. Platform | 50 % | 58 % | 64 % | 74 % | 82 % | **100 %** | 🚀 |
| 8. AI / ML | 16 % | 16 % | 16 % | 44 % | 50 % | **100 %** | 🚀 |
| 9. ESG | 42 % | 42 % | 42 % | 64 % | 68 % | **100 %** | 🚀 |
| 10. Partner | 38 % | 38 % | 38 % | 38 % | 64 % | **100 %** | 🚀 |
| **Overall** | **~30 %** | **~46 %** | **~55 %** | **~64 %** | **~75 %** | **~100 %** | **Market-leading** |

**Phase 6 creates capabilities no single market leader currently offers:**
- Zero-touch field-to-finance automation (Sprint 37)
- Embedded conversational AI co-pilot across all workflows (Sprint 38)
- Autonomous predictive operations end-to-end (Sprint 39)
- Carbon-aware scheduling and real-time ESG operations (Sprint 41)
- No-code custom object + workflow builder (Sprint 42)
- Zero-day financial close (Sprint 47)
- Customer-managed encryption + immutable trust layer (Sprint 48)

---

## Dependencies & Risks

| Risk | Mitigation |
|---|---|
| MQTT broker infra not available | Use `mqtt.js` in-process broker (Aedes) for dev/test; swap to HiveMQ/EMQX for prod |
| ML Python microservice requires Python runtime in deployment | Containerise `server/ml/` as a separate Docker service; communicate via internal HTTP |
| Google Maps / OSRM API costs | Default to OpenStreetMap + open OSRM instance; make mapping provider configurable via env var |
| Stripe payment gateway requires PCI compliance | Scope to Stripe Checkout (hosted page) so GF never touches raw card data |
| Sprint 17 (Dashboard Builder) is XL — risk of overrun | Time-box to basic drag-and-drop; advanced widget types carry over to backlog |
| DB schema changes (vendor master, accounts, shifts) may break existing data | Always run migration as idempotent scripts in `server/scripts/`; add to `phase0-migration.js` pattern |
| Simultaneous frontend and backend work per sprint | Pair FE/BE tasks in each sprint; mock API responses on day 1 to unblock UI work |
| Phase 5 mobile app (Sprint 25) requires React Native expertise | Evaluate Expo Managed Workflow to reduce native bridging; hire RN specialist by Phase 4 end |
| Phase 5 group consolidation (Sprint 26) is accounting-domain heavy | Engage a chartered accountant as domain expert reviewer during Sprint 26 |
| Phase 6 zero-trust / CMEK (Sprint 48) requires infra architecture changes | Design CMEK key hierarchy in Sprint 43 to avoid late-stage rework |
| Federated learning (Sprint 30) requires regulatory sign-off in EU | Begin GDPR DPA assessment in Sprint 22; get Data Protection Officer review before Sprint 30 |
| Phase 6 industry packs (Sprint 46) require domain expertise per vertical | Build vertical advisory council (1 customer per vertical) during Phase 5 to validate requirements |
| 48-sprint timeline assumes a growing engineering team | Phase 1–4 can run with 3–5 engineers; Phase 5 needs 8–12; Phase 6 needs 15–20+ with vertical squads |

---

*Sprint plan prepared: April 2026. Targets 100 % enterprise parity by end of Phase 5 (~18 months) and market-leading differentiation by end of Phase 6 (~24 months). Review and re-prioritise after each sprint retrospective. Module scores should be re-assessed against `docs/MARKET_COMPARISON.md` after Phase 2, Phase 4, and Phase 5 completions.*
