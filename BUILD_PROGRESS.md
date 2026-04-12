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

## Gate 2 — Evaluation Pass (Sprints S5–S10) 🟠

Target parity after Gate 2: **~75%** (passes formal technical evaluation)

---

### 🔄 S5–S7 — Mobile PWA + Offline Sync

**Gate:** G2 | **Effort:** 3 sprints  
**Status:** 🔄 In Progress

#### Planned Deliverables
- Service worker (`public/sw.js`) with background sync and push notifications
- `vite-plugin-pwa` configuration for installable PWA
- `src/domains/shared/components/InstallPrompt.tsx` — install to home screen prompt
- `src/domains/shared/components/OfflineSyncIndicator.tsx` — sync queue indicator
- IndexedDB offline queue for work order actions (create/update/close) when offline
- `manifest.json` update with proper icons, theme colour, display mode

#### Definition of Done (Planned)
- [ ] App passes Lighthouse PWA audit (score ≥ 90)
- [ ] Work order create/update/close works offline and syncs on reconnect
- [ ] Background sync retries failed mutations when connectivity is restored
- [ ] Install prompt appears on mobile and desktop
- [ ] Push notification scaffolding enabled (VAPID keys generated)

---

### 🔲 S5–S6 — Revenue Recognition (ASC 606)

**Gate:** G2 | **Effort:** 2 sprints  
**Status:** 🔲 To be Commenced

#### Planned Deliverables
- `server/routes/revenue-recognition.js` — ASC 606 recognition schedule endpoints
- `server/services/revenueRecognition.js` — 5-step model engine (identify contract, performance obligations, transaction price, allocation, recognition event)
- Frontend `src/domains/financial/pages/RevenueRecognition.tsx`
- DB collection `revenue_recognition_schedules`

#### Definition of Done (Planned)
- [ ] Revenue schedules are created and stored per contract
- [ ] Recognition events fire based on performance obligation completion
- [ ] ASC 606 deferred revenue and recognised revenue calculated correctly
- [ ] Frontend shows recognition waterfall chart per contract

---

### 🔲 S6 — Tax Engine (Avalara / TaxJar)

**Gate:** G2 | **Effort:** 1 sprint  
**Status:** 🔲 To be Commenced

#### Planned Deliverables
- `server/services/taxEngine.js` — Avalara AvaTax / TaxJar API integration with mock fallback
- Tax calculation wired into invoice creation endpoint
- `.env.example` updated with `AVALARA_ACCOUNT_ID`, `AVALARA_LICENSE_KEY`

#### Definition of Done (Planned)
- [ ] Tax calculation called on invoice creation with jurisdiction detection
- [ ] Avalara/TaxJar provider active when API keys configured
- [ ] Mock flat-rate fallback when no tax keys present
- [ ] Tax line items appear on generated invoices

---

### 🔲 S7 — GraphQL + OpenAPI Spec

**Gate:** G2 | **Effort:** 1 sprint  
**Status:** 🔲 To be Commenced

#### Planned Deliverables
- `swagger-autogen` or `@fastify/swagger` to generate `openapi.json` from existing Express routes
- Serve `GET /api/openapi.json` and Swagger UI at `/api/docs`
- `graphql-yoga` schema covering read-heavy analytics queries

#### Definition of Done (Planned)
- [ ] `GET /api/openapi.json` returns valid OpenAPI 3.1 spec covering all routes
- [ ] Swagger UI accessible at `/api/docs`
- [ ] GraphQL endpoint at `/api/graphql` accepts analytics queries

---

### 🔲 S7–S8 — AI Scheduling (Constraint-based)

**Gate:** G2 | **Effort:** 2 sprints  
**Status:** 🔲 To be Commenced

#### Planned Deliverables
- Replace heuristic scoring in `server/services/ai/scheduler.js` with constraint satisfaction / OR-Tools-style solver
- Skills, availability windows, SLA deadline, travel time as hard/soft constraints
- LLM-generated scheduling rationale stored in FlowSpace

#### Definition of Done (Planned)
- [ ] Scheduler respects skill constraints (hard), SLA deadlines (hard), and availability windows (hard)
- [ ] Travel time from route optimizer used as constraint input
- [ ] Schedule decision written to FlowSpace with rationale
- [ ] Measurable improvement over baseline heuristic in benchmark test

---

### 🔲 S8 — Computer Vision (Photo Validation)

**Gate:** G2 | **Effort:** 1 sprint  
**Status:** 🔲 To be Commenced

#### Planned Deliverables
- Wire `server/services/ai/vision.js` `visionAnalysis()` to real OpenAI GPT-4o vision API
- DefectDetection page calls real vision endpoint for photo uploads
- Mock fallback retained for environments without OpenAI key

#### Definition of Done (Planned)
- [ ] Photo uploads to `/api/ai/vision` produce real GPT-4o analysis when `OPENAI_API_KEY` set
- [ ] DefectDetection page displays actual defect findings
- [ ] Mock fallback works without errors

---

### 🔲 S8–S9 — Subscription / Recurring Billing

**Gate:** G2 | **Effort:** 2 sprints  
**Status:** 🔲 To be Commenced

#### Planned Deliverables
- `server/routes/subscriptions.js` — subscription plan CRUD, billing cycle management
- Stripe `subscription` + `invoice` objects integrated
- Frontend subscription management UI

#### Definition of Done (Planned)
- [ ] Subscriptions can be created, updated, and cancelled via API
- [ ] Recurring invoices auto-generated on billing cycle
- [ ] Stripe webhook handles `invoice.paid` and `customer.subscription.deleted`

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
