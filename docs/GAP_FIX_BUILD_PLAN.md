# Guardian-Flow — Gap-Fix Build Plan
> Derived from the April 2026 feature-parity audit against IBM Maximo, Salesforce Field Service, Zendesk, NetSuite, Temporal, and peer market leaders.  
> All phases are additive — each sprint leaves the system deployable.

---

## Legend
| Symbol | Meaning |
|--------|---------|
| 🔴 | Missing entirely |
| 🟡 | Stub / mock / UI-only |
| 🟢 | Implemented and wired |
| → | Leads to / triggers |

---

## Phase 1 — Foundation Blockers  *(Sprints 1–4, ~4 weeks)*
> Nothing else can be properly built until these structural gaps are closed.

### Sprint 1 — Asset Record Expansion
**Goal:** Register Equipment modal goes from 3 fields → 20+ fields matching Maximo basic asset.

**Backend (`server/routes/assets.js` + `equipment-register`)**
- [ ] Add fields to `POST /api/assets` and `POST /api/functions/equipment-register`:
  - `manufacturer`, `model`, `vendor_id`, `part_number`
  - `location_site`, `location_building`, `location_floor`, `location_room`, `location_position`
  - `purchase_date`, `purchase_price`, `purchase_order_number`
  - `warranty_start`, `warranty_end`, `warranty_vendor`
  - `criticality` (enum: low/medium/high/critical), `safety_critical` (boolean), `hazmat` (boolean)
  - `rated_capacity`, `rated_capacity_uom`, `rated_power_kw`
  - `status` (operating/standby/decommissioned/in_repair/disposed)
  - `lifecycle_state` (installed/active/decommissioned/disposed)
- [ ] Add `failure_class`, `failure_cause`, `failure_remedy` code-set collections + CRUD routes
- [ ] Add `asset_meters` collection: `{ asset_id, meter_type, uom, current_value, last_read_at }`
- [ ] `POST /api/assets/:id/meters` — record a meter reading
- [ ] DB migration `011-asset-expansion.js`

**Frontend (`src/domains/inventory/pages/Equipment.tsx`)**
- [ ] Replace 3-field modal with a tabbed form: **General | Location | Purchase | Warranty | Specs | Safety**
- [ ] Controlled-vocabulary dropdowns for Category (taxonomy), Status, Lifecycle State, Criticality
- [ ] Expose parent asset selector (already in API, missing from UI)

---

### Sprint 2 — Work Order Completion Loop
**Goal:** Close the WO → Invoice billing gap so that closing a WO can trigger an invoice.

**Backend**
- [ ] Extend `work_orders` schema: `scheduled_start`, `scheduled_end`, `actual_start`, `actual_end`, `duration_minutes`, `work_type`, `skills_required[]`, `parts_consumed[]`, `labour_cost`, `parts_cost`, `customer_signature_url`
- [ ] `PUT /api/work-orders/:id/complete` — sets `actual_end`, computes `duration_minutes`, deducts consumed parts from inventory
- [ ] On WO complete: auto-create draft invoice if `cost_to_customer > 0` (call existing `/api/invoices` internally)
- [ ] `POST /api/work-orders/:id/checklist` — ordered task list (description, required, completed_by, completed_at)
- [ ] `GET /api/work-orders/:id/checklist`

**Frontend (`src/domains/workOrders`)**
- [ ] Add **Checklist** tab on WO detail
- [ ] Add **Time Tracking** panel (start/stop timer → writes `actual_start` / `actual_end`)
- [ ] Add **Parts Used** panel (search inventory, add quantity)
- [ ] "Complete & Invoice" action button → creates draft invoice and navigates to it

---

### Sprint 3 — Background Job Engine
**Goal:** Enable all time-triggered work: SLA escalation, PM triggers, reorder alerts, report dispatch.

**Backend (new `server/jobs/` folder)**
- [ ] Install `node-cron` (already in `package.json` candidate) — no new external dep needed, or use `node-cron` from npm
- [ ] `server/jobs/queue.js` — simple persisted job store using existing DB adapter (`jobs` collection)
  - Schema: `{ id, type, payload, run_at, status, attempts, last_error, created_at }`
  - `enqueueJob(type, payload, runAt)`, `claimNextJob()`, `markDone(id)`, `markFailed(id, err)`
- [ ] `server/jobs/runner.js` — poll every 30 s, dispatch to handler map
- [ ] Handlers (one file each):
  - `server/jobs/handlers/sla-escalate.js` — query open tickets past SLA breach time → update status + notify
  - `server/jobs/handlers/pm-trigger.js` — check `asset_meters` and PM plan schedules → raise WOs
  - `server/jobs/handlers/reorder-check.js` — check stock levels vs reorder point → raise purchase requests
  - `server/jobs/handlers/report-dispatch.js` — send scheduled analytics reports via email
- [ ] Start runner in `server/server.js` after DB connects
- [ ] DB migration `012-jobs-collection.js`

---

### Sprint 4 — Tax Engine on Invoices
**Goal:** Legal invoicing in any jurisdiction — line-level tax with multiple rates.

**Backend**
- [ ] `tax_rates` collection: `{ id, tenant_id, name, rate_percent, applies_to[], jurisdiction, is_default }`
- [ ] CRUD routes `GET|POST|PUT|DELETE /api/tax-rates`
- [ ] Extend invoice line schema: `{ ..., tax_rate_id, tax_amount }`
- [ ] `GET /api/invoices/:id/totals` — compute subtotal, tax breakdown, total
- [ ] Update `POST /api/invoices` to accept `lines[].tax_rate_id` and compute `tax_amount` server-side
- [ ] DB migration `013-tax-rates.js`

**Frontend**
- [ ] Tax Rates settings page under Finance → Settings
- [ ] Invoice line editor: add "Tax Rate" dropdown per line
- [ ] Invoice summary panel: show subtotal + tax lines + total

---

## Phase 2 — Core Operations Depth  *(Sprints 5–9, ~5 weeks)*

### Sprint 5 — Preventive Maintenance Plans
**Goal:** Asset-linked PM schedules that auto-raise work orders (requires Sprint 3 job engine).

- [ ] `pm_plans` collection: `{ id, tenant_id, asset_id, name, frequency_type (calendar|meter), frequency_value, frequency_uom, job_plan_id, next_due_date, last_generated_wo_id }`
- [ ] `job_plans` collection: task library — `{ id, tenant_id, name, tasks[], estimated_hours, required_skills[], required_tools[] }`
- [ ] CRUD: `GET|POST|PUT|DELETE /api/pm-plans`, `GET|POST|PUT|DELETE /api/job-plans`
- [ ] `pm-trigger` job handler (Sprint 3) queries overdue plans and creates WOs via existing route
- [ ] Frontend: **PM Plans** tab on Asset detail page; **Job Plan Library** page under Operations

---

### Sprint 6 — Inventory — Multi-location, Parts-to-WO, Reorder
**Goal:** Inventory is usable in the field — parts reserved against WOs, reorder alerts fire.

- [ ] `stock_locations` collection: `{ id, tenant_id, name, type (warehouse|van|site) }`
- [ ] Extend `inventory_items`: add `stock_location_id`, `reorder_point`, `reorder_quantity`, `supplier_id`
- [ ] `stock_movements` collection: `{ id, item_id, from_location_id, to_location_id, quantity, reason (issue|receive|transfer|adjust), reference_id, reference_type, actor_id, created_at }`
- [ ] `POST /api/inventory/:id/issue` — issue qty to a WO (writes movement, decrements `quantity_on_hand`)
- [ ] `POST /api/inventory/:id/receive` — receive against PO
- [ ] `GET /api/inventory/movements` — movement history with filters
- [ ] `suppliers` collection + `GET|POST|PUT /api/suppliers`
- [ ] Reorder-check job handler (Sprint 3) creates `purchase_requests` when `qty_on_hand < reorder_point`
- [ ] Frontend: Location filter on inventory list; **Issue Parts** action on WO Parts panel

---

### Sprint 7 — Scheduler Enhancements
**Goal:** Scheduler uses real travel time matrix and respects shift windows.

- [ ] `technician_shifts` collection: `{ technician_id, date, start_time, end_time, break_windows[] }`
- [ ] `POST /api/technicians/:id/shifts` + `GET /api/technicians/:id/shifts`
- [ ] Update `server/services/scheduler.js`:
  - Load shifts and filter candidates to those available on the target date
  - Accept optional Google Maps Distance Matrix API key (`MAPS_API_KEY` env var); if absent, use straight-line haversine distance
  - Score now = skill_match_percent × (1 − travel_time_ratio) × shift_availability_factor
- [ ] Real-time dispatch board page (`/dispatch`):
  - Gantt-style grid: Y-axis = technicians, X-axis = time slots
  - Drag WO card onto technician row → calls `PUT /api/schedule/assignments/:id`
  - Uses existing WebSocket server to push assignment updates

---

### Sprint 8 — Inbound Communications + Agent Inbox
**Goal:** Comms Hub handles inbound email/SMS → tickets; agents have a live inbox.

- [ ] `POST /api/comms/inbound/email` — parse inbound email payload (SendGrid Inbound Parse or Mailgun), create/update ticket
- [ ] `POST /api/comms/inbound/sms` — Twilio inbound webhook handler, route to open thread or create ticket
- [ ] `POST /api/comms/inbound/whatsapp` — Twilio WhatsApp inbound, same routing logic
- [ ] `agent_inbox` collection: `{ thread_id, channel, customer_id, assigned_agent_id, unread_count, last_message_at, status }`
- [ ] `GET /api/comms/inbox` — agent's assigned threads sorted by `last_message_at`
- [ ] WebSocket event `comms:new_message` pushed to assigned agent on inbound
- [ ] Frontend: **Inbox** page under Communications; unread badge on nav icon; thread detail with reply box + internal notes tab

---

### Sprint 9 — CRM — Contacts, Pipeline, Activities
**Goal:** Salesforce-parity basics — contacts per account, opportunity pipeline, activity log.

- [ ] `contacts` collection: `{ id, tenant_id, customer_id, first_name, last_name, email, phone, role, is_primary }`
- [ ] CRUD `GET|POST|PUT|DELETE /api/contacts`
- [ ] `opportunities` collection: `{ id, tenant_id, customer_id, name, stage (prospect/qualified/proposal/negotiation/won/lost), value, probability, expected_close_date, owner_id }`
- [ ] CRUD `GET|POST|PUT|DELETE /api/opportunities`
- [ ] `activities` collection: `{ id, tenant_id, customer_id, contact_id, type (call/email/meeting/note), summary, logged_by, logged_at }`
- [ ] `POST /api/activities`, `GET /api/activities?customer_id=`
- [ ] Frontend: Customer detail adds **Contacts** tab, **Pipeline** tab, **Activities** timeline

---

## Phase 3 — Financial Grade  *(Sprints 10–12, ~3 weeks)*

### Sprint 10 — GL Hardening (Period Lock + Entry Reversals)
**Goal:** GL passes accountant review.

- [ ] `PUT /api/ledger/periods/:id/lock` — set `status = 'locked'`; reject new journal entry `POST` calls if period is locked
- [ ] `PUT /api/ledger/periods/:id/unlock` — require `sys_admin` or `tenant_admin` role
- [ ] `POST /api/ledger/entries/:id/reverse` — create a new JE with all debits/credits flipped, `reference` = "Reversal of JE-{original}"
- [ ] Auto-reversing entry flag: `auto_reverse_date` on JE; job handler posts reversal on that date
- [ ] Frontend: Period list shows lock toggle (admin only); JE detail has "Reverse" button

---

### Sprint 11 — Payments — Partial, Refunds, Auto-Reconcile
**Goal:** Payment lifecycle is complete without manual ledger work.

- [ ] Extend `payment_transactions`: add `applied_to_invoice_id[]`, `balance_remaining`
- [ ] `POST /api/payments/apply` — apply a payment (or partial) to one or more invoices; updates `invoice.amount_paid` and `invoice.status`
- [ ] `POST /api/payments/:id/refund` — call gateway refund API (Stripe `refunds.create`, PayPal `refund`, Razorpay `refund`); create credit note
- [ ] Auto-reconcile job: nightly match `payment_transactions` with `invoices` by amount + customer + date window
- [ ] Frontend: Invoice detail shows **Payment History** + "Apply Payment" button; Transactions list shows "Refund" action

---

### Sprint 12 — Recurring Invoices + Credit Notes
**Goal:** Subscription billing and credit memo capability.

- [ ] `invoice_schedules` collection: `{ id, tenant_id, customer_id, template_invoice_id, frequency (weekly/monthly/quarterly/annual), next_run_date, end_date, status }`
- [ ] `GET|POST|PUT|DELETE /api/invoice-schedules`
- [ ] Job handler: on `next_run_date`, clone template invoice, set next due date, send to customer
- [ ] `credit_notes` collection linked to originating invoice; `POST /api/credit-notes`; reduce outstanding balance on application
- [ ] Frontend: Invoice list → "Set Recurring" action; Credit Notes list under Finance

---

## Phase 4 — AI/ML Integrity  *(Sprints 13–15, ~3 weeks)*

### Sprint 13 — Real Time-Series Forecasting
**Goal:** Replace mock LLM forecast responses with a real statistical model.

- [ ] Install `ml-regression` or use a lightweight ARIMA implementation (pure JS — no new Python service needed)
- [ ] `server/services/forecasting.js` — export `forecastTimeSeries(dataPoints, horizon, frequency)` using simple Holt-Winters exponential smoothing
- [ ] Update `POST /api/analytics/forecast` to call `forecastTimeSeries` instead of the LLM; return structured `{ periods[], predicted_values[], confidence_low[], confidence_high[] }`
- [ ] LLM still used for narrative summary overlay (optional, graceful degradation)
- [ ] Add forecast accuracy backtest: `GET /api/analytics/forecast/accuracy?metric=&lookback_days=`

---

### Sprint 14 — Neuro Console — Remove Random Inference
**Goal:** Stop serving `Math.random()` as "AI inference".

- [ ] Replace random inference endpoint with one of:
  - **Option A** (recommended): Call OpenAI embeddings cosine similarity against a reference vector set
  - **Option B**: Return a clear `501 Not Implemented` with a message: "Model serving endpoint not configured. Set `MODEL_SERVING_URL` env var to connect a real inference server."
- [ ] Gate the Neuro Console UI behind a feature flag `FEATURE_NEURO_CONSOLE=true`; show "Coming Soon" banner when flag is off
- [ ] Remove or clearly mark A/B test page as demo/placeholder

---

### Sprint 15 — Federated Learning Aggregation + Drift
**Goal:** FedAvg actually averages gradients; drift detection is multivariate.

- [ ] `server/routes/federated.js` — `POST /api/ml/federated/rounds/:id/aggregate`:
  - Load all submitted gradient arrays for the round
  - Compute element-wise mean (FedAvg)
  - Store aggregated model update; mark round complete
- [ ] Extend drift detection (`server/routes/drift.js`): accept multivariate input matrix; compute KL divergence per feature alongside existing PSI; return per-feature drift scores

---

## Phase 5 — Enterprise Identity & Compliance  *(Sprints 16–17, ~2 weeks)*

### Sprint 16 — Per-Tenant SSO + SCIM
**Goal:** Every enterprise deal that blocks on "you only support one IdP" is unblocked.

- [ ] `sso_configs` collection: `{ id, tenant_id, provider, entity_id, sso_url, x509_cert, attribute_mapping, created_at }`
- [ ] `GET|POST|PUT|DELETE /api/org/sso-configs` (tenant_admin scoped)
- [ ] Update SSO callback `/api/sso/callback` to look up `sso_configs` by `tenant_id` rather than reading global env vars
- [ ] `GET /api/scim/v2/Users` + `POST /api/scim/v2/Users` + `PUT /api/scim/v2/Users/:id` + `DELETE /api/scim/v2/Users/:id` — SCIM 2.0 user provisioning
- [ ] SCIM bearer token auth (separate from JWT); token stored in `sso_configs`
- [ ] Frontend: SSO Configuration tab in Org Console per tenant

---

### Sprint 17 — Unified Audit Log + GDPR Tools
**Goal:** Single tamper-evident audit stream queryable across all domains.

- [ ] `audit_log` collection: `{ id, tenant_id, actor_id, actor_type, domain, action, resource_type, resource_id, before_snapshot, after_snapshot, ip_address, user_agent, created_at }`
  - Append-only: no `updateOne` or `deleteOne` ever targets this collection
- [ ] `server/middleware/audit.js` — wraps mutating routes, writes an audit entry post-response
- [ ] Register audit middleware on all `POST`, `PUT`, `PATCH`, `DELETE` routes
- [ ] `GET /api/audit-log` — paginated, filterable by domain/actor/resource; `sys_admin` + `tenant_admin` only
- [ ] `GET /api/audit-log/export?format=csv|json` — full export for SIEM
- [ ] GDPR: `POST /api/gdpr/export-customer-data/:customerId` — zip of all records referencing the customer
- [ ] GDPR: `DELETE /api/gdpr/erase-customer/:customerId` — anonymise PII fields, keep aggregated analytics

---

## Phase 6 — Mobile, PWA & Real-time  *(Sprints 18–19, ~2 weeks)*

### Sprint 18 — Real PWA + Offline Sync
**Goal:** Field technicians can complete WOs without a signal.

- [ ] Install `vite-plugin-pwa` config in `vite.config.ts`:
  ```ts
  VitePWA({
    registerType: 'autoUpdate',
    workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
    manifest: { name: 'Guardian Flow', short_name: 'GFlow', theme_color: '#1e1b4b' }
  })
  ```
- [ ] Service worker caches: static shell + last-fetched WO list + assigned WO detail pages
- [ ] IndexedDB offline queue (`src/lib/offlineQueue.ts`): buffer `PUT /api/work-orders/:id/complete`, `POST /api/work-orders/:id/checklist`, `POST /api/inventory/:id/issue`
- [ ] Sync queue on reconnect using `navigator.onLine` + `online` event listener
- [ ] `OfflineBanner` component already exists — wire it to actual `navigator.onLine`

---

### Sprint 19 — Real-time WebSocket Feeds
**Goal:** Dispatch board, IoT dashboard, and ticket inbox show live data without page refresh.

- [ ] WebSocket server already exists — extend event types:
  - `wo:status_change` — broadcast when WO status changes
  - `ticket:new` + `ticket:updated`
  - `schedule:assignment_proposed` + `schedule:assignment_accepted`
  - `inventory:low_stock` — emitted by reorder-check job
  - `comms:new_message` — see Sprint 8
- [ ] Client hook `src/lib/useSocket.ts` — subscribe to typed events, return latest payload
- [ ] Wire dispatch board (`/dispatch`), ticket list (`/tickets`), and IoT dashboard to `useSocket`
- [ ] Notification centre: `notifications` collection + bell icon shows unread count from WebSocket events

---

## Phase 7 — Knowledge Base & Training Completeness  *(Sprint 20, ~1 week)*

### Sprint 20 — KB Document Ingestion + Training Enrolment
**Goal:** KB accepts PDF/Word uploads; Training platform stores real enrolment records.

**KB**
- [ ] `POST /api/knowledge/upload` — accept `multipart/form-data`; extract text via `pdfjs-dist` (PDF) or `mammoth` (DOCX); chunk and embed into vector store
- [ ] KB article versioning: `kb_article_versions` collection; `GET /api/knowledge/:id/versions`
- [ ] "Was this helpful?" endpoint: `POST /api/knowledge/:id/feedback` (`{ helpful: bool, comment }`)

**Training**
- [ ] `training_enrolments` collection: `{ id, tenant_id, user_id, course_id, status (enrolled/in_progress/passed/failed), score, enrolled_at, completed_at, certificate_url }`
- [ ] `POST /api/training/enrol` + `PUT /api/training/enrolments/:id/complete`
- [ ] Certificate PDF generation on pass (reuse jsPDF pattern from invoices)
- [ ] Manager dashboard: `GET /api/training/team-progress?manager_id=` — aggregated completion rates

---

## Cross-cutting Improvements (parallel with all phases)

| Item | Sprint | Owner hint |
|------|--------|------------|
| OpenAPI spec — annotate all routes with JSDoc `@swagger` and serve via `swagger-ui-express` at `/api/docs` | 1 | Backend |
| Rate limiting — apply `express-rate-limit` to all legacy CRUD routes (not just new ones) | 1 | Backend |
| i18n scaffolding — add `react-i18next` with `en` locale JSON; extract all hardcoded UI strings | 3 | Frontend |
| WCAG 2.1 AA audit — add `eslint-plugin-jsx-a11y`; fix `aria-label` gaps on all icon buttons | 4 | Frontend |
| E2E test suite — replace E2E dashboard page with Playwright tests for top-10 user journeys | 5 | QA |
| `vite-plugin-pwa` manifest.json — minimum viable web-app manifest so install prompt fires | 18 | Frontend |

---

## Milestone Summary

| Milestone | Sprints | Deliverable |
|-----------|---------|-------------|
| **M1 — Shippable Asset + WO Core** | 1–2 | Equipment form parity with Maximo basic; WO closes → invoice |
| **M2 — Automated Operations** | 3–4 | Background jobs fire; legal invoicing with tax |
| **M3 — Full Field Service** | 5–7 | PM auto-raise; inventory linked to WO; real dispatch board |
| **M4 — Comms + CRM Depth** | 8–9 | Inbound messages routed; contacts + pipeline live |
| **M5 — Accounting Grade** | 10–12 | GL locked periods + reversals; partial pay + refunds; recurring invoices |
| **M6 — AI Integrity** | 13–15 | Real forecasting; Neuro Console honest about its state; FedAvg works |
| **M7 — Enterprise Identity** | 16–17 | Per-tenant SSO + SCIM; unified audit log; GDPR tools |
| **M8 — Mobile + Live** | 18–19 | Real PWA offline sync; WebSocket live feeds |
| **M9 — KB + Training** | 20 | Document upload + vector index; training enrolment + certificates |

---

## Definition of Done (per sprint)
1. All new routes have unit tests in `tests/unit/`
2. DB migration script is idempotent and added to `server/scripts/`
3. Frontend pages pass browser build (`npm run build` exits 0)
4. No new `Math.random()` used as a substitute for real logic
5. New env vars documented in `.env.example`
6. OpenAPI annotations added for new endpoints

---

*Last updated: 2026-04-11 | Audit source: `docs/GAP_ANALYSIS.md` + April 2026 feature-parity review*
