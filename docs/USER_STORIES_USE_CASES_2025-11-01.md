# Guardian Flow - User Stories & Use Cases

**Version:** 6.1.0  
**Date:** November 1, 2025  
**Document Type:** User Stories & Use Cases  
**Status:** Production Ready

---

## Table of Contents
1. [Operations Manager Stories](#operations-manager-stories)
2. [Finance Manager Stories](#finance-manager-stories)
3. [Compliance Officer Stories](#compliance-officer-stories)
4. [Fraud Investigator Stories](#fraud-investigator-stories)
5. [Technician Stories](#technician-stories)
6. [System Administrator Stories](#system-administrator-stories)
7. [Developer Stories](#developer-stories)
8. [Partner Administrator Stories](#partner-administrator-stories)

---

## Operations Manager Stories

### US-OP-001: Create and Assign Work Order
**As an** Operations Manager  
**I want to** create work orders and automatically assign them to available technicians  
**So that** I can ensure rapid response to customer requests

**Acceptance Criteria:**
- ✅ Can create work order with customer, equipment, and service details
- ✅ System suggests optimal technician based on skills, location, and availability
- ✅ Work order is instantly visible to assigned technician
- ✅ SLA countdown begins automatically upon creation
- ✅ Customer receives automated notification

**Priority:** Critical  
**Story Points:** 5  
**Dependencies:** Technician availability system, geolocation services

---

### US-OP-002: Monitor SLA Compliance in Real-Time
**As an** Operations Manager  
**I want to** view a real-time dashboard of SLA compliance across all work orders  
**So that** I can proactively prevent SLA breaches

**Acceptance Criteria:**
- ✅ Dashboard shows work orders approaching SLA deadline (< 2 hours remaining)
- ✅ Color-coded indicators (green/yellow/red) based on time remaining
- ✅ Can filter by severity, technician, location, or customer
- ✅ Receives alerts when work order enters "at-risk" status
- ✅ Historical SLA performance trends visible

**Priority:** High  
**Story Points:** 8  
**Dependencies:** SLA monitoring edge function, real-time data sync

---

### US-OP-003: Dispatch Technician with Route Optimization
**As an** Operations Manager  
**I want to** dispatch multiple technicians with optimized routes  
**So that** I can minimize travel time and maximize productivity

**Acceptance Criteria:**
- ✅ Can select multiple work orders and assign to technicians
- ✅ System calculates optimal route considering traffic and priority
- ✅ Route is visible on map with estimated travel times
- ✅ Technicians receive turn-by-turn navigation on mobile app
- ✅ Can re-optimize routes dynamically if new urgent work order arrives

**Priority:** High  
**Story Points:** 13  
**Dependencies:** Route optimization API, Google Maps integration

---

### US-OP-004: Generate Operational Performance Reports
**As an** Operations Manager  
**I want to** generate weekly/monthly performance reports  
**So that** I can track KPIs and identify improvement opportunities

**Acceptance Criteria:**
- ✅ Reports include: completed work orders, SLA compliance, technician utilization
- ✅ Can export reports as PDF or Excel
- ✅ Can schedule automated report generation and email delivery
- ✅ Drill-down capability to view individual work order details
- ✅ Year-over-year comparison available

**Priority:** Medium  
**Story Points:** 5  
**Dependencies:** Analytics aggregation functions

---

## Finance Manager Stories

### US-FIN-001: Automated Penalty Calculation
**As a** Finance Manager  
**I want** penalties to be automatically calculated based on SLA breaches  
**So that** I can ensure accurate billing without manual intervention

**Acceptance Criteria:**
- ✅ Penalty rules are configurable per contract/customer
- ✅ Penalties are calculated automatically when SLA is breached
- ✅ Penalty amounts are visible on work order and invoice
- ✅ Complete audit trail of penalty calculations
- ✅ Disputes can be raised and tracked

**Priority:** Critical  
**Story Points:** 8  
**Dependencies:** Contract management, SLA monitoring

---

### US-FIN-002: Generate Accurate Invoices
**As a** Finance Manager  
**I want to** generate invoices that include labor, parts, penalties, and taxes  
**So that** customers receive accurate billing

**Acceptance Criteria:**
- ✅ Invoice includes breakdown of all charges
- ✅ Multi-currency support with real-time exchange rates
- ✅ Tax calculations based on customer location
- ✅ Can apply discounts or adjustments
- ✅ Invoice generation triggers email notification to customer

**Priority:** Critical  
**Story Points:** 8  
**Dependencies:** Exchange rate API, tax calculation service

---

### US-FIN-003: Revenue Forecasting Dashboard
**As a** Finance Manager  
**I want to** view AI-generated revenue forecasts for next 30/60/90 days  
**So that** I can make informed financial decisions

**Acceptance Criteria:**
- ✅ Forecasts generated using historical data and ML models
- ✅ Confidence intervals shown (e.g., 80% confidence: $X - $Y)
- ✅ Can filter by customer, service type, or region
- ✅ Forecasts updated daily with new data
- ✅ Actual vs. forecast comparison available

**Priority:** High  
**Story Points:** 13  
**Dependencies:** Forecast engine, ML model training

---

### US-FIN-004: Handle Billing Disputes
**As a** Finance Manager  
**I want to** track and resolve billing disputes with complete audit trails  
**So that** I can maintain customer trust and financial accuracy

**Acceptance Criteria:**
- ✅ Can create dispute record linked to invoice
- ✅ All dispute communications logged with timestamps
- ✅ Can adjust invoice amounts with justification
- ✅ Dispute resolution triggers re-calculation and credit memo
- ✅ Complete history visible for audit purposes

**Priority:** High  
**Story Points:** 8  
**Dependencies:** Dispute management system, audit logs

---

## Compliance Officer Stories

### US-COMP-001: Conduct Quarterly Access Reviews
**As a** Compliance Officer  
**I want to** launch automated quarterly access review campaigns  
**So that** I can ensure users have appropriate permissions

**Acceptance Criteria:**
- ✅ Can create access review campaign for specific scope (tenant/role/global)
- ✅ Review items automatically generated for all active user roles
- ✅ Reviewers receive email notifications with review tasks
- ✅ Pending reviews automatically revoked after 30 days
- ✅ Campaign completion report includes all decisions and justifications

**Priority:** Critical  
**Story Points:** 13  
**Dependencies:** Access review edge function, email notifications

---

### US-COMP-002: Collect Compliance Evidence
**As a** Compliance Officer  
**I want to** automatically collect evidence for SOC 2 and ISO 27001 controls  
**So that** I can prepare for external audits efficiently

**Acceptance Criteria:**
- ✅ Evidence collected for access control, MFA, audit logs, training, vulnerabilities
- ✅ Can generate evidence package for specific framework (SOC 2/ISO 27001)
- ✅ Evidence includes metadata: collection method, date, status
- ✅ Evidence exported as JSON or PDF report
- ✅ Compliance score calculated based on available evidence

**Priority:** Critical  
**Story Points:** 13  
**Dependencies:** Evidence collector function, audit log archive

---

### US-COMP-003: Monitor Vulnerability Remediation SLAs
**As a** Compliance Officer  
**I want to** track vulnerability remediation against SLA targets  
**So that** I can ensure timely patching of security issues

**Acceptance Criteria:**
- ✅ Dashboard shows open vulnerabilities by severity
- ✅ SLA countdown visible for each vulnerability (Critical: 24h, High: 7d, etc.)
- ✅ Alerts sent when SLA is approaching (80% time elapsed)
- ✅ Can view patch deployment history
- ✅ SLA compliance rate calculated and trended over time

**Priority:** High  
**Story Points:** 8  
**Dependencies:** Vulnerability management system

---

### US-COMP-004: Review Immutable Audit Logs
**As a** Compliance Officer  
**I want to** access 7-year audit log archives with tamper-proof verification  
**So that** I can prove data integrity to auditors

**Acceptance Criteria:**
- ✅ Can query audit logs from current and archive tables (2025-2031)
- ✅ Tamper-proof hash verification for archived logs
- ✅ Can filter by user, action, resource type, date range
- ✅ Can export audit logs for specific period as encrypted file
- ✅ Audit log queries themselves are logged for accountability

**Priority:** Critical  
**Story Points:** 8  
**Dependencies:** Audit log archive, hash verification function

---

## Fraud Investigator Stories

### US-FRAUD-001: Detect Document Forgery
**As a** Fraud Investigator  
**I want** AI to automatically detect forged documents (photos, invoices)  
**So that** I can prevent fraudulent claims

**Acceptance Criteria:**
- ✅ Uploaded documents automatically scanned for forgery indicators
- ✅ Forgery score (0-100) displayed with confidence level
- ✅ Flagged documents routed to manual review queue
- ✅ Can provide feedback to improve ML model accuracy
- ✅ Historical accuracy metrics visible (precision, recall, F1-score)

**Priority:** Critical  
**Story Points:** 13  
**Dependencies:** Forgery detection ML model, image processing pipeline

---

### US-FRAUD-002: Investigate Anomalous Behavior
**As a** Fraud Investigator  
**I want to** view users with anomalous behavior patterns  
**So that** I can identify potential insider threats

**Acceptance Criteria:**
- ✅ Dashboard shows users with anomaly scores > 70%
- ✅ Anomaly factors explained (unusual login time, location, actions)
- ✅ Can drill into user's complete activity timeline
- ✅ Can flag user for monitoring or escalate to security team
- ✅ False positives can be marked to improve detection accuracy

**Priority:** High  
**Story Points:** 13  
**Dependencies:** Anomaly detection system, user behavior tracking

---

### US-FRAUD-003: Manage Fraud Cases
**As a** Fraud Investigator  
**I want to** create and track fraud investigation cases  
**So that** I can document findings and coordinate with legal team

**Acceptance Criteria:**
- ✅ Can create case with suspect, evidence, and timeline
- ✅ Can attach documents, photos, and transaction records
- ✅ Case status tracked (open, investigating, closed, escalated)
- ✅ All case actions logged with timestamps and investigators
- ✅ Can generate case summary report for legal review

**Priority:** High  
**Story Points:** 8  
**Dependencies:** Case management system, document storage

---

## Technician Stories

### US-TECH-001: View and Accept Work Orders on Mobile
**As a** Technician  
**I want to** view assigned work orders on my mobile device  
**So that** I can see job details and navigate to customer location

**Acceptance Criteria:**
- ✅ Work orders visible in mobile app sorted by priority
- ✅ Can view customer info, equipment details, service history
- ✅ "Navigate" button launches GPS navigation to customer site
- ✅ Can accept, start, or decline work order
- ✅ Offline mode allows viewing cached work orders without network

**Priority:** Critical  
**Story Points:** 8  
**Dependencies:** Mobile app, offline sync capability

---

### US-TECH-002: Capture Photos and Upload to Work Order
**As a** Technician  
**I want to** capture photos of equipment/damage and attach to work order  
**So that** I can document work performed

**Acceptance Criteria:**
- ✅ Can capture photos using device camera
- ✅ Photos automatically geotagged and timestamped
- ✅ Photos uploaded to work order when network available
- ✅ Photo validation checks for forgery (metadata tampering)
- ✅ Can add captions/notes to photos

**Priority:** High  
**Story Points:** 5  
**Dependencies:** Photo capture component, forgery detection

---

### US-TECH-003: Mark Work Order Complete
**As a** Technician  
**I want to** mark work order as complete with service summary  
**So that** operations team knows job is finished

**Acceptance Criteria:**
- ✅ Can enter completion notes and service summary
- ✅ Can record parts used from inventory
- ✅ Can capture customer signature (optional)
- ✅ Work order status changes to "completed"
- ✅ Customer receives automated service completion notification

**Priority:** Critical  
**Story Points:** 5  
**Dependencies:** Work order status management

---

## System Administrator Stories

### US-ADMIN-001: Manage User Roles and Permissions
**As a** System Administrator  
**I want to** assign and revoke user roles with audit trails  
**So that** I can control access to sensitive data

**Acceptance Criteria:**
- ✅ Can assign one or more roles to a user (8 role types)
- ✅ Role assignments logged in audit trail
- ✅ Can view user's current roles and permission matrix
- ✅ Can bulk-assign roles to multiple users
- ✅ Role changes trigger email notification to user

**Priority:** Critical  
**Story Points:** 5  
**Dependencies:** RBAC system, user roles table

---

### US-ADMIN-002: Grant Just-In-Time (JIT) Privileged Access
**As a** System Administrator  
**I want to** grant temporary elevated privileges with auto-expiration  
**So that** I can provide time-bound access for specific tasks

**Acceptance Criteria:**
- ✅ Can grant elevated role with justification and expiration time
- ✅ Approval workflow for sensitive roles (sys_admin)
- ✅ Access automatically revoked when expiration time reached
- ✅ Complete audit trail of temporary access grants
- ✅ Can manually revoke before expiration if needed

**Priority:** High  
**Story Points:** 8  
**Dependencies:** Temporary access grants table, scheduler

---

### US-ADMIN-003: Monitor System Health
**As a** System Administrator  
**I want to** view real-time system health metrics  
**So that** I can proactively address performance issues

**Acceptance Criteria:**
- ✅ Dashboard shows edge function performance (p50, p95, p99 latency)
- ✅ Database connection pool utilization visible
- ✅ API gateway rate limit consumption tracked
- ✅ Security alerts displayed with severity indicators
- ✅ Can acknowledge or dismiss alerts

**Priority:** High  
**Story Points:** 8  
**Dependencies:** System health monitoring, telemetry collection

---

## Developer Stories

### US-DEV-001: Access Comprehensive API Documentation
**As a** Developer  
**I want to** access interactive API documentation  
**So that** I can integrate Guardian Flow with external systems

**Acceptance Criteria:**
- ✅ Documentation includes endpoints, methods, parameters, responses
- ✅ Can test API calls directly from documentation (Swagger/OpenAPI)
- ✅ Code examples provided in multiple languages (curl, Python, JavaScript)
- ✅ Authentication methods clearly explained
- ✅ Rate limits and error codes documented

**Priority:** High  
**Story Points:** 5  
**Dependencies:** API documentation generation tool

---

### US-DEV-002: Create Webhooks for Event Notifications
**As a** Developer  
**I want to** register webhook endpoints to receive event notifications  
**So that** I can automate workflows based on platform events

**Acceptance Criteria:**
- ✅ Can register webhook URL for specific event types
- ✅ Webhooks fire on events: work_order_created, invoice_generated, etc.
- ✅ Webhook delivery retried on failure (exponential backoff)
- ✅ Can view webhook delivery logs and success rates
- ✅ Can test webhooks with sample payloads

**Priority:** High  
**Story Points:** 13  
**Dependencies:** Webhook delivery system, event system

---

### US-DEV-003: Deploy Extension to Marketplace
**As a** Developer  
**I want to** publish extensions to the Guardian Flow marketplace  
**So that** other tenants can install and use my integrations

**Acceptance Criteria:**
- ✅ Can upload extension package with manifest
- ✅ Extension undergoes security review before publication
- ✅ Can set pricing (free, one-time, subscription)
- ✅ Extension appears in marketplace with description and screenshots
- ✅ Can view installation count and user ratings

**Priority:** Medium  
**Story Points:** 13  
**Dependencies:** Marketplace infrastructure, payment processing

---

## Partner Administrator Stories

### US-PARTNER-001: Onboard New Partner Organization
**As a** Partner Administrator  
**I want to** onboard new partner organizations with isolated data  
**So that** I can scale service delivery network

**Acceptance Criteria:**
- ✅ Can create new partner tenant with company details
- ✅ Partner receives welcome email with login credentials
- ✅ Partner data is fully isolated from other tenants
- ✅ Can configure partner-specific SLAs and pricing
- ✅ Partner appears in partner directory

**Priority:** High  
**Story Points:** 8  
**Dependencies:** Multi-tenant architecture, partner onboarding function

---

### US-PARTNER-002: Track Partner Performance
**As a** Partner Administrator  
**I want to** view partner performance scorecards  
**So that** I can identify high/low performing partners

**Acceptance Criteria:**
- ✅ Scorecard includes: work orders completed, SLA compliance, customer ratings
- ✅ Can compare partners side-by-side
- ✅ Can filter by time period (week, month, quarter)
- ✅ Can export scorecard as PDF for partner review
- ✅ Automated alerts if partner falls below performance threshold

**Priority:** Medium  
**Story Points:** 8  
**Dependencies:** Partner analytics aggregation

---

## Use Case Flows

### UC-001: End-to-End Work Order Lifecycle

**Actors:** Customer, Operations Manager, Technician, Finance Manager

**Flow:**
1. Customer submits service request via portal
2. System creates work order and assigns technician based on availability
3. Technician receives notification and accepts work order
4. Technician navigates to customer site using GPS
5. Technician completes service and captures photos
6. Technician marks work order complete
7. System calculates labor + parts cost
8. System checks SLA compliance and calculates penalties if breached
9. Invoice generated and sent to customer
10. Payment received and reconciled

**Success Criteria:** Work order completed within SLA, accurate invoice, customer satisfied

---

### UC-002: Compliance Audit Evidence Collection

**Actors:** Compliance Officer, External Auditor

**Flow:**
1. Compliance officer initiates evidence collection via dashboard
2. System queries audit logs, access reviews, training records, vulnerabilities
3. Evidence package generated with tamper-proof hashes
4. Compliance officer exports evidence as encrypted PDF
5. External auditor reviews evidence and verifies integrity
6. System generates compliance score report

**Success Criteria:** 100% evidence coverage, auditor verification passed

---

### UC-003: Fraud Investigation Workflow

**Actors:** Fraud Investigator, Technician, System Administrator

**Flow:**
1. System detects anomalous photo upload (forgery score > 85%)
2. Photo flagged and work order routed to fraud review queue
3. Fraud investigator opens investigation case
4. Investigator reviews technician's history and behavior patterns
5. Investigator marks photo as fraudulent and revokes work order payment
6. System administrator suspends technician account
7. Incident logged and case closed

**Success Criteria:** Fraud detected and prevented, accurate audit trail maintained

---

**Document Maintenance:**
- Review quarterly and update with new user stories
- Mark completed stories with ✅
- Archive deprecated stories to separate document
