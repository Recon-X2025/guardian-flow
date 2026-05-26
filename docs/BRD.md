# Guardian Flow — Business Requirements Document (BRD)

**Version:** 7.0  
**Date:** May 2026  
**Status:** Approved for implementation planning — aligned with v6.1 architecture  

---

## 1. Executive Summary

### 1.1 Project Vision
Guardian Flow is designed as a modular, multi-tenant enterprise Field Service Management (FSM) platform with full Platform-as-a-Service (PaaS) capabilities. The goal is to deliver a robust, highly secure, and regulatory-compliant FSM platform that serves as a cost-effective, developer-extensible alternative to market leaders like ServiceNow FSM, Salesforce Field Service, and Microsoft Dynamics 365.

### 1.2 Problem Statement
Enterprise organizations managing large-scale physical assets and field forces face several business challenges:
* **High Total Cost of Ownership (TCO):** Licensing and customization for legacy systems like ServiceNow or Salesforce are prohibitively expensive.
* **Complex Regulatory Compliance:** Sectors such as utilities, healthcare, and finance require immutable audit trails (such as SOC 2 and GDPR) and data residency guarantees.
* **Execution and AI Untrustworthiness:** Existing systems lack auditable history for automated or AI-assisted operational decisions.
* **Integration Friction:** Legacy systems are difficult to customize, lack open API gateways for partner ecosystems, and require proprietary languages (e.g., Salesforce Apex).

### 1.3 Proposed Solution
Guardian Flow addresses these challenges by introducing:
1. **FlowSpace Decision Ledger:** An append-only, tenant-isolated ledger for all critical operational and AI-driven decisions, ensuring absolute auditability.
2. **DEX ExecutionContext:** A formal, state-machine-driven workflow engine that tracks the lineage of work orders and operations.
3. **PaaS Developer Framework:** A built-in API gateway, developer console, serverless functions, and marketplace that allows organizations and partners to extend the platform using standard web technology (React, Node.js, and REST APIs).
4. **Hybrid Database Architecture:** Native support for both MongoDB and PostgreSQL via a unified database abstraction layer, offering deployment flexibility.

---

## 2. Business Objectives & ROI Model

### 2.1 Primary Business Objectives
* **Reduce Legacy License Spending:** Achieve a cost reduction of 50-70% compared to ServiceNow or Salesforce FSM.
* **Enhance Dispatcher Efficiency:** Increase the ratio of managed field technicians per dispatcher from 20:1 to 50:1 through assisted scheduling and route optimization.
* **Minimize SLA Penalty Costs:** Predict SLA breaches before they occur and automatically trigger emergency rescheduling.
* **Reduce Fraud & Operational Inaccuracies:** Flag billing discrepancies, technician identity forgery, and duplicate work orders using automated anomalies checking.

### 2.2 ROI Projections (Based on 500-Technician Enterprise Deployment)

| Metric | Pre-Implementation | Post-Implementation | Expected Business Value |
|---|---|---|---|
| **Average Travel Time** | 45 minutes / job | 32 minutes / job | 28% reduction in fuel and vehicle wear |
| **SLA Penalty Costs** | $120,000 / year | $18,000 / year | 85% savings on operational SLA breaches |
| **Audit Preparation Time** | 3 weeks / audit | 2 hours (automated) | Near-zero overhead for SOC 2 / ISO 27001 data gathering |
| **Billing Disputes** | 4.2% of invoices | < 0.8% of invoices | Accelerated cash conversion cycle (Days Sales Outstanding) |

---

## 3. Market Analysis & Competitive Landscape

### 3.1 Competitive Positioning

Guardian Flow targets the enterprise FSM market, positioning itself as a secure, developer-first platform.

```
       High Customizability / PaaS
                 ▲
                 │     
                 │       ┌──────────────────────┐
                 │       │    GUARDIAN FLOW     │
                 │       └──────────────────────┘
                 │
                 │       ┌──────────────────────┐
                 │       │   ServiceNow / SFDC  │
                 │       └──────────────────────┘
                 │
─────────────────┼─────────────────────────────────► Low Cost
                 │
                 │       ┌──────────────────────┐
                 │       │   Traditional FSMs   │
                 │       │   (IFS, SAP FSM)     │
                 │       └──────────────────────┘
                 │
                 ▼
        Rigid / Out-of-the-box Only
```

### 3.2 Key Competitive Differentiators
* **FlowSpace Ledger:** Unlike competitors, Guardian Flow records all AI agent decisions, prompt histories, and critical manual overrides in an immutable database ledger.
* **White-Label PaaS Capability:** Native multi-tenant isolation allows partners to launch their own branded instances of the platform.
* **Database Agnosticism:** Deployable on on-premise PostgreSQL clusters or MongoDB Atlas Cloud.

---

## 4. Stakeholder & User Personas

The system must support the business goals of the following roles:

1. **Operations Manager (`ops_manager`):** Needs executive visibility into operational metrics, technician performance, and SLA compliance.
2. **Dispatcher (`dispatcher`):** Needs map-based dispatch, automated scheduling suggestions, and a real-time conflict-free routing system.
3. **Field Technician (`technician`):** Requires mobile work order checklists, photo upload/validation, parts consumption, and digital signatures.
4. **Finance Manager (`finance_manager`):** Responsible for invoices, payment tracking, dispute resolution, general ledger entries, and vendor payouts.
5. **Fraud Investigator (`fraud_investigator`):** Analyzes compliance alerts, statistical anomalies (z-score breaches), and image forgery reports.
6. **Tenant Administrator (`tenant_admin`):** Configures rules, RBAC permissions, and integrations for their own tenant organization.
7. **System Administrator (`sys_admin`):** Full system access to configure global platform settings, monitor system health, and manage tenant licensing.
8. **Partner Developer / Independent Software Vendor (ISV):** Builds customized extensions and utilizes the Developer Console to integrate external services.
9. **Customer (`customer`):** Books service requests, tracks technicians in real-time, views quotes/invoices, and files support tickets.

---

## 5. Functional Scope & Business Requirements

### 5.1 Field Service Management (FSM Core)
* **Work Order Orchestration:** Support creation, status progression (Draft → Assigned → In Progress → Pending Validation → Completed → Closed), and soft-deletes.
* **Technician Dispatch & Routing:** Maintain technician profile database detailing skills, certifications, and availability. Optimize technician travel route based on location and proximity.
* **Parts & Equipment Lifecycle:** Track equipment serial numbers, customer warranties, and parts inventory levels. Provide alerts when warehouse stock falls below minimum thresholds.

### 5.2 Financial Management
* **Revenue Cycle Management:** Auto-generate invoices upon work order completion. Support billing validation and disputes.
* **General Ledger & Double-Entry Accounting:** Auto-post financial activities (payments, invoice credits, penalty accruals) to the general ledger, separating entries by tenant.
* **Payment Gateways:** Support secure transactions using Stripe, PayPal, or Razorpay integration.

### 5.3 AI and Machine Learning Capabilities
* **Statistical Anomaly Detection:** Compute mathematical z-scores for operational duration (flagging slow tasks) and financial values (flagging billing anomalies).
* **AI Assistance & RAG Search:** Allow operators to search the knowledge base using natural language. Support automated summaries for long work order histories.
* **AI Image Forensics (Fraud/Tamper Detection):** Examine photos uploaded by technicians to detect editing, metadata tampering, or duplicate submissions.

### 5.4 Platform Security & Immutable Auditing
* **Immutable Audit Trail:** Log all critical system events (such as configuration changes or privilege escalation) to a read-only partition. Keep logs for 7 years to satisfy regulatory audits.
* **Role-Based Access Control (RBAC):** Restrict capabilities based on 11 distinct system roles. enforce multi-tenant separation so users can never access data belonging to another tenant.

### 5.5 PaaS and Developer Portal
* **Open API Gateway:** Provide API key management, usage monitoring, and rate limiting (e.g., 1,000 calls per day for sandboxes).
* **Webhooks & Extensions:** Broadcast events (e.g., `work_order.completed`) to third-party endpoints. Host a Marketplace where tenants can toggle modules.

---

## 6. Non-Functional Requirements (Business Perspective)

### 6.1 Data Governance & Residency
* The platform must dynamically enforce data residency. Data belonging to a European tenant must be queried and stored in European instances, and Indian tenant data in Indian instances.
* Support regulatory standards such as GDPR, including workflows for Data Subject Access Requests (DSAR) and Right-to-be-Forgotten data deletion.

### 6.2 Compliance Targets
* **SOC 2 Type II:** Fully document and enforce security controls (MFA, encryption at rest, secure CI/CD pipelines, change management) by Q4 2026.
* **ISO 27001:** Standardize Information Security Management System (ISMS) processes by Q1 2027.

### 6.3 Reliability & Availability
* Core API uptime of **99.9%** (excluding planned maintenance).
* System response time of **< 300 ms** for core database list queries (P95 metrics).

---

## 7. Business Monetization & License Model

Guardian Flow utilizes a hybrid monetization strategy to scale revenue across different target customer segments:

```
                  ┌─────────────────────────────────────────┐
                  │          GUARDIAN FLOW REVENUE          │
                  └────────────────────┬────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   SaaS Licenses  │          │   PaaS Gateways  │          │  App Marketplace │
│ Per seat/month   │          │ Overage charges  │          │ 15-20% commission│
│ Tiered feature   │          │  per API call    │          │ on partner apps  │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

1. **SaaS Seat Licensing:** 
   * *Standard User Seat:* $25/user/month (Technicians, Agents).
   * *Professional/Manager Seat:* $65/user/month (Dispatchers, Financial managers, Fraud investigators).
   * *Tenant Admin Seat:* $120/user/month (Full configuration, SSO/MFA toggles).
2. **PaaS API Quota Monetization:** 
   * Tenants receive 10,000 free API gateway transactions/month.
   * Overage charges are billed at $0.05 per API call. Custom serverless functions execution billed based on compute duration.
3. **Marketplace Commissions:** 
   * External developers can list specialized custom modules on the marketplace.
   * Guardian Flow collects a **15% commission** on all subscription transactions handled through the marketplace platform.

---

## 8. Development Roadmap

To bridge the gap between current parity (~37%) and full enterprise readiness, development is structured in the following roadmap:

### Phase 12 — Enterprise FSM Parity (Sprints 34–36)
* **Goal:** Enable multi-technician management, offline capabilities, and field resource coordination.
* **Key Requirements:** Crew scheduling, drag-and-drop Gantt Dispatch Board, PWA mobile offline support, and technician truck inventory tracking.

### Phase 13 — Financial Hardening (Sprints 37–39)
* **Goal:** Integrate Accounts Payable and ASC 606 revenue compliance.
* **Key Requirements:** 3-way invoice matching, supplier portals, and revenue recognition engines.

### Phase 14 — Platform Intelligence & Standards (Sprints 40–42)
* **Goal:** Implement advanced developer standards, real-world data connections, and legal compliance structures.
* **Key Requirements:** Real MQTT ingestion for IoT devices, digital twin telemetry binding, EU AI Act compliance scorecards, and external SIEM integrations (Splunk/Datadog).

---
*Document compiled May 2026. Approved by Product & Engineering Leadership.*
