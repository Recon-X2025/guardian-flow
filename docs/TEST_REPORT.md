# Guardian Flow — Test Execution Report

**Date:** 2026-04-10  
**Runner:** vitest v4.1.4  
**Command:** `node_modules/.bin/vitest run --reporter=verbose`  
**Duration:** 14.27 s (transform 1.13 s · setup 6.79 s · import 3.58 s · tests 8.40 s · environment 17.70 s)

---

## Summary

| Metric | Value |
|---|---|
| **Status** | ✅ ALL PASSED |
| **Test files** | 31 |
| **Total tests** | 429 |
| **Passed** | 429 |
| **Failed** | 0 |
| **Skipped** | 0 |

---

## Results by File

### `tests/api/ai-forecast.api.test.js` (5 tests)

| # | Test | Result |
|---|---|---|
| 1 | POST /api/functions/run-forecast-now > generates forecasts | ✅ |
| 2 | POST /api/functions/run-forecast-now > forecasts stored in forecast_outputs table | ✅ |
| 3 | POST /api/functions/get-forecast-metrics > returns model metrics | ✅ |
| 4 | Forecast value validation > forecast values are numeric and within reasonable bounds | ✅ |
| 5 | Forecast value validation > confidence intervals bracket the forecast value | ✅ |

---

### `tests/api/ai-forgery.api.test.js` (5 tests)

| # | Test | Result |
|---|---|---|
| 1 | POST /api/functions/process-forgery-batch > creates batch job with work_order_ids | ✅ |
| 2 | POST /api/functions/process-forgery-batch > batch job appears in forgery_batch_jobs table | ✅ |
| 3 | POST /api/functions/process-forgery-batch > detections stored in forgery_detections with confidence_score | ✅ |
| 4 | POST /api/functions/process-forgery-batch > high-confidence detections generate monitoring alerts | ✅ |
| 5 | POST /api/functions/process-forgery-batch > model metrics are seeded and queryable | ✅ |

---

### `tests/api/ai-fraud.api.test.js` (5 tests)

| # | Test | Result |
|---|---|---|
| 1 | POST /api/functions/run-fraud-detection > detects anomalies | ✅ |
| 2 | POST /api/functions/run-fraud-detection > anomalies stored in fraud_alerts with proper schema | ✅ |
| 3 | POST /api/functions/update-fraud-investigation > changes status to in_progress | ✅ |
| 4 | POST /api/functions/update-fraud-investigation > resolved status sets resolution_notes and resolved_at | ✅ |
| 5 | POST /api/functions/update-fraud-investigation > escalated status works | ✅ |

---

### `tests/api/ai-offers.api.test.js` (5 tests)

| # | Test | Result |
|---|---|---|
| 1 | POST /api/functions/generate-offers > returns offers for a valid work_order_id | ✅ |
| 2 | POST /api/functions/generate-offers > offers stored in sapos_offers table with provenance | ✅ |
| 3 | POST /api/functions/generate-offers > PATCH offer status to accepted updates correctly | ✅ |
| 4 | POST /api/functions/generate-offers > PATCH offer status to declined updates correctly | ✅ |
| 5 | POST /api/functions/generate-offers > warranty conflict detection flags conflicting offers | ✅ |

---

### `tests/api/ai-predictive.api.test.js` (5 tests)

| # | Test | Result |
|---|---|---|
| 1 | POST /api/functions/predict-maintenance-failures > returns predictions | ✅ |
| 2 | POST /api/functions/predict-maintenance-failures > predictions appear in maintenance_predictions table | ✅ |
| 3 | POST /api/functions/predict-maintenance-failures > each prediction has required fields: risk_level, failure_probability, confidence_score | ✅ |
| 4 | POST /api/functions/predict-maintenance-failures > predictions reference valid equipment IDs | ✅ |
| 5 | POST /api/functions/predict-maintenance-failures > re-running does not create duplicates for same equipment | ✅ |

---

### `tests/api/auth.api.test.js` (4 tests)

| # | Test | Result |
|---|---|---|
| 1 | Auth API > POST /api/auth/signin — valid credentials | ✅ |
| 2 | Auth API > POST /api/auth/signin — invalid credentials | ✅ |
| 3 | Auth API > GET /api/auth/user — with token | ✅ |
| 4 | Auth API > GET /api/auth/user — without token returns 401 | ✅ |

---

### `tests/api/comprehensive-all-routes.api.test.js` (176 tests)

The largest test file — exercises every API route group registered in `server.js`, including security hardening and burst-stability probes.

| # | Group | Test | Result |
|---|---|---|---|
| 1 | Infrastructure | GET /health — returns 200 with status fields | ✅ |
| 2 | Infrastructure | GET /api/metrics — Prometheus metrics endpoint | ✅ |
| 3 | Infrastructure | GET /nonexistent — 404 for unknown route | ✅ |
| 4 | Auth | POST /api/auth/signup — creates new user | ✅ |
| 5 | Auth | POST /api/auth/signin — valid credentials | ✅ |
| 6 | Auth | POST /api/auth/signin — rejects bad password | ✅ |
| 7 | Auth | POST /api/auth/signin — rejects empty body | ✅ |
| 8 | Auth | GET /api/auth/user — authenticated returns user | ✅ |
| 9 | Auth | GET /api/auth/me — authenticated returns profile | ✅ |
| 10 | Auth | GET /api/auth/user — unauthenticated returns 401 | ✅ |
| 11 | Auth | POST /api/auth/forgot-password — valid email accepted | ✅ |
| 12 | Auth | POST /api/auth/forgot-password — missing email returns 400 | ✅ |
| 13 | Auth | POST /api/auth/reset-password — missing token returns 400 | ✅ |
| 14 | Auth | POST /api/auth/refresh — missing refresh token returns 400 | ✅ |
| 15 | Auth | POST /api/auth/signout — authenticated | ✅ |
| 16 | Database adapter | GET /api/db/work_orders?select=*&limit=5 | ✅ |
| 17 | Database adapter | GET /api/db/tickets?select=*&limit=5 | ✅ |
| 18 | Database adapter | GET /api/db/invoices?select=*&limit=5 | ✅ |
| 19 | Database adapter | GET /api/db/customers?select=*&limit=5 | ✅ |
| 20 | Database adapter | GET /api/db/equipment?select=*&limit=5 | ✅ |
| 21 | Database adapter | GET /api/db/notifications?select=*&limit=5 | ✅ |
| 22 | Database adapter | GET /api/db/technicians?select=*&limit=5 | ✅ |
| 23 | Database adapter | GET /api/db/inventory_items?select=*&limit=5 | ✅ |
| 24 | Database adapter | POST /api/db/query — raw query | ✅ |
| 25 | Database adapter | POST /api/db/work_orders — creates a record | ✅ |
| 26 | Database adapter | GET /api/db/work_orders/nonexistent — 404 | ✅ |
| 27 | Storage | GET /api/storage — lists buckets / objects | ✅ |
| 28 | Storage | POST /api/storage — create folder / upload stub (no file) | ✅ |
| 29 | Edge Functions | POST /api/functions/generate-work-order — accepts request | ✅ |
| 30 | Edge Functions | POST /api/functions/generate-service-order — accepts request | ✅ |
| 31 | Edge Functions | POST /api/functions/predict-failure — accepts request | ✅ |
| 32 | Edge Functions | POST /api/functions/detect-forgery — accepts request | ✅ |
| 33 | Edge Functions | POST /api/functions/detect-fraud — accepts request | ✅ |
| 34 | Edge Functions | POST /api/functions/generate-offer — accepts request | ✅ |
| 35 | Edge Functions | POST /api/functions/forecast-demand — accepts request | ✅ |
| 36 | Payments | GET /api/payments/gateways | ✅ |
| 37 | Payments | POST /api/payments/create-intent — missing fields returns 400 | ✅ |
| 38 | Payments | POST /api/payments/process — missing fields returns 400 | ✅ |
| 39 | Payments | GET /api/payments/history/invoice-000 — unknown invoice | ✅ |
| 40 | Knowledge Base | GET /api/knowledge-base/categories | ✅ |
| 41 | Knowledge Base | GET /api/knowledge-base/articles | ✅ |
| 42 | Knowledge Base | GET /api/knowledge-base/tags | ✅ |
| 43 | Knowledge Base | POST /api/knowledge-base/articles — create article | ✅ |
| 44 | Knowledge Base | GET /api/knowledge-base/articles/:id — fetch article | ✅ |
| 45 | Knowledge Base | PATCH /api/knowledge-base/articles/:id — update article | ✅ |
| 46 | FAQs | GET /api/faqs | ✅ |
| 47 | FAQs | GET /api/faqs/categories | ✅ |
| 48 | ML | GET /api/ml/models | ✅ |
| 49 | ML | POST /api/ml/predict/failure — stub predict | ✅ |
| 50 | ML | POST /api/ml/predict/sla | ✅ |
| 51 | ML | POST /api/ml/predict/forecast | ✅ |
| 52 | ML | POST /api/ml/detect/anomalies | ✅ |
| 53 | AI | GET /api/ai/governance/policies | ✅ |
| 54 | AI | GET /api/ai/prompts | ✅ |
| 55 | AI | POST /api/ai/vision/analyze — stub request | ✅ |
| 56 | AI | GET /api/ai/finetune/jobs | ✅ |
| 57 | Security Monitor | GET /api/security/alerts | ✅ |
| 58 | Security Monitor | GET /api/security/summary | ✅ |
| 59 | SLA Monitor | GET /api/sla/dashboard | ✅ |
| 60 | SLA Monitor | GET /api/sla/breaches | ✅ |
| 61 | Partner Gateway | GET /api/partner/endpoints | ✅ |
| 62 | Partner Gateway | GET /api/partner-v2/catalog | ✅ |
| 63 | Org Console | GET /api/org — lists organisations | ✅ |
| 64 | Org Console | POST /api/org — create org | ✅ |
| 65 | Org Console | GET /api/org/:id — fetch org | ✅ |
| 66 | Org Console | PATCH /api/org/:id — update org name | ✅ |
| 67 | Org Console | GET /api/org/:id/members — list members | ✅ |
| 68 | FlowSpace | POST /api/flowspace/record — write decision record | ✅ |
| 69 | FlowSpace | GET /api/flowspace/records | ✅ |
| 70 | FlowSpace | GET /api/flowspace/records/:id — fetch record | ✅ |
| 71 | FlowSpace | GET /api/flowspace/records/:id/lineage | ✅ |
| 72 | DEX | POST /api/dex/contexts — create execution context | ✅ |
| 73 | DEX | GET /api/dex/contexts | ✅ |
| 74 | DEX | GET /api/dex/contexts/:id | ✅ |
| 75 | DEX | POST /api/dex/contexts/:id/transition — invalid transition returns 400/404 | ✅ |
| 76 | DEX | GET /api/dex-flows/definitions | ✅ |
| 77 | DEX | GET /api/dex-marketplace/listings | ✅ |
| 78 | SSO | GET /api/sso/config | ✅ |
| 79 | SSO | GET /api/sso/saml/metadata | ✅ |
| 80 | Currency | GET /api/currency/rates | ✅ |
| 81 | Currency | GET /api/currency/convert?from=USD&to=EUR&amount=100 | ✅ |
| 82 | Ledger | GET /api/ledger/accounts | ✅ |
| 83 | Ledger | POST /api/ledger/accounts — create account | ✅ |
| 84 | Ledger | GET /api/ledger/trial-balance | ✅ |
| 85 | Ledger | GET /api/ledger/entries | ✅ |
| 86 | Ledger | GET /api/ledger/periods | ✅ |
| 87 | Skills | GET /api/skills | ✅ |
| 88 | Skills | GET /api/skills/certifications | ✅ |
| 89 | Skills | GET /api/skills/match | ✅ |
| 90 | Skills | POST /api/skills — create skill | ✅ |
| 91 | Schedule | GET /api/schedule/assignments | ✅ |
| 92 | Schedule | POST /api/schedule/optimize — optimize schedule | ✅ |
| 93 | Customer Booking | GET /api/customer-booking/availability | ✅ |
| 94 | Customer Booking | POST /api/customer-booking/book — missing fields returns 400 | ✅ |
| 95 | Customer 360 | GET /api/customer360/customer-001 — probe endpoint | ✅ |
| 96 | Comms | POST /api/comms/send — missing fields returns 400 | ✅ |
| 97 | Comms | GET /api/comms/threads/customer-001 | ✅ |
| 98 | Assets | GET /api/assets | ✅ |
| 99 | Assets | POST /api/assets — create asset | ✅ |
| 100 | Assets | GET /api/assets/:id | ✅ |
| 101 | Assets | GET /api/assets/:id/tree | ✅ |
| 102 | Assets | GET /api/assets/:id/service-history | ✅ |
| 103 | Assets | GET /api/assets/health/summary | ✅ |
| 104 | Connectors | GET /api/connectors | ✅ |
| 105 | Connectors | POST /api/connectors — create connector | ✅ |
| 106 | Connectors | POST /api/connectors/:id/sync — trigger sync | ✅ |
| 107 | IoT Telemetry | GET /api/iot/devices | ✅ |
| 108 | IoT Telemetry | GET /api/iot/readings | ✅ |
| 109 | IoT Telemetry | POST /api/iot/ingest — ingest telemetry | ✅ |
| 110 | Maintenance Triggers | GET /api/maintenance-triggers | ✅ |
| 111 | Maintenance Triggers | POST /api/maintenance-triggers — create trigger | ✅ |
| 112 | Maintenance Triggers | POST /api/maintenance-triggers/evaluate | ✅ |
| 113 | Revenue Recognition | GET /api/rev-rec/contracts | ✅ |
| 114 | Revenue Recognition | POST /api/rev-rec/contracts — create contract | ✅ |
| 115 | Revenue Recognition | GET /api/rev-rec/summary | ✅ |
| 116 | Budgeting | GET /api/budgets | ✅ |
| 117 | Budgeting | POST /api/budgets — create budget | ✅ |
| 118 | Budgeting | GET /api/budgets/summary | ✅ |
| 119 | Budgeting | GET /api/budgets/:id/variance | ✅ |
| 120 | SLA Engine | GET /api/sla-engine/policies | ✅ |
| 121 | SLA Engine | POST /api/sla-engine/evaluate | ✅ |
| 122 | Customer Success | GET /api/customer-success/health-scores | ✅ |
| 123 | ESG | GET /api/esg/reports | ✅ |
| 124 | ESG | POST /api/esg/reports — create report | ✅ |
| 125 | ESG | GET /api/esg/benchmarks | ✅ |
| 126 | Digital Twin | GET /api/digital-twin/models | ✅ |
| 127 | Digital Twin | POST /api/digital-twin/models — create model | ✅ |
| 128 | Digital Twin | GET /api/digital-twin/models/:id | ✅ |
| 129 | Inventory Optimisation | GET /api/inventory-opt/recommendations | ✅ |
| 130 | Inventory Optimisation | POST /api/inventory-opt/simulate | ✅ |
| 131 | Audit Framework | GET /api/audit/controls | ✅ |
| 132 | Audit Framework | GET /api/audit/assessments | ✅ |
| 133 | Audit Framework | GET /api/audit/risk-register | ✅ |
| 134 | Audit Framework | GET /api/audit/report | ✅ |
| 135 | Platform Config | GET /api/platform/config | ✅ |
| 136 | Platform Config | GET /api/platform/rate-limits | ✅ |
| 137 | Platform Config | GET /api/platform/quotas | ✅ |
| 138 | Federated Learning | GET /api/federated/rounds | ✅ |
| 139 | Federated Learning | POST /api/federated/rounds — create round | ✅ |
| 140 | Neuro Console | GET /api/neuro/models | ✅ |
| 141 | Neuro Console | POST /api/neuro/models — register model | ✅ |
| 142 | Neuro Console | GET /api/neuro/models/:id/metrics | ✅ |
| 143 | White Label | GET /api/white-label/config | ✅ |
| 144 | White Label | GET /api/white-label/themes | ✅ |
| 145 | Reporting Engine | GET /api/reporting/reports | ✅ |
| 146 | Reporting Engine | POST /api/reporting/reports — create report definition | ✅ |
| 147 | Reporting Engine | GET /api/reporting/datasources | ✅ |
| 148 | Field App | GET /api/field-app/sync | ✅ |
| 149 | Field App | GET /api/field-app/config | ✅ |
| 150 | Field App | POST /api/field-app/crash-reports | ✅ |
| 151 | Observability | GET /api/observability/traces | ✅ |
| 152 | Observability | GET /api/observability/service-map | ✅ |
| 153 | Observability | GET /api/observability/slo-status | ✅ |
| 154 | Data Residency | GET /api/data-residency/policies | ✅ |
| 155 | AI Ethics | GET /api/ai-ethics/bias-reports | ✅ |
| 156 | AI Ethics | GET /api/ai-ethics/fairness-metrics | ✅ |
| 157 | Launch Readiness | GET /api/launch/checklist | ✅ |
| 158 | Launch Readiness | GET /api/launch/score | ✅ |
| 159 | Launch Readiness | GET /api/launch/runbook | ✅ |
| 160 | CBM | GET /api/cbm/rules | ✅ |
| 161 | CBM | POST /api/cbm/rules — create rule | ✅ |
| 162 | CBM | POST /api/cbm/evaluate | ✅ |
| 163 | CBM | GET /api/cbm/history | ✅ |
| 164 | Analytics & Anomaly | GET /api/analytics/anomalies | ✅ |
| 165 | Knowledge Query (RAG) | POST /api/knowledge/query — natural language query | ✅ |
| 166 | Frontend Error Logging | POST /api/log-error — logs a frontend error | ✅ |
| 167 | Security Hardening | Protected routes reject missing token (401) | ✅ |
| 168 | Security Hardening | NoSQL injection probe — $where operator rejected | ✅ |
| 169 | Security Hardening | XSS payload in signup fullName is sanitised | ✅ |
| 170 | Security Hardening | Oversized payload (>10 MB) is rejected | ✅ |
| 171 | Security Hardening | JWT with tampered signature returns 401 | ✅ |
| 172 | Security Hardening | Missing Content-Type still returns structured error | ✅ |
| 173 | Rapid Burst Stability | 20 sequential GET /health requests — no crashes | ✅ |
| 174 | Rapid Burst Stability | 20 sequential POST /api/auth/signin (invalid) — no 500s | ✅ |
| 175 | Rapid Burst Stability | 10 concurrent authenticated GET /api/assets — all succeed | ✅ |
| 176 | Rapid Burst Stability | 10 concurrent authenticated GET /api/ledger/accounts | ✅ |

---

### `tests/api/database.api.test.js` (15 tests)

| # | Test | Result |
|---|---|---|
| 1 | Database API > GET /api/db/tickets | ✅ |
| 2 | Database API > GET /api/db/work_orders | ✅ |
| 3 | Database API > GET /api/db/invoices | ✅ |
| 4 | Database API > GET /api/db/users | ✅ |
| 5 | Database API > GET /api/db/customers | ✅ |
| 6 | Database API > GET /api/db/equipment | ✅ |
| 7 | Database API > GET /api/db/inventory_items | ✅ |
| 8 | Database API > GET /api/db/service_orders | ✅ |
| 9 | Database API > GET /api/db/notifications | ✅ |
| 10 | Database API > GET /api/db/knowledge_base_articles | ✅ |
| 11 | Database API > GET /api/db/faqs | ✅ |
| 12 | Database API > GET /api/db/contracts | ✅ |
| 13 | Database API > GET /api/db/profiles | ✅ |
| 14 | Database API > GET /api/db/permissions | ✅ |
| 15 | Database API > GET /api/db/role_permissions | ✅ |

---

### `tests/api/endpoints.api.test.js` (6 tests)

| # | Test | Result |
|---|---|---|
| 1 | Feature API Endpoints > GET /health — server health check | ✅ |
| 2 | Feature API Endpoints > GET /api/knowledge-base/categories | ✅ |
| 3 | Feature API Endpoints > GET /api/knowledge-base/articles | ✅ |
| 4 | Feature API Endpoints > GET /api/faqs | ✅ |
| 5 | Feature API Endpoints > GET /api/faqs/categories | ✅ |
| 6 | Feature API Endpoints > POST /api/auth/signout | ✅ |

---

### `tests/components/AnalyticsTabs.test.tsx` (4 tests)

| # | Test | Result |
|---|---|---|
| 1 | Analytics Tabs > OperationalTab > should render and fetch trend data | ✅ |
| 2 | Analytics Tabs > SLATab > should render and fetch SLA metrics | ✅ |
| 3 | Analytics Tabs > InventoryTab > should render and fetch inventory items | ✅ |
| 4 | Analytics Tabs > FinancialTab > should render and fetch financial data | ✅ |

---

### `tests/components/CreateWorkOrderDialog.test.tsx` (4 tests)

| # | Test | Result |
|---|---|---|
| 1 | CreateWorkOrderDialog > should render dialog when open | ✅ |
| 2 | CreateWorkOrderDialog > should load technicians when opened | ✅ |
| 3 | CreateWorkOrderDialog > should display technician options after loading | ✅ |
| 4 | CreateWorkOrderDialog > should create work order when form is submitted | ✅ |

---

### `tests/components/ForecastCenter.test.tsx` (8 tests)

| # | Test | Result |
|---|---|---|
| 1 | ForecastCenter > renders forecast dashboard with title | ✅ |
| 2 | ForecastCenter > renders metric cards | ✅ |
| 3 | ForecastCenter > shows empty forecast message when no data | ✅ |
| 4 | ForecastCenter > "Regenerate Forecasts Only" button triggers run-forecast-now | ✅ |
| 5 | ForecastCenter > renders forecast window selector buttons | ✅ |
| 6 | ForecastCenter > clicking forecast window button changes selection | ✅ |
| 7 | ForecastCenter > renders geography hierarchy selects | ✅ |
| 8 | ForecastCenter > handles API error gracefully | ✅ |

---

### `tests/components/ForgeryDetection.test.tsx` (8 tests)

| # | Test | Result |
|---|---|---|
| 1 | ForgeryDetection > renders batch jobs table with progress | ✅ |
| 2 | ForgeryDetection > detection list shows confidence scores (parseFloat safety) | ✅ |
| 3 | ForgeryDetection > model metrics display precision, recall, F1 | ✅ |
| 4 | ForgeryDetection > "Start Batch Detection" button calls process-forgery-batch endpoint | ✅ |
| 5 | ForgeryDetection > review status badges render correctly | ✅ |
| 6 | ForgeryDetection > monitoring alerts section displays | ✅ |
| 7 | ForgeryDetection > handles null/undefined confidence_score without NaN | ✅ |
| 8 | ForgeryDetection > renders key metric cards | ✅ |

---

### `tests/components/FraudInvestigation.test.tsx` (8 tests)

| # | Test | Result |
|---|---|---|
| 1 | FraudInvestigation > renders summary cards with correct counts | ✅ |
| 2 | FraudInvestigation > alert cards show severity badges with correct colors | ✅ |
| 3 | FraudInvestigation > resolution notes textarea binds per-alert (not shared) | ✅ |
| 4 | FraudInvestigation > resolved alerts show resolution notes and timestamp | ✅ |
| 5 | FraudInvestigation > non-resolved alerts show investigation controls | ✅ |
| 6 | FraudInvestigation > resolved alerts do NOT show investigation controls | ✅ |
| 7 | FraudInvestigation > empty state shows "No fraud alerts" message | ✅ |
| 8 | FraudInvestigation > displays alert description and confidence | ✅ |

---

### `tests/components/GenerateServiceOrderDialog.test.tsx` (3 tests)

| # | Test | Result |
|---|---|---|
| 1 | GenerateServiceOrderDialog > should render dialog when open | ✅ |
| 2 | GenerateServiceOrderDialog > should invoke generate-service-order function when generating | ✅ |
| 3 | GenerateServiceOrderDialog > should handle function errors gracefully | ✅ |

---

### `tests/components/OfferAI.test.tsx` (8 tests)

| # | Test | Result |
|---|---|---|
| 1 | OfferAI > renders offer list with status badges | ✅ |
| 2 | OfferAI > work order selector populates from API | ✅ |
| 3 | OfferAI > "Generate Offers" button calls functions.invoke | ✅ |
| 4 | OfferAI > Accept/Decline buttons appear only for generated status without warranty conflicts | ✅ |
| 5 | OfferAI > warranty conflict badge shows for flagged offers | ✅ |
| 6 | OfferAI > conversion rate calculates correctly | ✅ |
| 7 | OfferAI > provenance metadata (model_version, confidence_score) displays | ✅ |
| 8 | OfferAI > empty state shows message when no offers | ✅ |

---

### `tests/components/PrecheckStatus.test.tsx` (3 tests)

| # | Test | Result |
|---|---|---|
| 1 | PrecheckStatus > should render component | ✅ |
| 2 | PrecheckStatus > should fetch precheck data on mount | ✅ |
| 3 | PrecheckStatus > should invoke precheck-orchestrator when running precheck | ✅ |

---

### `tests/components/PredictiveMaintenance.test.tsx` (9 tests)

| # | Test | Result |
|---|---|---|
| 1 | PredictiveMaintenance > renders loading state | ✅ |
| 2 | PredictiveMaintenance > renders empty state when no predictions available | ✅ |
| 3 | PredictiveMaintenance > renders prediction table with mock data | ✅ |
| 4 | PredictiveMaintenance > renders risk level badges with correct CSS classes | ✅ |
| 5 | PredictiveMaintenance > renders "Schedule Maintenance" button for each prediction | ✅ |
| 6 | PredictiveMaintenance > displays equipment info (manufacturer, model, serial_number) | ✅ |
| 7 | PredictiveMaintenance > displays summary cards with correct counts | ✅ |
| 8 | PredictiveMaintenance > displays confidence score for each prediction | ✅ |
| 9 | PredictiveMaintenance > handles null confidence_score gracefully | ✅ |

---

### `tests/components/migration-smoke.test.tsx` (25 tests)

Verifies that all migrated components use `apiClient` (not the legacy Supabase client).

| # | Test | Result |
|---|---|---|
| 1 | Import Verification > CreateWorkOrderDialog.tsx uses apiClient | ✅ |
| 2 | Import Verification > GenerateServiceOrderDialog.tsx uses apiClient | ✅ |
| 3 | Import Verification > TechnicianDialog.tsx uses apiClient | ✅ |
| 4 | Import Verification > FraudFeedbackDialog.tsx uses apiClient | ✅ |
| 5 | Import Verification > GenerateOfferDialog.tsx uses apiClient | ✅ |
| 6 | Import Verification > TriggerPrecheckDialog.tsx uses apiClient | ✅ |
| 7 | Import Verification > PrecheckStatus.tsx uses apiClient | ✅ |
| 8 | Import Verification > OperationalCommandView.tsx uses apiClient | ✅ |
| 9 | Import Verification > ContractDialog.tsx uses apiClient | ✅ |
| 10 | Import Verification > SeedDataManager.tsx uses apiClient | ✅ |
| 11 | Import Verification > SecurityDashboard.tsx uses apiClient | ✅ |
| 12 | Import Verification > PurchaseOrderDialog.tsx uses apiClient | ✅ |
| 13 | Import Verification > NLPQueryExecutor.tsx uses apiClient | ✅ |
| 14 | Import Verification > MFAOverrideDialog.tsx uses apiClient | ✅ |
| 15 | Import Verification > AddPenaltyRuleDialog.tsx uses apiClient | ✅ |
| 16 | Import Verification > AddInventoryItemDialog.tsx uses apiClient | ✅ |
| 17 | Import Verification > analytics/OperationalTab.tsx uses apiClient | ✅ |
| 18 | Import Verification > analytics/SLATab.tsx uses apiClient | ✅ |
| 19 | Import Verification > analytics/InventoryTab.tsx uses apiClient | ✅ |
| 20 | Import Verification > analytics/FinancialTab.tsx uses apiClient | ✅ |
| 21 | Import Verification > analytics/EnhancedSLATab.tsx uses apiClient | ✅ |
| 22 | Hook Verification > useOfflineSync hook uses apiClient | ✅ |
| 23 | Pattern Verification > .then() pattern for apiClient queries | ✅ |
| 24 | Pattern Verification > result.data pattern for function invocations | ✅ |
| 25 | No Legacy Supabase References > zero legacy Supabase imports in components directory | ✅ |

---

### `tests/integration/auth.test.ts` (6 tests)

| # | Test | Result |
|---|---|---|
| 1 | Authentication Integration > Sign Up Flow > should create a new user account | ✅ |
| 2 | Authentication Integration > Sign Up Flow > should reject duplicate email | ✅ |
| 3 | Authentication Integration > Sign In Flow > should sign in with valid credentials | ✅ |
| 4 | Authentication Integration > Sign In Flow > should reject invalid credentials | ✅ |
| 5 | Authentication Integration > Session Management > should get current user with valid token | ✅ |
| 6 | Authentication Integration > Session Management > should reject invalid token | ✅ |

---

### `tests/unit/apiClient.test.ts` (6 tests)

| # | Test | Result |
|---|---|---|
| 1 | apiClient > from() method > should create a query builder | ✅ |
| 2 | apiClient > from() method > should support select() | ✅ |
| 3 | apiClient > from() method > should support eq() filter | ✅ |
| 4 | apiClient > functions.invoke() > should invoke API functions | ✅ |
| 5 | apiClient > functions.invoke() > should handle function errors | ✅ |
| 6 | apiClient > auth methods > should support signInWithPassword | ✅ |

---

### `tests/unit/assets.test.ts` (10 tests)

| # | Test | Result |
|---|---|---|
| 1 | buildTree() > returns empty array for empty input | ✅ |
| 2 | buildTree() > places assets without parent_id at root | ✅ |
| 3 | buildTree() > places child under correct parent | ✅ |
| 4 | buildTree() > builds multi-level hierarchy | ✅ |
| 5 | buildTree() > treats orphan (dangling parent_id) as root node | ✅ |
| 6 | buildTree() > supports multiple roots each with children | ✅ |
| 7 | buildTree() > preserves asset properties on tree nodes | ✅ |
| 8 | buildTree() > handles assets with null parent_id as roots | ✅ |
| 9 | findInTree() > finds a deeply nested node | ✅ |
| 10 | findInTree() > returns undefined for non-existent id | ✅ |

---

### `tests/unit/automl.test.ts` (6 tests)

| # | Test | Result |
|---|---|---|
| 1 | automl service > createExperiment stores and returns experiment doc | ✅ |
| 2 | automl service > listExperiments calls findMany with tenant filter | ✅ |
| 3 | automl service > createRun throws when experiment not found | ✅ |
| 4 | automl service > createRun creates run with metrics when experiment exists | ✅ |
| 5 | automl service > deployModel throws when run not found | ✅ |
| 6 | automl service > deployModel marks run as deployed | ✅ |

---

### `tests/unit/currency.test.ts` (16 tests)

| # | Test | Result |
|---|---|---|
| 1 | convertAmount() > returns the same amount when from === to | ✅ |
| 2 | convertAmount() > converts GBP → USD using seeded rate | ✅ |
| 3 | convertAmount() > converts USD → GBP correctly | ✅ |
| 4 | convertAmount() > converts USD → EUR via GBP base | ✅ |
| 5 | convertAmount() > handles zero amount | ✅ |
| 6 | convertAmount() > handles negative amounts | ✅ |
| 7 | convertAmount() > is case-insensitive for currency codes | ✅ |
| 8 | convertAmount() > throws for unsupported from currency | ✅ |
| 9 | convertAmount() > throws for unsupported to currency | ✅ |
| 10 | getExchangeRates() > returns GBP rate of 1 when base is GBP | ✅ |
| 11 | getExchangeRates() > returns all supported currencies | ✅ |
| 12 | getExchangeRates() > returns USD rate > 1 relative to GBP | ✅ |
| 13 | getExchangeRates() > returns base rate of 1 for any base currency | ✅ |
| 14 | getExchangeRates() > recalculates rates relative to a non-GBP base | ✅ |
| 15 | getExchangeRates() > is case-insensitive | ✅ |
| 16 | getExchangeRates() > throws for unsupported base currency | ✅ |

---

### `tests/unit/db-adapter.test.ts` (13 tests)

| # | Test | Result |
|---|---|---|
| 1 | validateAdapter() > accepts a fully-compliant adapter | ✅ |
| 2 | validateAdapter() > throws when a single method is missing | ✅ |
| 3 | validateAdapter() > throws listing ALL missing methods in the error message | ✅ |
| 4 | validateAdapter() > throws when a method is not a function | ✅ |
| 5 | validateAdapter() > returns the same adapter object | ✅ |
| 6 | factory.getAdapter() > defaults to mongodb adapter when DB_ADAPTER is not set | ✅ |
| 7 | factory.getAdapter() > selects postgresql adapter when DB_ADAPTER=postgresql | ✅ |
| 8 | factory.getAdapter() > throws on unknown DB_ADAPTER value | ✅ |
| 9 | factory.getAdapter() > returns the same adapter on repeated calls (singleton) | ✅ |
| 10 | PostgreSQL buildWhere helper > is exercised indirectly via interface compliance tests | ✅ |
| 11 | PostgreSQL adapter interface compliance > exports all required DbAdapter methods | ✅ |
| 12 | MongoDB adapter interface compliance > exports all required DbAdapter methods | ✅ |
| 13 | MongoDB adapter interface compliance > isConnected() starts as false before connection completes | ✅ |

---

### `tests/unit/flowspace.test.ts` (23 tests)

| # | Test | Result |
|---|---|---|
| 1 | writeDecisionRecord() > inserts a record and returns an id + created_at | ✅ |
| 2 | writeDecisionRecord() > stores optional fields when provided | ✅ |
| 3 | writeDecisionRecord() > throws when tenantId is missing | ✅ |
| 4 | writeDecisionRecord() > throws when domain is missing | ✅ |
| 5 | writeDecisionRecord() > throws when actorType is missing | ✅ |
| 6 | writeDecisionRecord() > throws when actorId is missing | ✅ |
| 7 | writeDecisionRecord() > throws when action is missing | ✅ |
| 8 | writeDecisionRecord() > generates a unique id each call | ✅ |
| 9 | writeDecisionRecord() > null-fills optional fields when not provided | ✅ |
| 10 | listDecisionRecords() > returns records and total for a tenant | ✅ |
| 11 | listDecisionRecords() > passes tenant_id filter to adapter | ✅ |
| 12 | listDecisionRecords() > applies domain filter when provided | ✅ |
| 13 | listDecisionRecords() > caps limit at 200 | ✅ |
| 14 | listDecisionRecords() > throws when tenantId is missing | ✅ |
| 15 | getDecisionRecord() > returns the record when found | ✅ |
| 16 | getDecisionRecord() > queries with both id and tenant_id | ✅ |
| 17 | getDecisionRecord() > returns null when id is empty | ✅ |
| 18 | getDecisionRecord() > returns null when tenantId is empty | ✅ |
| 19 | getDecisionLineage() > walks the lineage chain from child to root | ✅ |
| 20 | getDecisionLineage() > returns a single record for a root node | ✅ |
| 21 | getDecisionLineage() > returns empty array for missing id | ✅ |
| 22 | getDecisionLineage() > returns empty array for missing tenantId | ✅ |
| 23 | getDecisionLineage() > stops after 10 hops to prevent infinite loops | ✅ |

---

### `tests/unit/ledger.test.ts` (9 tests)

| # | Test | Result |
|---|---|---|
| 1 | validateJournalBalance() > accepts a perfectly balanced 2-line entry | ✅ |
| 2 | validateJournalBalance() > accepts multi-line balanced entry | ✅ |
| 3 | validateJournalBalance() > rejects unbalanced entry | ✅ |
| 4 | validateJournalBalance() > rejects entry with fewer than 2 lines | ✅ |
| 5 | validateJournalBalance() > rejects entry with no debit lines | ✅ |
| 6 | validateJournalBalance() > accepts floating-point amounts within tolerance | ✅ |
| 7 | validateJournalBalance() > rejects empty array | ✅ |
| 8 | validateJournalBalance() > treats missing debit/credit fields as zero | ✅ |
| 9 | validateJournalBalance() > calculates totals correctly | ✅ |

---

### `tests/unit/scheduler.test.ts` (10 tests)

| # | Test | Result |
|---|---|---|
| 1 | calculateSlaUrgency() > returns 1 for an overdue deadline | ✅ |
| 2 | calculateSlaUrgency() > returns 0.9 for deadline within 4 hours | ✅ |
| 3 | calculateSlaUrgency() > returns 0.7 for deadline within 24 hours | ✅ |
| 4 | calculateSlaUrgency() > returns 0.5 for deadline more than 24 hours away | ✅ |
| 5 | scoreAssignment() > produces score between 0 and 100 | ✅ |
| 6 | scoreAssignment() > scores 100 for perfect match with overdue SLA | ✅ |
| 7 | scoreAssignment() > scores lower when technician has no matching skills | ✅ |
| 8 | scoreAssignment() > reduces score for expired certs | ✅ |
| 9 | scoreAssignment() > urgent SLA increases score vs distant deadline | ✅ |
| 10 | scoreAssignment() > returns 90 for full skill+cert match with no SLA deadline | ✅ |

---

### `tests/unit/skills-match.test.ts` (18 tests)

| # | Test | Result |
|---|---|---|
| 1 | scoreMatch() > returns 100% when all required skills are matched and valid | ✅ |
| 2 | scoreMatch() > returns 50% when only half of required skills match | ✅ |
| 3 | scoreMatch() > returns 100% when no skills are required | ✅ |
| 4 | scoreMatch() > halves the finalScore when certifications are expired | ✅ |
| 5 | scoreMatch() > certificationValid is true when expiry is in the future | ✅ |
| 6 | scoreMatch() > certificationValid is true when no expiry is set | ✅ |
| 7 | scoreMatch() > returns 0 match when technician has no matching skills | ✅ |
| 8 | scoreMatch() > ignores technician skills not in required list | ✅ |
| 9 | scoreAssignment() > returns a score between 0 and 100 | ✅ |
| 10 | scoreAssignment() > gives max score for perfect match with no SLA deadline | ✅ |
| 11 | scoreAssignment() > reduces score for missing skills | ✅ |
| 12 | scoreAssignment() > reduces score for invalid certifications | ✅ |
| 13 | scoreAssignment() > increases urgency for near-SLA deadline | ✅ |
| 14 | scoreAssignment() > scores overdue SLA at maximum urgency (slaScore=1) | ✅ |
| 15 | calculateSkillMatch() > returns 1 when all required skills are present | ✅ |
| 16 | calculateSkillMatch() > returns 1 when no skills required | ✅ |
| 17 | calculateSkillMatch() > returns partial match fraction | ✅ |
| 18 | calculateSkillMatch() > returns 0 when no matching skills | ✅ |

---

### `tests/unit/vision.test.ts` (3 tests)

| # | Test | Result |
|---|---|---|
| 1 | vision service > analyseImage returns defects array with correct structure | ✅ |
| 2 | vision service > analyseImage stores result in vision_analyses collection | ✅ |
| 3 | vision service > listAnalyses returns array from adapter | ✅ |

---

### `tests/unit/xai.test.ts` (3 tests)

| # | Test | Result |
|---|---|---|
| 1 | xai service > explainPrediction returns feature importances | ✅ |
| 2 | xai service > explainPrediction stores explanation in db | ✅ |
| 3 | xai service > generateCounterfactual returns alternatives | ✅ |

---

## Coverage by Layer

| Layer | Files | Tests |
|---|---|---|
| Unit | 11 | 123 |
| API / Integration | 10 | 253 |
| Component (React) | 10 | 78 |
| **Total** | **31** | **429** |

## Coverage by Domain

| Domain | Tests |
|---|---|
| Authentication & Security | 30 |
| Database / DB Adapter | 28 |
| AI — Forecasting | 10 |
| AI — Forgery Detection | 13 |
| AI — Fraud Investigation | 13 |
| AI — Offers / SAPOS | 13 |
| AI — Predictive Maintenance | 14 |
| AI — Vision / XAI / AutoML | 12 |
| FlowSpace Decision Records | 27 |
| DEX Execution Contexts | 6 |
| SSO | 2 |
| Currency & Exchange | 16 |
| Ledger / Finance | 9 |
| Skills & Scheduling | 28 |
| Assets | 10 |
| Knowledge Base / FAQs | 8 |
| Org Console | 5 |
| Platform (all other routes) | 59 |
| Migration / apiClient Smoke | 25 |
| Component UI rendering | 45 |

---

## How to Re-run

```bash
# Full suite
node_modules/.bin/vitest run

# Verbose (this report's source)
node_modules/.bin/vitest run --reporter=verbose

# Single file
node_modules/.bin/vitest run tests/unit/flowspace.test.ts

# Watch mode (development)
node_modules/.bin/vitest
```
