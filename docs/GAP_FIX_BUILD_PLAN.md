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
| **M10 — AI Integrity** | 21 | All Math.random() AI stubs replaced; real logic or honest 501/503 responses |
| **M11 — Live Connectors** | 22 | QuickBooks, Salesforce, SAP OAuth flows make real API calls |
| **M12 — Frontend Wired** | 23 | IoT, Anomaly, Digital Twin, ESG pages call real APIs; Governance + E2E honest |
| **M13 — Infra Completeness** | 24 | Vector DB activation path; 30+ undocumented env vars added; frontend tests scaffolded |
| **M14 — Frontend Mock Eliminated** | 25–27 | All remaining 64+ frontend pages replaced with live API calls; zero hardcoded mock arrays in production UI |
| **M15 — Real AI Active** | 28–30 | LLM prompts deployed; Google Maps routing live; constraint-based dispatch optimizer running; defect detection end-to-end |
| **M16 — IoT Automation** | 31 | IoT threshold → auto-WO trigger pipeline live; real device feeds; PM prediction from sensor data |
| **M17 — Market Differentiators** | 32–33 | Agentic AI dispatcher; customer self-service chatbot; i18n en/es/fr; WCAG 2.1 AA; Playwright E2E suite; OpenAPI docs at `/api/docs` |

---

## Phase 8 — Code-Quality Gaps from April 2026 Deep Scan  *(Sprints 21–24, ~4 weeks)*
> These gaps were found in the service layer and frontend and are independent of the feature-parity work above. They can be parallelised with Phase 2–4.

---

### Sprint 21 — De-mock AI Service Modules (G15)
**Goal:** Replace every `Math.random()` call in production AI service files with either a real model call or an explicit `501 Not Implemented` when no provider is configured.

**Backend**
- [ ] `server/services/ai/vision.js` — call `llm.visionAnalysis()` (already implemented in `llm.js`); fall back to `501` if `AI_PROVIDER=mock`
- [ ] `server/services/ai/xai.js` — call `llm.chatCompletion()` with a structured SHAP-explanation prompt; remove all `Math.random()` importance/direction/counterfactual generation
- [ ] `server/services/ai/automl.js` — store experiment metadata in DB; return `status: 'training'` immediately, update to `status: 'complete'` via background job when real training finishes; remove random accuracy/loss/duration
- [ ] `server/routes/ai.js` — price suggestions: replace `Math.random()` with average of last 5 invoices for same equipment category; risk score: delegate to `anomaly.detectFinancialAnomalies()`; failure probability: delegate to `predictive.predictMaintenanceNeeds()`
- [ ] `server/routes/customer-success.js` — compute churn risk from `support_tickets` open count + invoice overdue days + last-activity gap; replace all five `Math.random()` fields with real aggregations
- [ ] `server/services/ai/llm.js` — raise `503` (not silent mock) when `AI_PROVIDER !== 'mock'` but `OPENAI_API_KEY` is absent; log clear error message

**Tests**
- [ ] Unit test for each fixed service: assert no `Math.random` output variance across two identical inputs

---

### Sprint 22 — Real Connector OAuth Flows (G16)
**Goal:** QuickBooks, Salesforce, and SAP connectors make authenticated API calls.

**Backend**
- [ ] `server/services/connectors/quickbooks.js` — implement QuickBooks Online OAuth 2.0 PKCE flow; `sync('invoices')` calls QBO `/v3/company/{realmId}/query` API; map response to internal invoice schema
- [ ] `server/services/connectors/salesforce.js` — implement Salesforce Connected App OAuth; `sync('accounts')` calls SF REST `/services/data/vXX.0/sobjects/Account`; `sync('work_orders')` maps to FSL Work Orders
- [ ] `server/services/connectors/sap.js` — implement SAP Basic Auth + CSRF token pattern for S/4HANA OData; `sync('service_orders')` calls `/sap/opu/odata/sap/API_SERVICE_ORDER_SRV/A_ServiceOrder`
- [ ] `server/routes/connectors.js` — add `GET /api/connectors/:id/test-connection` endpoint; returns `{ ok, latency_ms, error? }`
- [ ] Add `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REALM_ID`, `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_INSTANCE_URL`, `SAP_BASE_URL`, `SAP_USERNAME`, `SAP_PASSWORD` to `.env.example`

**Tests**
- [ ] Mock HTTP client; assert each connector builds correct auth headers and maps response fields

---

### Sprint 23 — Wire Disconnected Frontend Pages to Real APIs (G17, G19, G20)
**Goal:** IoT, Anomaly Detection, Digital Twin, ESG pages call their real backend endpoints; Governance and E2E dashboards show honest state.

**Frontend**
- [ ] `src/domains/analytics/pages/IoTDashboard.tsx` — replace `mockDevices`/`mockReadings` with `useQuery` hooks calling `GET /api/iot-telemetry/devices` and `GET /api/iot-telemetry/readings`
- [ ] `src/domains/analytics/pages/AnomalyDetection.tsx` — replace `mockAnomalies` array with `GET /api/anomalies`; wire "Run Detection" button to `POST /api/anomalies/detect`
- [ ] `src/domains/analytics/pages/DigitalTwin.tsx` — replace `mockTwins`/`mockHistory` with `GET /api/digital-twin/models` and `GET /api/digital-twin/models/:id/history`
- [ ] `src/domains/analytics/pages/ESGReporting.tsx` — replace `mockReports`/`mockBenchmarks` with `GET /api/esg/reports`
- [ ] AI Governance page — surface `provider` field from API; display amber warning badge when any model lists a `mock/*` provider
- [ ] E2E Tests page — replace the fake-results route with a status message: *"E2E test execution requires Playwright runner — see docs/TESTING_GUIDE.md"*

**Backend**
- [ ] `server/routes/e2e-tests.js` — remove `Math.random()` duration generation; return `{ status: 'not_configured', message: '...' }` instead of fabricated results
- [ ] `server/services/ai/governance.js` — remove hardcoded `mock/openai` entries from seed list; populate registry from real `ai_governance_log` collection entries only

---

### Sprint 24 — Vector DB Activation, Frontend Tests, `.env.example` Completeness (G21–G23)
**Goal:** Establish the path from in-memory cosine search to a production vector DB; add minimal frontend test scaffold; document all env vars.

**Vector DB**
- [ ] `server/services/ai/embeddings.js` — detect `PGVECTOR_ENABLED=true` and delegate to `pgvector` SQL queries (`SELECT ... ORDER BY embedding <=> $1`); detect `MONGODB_ATLAS_VECTOR_SEARCH_INDEX` and use Atlas `$vectorSearch` aggregation stage; keep in-memory cosine as dev-only fallback
- [ ] `server/scripts/013-pgvector.sql` — `CREATE EXTENSION IF NOT EXISTS vector; CREATE INDEX ... USING hnsw`
- [ ] `docs/VECTOR_DB_SETUP.md` — step-by-step guide for both Atlas Vector Search and pgvector paths
- [ ] Add `PGVECTOR_ENABLED`, `MONGODB_ATLAS_VECTOR_SEARCH_INDEX`, `MONGODB_VECTOR_DIMENSIONS` to `.env.example`

**`.env.example` completeness**
- [ ] Audit every `process.env.*` reference across all route and service files
- [ ] Add all undocumented variables with inline comments explaining required format
- [ ] Group variables by domain: `# AI`, `# Connectors`, `# Comms`, `# Payments`, `# Feature Flags`
- [ ] Variables to add at minimum: `GOOGLE_MAPS_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REALM_ID`, `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_INSTANCE_URL`, `SAP_BASE_URL`, `SAP_USERNAME`, `SAP_PASSWORD`, `MODEL_SERVING_URL`, `FEATURE_NEURO_CONSOLE`, `ANTHROPIC_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `FINETUNE_BUCKET`, `FEDERATED_LEARNING_ROUNDS`

**Frontend tests**
- [ ] Install `@testing-library/react` + `@testing-library/user-event` (already in vitest ecosystem)
- [ ] Add `tests/unit/frontend/` directory; vitest config already picks up `tests/unit/**`
- [ ] Write component tests for the 5 highest-risk components:
  - `IoTDashboard` — assert real API called, mock arrays gone
  - `AnomalyDetection` — assert API called, filter works
  - `CustomerSuccess` — assert churn risk shown, not random
  - `WorkOrderForm` — assert required field validation
  - `InvoiceDetail` — assert totals computed correctly
- [ ] Add `useSocket` hook test: mock WebSocket, assert event payload updates React state

---

## Phase 9 — Frontend Mock Sweep  *(Sprints 25–27, ~3 weeks)*
> Removes all remaining hardcoded `const mock*` arrays from production frontend pages and replaces them with live API calls. 64 pages identified across 8 domains. Sprint 23 addressed 4 of them; these three sprints address the rest.

---

### Sprint 25 — Financial Pages Mock Sweep
**Goal:** Invoicing, Budgeting, Payments, Revenue Recognition, Quotes, Pricing Calculator — all show live DB data.

**Frontend**
- [ ] `src/domains/financial/pages/Invoicing.tsx` — replace `mockInvoices` with `useQuery → GET /api/invoices`; wire create/edit/void actions
- [ ] `src/domains/financial/pages/Budgeting.tsx` — replace `mockBudgets`/`mockCategories` with `GET /api/budgeting/budgets`; wire allocation save
- [ ] `src/domains/financial/pages/Payments.tsx` — replace `mockPayments`/`mockTransactions` with `GET /api/payments`; wire refund and partial-pay actions
- [ ] `src/domains/financial/pages/RevenueRecognition.tsx` — replace `mockSchedules`/`mockEntries` with `GET /api/revenue-recognition/schedules`
- [ ] `src/domains/financial/pages/Quotes.tsx` — replace `mockQuotes` with `GET /api/quotes`; wire approve/reject/convert-to-invoice
- [ ] `src/domains/financial/pages/PricingCalculator.tsx` — replace `mockPricingRules` with `GET /api/pricing`; wire rule CRUD

**Backend**
- [ ] Verify `GET /api/quotes` and `GET /api/pricing` endpoints exist; create if missing (CRUD only, no ML needed here)

**Tests**
- [ ] Snapshot test for each page: assert no static array rendered when API returns empty

---

### Sprint 26 — Fraud, Customers, DEX, and Org Pages Mock Sweep
**Goal:** Remaining mock arrays in fraud investigation, customer success, partner gateway, DEX, and org management pages removed.

**Frontend**
- [ ] `src/domains/fraud/pages/AuditFramework.tsx` — replace `mockAuditEvents`/`mockPolicies` with `GET /api/audit-framework/events` and `GET /api/compliance-policy/policies`
- [ ] `src/domains/fraud/pages/ForgeryDetection.tsx` — replace `mockDocuments`/`mockAlerts` with `GET /api/vision/forgery-cases`; wire "Analyse Document" upload to `POST /api/vision/analyse`
- [ ] `src/domains/customers/pages/CustomerSuccess.tsx` — replace five `Math.random()` health scores with `GET /api/customer-success/health`; display real churn risk from Sprint 21 fix
- [ ] `src/domains/customers/pages/PartnerGateway.tsx` — replace `mockPartners`/`mockDeals` with `GET /api/partner/list`
- [ ] `src/domains/dex/pages/FlowDesigner.tsx` — replace `mockNodes`/`mockEdges` with `GET /api/dex/flows/:id`; wire save to `PUT /api/dex/flows/:id`
- [ ] `src/domains/dex/pages/DEXMarketplace.tsx` — replace `mockListings` with `GET /api/dex/marketplace/listings`
- [ ] `src/domains/org/pages/WhiteLabelPortal.tsx` — replace `mockBranding`/`mockDomains` with `GET /api/org/white-label`; wire save
- [ ] `src/domains/org/pages/DataResidency.tsx` — replace `mockRegions`/`mockPolicies` with `GET /api/data-residency/config`; wire policy update

**Backend**
- [ ] `GET /api/vision/forgery-cases` — list forgery review items from `vision_cases` collection
- [ ] `GET /api/org/white-label` + `PUT /api/org/white-label` — persist branding config per tenant
- [ ] `GET /api/data-residency/config` + `PUT /api/data-residency/config` — persist residency policy per tenant

---

### Sprint 27 — Shared Pages + WorkOrders Mock Sweep
**Goal:** All remaining shared-domain and work-order pages wired to real APIs. After this sprint, `const mock` should appear only in `tests/` directories.

**Frontend**
- [ ] `src/domains/shared/pages/NeuroConsole.tsx` — replace `mockModels`/`mockJobs` with `GET /api/neuro-console/models`; replace random inference metrics with real `GET /api/neuro-console/stats`
- [ ] `src/domains/shared/pages/LaunchReadiness.tsx` — replace `mockChecks` with `GET /api/launch-readiness/checks`; wire re-run action
- [ ] `src/domains/shared/pages/AIEthics.tsx` — replace `mockPrinciples`/`mockAssessments` with `GET /api/ai-ethics/assessments`
- [ ] `src/domains/shared/pages/SLAEngine.tsx` — replace `mockRules`/`mockBreaches` with `GET /api/sla/rules` and `GET /api/sla/breaches`
- [ ] `src/domains/shared/pages/PlatformConfig.tsx` — replace `mockSettings` with `GET /api/platform-config`; wire save to `PUT /api/platform-config`
- [ ] `src/domains/shared/pages/ObservabilityEnhanced.tsx` — replace `mockTraces`/`mockMetrics` with `GET /api/observability/traces` and `GET /api/metrics`
- [ ] `src/domains/workOrders/pages/MaintenanceTriggers.tsx` — replace `mockTriggers` with `GET /api/maintenance-triggers`; wire enable/disable toggle

**Backend**
- [ ] `GET /api/launch-readiness/checks` — compute live readiness state from: DB connectivity, env vars present, AI provider configured, last migration run
- [ ] `GET /api/neuro-console/models` and `GET /api/neuro-console/stats` — serve from `ml_models` and `ml_experiments` collections; no random values

**CI gate**
- [ ] Add grep CI check: fail build if any `src/domains/**/*.tsx` file contains `const mock` outside a `*.test.*` file

---

## Phase 10 — Real AI Activation  *(Sprints 28–30, ~3 weeks)*
> These sprints activate the AI infrastructure that was scaffolded but never truly wired end-to-end: LLM prompts for each FSM use-case, real routing via Google Maps, a constraint-based scheduling optimizer, and full defect-detection pipeline.

---

### Sprint 28 — LLM Prompt Deployment + AI Provider Hardening
**Goal:** Every AI feature that calls `llm.chatCompletion()` has a production-quality prompt, token budget, retry policy, and graceful degradation. `AI_PROVIDER=openai` becomes the deployable default.

**Backend**
- [ ] `server/services/ai/prompts.js` — add/complete prompt templates for: WO pre-visit summary, SLA breach brief, offer recommendation JSON, KB search synthesis, anomaly narrative, forecast explanation, XAI SHAP narrative
- [ ] `server/services/ai/llm.js` — enforce token budget per call type (e.g. summary ≤ 512 tokens output); add exponential back-off retry (3 attempts) on 429/503; emit `ai_call` analytics event with `{ model, tokens_in, tokens_out, latency_ms, feature }`
- [ ] `server/routes/ai.js` — wire all seven features above to the corresponding prompt; switch default from `mock` to `openai` when `OPENAI_API_KEY` is present
- [ ] Streaming: `GET /api/ai/stream-summary` — SSE endpoint that proxies OpenAI stream; consumed by NeuroConsole and Assistant pages
- [ ] Add `OPENAI_MODEL` (default `gpt-4o-mini`), `ANTHROPIC_API_KEY`, `AI_MAX_TOKENS`, `AI_RETRY_ATTEMPTS` to `.env.example`

**Frontend**
- [ ] `src/domains/shared/pages/NeuroConsole.tsx` — consume `GET /api/ai/stream-summary` via EventSource; render streamed tokens progressively
- [ ] Any page with "Generate Summary" or "Ask AI" button — wire to streaming endpoint; show typing indicator

**Tests**
- [ ] Unit: mock OpenAI client; assert each prompt template renders required fields and stays within token budget
- [ ] Integration: assert 429 triggers retry and eventually returns result or structured error

---

### Sprint 29 — Real Route Optimization (Google Maps / OSRM)
**Goal:** Replace haversine stub with a real routing API; return actual drive time and distance for every technician-to-job leg.

**Backend**
- [ ] `server/services/ai/routing.js` — when `GOOGLE_MAPS_API_KEY` is set: call Google Maps Directions API (`/maps/api/directions/json`) for each origin→destination pair; cache results in `route_cache` collection (TTL 24 h) to control API spend; fall back to haversine + 40 km/h average when API unavailable
- [ ] `server/routes/schedule.js` — `POST /api/schedule/optimize-route` — accept `{ technician_id, work_order_ids }`, call `routing.optimizeRoute()`, return ordered stops with `{ drive_time_min, distance_km, polyline }`
- [ ] Add traffic-aware option: pass `departure_time=now` to Google Maps when `ROUTING_TRAFFIC_AWARE=true`
- [ ] Add `GOOGLE_MAPS_API_KEY`, `ROUTING_PROVIDER` (`google`|`osrm`|`haversine`), `ROUTING_TRAFFIC_AWARE` to `.env.example`

**Frontend**
- [ ] `src/domains/workOrders/pages/RouteOptimization.tsx` — replace straight-line stub with results from `POST /api/schedule/optimize-route`; render polyline on Leaflet map if `VITE_MAPS_PROVIDER=leaflet`; show drive time + distance per leg
- [ ] Show "source: google-maps" badge in UI; remove hardcoded `15 km` assumption

**Tests**
- [ ] Mock Google Maps HTTP response; assert correct drive time extracted and cached
- [ ] Assert fallback activates when API key absent

---

### Sprint 30 — Constraint-Based Scheduling Optimizer + Defect Detection Pipeline
**Goal:** Dispatch board gains AI-assisted technician matching (skills + location + parts + SLA urgency). Photo uploads run through real vision model and store structured findings.

**Backend — Scheduling Optimizer**
- [ ] `server/services/ai/scheduler.js` — `suggestAssignment(workOrderId)`:
  1. Fetch WO required skills, location, urgency score (from SLA service)
  2. Fetch available technicians with their skills, current location (last GPS ping or home address), and open calendar slots
  3. Score each technician: `skill_match × 0.4 + proximity × 0.3 + availability × 0.2 + workload_balance × 0.1`
  4. Return top-3 candidates with score breakdown
- [ ] `server/routes/schedule.js` — `GET /api/schedule/suggest/:workOrderId` — return ranked technician suggestions with reasoning; persist suggestion to `dispatch_suggestions` for FlowSpace audit trail
- [ ] `server/routes/schedule.js` — `POST /api/schedule/accept-suggestion` — assign technician from suggestion; record accepted/rejected in FlowSpace decision log

**Backend — Defect Detection**
- [ ] `server/services/ai/vision.js` — `analyseDefect(imageBase64, assetId)`:
  1. Call `llm.visionAnalysis()` with structured prompt requesting JSON: `{ defects: [{ type, severity, component, confidence, bounding_box? }] }`
  2. Store result in `defect_findings` collection linked to asset
  3. If `severity === 'critical'` → auto-raise a high-priority WO via WO service
- [ ] `server/routes/vision.js` — `POST /api/vision/analyse-defect` — accept multipart image upload; call `vision.analyseDefect()`; return structured findings
- [ ] `server/routes/assets.js` — `GET /api/assets/:id/defect-history` — list defect findings for asset

**Frontend**
- [ ] `src/domains/workOrders/pages/Dispatch.tsx` — "Suggest Technician" button calls `GET /api/schedule/suggest/:id`; show ranked candidates with score bar; "Accept" button calls `POST /api/schedule/accept-suggestion`
- [ ] `src/domains/workOrders/pages/DefectDetection.tsx` — upload photo → calls `POST /api/vision/analyse-defect`; render findings list with severity badges; show "Critical — WO raised" alert when applicable
- [ ] `src/domains/workOrders/pages/AssetRegister.tsx` — add "Defect History" tab calling `GET /api/assets/:id/defect-history`

**Tests**
- [ ] Scheduler: unit test scoring formula with known inputs; assert top candidate matches expected
- [ ] Vision: mock LLM response; assert critical defect triggers WO creation

---

## Phase 11 — Differentiators  *(Sprints 31–33, ~3 weeks)*
> Capabilities that take GuardianFlow from "competitive parity" to "market differentiator": agentic AI, IoT automation pipeline, customer self-service chatbot, i18n, WCAG 2.1 AA, and the full Playwright E2E + OpenAPI documentation layer.

---

### Sprint 31 — IoT → Auto-WO Trigger Pipeline
**Goal:** Real IoT readings automatically raise maintenance work orders when thresholds are breached; PM prediction runs on sensor time-series.

**Backend**
- [ ] `server/services/iot.js` — `evaluateTriggers(tenantId)`: query latest reading per device; compare against `iot_thresholds` collection; when breached, call WO service to raise a WO with `source: 'iot_trigger'`; debounce: skip if same device raised a WO in last 4 h
- [ ] `server/routes/iot-telemetry.js` — `POST /api/iot-telemetry/thresholds` (CRUD for per-device alert rules); `POST /api/iot-telemetry/evaluate` (trigger manual evaluation run)
- [ ] Background job (Bull/cron) — run `evaluateTriggers` every 5 min per tenant; register in Sprint 3's job engine
- [ ] `server/services/ai/predictive.js` — `forecastFailure(deviceId)`: sliding-window z-score over last 30 readings; if z > 2.5, set `predicted_failure_in_days` and attach to next scheduled PM; store prediction in `predictive_forecasts`
- [ ] `server/routes/iot-telemetry.js` — `GET /api/iot-telemetry/devices/:id/forecast` — return failure forecast for a device

**Frontend**
- [ ] `src/domains/workOrders/pages/MaintenanceTriggers.tsx` — now wired (Sprint 27); extend: show "IoT Triggered" badge on WOs raised automatically; link to triggering reading
- [ ] `src/domains/workOrders/pages/IoTDashboard.tsx` — add threshold editor panel; show per-device forecast bar ("Predicted failure in N days")
- [ ] `src/domains/workOrders/pages/PredictiveMaintenance.tsx` — integrate `GET /api/iot-telemetry/devices/:id/forecast` results into calendar view; highlight high-risk assets in red

---

### Sprint 32 — Agentic AI Dispatcher + Customer Self-Service Chatbot
**Goal:** Autonomous dispatch agent handles routine WO triage end-to-end; customer chatbot allows self-service booking and status lookup.

**Backend — Agentic Dispatcher**
- [ ] `server/services/ai/agent.js` — `runDispatchAgent(workOrderId)`: LLM tool-calling loop with tools: `get_wo_details`, `list_available_technicians`, `suggest_assignment`, `assign_technician`, `notify_customer`; max 5 tool-call rounds; persist each step to FlowSpace decision log; human-in-the-loop: pause if confidence < 0.7 and escalate
- [ ] `server/routes/ai.js` — `POST /api/ai/dispatch-agent` — trigger agent for a WO; return `{ status: 'assigned'|'escalated', steps: [...], assignee? }`
- [ ] Rate limit dispatch agent: max 10 concurrent agent runs per tenant; queue excess

**Backend — Customer Self-Service Chatbot**
- [ ] `server/routes/customer-booking.js` — `POST /api/customer-booking/chat` — stateless chat endpoint; accepts `{ session_id, message, tenant_id }`; LLM with tools: `lookup_booking(ref)`, `get_technician_eta(booking_id)`, `create_booking(details)`, `cancel_booking(ref)`; returns `{ reply, actions? }`
- [ ] Booking intent recognition: when message contains booking intent, call `create_booking` tool and confirm details before committing
- [ ] Rate limit: 20 messages/min per session

**Frontend**
- [ ] `src/domains/workOrders/pages/Dispatch.tsx` — "Auto-Dispatch" toggle: when enabled, calls `POST /api/ai/dispatch-agent`; show agent reasoning steps in expandable panel; "Override" button to revert to manual
- [ ] `src/domains/customers/pages/CustomerPortal.tsx` — add chat widget in bottom-right corner; connects to `POST /api/customer-booking/chat`; shows typing indicator while agent responds

**Tests**
- [ ] Agent: mock all tools; assert agent selects best technician and stops within 5 rounds
- [ ] Chatbot: assert booking intent triggers `create_booking` tool call and confirmation step

---

### Sprint 33 — i18n, WCAG 2.1 AA, Playwright E2E Suite, OpenAPI Docs
**Goal:** GuardianFlow is internationalised, accessible, E2E tested against real flows, and has machine-readable API documentation suitable for enterprise procurement RFPs.

**i18n**
- [ ] Install `react-i18next`; create `src/i18n/` with `en.json`, `es.json`, `fr.json` locale files
- [ ] Extract all hardcoded UI strings from the 10 highest-traffic pages (WorkOrders, Dispatch, Invoicing, Customers, Dashboard, KB, Scheduler, Payments, Analytics, Settings) into locale JSON
- [ ] Add language selector to app header; persist choice in `localStorage`; default to browser locale
- [ ] Backend: accept `Accept-Language` header; return error messages in requested language (en/es/fr)

**Accessibility (WCAG 2.1 AA)**
- [ ] Install `eslint-plugin-jsx-a11y`; add to eslint config; fix all `error`-level violations across codebase
- [ ] Audit all icon-only buttons: add `aria-label` to every one
- [ ] Ensure all form inputs have associated `<label>` or `aria-labelledby`
- [ ] Add `role="alert"` to all toast/notification components
- [ ] Keyboard navigation: verify modal traps focus; Escape closes modal; Dispatch board is keyboard-navigable
- [ ] Colour contrast: verify all text meets 4.5:1 ratio against `--gf-*` token backgrounds; fix failing tokens in `src/styles/tokens.css`

**Playwright E2E Suite**
- [ ] Install Playwright (`@playwright/test`); configure `playwright.config.ts` pointing at `http://localhost:5173`
- [ ] Remove stub E2E runner page entirely; replace with real suite
- [ ] Write E2E tests for top-10 journeys:
  1. Log in as technician → view assigned WO → update status → complete
  2. Dispatcher creates WO → uses auto-suggest → assigns technician
  3. Admin creates invoice → approves → marks paid
  4. Customer books appointment via self-service chatbot
  5. Upload photo on WO → defect detected → high-priority WO auto-raised
  6. IoT threshold breached → trigger fires → WO created
  7. Run KB search → get RAG answer
  8. PM plan auto-raises scheduled WO
  9. SCIM provisioning creates user → user logs in
  10. Tenant admin customises white-label theme → customer sees branded portal
- [ ] Add `npm run test:e2e` script; run in CI on PR to main

**OpenAPI Documentation**
- [ ] Install `swagger-jsdoc` + `swagger-ui-express`
- [ ] Add JSDoc `@swagger` annotations to all routes in `server/routes/`
- [ ] Mount Swagger UI at `GET /api/docs`; accessible in dev and staging only (not production unless `SWAGGER_ENABLED=true`)
- [ ] Export `openapi.json` as build artifact for enterprise procurement portal uploads
- [ ] Add `SWAGGER_ENABLED` to `.env.example`

---

## Phase 12 — Enterprise FSM Parity (Sprints 34–36, ~3 weeks)
> **Source:** `docs/COMPETITIVE_GAP_ANALYSIS.md` Modules A, B, C, I  
> Gaps vs. ServiceNow Enterprise FSM, Salesforce Field Service, D365 Field Service, IFS Cloud, SAP FSM, Oracle Field Service

### Sprint 34 — Crew WO + Gantt Dispatch Board + MFA + Territory Planning
**Goal:** Close the three most critical FSM differentiators absent from every competitor analysis: crew-based work orders, a true visual dispatch Gantt, multi-factor authentication, and territory planning for large field operations.

**Backend — Crew Work Orders**
- [ ] DB migration `011-crew-work-orders.js`: add `crew_members[]`, `crew_lead`, `min_crew_size`, `max_crew_size` to `work_orders` collection; index on `crew_members`
- [ ] `POST /api/work-orders/:id/crew` — add/remove crew members; validate all members are technicians with required skills; emit `crew_updated` WS event
- [ ] `GET /api/work-orders/:id/crew` — return crew with availability + certification status per member

**Backend — Territory Planning**
- [ ] DB migration `012-territories.js`: new `territories` collection — `{tenantId, name, polygon: GeoJSON, defaultTechnicianIds[], managerIds[]}`
- [ ] `POST /api/territories` — create territory (polygon via GeoJSON); `GET /api/territories`; `PUT /api/territories/:id`; `DELETE /api/territories/:id`
- [ ] `GET /api/territories/:id/work-orders` — return WOs whose site address falls within polygon (geospatial query)
- [ ] `GET /api/territories/:id/technicians` — technicians assigned to territory with current WO load

**Backend — MFA (TOTP)**
- [ ] Install `speakeasy` + `qrcode` packages; add `mfa_secret`, `mfa_enabled` fields to users collection
- [ ] `POST /api/auth/mfa/enroll` — generate TOTP secret; return QR code data URL; do NOT save until verified
- [ ] `POST /api/auth/mfa/verify-enroll` — accept 6-digit TOTP code; if valid, save `mfa_secret` + set `mfa_enabled: true`; return backup codes (hashed)
- [ ] `POST /api/auth/mfa/validate` — accept TOTP code at login step 2; issue JWT only on valid code; rate-limit to 5 attempts/min per user
- [ ] `POST /api/auth/mfa/disable` — require current password + TOTP code; clears MFA secret

**Frontend — Dispatch Gantt**
- [ ] Install `@dhx/trial-suite` or equivalent lightweight Gantt lib (check for licence cost; if cost-prohibitive use `react-big-calendar` with resource view); render technician rows, WO blocks, travel-time gaps
- [ ] `src/domains/workOrders/pages/Dispatch.tsx` — replace current list dispatch with Gantt view; each row = 1 technician; drag WO block to reassign; click WO block to open detail drawer; colour-code by SLA status (green/amber/red)
- [ ] Real-time update: Gantt reacts to WS `assignment_updated` and `work_order_updated` events without page reload

**Frontend — Territory Management Page**
- [ ] `src/domains/shared/pages/TerritoryManagement.tsx` — new page; render territories on interactive map (Leaflet); draw polygon to create territory; assign technicians; show WO density heatmap overlay
- [ ] Add route `/territories` in `src/App.tsx`; add to sidebar under Scheduling

**Frontend — MFA Enrollment Flow**
- [ ] `src/domains/auth/pages/auth/MFAEnroll.tsx` — step-by-step: show QR code → ask user to scan with TOTP app → enter 6-digit code to verify → show backup codes → done
- [ ] `src/domains/shared/pages/Settings.tsx` — add "Security" tab: enable/disable MFA; show MFA status badge

**Tests**
- [ ] `tests/unit/mfa.test.js` — enroll, validate correct TOTP, reject incorrect TOTP, rate-limit exceeded
- [ ] `tests/unit/territories.test.js` — CRUD, geospatial lookup of WOs within polygon

---

### Sprint 35 — Crowd Marketplace WO + Email→WO AI + Capacity Demand Forecasting + Multi-day WO
**Goal:** Enable enterprise operations that subcontract to partner networks, use Copilot-style email-to-WO, forecast capacity gaps weeks ahead, and span WOs over multiple days.

**Backend — Crowd / Contractor WO Assignment**
- [ ] DB migration `013-crowd.js`: add `crowd_partner_id`, `crowd_status` (pending_acceptance / accepted / declined / completed) to `work_orders`; new `crowd_partners` collection — `{tenantId, orgName, contactEmail, skills[], territories[], certifications[], status}`
- [ ] `POST /api/crowd/partners` — invite partner org; send invitation email; `GET /api/crowd/partners`; `PUT /api/crowd/partners/:id/approve`
- [ ] `POST /api/work-orders/:id/assign-crowd` — dispatch WO to crowd partner; set `crowd_status: pending_acceptance`; emit webhook `crowd_assignment_created` to partner's registered webhook URL
- [ ] `POST /api/crowd/inbound/accept` — partner accepts WO (HMAC-signed inbound webhook)
- [ ] `POST /api/crowd/inbound/decline` — partner declines; WO reverts to unassigned pool

**Backend — Email → WO Auto-Creation**
- [ ] `POST /api/work-orders/from-email` — accepts `{subject, body, senderEmail, tenantId}`; calls LLM (GPT-4o via `server/services/ai/llm.js`) with prompt to extract: `{title, description, priority, customerRef, siteAddress, requiredSkills}`; creates WO draft with `status: draft`; returns `{ workOrderId, extracted, confidence }`
- [ ] Confidence < 0.6 → set `status: pending_review` rather than `draft`; flag for human review
- [ ] `GET /api/work-orders?status=pending_review` — queue for dispatcher review

**Backend — Capacity Demand Forecasting**
- [ ] `GET /api/scheduling/capacity-forecast?weeks=4&territory=:id` — returns per-week demand forecast: `{week, forecastedWOs, availableCapacity, gap}`; demand from time-series model (Prophet via Python sidecar or simple Holt-Winters in JS); capacity from scheduled technician hours
- [ ] `GET /api/scheduling/capacity-forecast/gaps` — return weeks where `gap > 0`; suggest whether to hire, use crowd, or defer

**Backend — Multi-Day Work Orders**
- [ ] DB migration: add `multi_day: Boolean`, `planned_start_date`, `planned_end_date`, `daily_schedule[]: [{date, technician_id, planned_hours}]` to `work_orders`
- [ ] `PUT /api/work-orders/:id/daily-schedule` — set daily schedule entries; each entry creates a slot in dispatch board
- [ ] `GET /api/work-orders/:id/daily-schedule` — return per-day schedule with completion status

**Frontend**
- [ ] `src/domains/customers/pages/PartnerGateway.tsx` — replace mock partner list with real crowd partner CRUD; show pending WOs awaiting acceptance; show WO acceptance/decline audit trail
- [ ] `src/domains/workOrders/pages/WorkOrders.tsx` — add "Email Import" button → paste raw email → call `/api/work-orders/from-email` → review extracted fields → confirm/edit → save as WO
- [ ] `src/domains/workOrders/pages/Scheduler.tsx` — add "Capacity Forecast" panel: bar chart of forecasted demand vs available capacity per week; red highlight on gap weeks; one-click to open crowd partner page to address gap
- [ ] `src/domains/workOrders/pages/WorkOrders.tsx` — add multi-day WO flag; show date range badge on WO card

**Tests**
- [ ] Email→WO: mock LLM; assert extracted fields match expected WO shape; test confidence threshold logic
- [ ] Capacity forecast: assert output structure; assert gap detection
- [ ] Crowd: accept + decline flow; verify `crowd_status` transitions

---

### Sprint 36 — Offline Mobile PWA + Asset CMDB Graph + Truck Stock + Compliance Certificates
**Goal:** Technicians can work without connectivity; assets have enterprise-grade dependency tracking; mobile inventory and compliance cert expiry tracking are live.

**Backend — Asset Dependency Graph (CMDB-style)**
- [ ] DB migration `014-asset-graph.js`: add `parent_asset_id`, `child_asset_ids[]`, `dependency_type` (hosts / powers / connects_to / contains) to `assets` collection; create index on `parent_asset_id`
- [ ] `GET /api/assets/:id/graph` — return asset + all ancestors + all descendants to depth 3; include impact score (number of dependent assets)
- [ ] `POST /api/assets/:id/dependencies` — add dependency relationship; `DELETE /api/assets/:id/dependencies/:relId`

**Backend — Compliance Certificate Tracking**
- [ ] DB migration: new `asset_compliance_certs` collection — `{assetId, tenantId, certType (calibration/safety/insurance/warranty), issuer, issuedDate, expiryDate, documentUrl, status (valid/expiring_soon/expired)}`
- [ ] `POST /api/assets/:id/compliance-certs` — add certificate; `GET /api/assets/:id/compliance-certs`
- [ ] Cron job `compliance-cert-monitor.js` — daily scan: set `status: expiring_soon` if expiry within 30 days; set `expired` if past; emit notification to asset owner + tenant admin

**Backend — Truck Stock / Mobile Inventory**
- [ ] DB migration: new `technician_vehicles` collection — `{technicianId, tenantId, vehicleRef, stockItems[]: [{partId, qty, minQty}]}`
- [ ] `GET /api/technicians/:id/vehicle-stock` — return current truck stock
- [ ] `POST /api/technicians/:id/vehicle-stock/consume` — deduct parts used on a WO; trigger restock alert if qty < `minQty`
- [ ] `POST /api/technicians/:id/vehicle-stock/restock` — record restock from warehouse

**Frontend — PWA Offline**
- [ ] Add `vite-plugin-pwa` to `vite.config.ts`; configure service worker to cache: app shell, WorkOrders page, WO detail, Dispatch board, KnowledgeBase
- [ ] Implement IndexedDB offline queue: when offline, store `PUT /api/work-orders/:id/status` and `POST /api/work-orders/:id/notes` calls; replay queue on reconnect with conflict detection (last-write-wins on status, append-only on notes)
- [ ] Offline indicator banner in app header when `navigator.onLine === false`

**Frontend — Asset Dependency Graph**
- [ ] `src/domains/workOrders/pages/AssetRegister.tsx` — add "Dependencies" tab: render asset dependency graph using D3 force-directed layout; show impact score badge; click node to navigate to that asset's record

**Frontend — Compliance Certs**
- [ ] `src/domains/workOrders/pages/AssetRegister.tsx` — add "Compliance" tab: list certificates with expiry countdown; red badge on expired, amber on expiring within 30 days; upload document (S3/local storage)

**Frontend — Truck Stock**
- [ ] `src/domains/shared/pages/Technicians.tsx` — add "Vehicle Stock" panel per technician: show parts, quantities, low-stock alerts; "Consume" button links to a WO

**Tests**
- [ ] Asset graph: CRUD relationships; depth-3 traversal returns correct nodes
- [ ] Cert monitor: expiry date logic; correct `status` transitions
- [ ] Truck stock: consume deducts correctly; restock alert triggered at minQty

---

## Phase 13 — Financial & CRM Enterprise Grade (Sprints 37–39, ~3 weeks)
> **Source:** `docs/COMPETITIVE_GAP_ANALYSIS.md` Modules D and E  
> Gaps vs. SAP S/4HANA, Oracle Fusion Financials, Workday, Salesforce Sales Cloud, HubSpot Enterprise

### Sprint 37 — Accounts Payable + Supplier Portal + ASC 606 Revenue Engine
**Goal:** GuardianFlow gains a real Accounts Payable module (enterprise prerequisite) and a standards-compliant ASC 606 / IFRS 15 revenue recognition engine.

**Backend — Accounts Payable**
- [ ] DB migration `015-accounts-payable.js`: new `ap_invoices` collection — `{tenantId, vendorId, invoiceNo, invoiceDate, dueDate, lineItems[], currency, totalAmount, status (received/matched/approved/paid/disputed), purchaseOrderRef, goodsReceiptRef, threeWayMatchStatus}`
- [ ] `POST /api/ap/invoices` — create AP invoice; `GET /api/ap/invoices`; `PUT /api/ap/invoices/:id/approve`; `PUT /api/ap/invoices/:id/pay`; `PUT /api/ap/invoices/:id/dispute`
- [ ] 3-way match engine: `POST /api/ap/invoices/:id/match` — compare AP invoice to PO and goods receipt; return match result (exact / partial / exception); auto-approve exact matches; flag exceptions for manual review
- [ ] Payment run: `POST /api/ap/payment-runs` — batch pay all approved AP invoices due by a given date; generate payment file (CSV); update `status: paid`

**Backend — Supplier Portal (self-service AP)**
- [ ] `POST /api/suppliers/portal/submit-invoice` — supplier-facing endpoint (separate auth scope `supplier`); submit invoice with PDF attachment; creates `ap_invoice` in received status
- [ ] `GET /api/suppliers/portal/invoices` — supplier sees their own invoices and payment status

**Backend — ASC 606 / IFRS 15 Revenue Recognition Engine**
- [ ] DB migration `016-revenue-recognition.js`: new `revenue_contracts` collection — `{tenantId, customerId, contractNo, performanceObligations[], transactionPrice, allocationMethod, status}`; new `revenue_schedules` collection — `{contractId, obligationId, recognitionDate, amount, recognized: Boolean}`
- [ ] `POST /api/revenue/contracts` — create revenue contract with performance obligations; auto-calculate SSP (standalone selling price) allocation across obligations
- [ ] `POST /api/revenue/contracts/:id/recognize` — trigger recognition for obligations satisfied in a period; create journal entries; update `revenue_schedules`
- [ ] `GET /api/revenue/contracts/:id/waterfall` — return period-by-period recognition schedule (deferred → earned waterfall)
- [ ] `GET /api/revenue/reports/asc606-disclosure` — return contract assets, contract liabilities, remaining performance obligations for financial statement disclosure

**Frontend**
- [ ] `src/domains/financial/pages/AccountsPayable.tsx` — new page: AP invoice list with status badges; 3-way match indicator; bulk approve/pay; supplier portal link; aging report (0–30, 31–60, 61–90, 90+ days)
- [ ] `src/domains/financial/pages/RevenueRecognition.tsx` — replace mock with real waterfall chart per contract; period picker; ASC 606 disclosure report export

**Tests**
- [ ] 3-way match: exact match auto-approves; line item variance > 5% raises exception
- [ ] ASC 606: SSP allocation across 3 obligations sums to transaction price; waterfall schedule totals to contract value

---

### Sprint 38 — Intercompany Consolidation + Fixed Assets + Global e-Invoicing + Expense Management
**Goal:** Enterprise customers operating across multiple legal entities get consolidation, fixed asset depreciation, country-specific e-invoicing, and technician expense claims.

**Backend — Fixed Assets & Depreciation**
- [ ] DB migration `017-fixed-assets.js`: new `fixed_assets` collection — `{tenantId, assetName, assetClass, acquisitionDate, acquisitionCost, depreciationMethod (straight_line/declining_balance/units_of_production), usefulLifeMonths, residualValue, bookValue, disposalDate}`
- [ ] Depreciation run: `POST /api/finance/fixed-assets/depreciation-run?period=YYYY-MM` — calculate depreciation for all assets in period; create journal entries; update `bookValue`
- [ ] `POST /api/finance/fixed-assets` — add asset; `GET /api/finance/fixed-assets`; `PUT /api/finance/fixed-assets/:id/dispose` — calculate gain/loss on disposal

**Backend — Intercompany Transactions & Consolidation**
- [ ] DB migration `018-intercompany.js`: add `entity_id` to `tenants`; new `intercompany_transactions` collection — `{fromEntityId, toEntityId, transactionType, amount, currency, eliminations[]}`
- [ ] `POST /api/finance/intercompany/transactions` — record IC transaction
- [ ] `POST /api/finance/consolidation/run?period=YYYY-MM` — generate consolidated P&L and Balance Sheet: sum all entity GLs, eliminate IC transactions, apply FX translation; return consolidated trial balance

**Backend — Global e-Invoicing**
- [ ] `POST /api/finance/invoices/:id/e-invoice` — given invoice + `countryCode`; apply country-specific format: `{ PEPPOL_BIS: UBL XML, CFDI: MX SAT XML, FatturaPA: IT XML, Generic: JSON-LD }` — start with PEPPOL and CFDI; stub others
- [ ] Store generated e-invoice document; add `e_invoice_status`, `e_invoice_format`, `submission_ref` to invoice record

**Backend — Expense Management**
- [ ] DB migration `019-expenses.js`: new `expense_claims` collection — `{technicianId, tenantId, claims[]: {date, category, amount, currency, receiptUrl, description}, totalAmount, status (draft/submitted/approved/rejected/paid), approvedBy}`
- [ ] `POST /api/expenses` — create expense claim; `PUT /api/expenses/:id/submit`; `PUT /api/expenses/:id/approve`; `PUT /api/expenses/:id/reject`; `POST /api/expenses/:id/receipt-upload` — upload receipt image
- [ ] Policy engine: flag expenses exceeding per-diem limits (configurable per tenant per category); auto-reject out-of-policy if tenant setting `auto_reject_out_of_policy: true`

**Frontend**
- [ ] `src/domains/financial/pages/GeneralLedger.tsx` — add "Consolidation" tab: entity selector; period picker; consolidated trial balance table with IC eliminations shown separately
- [ ] New page `src/domains/financial/pages/FixedAssets.tsx` — register asset; depreciation schedule; net book value chart; disposal workflow
- [ ] `src/domains/financial/pages/Invoicing.tsx` — add "Generate e-Invoice" button; country selector; preview XML before sending; download/send
- [ ] New page `src/domains/shared/pages/ExpenseManagement.tsx` — technician submits claim + receipt photo; manager approves; finance exports to payroll

**Tests**
- [ ] Depreciation: straight-line on a 60-month asset produces correct monthly charge
- [ ] Consolidation: 2-entity with IC transaction; elimination reduces consolidated revenue + cost
- [ ] Expense policy: over-per-diem expense flagged; auto-reject when policy enabled

---

### Sprint 39 — CRM Pipeline + Contact Org Chart + NPS/CSAT + Marketing Automation (Light)
**Goal:** GuardianFlow gains basic CRM capability — deal pipeline, org-chart contacts, customer satisfaction measurement, and lightweight marketing campaigns — to compete with Salesforce/HubSpot for prospects managing the full customer lifecycle.

**Backend — CRM Pipeline**
- [ ] DB migration `020-crm.js`: new `deals` collection — `{tenantId, title, accountId, contactId, stage, amount, probability, expectedCloseDate, owner, notes[]}`; pipeline stages configurable per tenant
- [ ] `POST /api/crm/deals`; `GET /api/crm/deals`; `PUT /api/crm/deals/:id`; `PUT /api/crm/deals/:id/stage`; `DELETE /api/crm/deals/:id`
- [ ] `GET /api/crm/pipeline/summary` — return deal count + weighted ARR per stage; forecast this month's close
- [ ] Activity auto-log: `POST /api/crm/activities` — `{type: email|call|meeting|note, dealId?, contactId?, summary, timestamp}`

**Backend — NPS / CSAT Surveys**
- [ ] DB migration `021-surveys.js`: new `survey_responses` collection — `{tenantId, surveyType (nps/csat), workOrderId?, customerId, score, comment, respondedAt}`
- [ ] `POST /api/surveys/send` — trigger survey send (email via `server/services/notifications.js`) after WO status = completed; include unique response link
- [ ] `POST /api/surveys/respond/:token` — public endpoint; accept `{score, comment}`; save response
- [ ] `GET /api/surveys/analytics` — return NPS (promoters – detractors), CSAT average, response rate, trend by week

**Frontend**
- [ ] New page `src/domains/customers/pages/CRMPipeline.tsx` — Kanban board with configurable stages; drag deal card between stages; deal value and probability visible on card; click to open deal detail with activity timeline; forecast widget in sidebar
- [ ] `src/domains/customers/pages/Customers.tsx` — add "Contacts" tab with org chart view (D3 tree rendering parent-child contact relationships within an account)
- [ ] `src/domains/customers/pages/CustomerSuccess.tsx` — add NPS trend line chart; CSAT score per technician; response rate gauge; "Send Survey" button on completed WOs
- [ ] `src/domains/customers/pages/CustomerPortal.tsx` — embed NPS survey widget post-appointment; 1-click NPS score + optional comment

**Tests**
- [ ] Pipeline: stage transition valid/invalid transitions; weighted ARR calculation
- [ ] NPS: score 9 = promoter, score 6 = detractor; NPS calculation correct
- [ ] Survey: token is single-use; duplicate submission rejected

---

## Phase 14 — Platform Intelligence & Standards (Sprints 40–42, ~3 weeks)
> **Source:** `docs/COMPETITIVE_GAP_ANALYSIS.md` Modules F, G, H, I, J  
> Gaps vs. Databricks AI/BI, Azure IoT, PTC ThingWorx, IBM watsonx.governance, Azure Entra, MuleSoft

### Sprint 40 — NLP-to-SQL Analytics + Streaming Anomaly + ESG Scope Engine + Webhook Hardening
**Goal:** Analytics queries can be asked in natural language; anomaly detection is real-time streaming; ESG reporting has an actual Scope 1/2/3 calculation; webhooks are production-grade with delivery guarantees.

**Backend — NLP-to-SQL (Analytics Query Engine)**
- [ ] `POST /api/analytics/nlp-query` — accepts `{question: string, tenantId}`; calls LLM with schema context (table names, columns, sample rows) to generate SQL; execute SQL against read-replica analytics DB; return `{sql, results, chartType: suggested}`
- [ ] Schema context: auto-generate from DB adapter `getTableSchema()` method; inject up to 3000 tokens of schema
- [ ] Safety: wrap generated SQL in a read-only transaction; reject any DDL/DML statements; max 10,000 row result cap
- [ ] Rate limit: 20 NLP queries / hour per tenant

**Frontend — NLP Query Interface**
- [ ] `src/domains/shared/pages/NLPQueryInterface.tsx` — connect to `POST /api/analytics/nlp-query`; show "Thinking…" state; render result as auto-selected chart type (bar/line/table/number); show generated SQL in expandable "How was this calculated?" panel

**Backend — Real-Time Streaming Anomaly Detection**
- [ ] Add `server/services/streaming/anomaly-stream.js` — WebSocket consumer: subscribe to `iot_telemetry` channel; apply CUSUM (cumulative sum) anomaly algorithm in-process; when anomaly detected emit `anomaly_alert` WS event to tenant subscribers
- [ ] `GET /api/anomaly/stream` — WebSocket upgrade endpoint; tenant-scoped stream of anomaly events

**Frontend — Anomaly Monitor**
- [ ] `src/domains/analytics/pages/AnomalyMonitor.tsx` — connect to WS `anomaly_alert` events; render live event feed with asset name, metric, threshold breach value, and timestamp; alert count badge in sidebar

**Backend — ESG Scope 1/2/3 Engine**
- [ ] DB migration `022-esg.js`: new `esg_activities` collection — `{tenantId, period, scope (1/2/3), activityType, quantity, unit, emissionFactor, co2eKg}`; new `esg_emission_factors` collection (seed with IPCC default factors)
- [ ] `POST /api/esg/activities` — record activity (fuel consumption, electricity, supply chain spend)
- [ ] `GET /api/esg/reports/scope?year=YYYY` — return Scope 1/2/3 totals; breakdown by activity type; trend vs prior year
- [ ] `GET /api/esg/reports/cdp-template` — return JSON mapped to CDP response template headings (water, energy, Scope 1/2/3, governance); export as CSV

**Frontend — ESG Reporting**
- [ ] `src/domains/analytics/pages/ESGReporting.tsx` — replace mock with real Scope 1/2/3 donut chart; activity log table; CDP/GRI template export button; year-over-year trend

**Backend — Webhook Hardening**
- [ ] Add `server/services/webhooks/delivery.js` — delivery queue: store outgoing webhook attempts in DB; retry with exponential back-off (1min, 5min, 30min, 2hr, 24hr); mark `dead_letter` after 5 failed attempts; expose `GET /api/webhooks/:id/delivery-log` for debugging
- [ ] HMAC-SHA256 signature: sign outgoing payload with tenant webhook secret; add `X-GuardianFlow-Signature` header; document in OpenAPI
- [ ] `GET /api/webhooks/events` — return available event types with schema for each

**Frontend — Webhooks**
- [ ] `src/domains/shared/pages/Webhooks.tsx` — show per-webhook delivery log with status (delivered/failed/dead_letter); "Retry" button for failed deliveries; show HMAC secret (masked) with rotate button

**Tests**
- [ ] NLP-to-SQL: mock LLM to return known SQL; assert read-only enforcement rejects UPDATE
- [ ] Anomaly stream: inject synthetic telemetry spike; assert CUSUM triggers alert within 3 data points
- [ ] ESG: Scope totals sum correctly; zero-emission month returns 0 not null
- [ ] Webhook delivery: retry schedule correct; dead-letter after 5th failure; HMAC signature verifiable

---

### Sprint 41 — Real MQTT Device Ingestion + Digital Twin Computation + RUL Model + Dev Sandbox
**Goal:** IoT is no longer mock — real device data flows in; digital twins have live computation; asset degradation is modelled with Remaining Useful Life; enterprise developers get isolated sandbox tenants.

**Backend — Real MQTT Ingestion**
- [ ] Install `mqtt` package; add `server/services/iot/mqtt-broker.js` — MQTT client connects to configurable `MQTT_BROKER_URL`; subscribes to `gf/{tenantId}/devices/+/telemetry`; validates payload schema; upserts to `iot_readings` collection; emits WS `iot_telemetry` event
- [ ] `POST /api/iot/devices/register` — register a device with its expected metrics schema; return device credentials (client ID + password for MQTT auth)
- [ ] `GET /api/iot/devices` — list registered devices + last seen timestamp + last reading values
- [ ] Threshold rules: `POST /api/iot/rules` — `{deviceId, metric, condition: gt|lt|eq, threshold, action: create_work_order|send_alert}`; engine evaluates on each incoming reading

**Backend — Digital Twin Real Computation**
- [ ] DB migration `023-digital-twins.js`: new `digital_twins` collection — `{tenantId, assetId, schema: {metrics[], relationships[]}, currentState: {}, simulationHistory[]}`
- [ ] `PUT /api/digital-twins/:id/state` — update twin state from IoT reading; propagate state to dependent twins (parent propagation)
- [ ] `POST /api/digital-twins/:id/simulate` — run forward simulation: given current state + input changes, project state over N timesteps using linear state-space model; return `{trajectory[], alertsProjected[]}`

**Backend — Remaining Useful Life (RUL) Model**
- [ ] `server/services/ai/rul-model.js` — fit exponential degradation model on asset's historical telemetry: `y = a * exp(-b*t)` + noise; extrapolate to reach failure threshold; return `{estimatedRULDays, confidence, degradationCurve[]}`
- [ ] `GET /api/assets/:id/rul` — call RUL model on asset's telemetry history; return RUL estimate; store as `rul_estimate` on asset record
- [ ] Cron: daily `rul-refresh.js` — recalculate RUL for all assets with IoT data; flag assets with RUL < 30 days for preventive maintenance scheduling

**Backend — Developer Sandbox**
- [ ] `POST /api/admin/sandbox/provision` — sys_admin only; create isolated sandbox tenant: `{tenantId: "sandbox-XXXXXX", tier: "sandbox", seeded: true}`; seed with demo work orders, technicians, assets, invoices
- [ ] `POST /api/admin/sandbox/:tenantId/reset` — wipe and re-seed sandbox tenant data
- [ ] `DELETE /api/admin/sandbox/:tenantId` — deprovision (only sandbox-prefixed tenants)
- [ ] Sandbox tenants: rate-limited to 100 API calls/hour; all webhooks go to a mock endpoint (no real outbound)

**Frontend**
- [ ] `src/domains/workOrders/pages/IoTDashboard.tsx` — replace mock with live data from `GET /api/iot/devices`; show MQTT connection status badge; real sensor readings update via WS; threshold rule builder UI
- [ ] `src/domains/analytics/pages/DigitalTwin.tsx` — replace mock with real twin state from API; add "Simulate" panel: slider for input variable → run simulation → show projected state trajectory as line chart
- [ ] `src/domains/workOrders/pages/PredictiveMaintenance.tsx` — add RUL column to asset list: "Est. RUL: 47 days"; colour-code critical (<14 days = red, 14–30 = amber); click to see degradation curve chart
- [ ] `src/domains/shared/pages/DeveloperPortal.tsx` — add "Sandbox" tab: provision sandbox button; API key for sandbox shown; reset sandbox button; sandbox rate limit indicator

**Tests**
- [ ] MQTT ingest: mock broker publish → assert `iot_readings` inserted and WS event emitted
- [ ] Threshold rule: publish reading exceeding rule → assert WO created
- [ ] RUL model: synthetic degradation data → assert RUL estimate within 10% of analytical solution
- [ ] Sandbox: provision creates isolated tenant; reset wipes only that tenant's data

---

### Sprint 42 — EU AI Act Governance + LLM Monitoring + Model Risk Tiers + SIEM Export + SDK/CLI
**Goal:** GuardianFlow meets enterprise AI governance requirements (EU AI Act readiness), monitors LLM usage for safety, classifies all models by risk tier, exports audit logs to SIEM tools, and ships a developer SDK.

**Backend — EU AI Act Model Risk Classification**
- [ ] DB migration `024-ai-governance.js`: add `risk_tier` (minimal / limited / high / prohibited), `eu_ai_act_category`, `intended_purpose`, `high_risk_justification`, `last_review_date` to models registered in `model_registry`
- [ ] `PUT /api/ai-governance/models/:id/risk-tier` — set risk tier with justification; require 2nd approver for `high` or `prohibited` tier changes (approval workflow)
- [ ] `GET /api/ai-governance/compliance-report` — return: total models by tier, high-risk models with justification, models overdue for review (>90 days), EU AI Act Article 9 conformity checklist status

**Backend — LLM Monitoring**
- [ ] `server/middleware/llm-monitor.js` — wraps all LLM calls; logs: `{tenantId, model, prompt_tokens, completion_tokens, latency_ms, endpoint, timestamp}`; runs content safety checks on completion: profanity filter + PII detection (regex-based, no external API)
- [ ] `GET /api/ai-governance/llm-usage` — return per-tenant LLM usage: calls/day, token budget used vs limit, content safety flags count
- [ ] Token budget enforcement: `server/services/ai/llm.js` — check tenant's monthly token budget before each call; return `429 token_budget_exceeded` if over limit

**Backend — SIEM Export**
- [ ] `server/services/audit/siem-export.js` — batch export audit log to SIEM-compatible format: CEF (Common Event Format) or JSON over HTTPS POST; configurable endpoint URL per tenant; scheduled hourly export or real-time streaming via webhook
- [ ] `POST /api/admin/siem/configure` — set `{siem_endpoint_url, format: cef|json, auth_token}`; `POST /api/admin/siem/test` — send test event

**Backend — Developer SDK**
- [ ] Create `sdk/` directory: `sdk/js/guardianflow-sdk.js` — JavaScript/Node.js SDK wrapping all public API endpoints: `WorkOrders`, `Technicians`, `Invoicing`, `IoT`, `Analytics`; auto-retry on 429; includes TypeScript types in `sdk/js/types.d.ts`
- [ ] `GET /api/sdk/download` — return download URL for latest SDK tarball
- [ ] `sdk/README.md` — quickstart guide: authenticate, list work orders, create WO

**Frontend**
- [ ] `src/domains/org/pages/AIGovernance.tsx` — replace mock registry with real model list from `GET /api/ai-governance/models`; risk tier badge per model (colour-coded: green/yellow/orange/red); "Review" button opens risk classification form; EU AI Act compliance report view
- [ ] `src/domains/shared/pages/AIEthics.tsx` — wire to real bias metrics from `GET /api/ai-governance/models/:id/bias-report`; show SHAP top-5 features; real fairness score from model monitoring data
- [ ] `src/domains/shared/pages/Observability.tsx` — add "LLM Usage" tab: token consumption per tenant; content safety flag count; budget utilisation gauge
- [ ] `src/domains/org/pages/ConnectorManagement.tsx` — add SIEM export configuration panel
- [ ] `src/domains/shared/pages/DeveloperPortal.tsx` — add "SDK" tab: download SDK button; TypeScript types viewer; quickstart code snippet

**Tests**
- [ ] Risk tier: `high` tier change without 2nd approver returns 403; with approver returns 200
- [ ] LLM monitor: mock LLM call; assert usage log created; PII in output triggers flag
- [ ] Token budget: over-budget call returns 429
- [ ] SIEM export: mock HTTP server; assert CEF-formatted events received at SIEM endpoint

---

## Milestone Summary (updated)

| Milestone | Description | Sprints | Status |
|-----------|-------------|---------|--------|
| **M1** | Core platform: auth, WO, RBAC, multi-tenant | 1–2 | ✅ Complete |
| **M2** | Scheduling + dispatch foundations | 3 | ✅ Complete |
| **M3** | Financial lifecycle | 4 | ✅ Complete |
| **M4** | Inventory + assets | 5–6 | ✅ Complete |
| **M5** | Knowledge base + KB search | 7–8 | ✅ Complete |
| **M6** | Analytics + reporting | 9–11 | ✅ Complete |
| **M7** | Platform infrastructure | 12–15 | ✅ Complete |
| **M8** | Security + compliance foundations | 16–18 | ✅ Complete |
| **M9** | AI infrastructure (real) | 19–21 | ✅ Complete |
| **M10** | Operations hardening | 22–24 | ✅ Complete |
| **M11** | Mock sweep: all pages use real APIs | 25–27 | 🔄 Planned |
| **M12** | Real AI activation | 28–30 | 🔄 Planned |
| **M13** | Differentiators: agentic AI, IoT→WO, i18n, E2E | 31–33 | 🔄 Planned |
| **M14** | Enterprise FSM: crew, crowd, territory, mobile | 34–36 | 🔄 Planned (new) |
| **M15** | Enterprise Finance + CRM | 37–39 | 🔄 Planned (new) |
| **M16** | Platform intelligence: NLP analytics, ESG, IoT live, RUL | 40–41 | 🔄 Planned (new) |
| **M17** | AI governance, SIEM, SDK, EU AI Act | 42 | 🔄 Planned (new) |

---

## Definition of Done (per sprint)
1. All new routes have unit tests in `tests/unit/`
2. DB migration script is idempotent and added to `server/scripts/`
3. Frontend pages pass browser build (`npm run build` exits 0)
4. No new `Math.random()` used as a substitute for real logic
5. New env vars documented in `.env.example`
6. OpenAPI annotations added for new endpoints

---

*Last updated: 2026-04-11 | Audit source: `docs/GAP_ANALYSIS.md` + April 2026 deep-scan (G15–G23) + `docs/COMPETITIVE_GAP_ANALYSIS.md` enterprise market research (Phases 12–14, Sprints 34–42)*
