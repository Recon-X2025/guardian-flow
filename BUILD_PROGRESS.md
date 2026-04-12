# Guardian Flow — Sprint Build Progress

**Living Document** | Updated after every sprint phase transition  
**Accountable Lead:** Senior Engineering  
**Reference Audit:** `docs/PLATFORM_COMPREHENSIVE_AUDIT.md`  
**Sprint Track:** Gate 1 → Gate 2 → Gate 3 (18 sprints total)  
**Current Platform Parity:** 37% at start → Target 90%+ at Gate 3 complete

---

## Sprint Status Legend

| Symbol | Meaning |
|--------|---------|
| 🔲 | To be Commenced |
| 🔄 | In Progress |
| ✅ | Completed |

---

## Gate 1 — Demo-Critical (Sprints S1–S4) 🔴

Target parity after Gate 1: **~55%** (passes enterprise demo)

---

### ✅ S1 — LLM Integration + AI Copilot

**Gate:** G1 | **Effort:** 2 sprints  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- Wired `src/domains/shared/pages/Assistant.tsx` to call real `/api/ai/chat` endpoint with SSE streaming — replaced the hardcoded `setTimeout` mock with a live streaming connection to `server/services/ai/llm.js`
- Created `src/domains/shared/components/AICopilotWidget.tsx` — a persistent floating AI Copilot panel accessible from every page in the app. Features: streaming SSE chat, provider badge (mock/openai), conversation history, suggested prompts, keyboard shortcut (`/` to focus)
- Wired `AICopilotWidget` into `src/domains/shared/components/AppLayout.tsx` — available globally without a page navigation
- Updated `.env.example` to document `AI_PROVIDER=openai` + `OPENAI_API_KEY` activation path

#### Definition of Done ✅
- [x] `Assistant.tsx` sends messages to `/api/ai/chat` and streams real responses via SSE
- [x] `AICopilotWidget` is rendered in `AppLayout` and visible on every authenticated page
- [x] Streaming tokens appear in real-time in both `Assistant.tsx` and `AICopilotWidget`
- [x] When `AI_PROVIDER=mock`, responses are generated locally — no external call, no error
- [x] When `AI_PROVIDER=openai` + `OPENAI_API_KEY` is set, responses flow through OpenAI GPT-4o
- [x] Provider indicator badge shows active provider (`mock` / `openai`) in both UIs
- [x] All existing tests pass (no regressions)
- [x] `.env.example` updated with activation instructions

#### Files Changed
- `src/domains/shared/pages/Assistant.tsx` — real API wiring + streaming
- `src/domains/shared/components/AICopilotWidget.tsx` — new global copilot widget
- `src/domains/shared/components/AppLayout.tsx` — widget mounted globally
- `.env.example` — AI provider documentation updated

---

### ✅ S2 — Vector DB + RAG (Atlas Vector Search)

**Gate:** G1 | **Effort:** 1 sprint  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- Upgraded `server/services/ai/embeddings.js` to use MongoDB Atlas `$vectorSearch` aggregation pipeline when the collection has a vector index configured — falls back gracefully to brute-force cosine similarity for non-Atlas or local environments
- Added `server/scripts/create-vector-index.js` — script to create the Atlas vector index on `knowledge_base_chunks` with `numDimensions: 1536`, `similarity: cosine`
- Updated `.env.example` to document `ATLAS_VECTOR_SEARCH=true` env var that enables the Atlas path

#### Definition of Done ✅
- [x] `vectorSearch()` in `embeddings.js` attempts `$vectorSearch` aggregation when `ATLAS_VECTOR_SEARCH=true`
- [x] Falls back to brute-force cosine similarity when Atlas index is not available (local dev)
- [x] `create-vector-index.js` script creates the correct index schema for Atlas
- [x] RAG queries continue to work in both Atlas and local modes
- [x] All existing tests pass

#### Files Changed
- `server/services/ai/embeddings.js` — Atlas `$vectorSearch` with fallback
- `server/scripts/create-vector-index.js` — new index creation script
- `.env.example` — `ATLAS_VECTOR_SEARCH` documented

---

### ✅ S3 — Route Optimization (Real TSP + Google Maps)

**Gate:** G1 | **Effort:** 1 sprint  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- Updated `server/services/routeOptimizer.js` to call **Google Maps Distance Matrix API** for real driving distances and durations when `GOOGLE_MAPS_API_KEY` is set — falls back to haversine straight-line calculation otherwise
- `optimizeRoute()` now uses real driving-time weights in the nearest-neighbour TSP algorithm when Maps API is available
- `calculateDrivingTime()` returns real Google Maps driving duration (minutes) and distance (km) when API key is configured
- Updated `.env.example` to document `GOOGLE_MAPS_API_KEY`

#### Definition of Done ✅
- [x] `calculateDrivingTime()` calls Google Maps Distance Matrix API when key present
- [x] `optimizeRoute()` uses real driving distances in TSP when Maps API available
- [x] Haversine fallback activates automatically when no API key is configured
- [x] Google Maps API errors are caught and fall back to haversine gracefully
- [x] `.env.example` updated with `GOOGLE_MAPS_API_KEY` documentation
- [x] No regressions in existing route endpoints

#### Files Changed
- `server/services/routeOptimizer.js` — Google Maps Distance Matrix integration with haversine fallback
- `.env.example` — `GOOGLE_MAPS_API_KEY` documented

---

### ✅ S3–S4 — ERP Connectors (SAP OData + NetSuite REST)

**Gate:** G1 | **Effort:** 2 sprints  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- Upgraded `server/services/connectors/sap.js` from stub to real SAP OData v4 REST connector — supports `gl_accounts`, `cost_centres`, `vendor_master`, `purchase_orders` entity sync via SAP OData endpoint with Basic / OAuth2 authentication
- Created `server/services/connectors/netsuite.js` — NetSuite REST API connector supporting `vendors`, `customers`, `invoices`, `purchase_orders` sync via OAuth 1.0a (TBA)
- Updated `server/routes/connectors.js` to include `netsuite` in `CONNECTOR_TYPES` and `buildConnector()`

#### Definition of Done ✅
- [x] SAP connector calls real OData endpoints (not stub logging only); auth configurable via `credentials.system_id`, `credentials.client`, `credentials.username`, `credentials.password`
- [x] NetSuite connector exists and handles `vendors`, `customers`, `invoices`, `purchase_orders` entities
- [x] Both connectors implement `sync(direction, entity)` and `webhookReceive(payload)` following `BaseConnector` interface
- [x] `buildConnector()` in `connectors.js` resolves `netsuite` type
- [x] HTTP errors from SAP/NetSuite are caught and written to `connector_sync_log`
- [x] No regressions in existing Salesforce / QuickBooks connectors

#### Files Changed
- `server/services/connectors/sap.js` — real OData implementation
- `server/services/connectors/netsuite.js` — new NetSuite REST connector
- `server/routes/connectors.js` — `netsuite` type registered

---

## ✅ Gate 2 — Evaluation Pass (Sprints S5–S10) ✅

Target parity after Gate 2: **~75%** (passes formal technical evaluation)

---

### ✅ S5–S7 — Mobile PWA + Offline Sync

**Gate:** G2 | **Effort:** 3 sprints  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- Upgraded `src/domains/shared/hooks/useOfflineSync.tsx` from in-memory queue to real IndexedDB persistence — actions survive page refreshes and browser restarts. Added `status` field (`idle` / `syncing` / `synced` / `error`) that was missing and breaking `OfflineSyncIndicator`
- Wired `InstallPrompt` and `OfflineSyncIndicator` into `AppLayout.tsx` — both are now visible on every authenticated page. Sync indicator appears in the header bar on sm+ screens
- Updated `public/manifest.json` — added `id`, `scope`, `display_override`, `lang`, `dir`, `screenshots`, `prefer_related_applications`, improved shortcuts (New WO, Schedule, Tickets, AI Assistant)
- Documented `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `.env.example` for push notification activation

#### Definition of Done ✅
- [x] `useOfflineSync` persists queue to IndexedDB — survives page reload
- [x] `status` field returned from hook correctly — `OfflineSyncIndicator` no longer receives `undefined`
- [x] Service worker `SYNC_OFFLINE_QUEUE` message triggers `syncQueue()` in the hook
- [x] `InstallPrompt` and `OfflineSyncIndicator` mounted in `AppLayout` — globally visible
- [x] `manifest.json` passes W3C Web App Manifest validation (all required fields present)
- [x] VAPID key configuration documented in `.env.example`
- [x] All 253 existing tests pass (TypeScript clean)

#### Files Changed
- `src/domains/shared/hooks/useOfflineSync.tsx` — IndexedDB persistence + `status` field
- `src/domains/shared/components/AppLayout.tsx` — `InstallPrompt` + `OfflineSyncIndicator` wired
- `public/manifest.json` — full W3C manifest + improved shortcuts + screenshots
- `.env.example` — VAPID push key documentation

---

### ✅ S5–S6 — Revenue Recognition (ASC 606)

**Gate:** G2 | **Effort:** 2 sprints  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- `server/routes/revenue.js` — Full ASC 606 / IFRS 15 backend with 7 endpoints: create contract + auto-allocate transaction price across POBs using relative SSP, GET contracts, GET contract detail (with POBs + schedule), PUT contract, add POB, run period-end recognition (writes journal lines: DR Deferred Revenue / CR Revenue), GET dashboard KPIs
- `src/domains/financial/pages/RevenueRecognition.tsx` — Full-featured page: 4 KPI stat cards (total value, recognised, deferred, recognition rate), contract table with progress bars, contract detail drawer showing POBs and monthly schedule, new contract wizard supporting both straight-line over-time and point-in-time POBs, one-click period-end recognition
- Route registered at `/api/revenue` in `server/server.js`, page at `/revenue-recognition` in `App.tsx`

#### Definition of Done ✅
- [x] POST `/api/revenue/contracts` allocates transaction price to POBs using relative SSP; generates monthly straight-line or point-in-time recognition schedule
- [x] POST `/api/revenue/contracts/:id/recognise` commits journal lines (DR Deferred Revenue / CR Revenue) for a period
- [x] Frontend shows KPI dashboard (total value, recognised, deferred, recognition rate + due this period)
- [x] Contract detail drawer shows POB allocation and monthly schedule with status
- [x] New contract wizard supports multi-POB contracts with per-POB delivery type and date configuration
- [x] TypeScript clean — `tsc --noEmit` passes with 0 errors
- [x] All 253 tests pass

#### Files Changed
- `server/routes/revenue.js` — new ASC 606 route file
- `server/server.js` — import + `app.use('/api/revenue', revenueRoutes)`
- `src/domains/financial/pages/RevenueRecognition.tsx` — new frontend page
- `src/App.tsx` — `/revenue-recognition` route added

---

### ✅ S6 — Tax Engine (Avalara / TaxJar)

**Gate:** G2 | **Effort:** 1 sprint  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- `server/services/taxEngine.js` — multi-provider tax calculation service: Avalara AvaTax (REST, sandbox + production), TaxJar (REST, sandbox + production), local heuristic fallback (US state rates + country VAT rates). Auto-degrades to local when API credentials are missing or provider returns an error
- `server/routes/tax.js` — 4 endpoints: POST `/calculate` (persists audit record to `tax_calculations` collection), POST `/validate` (Avalara address normalisation with fallback), GET `/rates` (tenant audit history), GET `/config` (active provider status — safe to expose)
- Registered at `/api/tax` in `server/server.js`
- `.env.example` updated with `TAX_PROVIDER`, `AVALARA_ACCOUNT_ID`, `AVALARA_LICENSE_KEY`, `TAXJAR_API_KEY`

#### Definition of Done ✅
- [x] `calculateTax()` returns `{ tax_amount, tax_rate, provider, breakdown }` for all three providers
- [x] Auto-fallback to local heuristic when API keys are absent or provider call fails
- [x] Every tax calculation is persisted to `tax_calculations` for audit purposes
- [x] Address validation endpoint works (Avalara when configured, pass-through otherwise)
- [x] `/api/tax/config` returns active provider without exposing secrets
- [x] `.env.example` documents all tax engine configuration
- [x] All 253 tests pass

#### Files Changed
- `server/services/taxEngine.js` — new multi-provider tax service
- `server/routes/tax.js` — new tax API routes
- `server/server.js` — import + `app.use('/api/tax', taxRoutes)`
- `.env.example` — tax engine configuration documented

---

### ✅ S7 — GraphQL + OpenAPI Spec

**Gate:** G2 | **Effort:** 1 sprint  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- `server/routes/openapi.js` — dynamically generates OpenAPI 3.1 JSON spec at `GET /api/openapi.json` (no build step, serves from memory). Also serves Swagger UI at `GET /api/docs` via CDN (no static assets needed). Covers all major API domains: Auth, Revenue, Tax, AI, Connectors, GraphQL, Org, FlowSpace, DEX, SSO, IoT
- `server/routes/graphql-api.js` — GraphQL endpoint at `/api/graphql` using `graphql-yoga`. Schema covers 7 query types: `revenueStats`, `revenueContracts`, `taxHistory`, `workOrderStats`, `workOrders`, `assetStats`, `scheduleStats`. Auth-protected via `authenticateToken` middleware. GraphiQL explorer enabled in non-production
- Added `graphql` and `graphql-yoga` npm packages (no CVEs found)

#### Definition of Done ✅
- [x] `GET /api/openapi.json` returns valid OpenAPI 3.1 spec with security schemes, tags, component schemas
- [x] `GET /api/docs` renders Swagger UI (Swagger UI 5 via CDN)
- [x] `POST /api/graphql` accepts `{ query, variables }` and returns typed analytics data
- [x] GraphQL schema typed: `RevenueStats`, `RevenueContract`, `TaxCalculation`, `WorkOrderStats`, `AssetStats`, `ScheduleStats`
- [x] All GraphQL resolvers tenant-scoped via `req.user.tenantId`
- [x] `graphql` and `graphql-yoga` have no known CVEs
- [x] All 253 tests pass

#### Files Changed
- `server/routes/openapi.js` — new OpenAPI 3.1 spec generator + Swagger UI
- `server/routes/graphql-api.js` — new GraphQL endpoint
- `server/server.js` — import + `app.use('/api', openApiRoutes)`, `app.use('/api/graphql', graphqlApiRoutes)`
- `package.json` — graphql + graphql-yoga added

---

### ✅ S7–S8 — AI Scheduling (Constraint-based)

**Gate:** G2 | **Effort:** 2 sprints  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
Replaced the simple greedy scheduler in `server/services/ai/scheduler.js` with a full constraint-based engine:

- **Phase 1 — Hard constraint filtering**: For each work order, candidates must pass all 4 hard constraints before scoring: H1 Skill match (technician must have all required skills), H2 Capacity (below max daily load), H3 Availability (start falls inside shift window / custom availability windows), H4 SLA deadline (scheduled end must be before SLA deadline)
- **Phase 2 — Soft constraint scoring**: Valid candidates scored on 5 dimensions: SLA urgency ×4, priority ×3, skill quality ×2, travel time ×2, load balance ×1
- **Phase 3 — Priority-ordered assignment**: Work orders sorted by SLA deadline ASC → priority DESC. Each assigned to highest-scoring valid technician. Unscheduled work orders tracked with constraint violation reasons
- **FlowSpace integration**: Every optimization run writes a structured decision record to FlowSpace with rationale, constraint list, and unscheduled count
- Schema upgraded: `schedule_optimization_runs` now includes `algorithm`, `total_unscheduled`; assignments include `skill_match_score`, `sla_urgency_score`, `travel_time_min`

#### Definition of Done ✅
- [x] Scheduler filters candidates by all 4 hard constraints before scoring
- [x] Skill match check uses exact normalised matching (case-insensitive)
- [x] SLA deadline is a hard constraint — no assignment violates SLA
- [x] Availability windows respected (custom overrides shift defaults)
- [x] Scheduling decision written to FlowSpace with human-readable rationale
- [x] Unscheduled work orders returned with per-technician violation reason map
- [x] All 253 tests pass

#### Files Changed
- `server/services/ai/scheduler.js` — complete rewrite from greedy to constraint-based

---

### ✅ S8 — Computer Vision (Photo Validation)

**Gate:** G2 | **Effort:** 1 sprint  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- Upgraded `server/services/ai/vision.js` from random mock to real GPT-4o Vision API integration. Sends base64 image as `data:{mimeType};base64,{image}` URL in the OpenAI chat completion request. Structured system prompt extracts `defects[]`, `overall_condition`, `overall_score`, `description`, `recommended_action`
- Mock fallback retained for environments without `OPENAI_API_KEY` — returns deterministic random defects with all new schema fields
- Updated `server/routes/vision.js` to accept optional `context` field in request body — passed to GPT-4o for more targeted analysis
- Rebuilt `DefectDetection.tsx`: shows provider badge (GPT-4o vs Mock), overall condition label (good/fair/poor/critical), human-readable recommended action, defect list with severity badges + location text, optional context input field for technician notes. Uses `apiClient.request()` for auth header injection

#### Definition of Done ✅
- [x] POST `/api/ai/vision/analyse` calls GPT-4o Vision when `OPENAI_API_KEY` is set
- [x] Returns structured response: `defects[]` with severity + location, `overallCondition`, `overallScore`, `description`, `recommendedAction`, `provider`
- [x] Mock fallback returns all fields with same schema when no API key
- [x] DefectDetection page renders all new fields (condition badge, action recommendation, severity, location)
- [x] Provider badge shows "GPT-4o" vs "Mock"
- [x] Context note passed from UI through to OpenAI prompt
- [x] TypeScript clean — 0 errors
- [x] All 253 tests pass

#### Files Changed
- `server/services/ai/vision.js` — GPT-4o Vision integration + updated mock fallback
- `server/routes/vision.js` — accept `context` param
- `src/domains/workOrders/pages/DefectDetection.tsx` — fully updated UI

---

### ✅ S8–S9 — Subscription / Recurring Billing

**Gate:** G2 | **Effort:** 2 sprints  
**Status:** ✅ Completed  
**Completed:** 2026-04-12

#### What Was Built
- `server/routes/subscriptions.js` — full recurring billing engine with 14 endpoints covering plans (CRUD), subscriptions (create/get/list/update/cancel/pause/resume), invoices (history + manual generate), Stripe webhook handler, and billing cycle runner
- **Stripe mode**: when `STRIPE_SECRET_KEY` is set, creates Stripe Products + Prices for plans, creates Stripe Customers + Subscriptions; webhook handles `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated`
- **Local mode**: internal billing engine auto-generates invoices on subscription creation; `POST /run-billing-cycle` processes all due subscriptions, advances billing periods
- `src/domains/financial/pages/SubscriptionManagement.tsx` — full management UI: plan cards, subscription table with status + period, detail drawer with invoice history, new plan dialog, new subscription wizard, cancel/pause/resume action dropdown menu, run billing cycle button
- Route at `/api/subscriptions`, page at `/subscriptions` in App.tsx
- `STRIPE_WEBHOOK_SECRET` documented in `.env.example`

#### Definition of Done ✅
- [x] Plans CRUD: create plan with price, currency, billing interval; mirrors to Stripe when configured
- [x] Subscription create: selects plan, creates customer, generates first invoice automatically (local mode)
- [x] Cancel (at period end or immediately), pause, resume
- [x] Billing cycle runner: finds all active subscriptions with elapsed period_end, generates invoices, advances periods
- [x] Stripe webhook: `invoice.paid` stores invoice; `subscription.deleted` cancels subscription
- [x] Frontend: plan overview cards, subscription table, invoice history, action menus
- [x] All 253 tests pass — TypeScript clean

#### Files Changed
- `server/routes/subscriptions.js` — new subscriptions route
- `server/server.js` — import + `app.use('/api/subscriptions', subscriptionsRoutes)`
- `src/domains/financial/pages/SubscriptionManagement.tsx` — new frontend page
- `src/App.tsx` — `/subscriptions` route added
- `.env.example` — `STRIPE_WEBHOOK_SECRET` documented

---

## ✅ Gate 2 COMPLETE — Evaluation Pass (~75% platform parity)

All Gate 2 sprints delivered:
- S5–S7: Mobile PWA + IndexedDB offline sync ✅
- S5–S6: ASC 606 Revenue Recognition ✅
- S6: Tax Engine (Avalara / TaxJar / local) ✅
- S7: GraphQL analytics API + OpenAPI 3.1 spec + Swagger UI ✅
- S7–S8: Constraint-based AI Scheduler (skill/SLA/availability hard constraints) ✅
- S8: GPT-4o Computer Vision (DefectDetection) ✅
- S8–S9: Subscription / Recurring Billing (Stripe + local) ✅

---

## Gate 3 — Enterprise Win (Sprints S11–S18) 🟡

Target parity after Gate 3: **~90%+** (preferred enterprise choice)

---

### 🔲 S11–S13 — Agentic AI (DEX-based)

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** Autonomous AI agents that create and drive DEX ExecutionContexts through their lifecycle. Agents receive goals, decompose into tasks, execute via tool calls, and record decisions in FlowSpace.

---

### 🔲 S13–S14 — IoT + Predictive Maintenance

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** MQTT broker integration for real sensor telemetry; predictive failure scoring fed by live sensor data rather than static ML models.

---

### 🔲 S14–S15 — CRM Email/Calendar Sync

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** Google/Microsoft OAuth2 calendar sync; email activity logged to CRM contacts and accounts automatically.

---

### 🔲 S15 — ML Fraud Detection

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** Replace `Math.random()` in `anomaly.js` with a real trained isolation forest / XGBoost model served via Python microservice or ONNX.js.

---

### 🔲 S15–S16 — ESG Scope 1/2/3 + GRI/SASB/TCFD Reporting

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** Complete ESG data collection pipeline; automated GRI/SASB/TCFD report generation; Scope 3 supply chain emissions calculation.

---

### 🔲 S16–S17 — Marketplace Extension Backend

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** `server/routes/marketplace-extension-manager.js` — extension submission, sandboxed testing, certification workflow, installation management, billing revenue split.

---

### 🔲 S17–S18 — FlowSpace Governance Platform

**Gate:** G3 | **Status:** 🔲 To be Commenced

**Planned:** Full governance UI over FlowSpace decision ledger — decision replay, lineage graph visualisation, AI Act Article 13 explainability reports, bulk export for regulatory audits.

---

## Parity Scorecard (Updated Per Sprint)

| After | Parity | Enterprise Gate |
|-------|--------|-----------------|
| Baseline (today) | ~37% | Fails demo |
| Gate 1 complete (S4) | ~55% | Passes demo |
| Gate 2 complete (S10) | ~75% | Passes tech eval |
| Gate 3 complete (S18) | ~90%+ | Preferred choice |

---

*Document maintained by: Engineering Lead. Last updated: 2026-04-12.*
