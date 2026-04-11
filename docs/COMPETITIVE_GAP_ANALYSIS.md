# GuardianFlow — Enterprise Competitive Gap Analysis
## Page-by-Page Comparison Against Market Leaders (2025/2026)

**Scope:** Enterprise scale (5,000+ employees, 500+ field technicians, multi-tenant, multi-country).
**Not mid-market.** Reference points: Fortune 500 FSM / ERP / CRM / IoT deployments.
**Cross-industry lens:** GuardianFlow is not FSM-only. Module services must be usable by Utilities, Telecom, Healthcare, Manufacturing, Insurance, and Public Sector.

**Audit date:** 2026-04-11
**Analyst:** GuardianFlow AI Agent (primary research via vendor documentation, Gartner/IDC public data, 2025 release notes)

---

## Table of Contents
1. [Module A — Field Service & Work Orders](#module-a--field-service--work-orders)
2. [Module B — Scheduling, Dispatch & Routing](#module-b--scheduling-dispatch--routing)
3. [Module C — Asset, Inventory & Procurement](#module-c--asset-inventory--procurement)
4. [Module D — Financial Management](#module-d--financial-management)
5. [Module E — Customer & CRM](#module-e--customer--crm)
6. [Module F — AI, Analytics & Intelligence](#module-f--ai-analytics--intelligence)
7. [Module G — IoT, Digital Twin & Predictive](#module-g--iot-digital-twin--predictive)
8. [Module H — AI Governance & Ethics](#module-h--ai-governance--ethics)
9. [Module I — Identity, Compliance & Security](#module-i--identity-compliance--security)
10. [Module J — Developer Platform, Marketplace & Integration](#module-j--developer-platform-marketplace--integration)
11. [Gap Summary Table](#gap-summary-table)
12. [Net-New Sprint Items for Build Plan](#net-new-sprint-items-for-build-plan)

---

## Module A — Field Service & Work Orders

### Leaders Assessed
| Vendor | Product | Positioning |
|--------|---------|-------------|
| ServiceNow | Field Service Management (FSM Pro/Enterprise) | ITSM-first, extends to physical assets |
| Salesforce | Field Service (Einstein 1 Edition) | CRM-first, Agentforce autonomous dispatch |
| Microsoft | Dynamics 365 Field Service + Copilot | ERP-first, Copilot embedded throughout |
| IFS | IFS Cloud FSM | Engineering-asset-first, aerospace/defence heritage |
| SAP | SAP Field Service Management 2025 | ERP-first, crowd marketplace differentiated |
| Oracle | Oracle Field Service Cloud (25C) | AI-routing-first, telco/utilities heritage |

### Page-by-Page Comparison: Work Orders

| Page / Capability | ServiceNow | Salesforce FS | D365 FS | IFS Cloud | SAP FSM | Oracle FS | **GuardianFlow** |
|---|---|---|---|---|---|---|---|
| **Work Order List** | Filter by skill, SLA breach risk, priority heat-map | Kanban + list; AI priority score visible | List with Copilot summary pills | List with asset-linked risk score | List with Crowd assignment badge | List with time-window compliance colour-coding | ✅ List exists. ❌ No risk score, no AI priority |
| **Work Order Detail** | AI-generated pre-visit brief; asset history panel; parts check inline | Einstein Copilot pre-brief (read by Siri); image upload to AI | Copilot auto-generates WO from email; recap summary | Engineering checklist embedded; parts reservation inline | Smart form with conditional fields; PDF auto-generation | Real-time ETA; OAuth-secured API | ✅ Basic CRUD. ❌ No AI brief, no inline asset history panel, no Copilot-style summary |
| **WO Creation from Trigger** | IoT → WO, ITSM incident → WO, email → WO | Agentforce → WO; sensor → WO | Email/chat → WO (Copilot extracts details); IoT → WO | PM schedule → WO; sensor threshold → WO | Crowd auto-assignment on creation | IoT → WO; OAuth calendar booking | ✅ Manual only. ❌ No email-parse creation, no Agentforce-style autonomous creation |
| **Crew / Multi-Technician WO** | Crew scheduling; task assignment per crew member | Crew + 24hr round-the-clock resource availability | Crew assignment with shift constraints | Crew operations; certification per member | Partial-day crew assignment; dynamic crew composition | Crew with privacy location controls | ❌ Not implemented |
| **WO Task Bundling** | Bundle multiple WOs for same location or equipment | Location bundling + travel optimization | Bundling in RSO (Resource Scheduling Optimization) | Task bundling with shared parts list | Bulk assignment with lasso map tool | Geo-cluster bundling | ❌ Not implemented |
| **Contractor / Crowd WO** | Field Service Marketplace (partner assignment) | AppExchange contractor modules | Contractor management; subcontractor portal | Contractor onboarding + SLA tracking | Crowd Marketplace (SAP FSM Crowd; role: Crowd Owner / Partner Manager / Crowd Technician) | External partner portal | ❌ Not implemented |
| **WO to Invoice Automation** | Service contract → invoice trigger | Einstein automates service-to-invoice | Finance module link (service-to-cash) | ERP-linked: WO close → AR entry | SAP ERP integration: WO → billing doc | Oracle Financials integration | ✅ WO → invoice flow exists. ❌ No tax automation, no credit note reversal on dispute |
| **Mobile WO App** | Native iOS/Android; offline sync; photo + signature capture | Field Service App; Siri/Agentforce hands-free | D365 mobile; Outlook + Teams integration | IFS Mobile; AR overlay available | SAP Mobile; guided smart forms; group check-out | Oracle mobile; low-connectivity offline | ❌ No native mobile app; PWA shell only (incomplete offline) |

### GuardianFlow Gaps — Module A
1. **AI-generated pre-visit brief** for technician (GPT-4o prompt over asset history + last 3 WOs) — not built
2. **Crew / multi-technician WO** — schema and UI missing
3. **Task bundling** — no grouping logic when same location or equipment
4. **Contractor / Crowd marketplace** — PartnerGateway page exists but no crowd WO assignment
5. **Email/chat → WO auto-creation** (Copilot-style) — not built
6. **Offline-capable native mobile app** — PWA shell only

---

## Module B — Scheduling, Dispatch & Routing

### Leaders Assessed
ServiceNow (Dynamic Scheduling), Salesforce (Agentforce Scheduling), D365 (RSO + Scheduling Operations Agent), IFS (Planning & Scheduling Optimization / PSO), SAP (Auto-Scheduler + Crowd), Oracle (AI-Driven Routing / Assisted Scheduling)

### Page-by-Page Comparison: Scheduling & Dispatch

| Page / Capability | ServiceNow | Salesforce FS | D365 FS (RSO) | IFS PSO | SAP FSM | Oracle FS | **GuardianFlow** |
|---|---|---|---|---|---|---|---|
| **Dispatch Board / Gantt** | Drag-and-drop visual console; real-time conflict alerts | Agentforce fills gaps autonomously; dispatcher override | D365 Schedule Board with Copilot suggestions; real-time disruption response | PSO visual board; multi-resource; travel time overlay | Dispatch board with geographic map lasso; urgency highlight | Dynamic dispatch with real-time traffic; SLA risk colour | ✅ Basic dispatch board. ❌ No Gantt view, no conflict alerts, no geo-map |
| **AI Scheduling Suggestions** | Predictive Intelligence: ML-based task categorisation + resource recommendation | Agentforce 2.0 autonomous scheduling; 24-hr booking | Copilot "agentic scheduling": NLP prompt to reschedule; Scheduling Operations Agent (2026) | IFS.ai auto-scheduling; skill + SLA + traffic weighting | AI recommendations; skill validation on assignment | Assisted Scheduling: AI recommends top technician with reasoning | ✅ Sprint 30 adds constraint-based scoring. ❌ No NLP prompting, no autonomous re-scheduling agent |
| **Route Optimization** | Multi-stop route optimization (Google Maps / HERE); travel time in Gantt | Real-time traffic rerouting; Siri-triggered rerouting | RSO: multi-day, multi-technician optimization; live traffic | AI-driven route optimization; depot-to-site | Geographic dispatch; map lasso for bulk assignment | Dynamic re-routing on cancellation/delay; ETA recompute | ✅ Sprint 29 adds Google Maps. ❌ No multi-day, no re-routing on cancellation event |
| **Territory Planning** | Territory management; geographic assignment rules | Territory management with equity scoring | Territory planning with capacity reservations | Territory + depot planning | Geographic zone assignment | Geographic territory rules | ❌ Not implemented |
| **Capacity & Demand Forecasting** | Workforce Optimization: demand forecast + headcount planning | Agentforce workforce planning | Capacity reservations management | PSO: forward-looking capacity planning | Demand forecasting via SAP IBP integration | AI workload prediction: align capacity to demand | ❌ Not implemented — only historical WO counts |
| **SLA Breach Prediction on Schedule Board** | Real-time SLA breach risk visible per WO in board | Einstein SLA risk score in schedule | Copilot flags SLA risks on board | SLA compliance metric per resource | SLA validation on assignment | Emergency job prioritization; SLA flag | ❌ SLA engine exists but not surfaced on dispatch board |
| **Multi-Day Scheduling** | Multi-day project scheduling | Multi-day WO with crew | Multi-Day Scheduling (Professional tier) | Multi-day engineering projects | Multi-day crew assignment | Multi-day route planning | ❌ Not implemented |

### GuardianFlow Gaps — Module B
1. **Gantt view** on dispatch board with travel-time overlay
2. **Territory planning** — geographic zone management for large field operations
3. **Capacity & demand forecasting** — workforce planning beyond WO counts
4. **Multi-day scheduling** — complex project-style WOs spanning days
5. **Autonomous re-scheduling agent** triggered by real-world events (cancellation, traffic delay)
6. **SLA breach risk surfaced on schedule board** in real time

---

## Module C — Asset, Inventory & Procurement

### Leaders Assessed
ServiceNow (CMDB + Asset Management), Salesforce (Field Service Asset Management), D365 (Asset Management + Inventory), IFS (EAM — Enterprise Asset Management), SAP (Plant Maintenance / EAM), Oracle (Maintenance Cloud)

### Page-by-Page Comparison

| Page / Capability | ServiceNow | Salesforce FS | D365 FS | IFS EAM | SAP PM | Oracle Maintenance | **GuardianFlow** |
|---|---|---|---|---|---|---|---|
| **Asset Register / Equipment** | CMDB: asset with full dependency graph; software + hardware | Asset hierarchy; service history; Einstein health score | Serialised inventory tracking; asset lifecycle | Asset master with engineering specs; compliance certs | Plant Maintenance hierarchy; functional locations | Asset with IoT telemetry linked; OAuth-secured maintenance API | ✅ Exists. ❌ No dependency graph, no compliance cert tracking |
| **Preventive Maintenance Plans** | Planned Maintenance module; auto-raise on schedule | PM plans with auto WO creation | Maintenance plans with auto-trigger | IFS Maintenance Plans; condition-based trigger | PM with calibration intervals | Predictive + PM plans; condition monitoring | ✅ Sprint 5 adds PM. ❌ No condition-based trigger from sensor |
| **Inventory / Parts Management** | Parts reservation before dispatch; CMDB-linked | Inventory unified via Data Cloud; proactive parts alerts | Serialised stock; AI inventory monitoring + replenishment alerts | Truck stock + depot; automated restocking; reverse logistics | Automated restocking; integration with Ariba procurement | Proactive asset maintenance parts logistics | ✅ Basic inventory. ❌ No truck stock tracking, no automated reorder, no serialisation |
| **Multi-location Inventory** | Multi-warehouse visibility | Multi-location via Data Cloud | Multi-warehouse with transfer orders | Multi-depot + field vehicle stock | Multi-plant stock with transfer orders | Multi-site stock visibility | ✅ Sprint 6 adds multi-location. ❌ No transfer order workflow |
| **Procurement / Purchase Orders** | Procurement integration (Ariba-style) | AppExchange procurement | D365 Supply Chain integration | IFS Procurement module | SAP Ariba integration; supplier portal + early payment | Oracle Procurement Cloud | ✅ Procurement page exists. ❌ No supplier portal, no 3-way match |
| **Reverse Logistics / Warranty Returns** | Asset return workflow in CMDB | Warranty case linked to asset | Warranty management | Depot repair + return workflow | SAP warranty management | Oracle warranty returns | ✅ Warranty page exists. ❌ No depot repair, no return workflow |
| **Asset Inspection / Photo AI** | Computer vision via NowAssist | Einstein Vision: image-based troubleshooting; Agentforce image analysis | Copilot: image submitted for AI analysis | PTC Vuforia AR integration (partner) | Photo capture with PDF generation | Photo + PDF in mobile app | ✅ Sprint 30 adds defect detection. ❌ No AR overlay, no video stream inspection |

### GuardianFlow Gaps — Module C
1. **Asset dependency graph** (CMDB-style parent/child relationships with impact mapping)
2. **Compliance certificate tracking** per asset (calibration, safety inspection expiry)
3. **Truck stock / mobile inventory tracking** per technician vehicle
4. **Automated reorder** when stock falls below threshold
5. **Serialised inventory** tracking (unique serial per part)
6. **Supplier portal with 3-way match** (PO → goods receipt → invoice)
7. **Depot repair / return workflow** for warranty items
8. **AR overlay** for guided repair (PTC Vuforia / HoloLens style — stretch goal)

---

## Module D — Financial Management

### Leaders Assessed
SAP S/4HANA Finance, Oracle Fusion Cloud Financials, Workday Financial Management, NetSuite ERP (for SME-to-enterprise comparison)

### Page-by-Page Comparison: Financial

| Page / Capability | SAP S/4HANA | Oracle Fusion | Workday | NetSuite | **GuardianFlow** |
|---|---|---|---|---|---|
| **General Ledger** | Multi-ledger, document splitting, IFRS + GAAP parallel; real-time consolidation; granular audit trail | Multi-GAAP cloud-native GL; AI anomaly detection; multi-currency | Continuous accounting; real-time close; AI anomaly detection; IFRS + GAAP parallel ledgers | Multi-book; automated consolidation; period close workflow | ✅ GL page exists. ❌ No parallel ledger, no period lock, no real-time close |
| **Accounts Payable** | 3-way match; Ariba supplier portal; global tax; mass payment runs; early payment programs | Invoice ingest automation; supplier self-service; AI 3-way match | Agentic AI inbox; 3-way match; supplier self-service; automated tax compliance | AP automation; vendor portal; ACH/wire payments | ❌ Not implemented (no AP module at all) |
| **Accounts Receivable** | Dunning; cash application; dispute management; deduction mgmt | AI cash forecasting; automated dunning; dispute resolution | Automated cash application; AI dispute resolution | Automated dunning; cash forecasting | ✅ Invoicing + payments exist. ❌ No dunning, no cash application automation |
| **Revenue Recognition** | SAP RAR: ASC 606/IFRS 15; multi-element; contract mgmt | ASC 606/IFRS 15; opportunity-to-cash; deferred revenue AI forecast | ASC 606/IFRS 15; Revenue Contract Agent (AI); waterfall scheduling | ASC 606 compliance; deferred revenue schedules | ✅ RevenueRecognition page exists (mock). ❌ No ASC 606 engine, no deferred revenue |
| **Budgeting & Forecasting** | Integrated planning via SAP IBP; rolling forecasts; driver-based planning | EPM: rolling forecast; scenario planning; AI suggestions | Continuous planning; driver-based; AI scenario modelling | Budget vs actual; rolling forecast | ✅ Budgeting page exists (mock). ❌ No driver-based planning, no scenario models |
| **Intercompany / Consolidation** | Automated intercompany elimination; group consolidation | Multi-entity consolidation; automated IC transactions | Automated consolidation across subsidiaries | Multi-subsidiary with IC elimination | ❌ Not implemented |
| **Tax Management** | Global tax engine: VAT, GST, WHT; e-invoicing for 50+ countries | Global tax; local compliance for 100+ countries | Automated global tax; country rules | Tax compliance module | ✅ Sprint 4 adds basic tax. ❌ No e-invoicing, no VAT return filing, no 50-country support |
| **Fixed Assets** | Asset lifecycle; depreciation; impairment | Asset accounting with parallel depreciation | Asset management with depreciation | Fixed asset management | ❌ Not implemented |
| **Cash Management & Treasury** | Cash flow forecasting; bank reconciliation; FX risk | Treasury: FX, liquidity, bank connectivity (SWIFT) | Cash management; bank reconciliation | Basic cash management | ❌ Not implemented |
| **Expense Management** | SAP Concur integration; per diem; policy enforcement | Oracle Expense: policy rules; receipt OCR | Expense automation; OCR receipts; policy compliance | Expense reports | ❌ Not implemented |
| **Dispute Management** | Dispute + deduction workflow; credit note auto-generation | Dispute resolution with approval workflow | AI dispute resolution | Dispute management | ✅ DisputeManagement page exists (mock). ❌ No credit note automation |

### GuardianFlow Gaps — Module D
1. **Accounts Payable module** — entirely missing (AP is a core ERP module)
2. **Parallel ledger** — IFRS + GAAP simultaneous posting
3. **Intercompany / consolidation** — critical for multi-entity enterprise customers
4. **Fixed assets & depreciation** — required for any enterprise with capital equipment
5. **Cash management & bank reconciliation** — basic treasury capability
6. **Expense management** — technician expense claims + policy enforcement
7. **ASC 606 / IFRS 15 revenue recognition engine** — not a stub
8. **Global e-invoicing** — country-specific VAT compliance (Peppol, CFDI, etc.)
9. **Dunning & collections workflow** on Accounts Receivable

---

## Module E — Customer & CRM

### Leaders Assessed
Salesforce Sales Cloud (Enterprise), HubSpot Enterprise, Microsoft Dynamics 365 CRM, ServiceNow CSM (Customer Service Management)

### Page-by-Page Comparison: CRM

| Page / Capability | Salesforce Sales Cloud | HubSpot Enterprise | D365 CRM | ServiceNow CSM | **GuardianFlow** |
|---|---|---|---|---|---|
| **Customer / Account Record (360)** | Unified 360 view: all deals, cases, invoices, campaign memberships, AI scoring; parent-child org hierarchy | Smart CRM: unified timeline across sales + marketing + service; AI Breeze summaries | 360 with LinkedIn integration; relationship intelligence | CSM: unified customer record; linked to incidents, assets, SLAs | ✅ Customer360 page exists. ❌ No unified timeline, no parent-child orgs, no AI scoring |
| **Contact Management** | Contact with role-based org chart; activity auto-log (email + calendar); Einstein next-best-action | Contact with full activity log; automatic email/meeting capture; AI draft replies | Contact with LinkedIn Sales Navigator; relationship map | Contact linked to cases and accounts | ✅ Contacts page (basic). ❌ No org chart, no email auto-log, no LinkedIn |
| **Pipeline / Deals** | Customisable stages; opportunity scoring; territory-based pipelines; CPQ integration | Multi-pipeline; drag-and-drop; forecast by stage; AI deal health | Opportunity management with Copilot coaching | Service pipeline (case-to-resolution stages) | ❌ No CRM pipeline/deal management (only service WO lifecycle) |
| **Customer Success / Health Score** | Success Plans; Customer Health Score from usage + support + survey data | Customer health tracking in Service Hub Enterprise | Customer Health with AI churn prediction | CSM: service health dashboard | ✅ CustomerSuccess page exists (random mock). ❌ No real health score computation — Sprint 21 fixes this partially |
| **Self-Service Portal** | Experience Cloud: self-service for cases, appointments, invoice view | Customer portal: ticket submission, knowledge search | Power Pages: self-service portal | Service Portal: NLP search, case submission, appointment booking | ✅ CustomerPortal page exists. ❌ No NLP search, no case integration, no real-time WO tracking |
| **Partner Portal** | Experience Cloud Partner Edition: deal registration, co-selling, MDF, certification | AppExchange partner tools | D365 Partner Portal: deal mgmt, certification | FSM Marketplace: partner tech assignment | ✅ PartnerPortal exists. ❌ No deal registration, no certification tracking, no MDF |
| **Campaigns & Marketing** | Marketing Cloud Account Engagement (Pardot); email + SMS + multi-touch attribution | Marketing Hub: email, social, ads, workflows, landing pages | Customer Insights (D365 Marketing); AI-powered segments | None (CSM only) | ❌ No marketing module at all |
| **Sentiment / NPS** | Einstein: sentiment analysis on case/email; NPS survey integration | Feedback surveys with NPS tracking | D365 Customer Voice: NPS, CSAT surveys | CSM: satisfaction survey on case close | ❌ Not implemented |

### GuardianFlow Gaps — Module E
1. **CRM Pipeline / Deal Management** — no opportunity tracking at all
2. **Contact org chart and relationship mapping** — critical for enterprise B2B accounts
3. **Auto-log emails and calendar events** to contact/account record
4. **Campaigns & marketing automation** — no marketing module
5. **NPS / CSAT survey** on work order / case close
6. **Partner deal registration and MDF tracking**
7. **Self-service portal with NLP search** and real-time WO tracking
8. **Sentiment analysis** on customer communications

---

## Module F — AI, Analytics & Intelligence

### Leaders Assessed
Salesforce Einstein Analytics, Microsoft Power BI + Copilot Analytics, IBM Cognos Analytics, Tableau (Salesforce), Databricks Lakehouse + AI/BI

### Page-by-Page Comparison: Analytics

| Page / Capability | Salesforce Einstein | MS Power BI + Copilot | IBM Cognos | Tableau | Databricks AI/BI | **GuardianFlow** |
|---|---|---|---|---|---|---|
| **Dashboard / KPI Hub** | Einstein dashboards with AI-narrative summaries; recommended next actions | Power BI Copilot auto-generates dashboard from NLP; custom visuals; embedded in Teams/Outlook | AI-powered KPI discovery; auto-narrative | Pulse dashboards; AI-generated summaries | AI/BI Genie: NLP to dashboard; auto-alerts | ✅ Analytics page. ❌ No AI narrative, no NLP query |
| **Custom Report Builder** | Report builder with AI suggestions; formula fields; cross-object reports | Power BI: drag-drop report builder; Copilot report creation from NLP | Self-service: guided AI report creation | Drag-drop + calculated fields; AI field suggestions | Notebook + BI unified; LLM-driven analysis | ✅ CustomReportBuilder page exists. ❌ No AI suggestions, no NLP |
| **Forecast Centre** | Einstein Forecasting: opportunity + revenue ML forecast | Power BI predictive analytics; Azure ML integration | Cognos Forecasting: time-series AI | Tableau Einstein: AI forecast with confidence bands | Databricks: custom time-series models (Prophet/ARIMA) | ✅ ForecastCenter page. ❌ Sprint 13 adds real forecasting. Still needs confidence bands, scenario comparison |
| **Anomaly Detection** | Einstein AIOps: real-time anomaly on metrics; alert routing | Azure Metrics Advisor: ML anomaly on time series | Anomaly detection in metrics | Tableau Viz Extensions + Einstein | Databricks: ML anomaly on streaming data | ✅ Page exists. ❌ Sprint 23 wires to real API. Still no real-time streaming anomaly |
| **ESG Reporting** | Salesforce Net Zero Cloud: Scope 1/2/3 emissions; CDP/GRI/TCFD reporting | Microsoft Sustainability Manager: emissions tracking; ESG reporting | Cognos: sustainability reports | Tableau: ESG data visualisation | Databricks: ESG data lake | ✅ ESGReporting page. ❌ No Scope 1/2/3 calculation, no CDP/GRI standard templates |
| **NLP Query Interface** | Einstein NLP: ask questions in natural language; auto-viz generation | Copilot in Power BI: "show me revenue by region this quarter" | Cognos Assistant NLP | Ask Data (Tableau) | Databricks AI Genie | ✅ NLPQueryInterface page exists. ❌ Not connected to any real query engine |
| **AutoML Studio** | Einstein Discovery: no-code ML; feature importance; deployment | Azure AutoML | IBM AutoAI | Tableau CRM Einstein Discovery | Databricks AutoML | ✅ AutoMLStudio page. ❌ Only stub; no real training or deployment |
| **Explainability Dashboard** | Einstein Prediction Explainability: SHAP-based | Azure Responsible AI Dashboard | IBM Watson OpenScale: SHAP/LIME | Tableau: model transparency overlay | Databricks MLflow: SHAP integration | ✅ ExplainabilityDashboard page. ❌ No real SHAP computation |
| **LLM Fine-Tuner** | Einstein Studio: custom model training on Salesforce data | Azure AI Studio: fine-tuning OpenAI models on private data | None | None | Databricks: LLM fine-tuning on GPU clusters | ✅ LLMFineTuner page. ❌ Completely stub |

### GuardianFlow Gaps — Module F
1. **NLP-to-dashboard** engine (connect NLPQueryInterface to a real query backend — e.g., text-to-SQL over analytics DB)
2. **Real-time streaming anomaly** detection (Kafka/Flink consumer, not batch query)
3. **Scope 1/2/3 emissions calculation** engine with CDP/GRI report templates for ESG page
4. **Confidence bands and scenario comparison** in Forecast Centre
5. **AutoML real training pipeline** (not stub) — at minimum connect to AutoML in managed cloud (Vertex, Azure AutoML)
6. **SHAP real computation** wired to deployed models

---

## Module G — IoT, Digital Twin & Predictive

### Leaders Assessed
Microsoft Azure IoT / Azure Digital Twins, AWS IoT Core / IoT TwinMaker, PTC ThingWorx 10.0, Siemens MindSphere / Industrial IoT

### Page-by-Page Comparison: IoT / Digital Twin

| Page / Capability | Azure IoT / ADT | AWS IoT / TwinMaker | PTC ThingWorx | Siemens MindSphere | **GuardianFlow** |
|---|---|---|---|---|---|
| **IoT Device Dashboard** | Real-time telemetry; device twin state; anomaly alert; threshold rules; billions of device scale | IoT Core: real-time message routing; SiteWise: OT data context; device shadows | Real-time dashboards; Kepware protocol support (OPC-UA, MQTT, Modbus) | Real-time monitoring; OPC-UA; multi-protocol ingestion | ✅ IoTDashboard pages (workOrders + analytics). ❌ No real device connection, no threshold rules live, no OPC-UA |
| **Digital Twin** | Azure Digital Twins: twin graph with DTDL modelling; real-time simulation; Power BI analytics integration | AWS IoT TwinMaker: 3D scene + real data binding; SageMaker ML on twin data | ThingWorx Twin: low-code twin builder; AR overlay; streaming to Azure OneLake | MindSphere: industrial twin; simulation engine; CAD model import | ✅ DigitalTwin page. ❌ No real twin graph, no 3D model, no simulation — mock data only (Sprint 23 wires API, still no real computation) |
| **Predictive Maintenance** | Azure ML + IoT Hub: anomaly model → maintenance ticket in D365; GE Aviation case: 20% cost reduction | SageMaker + IoT SiteWise: custom ML models on OT data → work order trigger | ThingWorx Analytics: built-in ML; failure prediction → ERP ticket | MindSphere Predictive Services: remaining useful life (RUL) models | ✅ PredictiveMaintenance page. ❌ Sprint 31 adds z-score. Still no RUL model, no ML training on asset data |
| **Threshold → WO Automation** | Event Grid: threshold → Logic App → D365 WO | IoT Events → Lambda → CMMS ticket | ThingWorx Rules Engine: threshold → WO in any integrated system | MindSphere: alert → maintenance notification | ❌ Sprint 31 addresses this. Still not live |
| **AR / Remote Assist** | Dynamics 365 Remote Assist: HoloLens; expert sees technician's view; annotation | AWS Panorama: edge vision; no AR assist native | PTC Vuforia Chalk: AR collaboration; Vuforia Studio: work instructions on asset | Siemens: AR guided maintenance | ❌ Not planned |
| **Edge Computing** | Azure IoT Edge: ML inference at edge; offline operation | AWS Greengrass: edge ML inference | ThingWorx Edge: Kepware edge server | MindSphere Edge | ❌ Not planned |
| **Protocol Support** | MQTT, AMQP, HTTPS; OPC-UA via Industrial IoT | MQTT, HTTPS, LoRaWAN, Zigbee | OPC-UA, Modbus, EtherNet/IP, BACnet via Kepware | OPC-UA, REST, MQTT | ❌ No protocol adapter — only mock device data |

### GuardianFlow Gaps — Module G
1. **Real device connection** via MQTT/AMQP ingestion endpoint (not mock)
2. **Digital twin real computation** — at minimum a JSON-schema twin with real telemetry binding
3. **Remaining Useful Life (RUL)** model — beyond z-score threshold to actual degradation curve fitting
4. **AR Remote Assist** — guided repair via mobile camera + expert annotation (stretch goal)
5. **Edge inference** — ability to run anomaly model on-device without cloud round-trip
6. **Multi-protocol adapter** — OPC-UA and MQTT at minimum for industrial use cases

---

## Module H — AI Governance & Ethics

### Leaders Assessed
IBM watsonx.governance, ModelOp Center, Microsoft Responsible AI tooling, Google Vertex AI Model Registry

### Page-by-Page Comparison: AI Governance

| Page / Capability | IBM watsonx.governance | ModelOp Center | MS Responsible AI | Google Vertex AI | **GuardianFlow** |
|---|---|---|---|---|---|
| **Model Registry** | Centralized registry: all models (IBM + 3rd party); version lineage; risk tier | Single pane: inventory across vendor models + internal; version + owner + risk tier | Azure ML Model Registry; integrated with deployment pipelines | Vertex Model Registry: experiment lineage; A/B traffic split | ✅ AIGovernance page. ❌ Sprint 23 fixes hardcoded seed — but no version lineage, no risk tier classification |
| **Explainability** | SHAP/LIME dashboards; runtime explanations for regulated decisions; AI Factsheets | SHAP integrated; business-readable explanation summaries | Azure Responsible AI Dashboard: SHAP, error analysis, fairness | Vertex Explainable AI: SHAP + integrated gradients | ✅ ExplainabilityDashboard. ❌ No real SHAP — Sprint 21 fixes xai.js but no dashboard binding |
| **Bias & Fairness Audit** | Continuous automated bias scanning; pre-deployment fairness check; corrective action tracking | Automated bias testing in pipeline; audit trail | Fairlearn integration; bias metrics in Responsible AI Dashboard | Vertex: fairness metrics; model evaluation | ✅ AIEthics page. ❌ No real bias metric computation — only placeholder text |
| **Model Performance Monitoring** | Runtime drift detection; accuracy degradation alerts; auto-retrain trigger | Continuous monitoring; auto-decommission trigger | Azure ML monitoring: data drift + model drift alerts | Vertex Model Monitoring: skew + drift + feature distribution | ❌ Not implemented — no production model monitoring |
| **Compliance Documentation** | EU AI Act evidence collection; model cards; regulatory report generation | Self-service compliance docs; audit-ready PDF generation | Responsible AI scorecard | Model cards in Vertex | ❌ Not implemented |
| **Incident Management** | AI incident log; root-cause analysis workflow | Incident tracking per model | None native | None native | ❌ Not implemented |
| **GenAI / LLM Governance** | Extends to LLM: toxicity monitoring, prompt injection detection, hallucination tracking | LLM portfolio governance | Azure AI Content Safety: prompt injection + content filtering | Vertex Model Garden governance; safety filters | ❌ Not implemented — no LLM monitoring |

### GuardianFlow Gaps — Module H
1. **Model risk tier classification** (Low / Medium / High / Prohibited) per EU AI Act categories
2. **Real bias metric computation** (demographic parity, equalised odds) on model outputs
3. **Model performance monitoring** in production (drift detection + accuracy degradation)
4. **Compliance documentation generator** — model card PDF, EU AI Act evidence pack
5. **LLM monitoring** — prompt injection detection, toxicity scoring, hallucination flagging
6. **AI incident management** workflow with root-cause analysis

---

## Module I — Identity, Compliance & Security

### Leaders Assessed
Okta Workforce Identity, Azure Active Directory / Entra ID, Ping Identity, OneTrust (privacy/compliance)

### Page-by-Page Comparison: Identity & Compliance

| Page / Capability | Okta | Azure Entra | Ping Identity | OneTrust | **GuardianFlow** |
|---|---|---|---|---|---|
| **SSO / SAML / OIDC** | 7,000+ app integrations; SAML 2.0, OIDC, OAuth 2.0 | Azure AD SSO; SAML + OIDC; Conditional Access policies | SAML 2.0, OIDC; adaptive authentication | None (compliance only) | ✅ Sprint 16 adds SSO. Needs validation against real enterprise IdPs |
| **SCIM Provisioning** | SCIM 2.0: auto-provision/deprovision users; lifecycle management | Entra SCIM provisioning; HR integration (Workday, SAP) | SCIM 2.0; governance lifecycle | None | ✅ Sprint 16 includes SCIM. ❌ No HR system integration |
| **MFA / Adaptive Auth** | MFA: TOTP, push, biometric; risk-based adaptive auth | MFA + Conditional Access: location, device, risk | Adaptive MFA; device trust | None | ❌ No MFA at all — critical enterprise gap |
| **Privileged Access Management** | Okta PAM: just-in-time access; session recording | Azure PIM: time-bound privileged roles | Ping PAM | None | ❌ Not implemented |
| **GDPR / Data Subject Rights** | None | Microsoft Purview: data subject access request workflow | None | OneTrust DSAR: automated data subject request; consent management; data mapping | ✅ Sprint 17 adds GDPR tools. ❌ No consent management, no automated DSAR workflow |
| **Unified Audit Log** | Okta System Log: all identity events | Azure Monitor + Sentinel: full audit log; SIEM integration | Ping audit log | OneTrust audit trail for consent | ✅ Sprint 17 adds audit log. ❌ No SIEM export, no long-term immutable retention |
| **Data Residency Controls** | Okta: US/EU data residency | Azure: 60+ regions; data residency guarantees; geo-fencing | Ping: on-prem or cloud | OneTrust: data mapping per jurisdiction | ✅ DataResidency page exists. ❌ No actual geo-fencing enforcement in DB queries |
| **SOC 2 / ISO 27001** | SOC 2 Type II; ISO 27001 | SOC 2 Type II; ISO 27001; FedRAMP | SOC 2 Type II | ISO 27001; privacy certifications | ❌ No SOC 2 controls documented or enforced in codebase |

### GuardianFlow Gaps — Module I
1. **MFA** — absolutely critical enterprise gate; currently zero MFA
2. **Privileged Access Management** — just-in-time admin access
3. **Automated DSAR** workflow for GDPR (not just a checkbox)
4. **SIEM export** of audit log (Splunk/Sentinel-compatible format)
5. **Geo-fencing at DB query level** for data residency
6. **SOC 2 Type II controls** documented and enforceable

---

## Module J — Developer Platform, Marketplace & Integration

### Leaders Assessed
Salesforce AppExchange + Heroku, ServiceNow App Engine, MuleSoft (Salesforce), Azure Integration Services, Kong API Gateway

### Page-by-Page Comparison: Developer Platform

| Page / Capability | Salesforce/AppExchange | ServiceNow App Engine | MuleSoft | Azure Integration | Kong Gateway | **GuardianFlow** |
|---|---|---|---|---|---|---|
| **API Gateway / Rate Limiting** | Heroku + Salesforce API; per-app throttling | ServiceNow REST API Explorer; rate limiting | MuleSoft API Manager: policies, SLA tiers, rate limiting | Azure API Management: policies, JWT validation, rate limiting | Kong: plugin-based rate limit, auth, transform | ✅ Per-tenant rate limiting exists. ❌ No policy engine, no SLA tier throttling |
| **Developer Portal** | Trailhead + developer.salesforce.com; sandbox environments | Developer documentation + sandbox | Anypoint Exchange: API catalogue | Azure API Management portal: auto-generated docs | Kong DevPortal: OpenAPI docs | ✅ DeveloperPortal page. ❌ No sandbox environment, no OpenAPI docs (Sprint 33 adds) |
| **Webhooks** | Outbound messages + platform events | Business rules → REST callout | MuleSoft event-driven | Azure Event Grid | Kong webhooks plugin | ✅ Webhooks page. ❌ No retry logic, no delivery guarantee, no signature verification |
| **Low-code / Workflow Builder** | Flow Builder; Apex; Lightning Web Components | Flow Designer (no-code); Scripting | Anypoint Studio: drag-drop API flows | Power Automate | None | ✅ FlowDesigner (DEX) page. ❌ Fully mock, no real workflow execution |
| **Connector Marketplace** | 5,000+ AppExchange listings | ServiceNow Store | Anypoint Exchange: 2,000+ connectors | Azure Marketplace | Kong Hub | ✅ DEXMarketplace + Marketplace pages. ❌ No real connector execution (Sprint 22 adds 3) |
| **SDK / Code Generation** | Salesforce CLI; Apex generator | ServiceNow CLI; PDI | MuleSoft SDK | Azure SDK (Python/JS/C#/.NET) | Kong decK; terraform | ❌ No SDK or CLI for GuardianFlow |
| **OpenAPI / GraphQL** | REST + GraphQL; auto-generated Swagger | REST API; OpenAPI export | OpenAPI first; GraphQL support | OpenAPI + GraphQL | OpenAPI spec management | ✅ Sprint 33 adds OpenAPI. ❌ No GraphQL |

### GuardianFlow Gaps — Module J
1. **Webhook delivery guarantee** — at-least-once delivery with retry, exponential back-off, dead-letter queue
2. **Webhook signature verification** (HMAC-SHA256) — security critical
3. **SDK / CLI** for partner developers to build integrations
4. **GraphQL API** — enterprise integration standard
5. **Sandbox environment** — essential for enterprise developer onboarding
6. **Flow Designer real execution engine** — currently a UI-only mock (DEX)

---

## Gap Summary Table

> Rating scale: ✅ Enterprise-grade | ⚠️ Partial / stub | ❌ Not implemented

| Module | Feature | Rating | Closest Competitor | Sprint Assigned |
|--------|---------|--------|-------------------|-----------------|
| **A — Work Orders** | AI pre-visit brief | ❌ | Salesforce Einstein Copilot, D365 Copilot | Sprint 28 (partial) |
| **A** | Crew / multi-technician WO | ❌ | All leaders | Sprint 34 (new) |
| **A** | Task bundling | ❌ | ServiceNow, D365 RSO | Sprint 34 (new) |
| **A** | Crowd/contractor marketplace WO | ❌ | SAP Crowd, ServiceNow Marketplace | Sprint 35 (new) |
| **A** | Email/chat → WO auto-creation | ❌ | D365 Copilot, Salesforce Agentforce | Sprint 35 (new) |
| **A** | Offline native mobile app | ❌ | All leaders | Sprint 36 (new) |
| **B — Scheduling** | Gantt with travel-time overlay | ❌ | IFS PSO, D365 RSO | Sprint 34 (new) |
| **B** | Territory planning | ❌ | ServiceNow, Salesforce, D365 | Sprint 34 (new) |
| **B** | Capacity & demand forecasting | ❌ | IFS PSO, Oracle, ServiceNow | Sprint 35 (new) |
| **B** | Multi-day scheduling | ❌ | ServiceNow Pro, D365, IFS | Sprint 35 (new) |
| **C — Assets** | Asset dependency graph (CMDB-style) | ❌ | ServiceNow CMDB | Sprint 36 (new) |
| **C** | Compliance certificate tracking | ❌ | IFS EAM, SAP PM | Sprint 36 (new) |
| **C** | Truck stock / mobile inventory | ❌ | IFS, SAP, Oracle | Sprint 36 (new) |
| **C** | Serialised inventory | ❌ | D365, IFS, SAP | Sprint 36 (new) |
| **C** | Supplier portal + 3-way match | ❌ | SAP Ariba, Oracle Procurement | Sprint 37 (new) |
| **D — Finance** | Accounts Payable module | ❌ | SAP, Oracle, Workday | Sprint 37 (new) |
| **D** | Parallel ledger (IFRS + GAAP) | ❌ | SAP, Oracle, Workday | Sprint 37 (new) |
| **D** | Intercompany / consolidation | ❌ | SAP, Oracle, Workday | Sprint 38 (new) |
| **D** | Fixed assets & depreciation | ❌ | SAP, Oracle, NetSuite | Sprint 38 (new) |
| **D** | Global e-invoicing (Peppol, CFDI) | ❌ | SAP, Oracle | Sprint 38 (new) |
| **D** | Expense management | ❌ | SAP Concur, Oracle Expense, Workday | Sprint 38 (new) |
| **D** | ASC 606 / IFRS 15 revenue engine | ❌ | SAP RAR, Oracle, Workday | Sprint 37 (partial) |
| **E — CRM** | Pipeline / Deal Management | ❌ | Salesforce, HubSpot, D365 | Sprint 39 (new) |
| **E** | Contact org chart + auto email log | ❌ | Salesforce, HubSpot | Sprint 39 (new) |
| **E** | Marketing automation | ❌ | Salesforce Marketing Cloud, HubSpot | Sprint 39 (new) |
| **E** | NPS / CSAT survey on WO close | ❌ | Salesforce, ServiceNow CSM | Sprint 39 (new) |
| **F — Analytics** | NLP-to-dashboard query engine | ❌ | Copilot in Power BI, Einstein | Sprint 40 (new) |
| **F** | Streaming anomaly detection | ❌ | Databricks, Azure Metrics Advisor | Sprint 40 (new) |
| **F** | ESG Scope 1/2/3 engine | ❌ | Salesforce Net Zero, MS Sustainability | Sprint 40 (new) |
| **G — IoT** | Real MQTT device ingestion | ❌ | Azure IoT, AWS IoT, ThingWorx | Sprint 41 (new) |
| **G** | Digital twin real computation | ❌ | Azure ADT, AWS TwinMaker, PTC | Sprint 41 (new) |
| **G** | Remaining Useful Life (RUL) model | ❌ | ThingWorx Analytics, MindSphere | Sprint 41 (new) |
| **H — AI Gov** | Model risk tier + EU AI Act | ❌ | IBM watsonx, ModelOp | Sprint 42 (new) |
| **H** | LLM monitoring (toxicity, hallucination) | ❌ | IBM watsonx, Azure AI Content Safety | Sprint 42 (new) |
| **I — Identity** | MFA (TOTP / Push) | ❌ | Okta, Azure Entra | Sprint 34 (new) |
| **I** | SIEM export of audit log | ❌ | Okta, Azure Sentinel | Sprint 42 (new) |
| **J — DevPlatform** | Webhook HMAC + retry guarantee | ❌ | Salesforce, MuleSoft, Kong | Sprint 40 (new) |
| **J** | Sandbox / tenant isolation for developers | ❌ | Salesforce, ServiceNow | Sprint 41 (new) |
| **J** | SDK / CLI for partners | ❌ | All platforms | Sprint 42 (new) |

---

## Net-New Sprint Items for Build Plan

> These map directly to Phases 12–14 in `GAP_FIX_BUILD_PLAN.md`.
> All gaps above that are not yet covered by Sprints 1–33 require new sprints.

### Phase 12 — Enterprise FSM Parity (Sprints 34–36)
Closes the gaps identified in Modules A, B, and C that separate mid-market FSM from enterprise FSM grade.

**Sprint 34** — Crew WO + Gantt Dispatch + MFA + Territory Planning
**Sprint 35** — Crowd Marketplace WO + Email→WO + Capacity Forecasting + Multi-day WO
**Sprint 36** — Mobile PWA Offline + Asset CMDB Graph + Truck Stock + Compliance Certs

### Phase 13 — Financial & CRM Enterprise Grade (Sprints 37–39)
Closes Modules D and E gaps.

**Sprint 37** — Accounts Payable + Supplier Portal + ASC 606 Engine
**Sprint 38** — Intercompany Consolidation + Fixed Assets + Global e-Invoicing + Expense Management
**Sprint 39** — CRM Pipeline + Contact Org Chart + NPS/CSAT + Marketing Automation (light)

### Phase 14 — Platform Intelligence & Standards (Sprints 40–42)
Closes Modules F, G, H, I (partial), J gaps.

**Sprint 40** — NLP-to-SQL Analytics + Streaming Anomaly + ESG Engine + Webhook HMAC/Retry
**Sprint 41** — Real MQTT Ingestion + Digital Twin Computation + RUL Model + Dev Sandbox
**Sprint 42** — EU AI Act Governance + LLM Monitoring + Model Risk Tiers + SIEM Export + SDK CLI

---

*Last updated: 2026-04-11 | Source: Live market research against ServiceNow, Salesforce, D365, IFS, SAP, Oracle, Workday, IBM watsonx, Azure IoT, PTC ThingWorx*
