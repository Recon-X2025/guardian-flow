# Guardian Flow — User Stories

**Version:** 1.0  
**Date:** 2026-04-13  
**Platform Parity:** ~75% (post Gate 3 + stub-fix release)  
**Reference Build:** HEAD `19080a5` — `copilot/sprint-29-through-52`

> Stories are written as: **As a [persona], I want [goal] so that [benefit].**  
> Acceptance criteria are listed under each story.  
> Stories marked ⚠️ have a known implementation gap documented in `BUILD_REPORT.md`.

---

## Table of Contents

1. [Authentication & Identity](#1-authentication--identity)
2. [Organisation Management Console (MAC)](#2-organisation-management-console-mac)
3. [Field Service Management — Work Orders](#3-field-service-management--work-orders)
4. [Scheduling & Dispatch](#4-scheduling--dispatch)
5. [Asset Management & Predictive Maintenance](#5-asset-management--predictive-maintenance)
6. [IoT Telemetry & Digital Twins](#6-iot-telemetry--digital-twins)
7. [CRM — Accounts, Contacts & Leads](#7-crm--accounts-contacts--leads)
8. [CRM — Pipeline & Deals](#8-crm--pipeline--deals)
9. [CRM — Calendar & Email Sync](#9-crm--calendar--email-sync)
10. [Financial — General Ledger & Journals](#10-financial--general-ledger--journals)
11. [Financial — Invoicing & Payments](#11-financial--invoicing--payments)
12. [Financial — Revenue Recognition (ASC 606)](#12-financial--revenue-recognition-asc-606)
13. [Financial — Subscription & Recurring Billing](#13-financial--subscription--recurring-billing)
14. [Financial — Tax Engine](#14-financial--tax-engine)
15. [Financial — Bank Reconciliation](#15-financial--bank-reconciliation)
16. [Financial — Accounts Payable & Fixed Assets](#16-financial--accounts-payable--fixed-assets)
17. [Financial — Budgeting & Expenses](#17-financial--budgeting--expenses)
18. [Inventory & Procurement](#18-inventory--procurement)
19. [AI Copilot & LLM Assistant](#19-ai-copilot--llm-assistant)
20. [ML Studio & AutoML](#20-ml-studio--automl)
21. [Agentic AI (DEX-based)](#21-agentic-ai-dex-based)
22. [Fraud Detection & Anomaly Monitoring](#22-fraud-detection--anomaly-monitoring)
23. [Computer Vision & Defect Detection](#23-computer-vision--defect-detection)
24. [Forecasting & Demand Planning](#24-forecasting--demand-planning)
25. [ESG Reporting](#25-esg-reporting)
26. [Compliance & Audit](#26-compliance--audit)
27. [Analytics, Dashboards & Reporting](#27-analytics-dashboards--reporting)
28. [Knowledge Base & RAG Engine](#28-knowledge-base--rag-engine)
29. [Customer Portal & Booking](#29-customer-portal--booking)
30. [Partner Portal & Subcontractors](#30-partner-portal--subcontractors)
31. [Communications Hub](#31-communications-hub)
32. [FlowSpace — AI Decision Governance](#32-flowspace--ai-decision-governance)
33. [DEX — Execution Contexts](#33-dex--execution-contexts)
34. [Marketplace & Extensions](#34-marketplace--extensions)
35. [Developer Platform & API Gateway](#35-developer-platform--api-gateway)
36. [Security & SIEM](#36-security--siem)
37. [Platform Administration & Configuration](#37-platform-administration--configuration)

---

## 1. Authentication & Identity

### US-AUTH-01 — Email & Password Login
**As a** user,  
**I want** to sign in with my email and password,  
**so that** I can access the platform securely.

**Acceptance Criteria:**
- Login form validates email format and password length before submission.
- On success, a signed JWT access token and refresh token are issued.
- Failed login attempts are rate-limited (10 attempts / 15 min per IP).
- Error messages do not reveal whether the email or password was wrong.

---

### US-AUTH-02 — TOTP Multi-Factor Authentication
**As a** security-conscious user,  
**I want** to enrol a TOTP authenticator app (e.g. Google Authenticator),  
**so that** my account requires a second factor on each login.

**Acceptance Criteria:**
- MFA enrolment generates a QR code compatible with RFC 6238 TOTP apps.
- A six-digit OTP is validated server-side using HMAC-SHA1 with a ±1 time-step tolerance.
- MFA can be enforced at the organisation level by a tenant admin.
- Backup codes are issued at enrolment; each code is single-use.

---

### US-AUTH-03 — SSO via OIDC (Google / Azure AD)
**As an** enterprise user,  
**I want** to sign in using my corporate identity provider via OIDC,  
**so that** I don't maintain a separate password for Guardian Flow.

**Acceptance Criteria:**
- Supports OIDC Authorization Code flow with PKCE.
- State parameter is validated with timing-safe comparison to prevent CSRF.
- Upon successful callback, a Guardian Flow JWT is issued using the same auth pair as email/password login.
- Tenant admin can configure OIDC client ID, secret, and discovery URL.

---

### US-AUTH-04 — SSO via SAML 2.0
**As an** enterprise IT administrator,  
**I want** to federate login through my organisation's SAML identity provider,  
**so that** user provisioning is centralised in our directory.

**Acceptance Criteria:**
- Platform accepts SAML assertions and validates signatures.
- NameID is mapped to a Guardian Flow user record.
- SP metadata endpoint is available for IdP configuration.
- SAML errors produce a user-friendly page, not an unhandled 500.

---

### US-AUTH-05 — Token Refresh
**As a** logged-in user,  
**I want** my session to refresh automatically before my access token expires,  
**so that** I am not unexpectedly logged out during active use.

**Acceptance Criteria:**
- `POST /api/auth/refresh` accepts a valid refresh token and returns a new access token.
- Expired or revoked refresh tokens return 401.
- Client-side code silently retries the original request after a successful refresh.

---

### US-AUTH-06 — Role-Based Access Control
**As a** system administrator,  
**I want** to assign roles to users (sys_admin, tenant_admin, finance_manager, ops_manager, dispatcher, technician, partner_admin),  
**so that** each user only sees and acts on what they are permitted to.

**Acceptance Criteria:**
- Every API endpoint checks the caller's role against a permission matrix before processing.
- `sys_admin` has unrestricted access across all tenants.
- `technician` can only read and update work orders assigned to them.
- Permission checks use the DB-backed `role_permissions` collection when populated; falls back to the in-memory matrix.

---

## 2. Organisation Management Console (MAC)

### US-ORG-01 — Create and Manage Organisations
**As a** system administrator,  
**I want** to create, view, update, and deactivate tenant organisations,  
**so that** I can onboard and offboard customers from a single console.

**Acceptance Criteria:**
- `POST /api/org` creates an organisation with name, industry, contact, and plan.
- `PATCH /api/org/:id` updates profile fields; validates required fields server-side.
- `DELETE /api/org/:id` soft-deactivates (sets `status: inactive`); data is retained.
- List endpoint supports pagination.

---

### US-ORG-02 — Manage Organisation Members
**As a** tenant administrator,  
**I want** to invite, role-change, and remove members of my organisation,  
**so that** I control who has access and what they can do.

**Acceptance Criteria:**
- `POST /api/org/:id/members/invite` accepts an email and role; creates a pending invitation.
- `PATCH /api/org/:id/members/:uid` allows changing role and active status.
- `DELETE /api/org/:id/members/:uid` removes the member from the organisation.
- Tenant admin cannot manage members of a different organisation; sys_admin can.

---

### US-ORG-03 — Organisation Security Settings
**As a** tenant administrator,  
**I want** to configure MFA enforcement, SSO, IP allowlisting, and audit logging for my organisation,  
**so that** I meet my company's security policy requirements.

**Acceptance Criteria:**
- Security tab toggles: MFA required, SSO enabled, IP allowlist enabled, audit logging enabled.
- CIDR list is validated and stored; non-CIDR input is rejected.
- Danger-zone deactivation requires explicit confirmation.
- Changes are recorded in the audit log.

---

### US-ORG-04 — Billing Plan Management
**As a** system administrator,  
**I want** to view and change an organisation's subscription plan from the MAC,  
**so that** I can upgrade or downgrade customers without accessing the database.

**Acceptance Criteria:**
- Billing tab shows current plan, usage limits per plan, and a change-plan control visible only to sys_admin.
- Plan change is persisted to the organisation record.
- Usage counts (members, API calls) are displayed against plan limits.

---

## 3. Field Service Management — Work Orders

### US-WO-01 — Create a Work Order
**As an** operations manager,  
**I want** to create a work order with priority, required skills, asset reference, and SLA deadline,  
**so that** field jobs are tracked from creation to completion.

**Acceptance Criteria:**
- Work order requires: title, description, priority (low/medium/high/critical), required skills array, and a customer reference.
- SLA deadline defaults based on priority mapping; can be manually overridden.
- Created work order is assigned a unique ID and status `open`.
- Creation event is written to the FlowSpace decision ledger.

---

### US-WO-02 — View and Filter Work Orders
**As a** dispatcher,  
**I want** to view all open work orders and filter by status, priority, technician, and date range,  
**so that** I have an at-a-glance picture of the field workload.

**Acceptance Criteria:**
- Work orders list endpoint supports query parameters: `status`, `priority`, `technician_id`, `from`, `to`.
- Results are paginated (default 25 per page).
- Each work order card shows: title, status, priority badge, assigned technician, SLA deadline, and countdown.
- SLA-breached work orders are visually flagged in red.

---

### US-WO-03 — Assign and Reassign a Work Order
**As a** dispatcher,  
**I want** to assign a work order to a technician or reassign it to another,  
**so that** coverage is maintained if a technician is unavailable.

**Acceptance Criteria:**
- Assignment updates `assigned_to`, sets status to `assigned`, and records timestamp.
- Reassignment logs the previous assignee and reason.
- Assigned technician receives a notification (when communications are live).
- SLA deadline is not reset on reassignment.

---

### US-WO-04 — Update Work Order Status
**As a** field technician,  
**I want** to update the status of my assigned work order (in_progress, pending_parts, completed),  
**so that** the back office knows the real-time state of each job.

**Acceptance Criteria:**
- Technician can only update work orders assigned to them.
- Status transitions are validated: `assigned → in_progress → completed`; `in_progress → pending_parts → in_progress`.
- Completion requires a completion note or photo reference.
- Completion timestamp is recorded for SLA performance calculation.

---

### US-WO-05 — Geo Check-In / Check-Out
**As a** field technician,  
**I want** to check in to a job site on arrival and check out on departure,  
**so that** on-site time is tracked accurately for billing and compliance.

**Acceptance Criteria:**
- Check-in records GPS latitude/longitude and timestamp.
- Check-out records departure timestamp and calculates on-site duration.
- Both events are stored in the work order record.
- Check-in/out is accessible from the mobile PWA offline queue and syncs when connectivity is restored.

---

### US-WO-06 — Multi-Day Work Orders
**As an** operations manager,  
**I want** to create work orders that span multiple days with daily task segments,  
**so that** long-running projects are tracked at a per-day granularity.

**Acceptance Criteria:**
- Multi-day work order has a `start_date` and `end_date`.
- Daily segments can be created under the parent work order.
- Each segment has its own status, technician assignment, and notes.
- Parent status rolls up from segment statuses.

---

### US-WO-07 — Email-to-Work-Order Automation
**As an** operations manager,  
**I want** inbound service request emails to be automatically parsed and converted to work orders,  
**so that** no customer request is missed.

**Acceptance Criteria:**
- `POST /api/email-to-wo/ingest` accepts raw email content (subject, body, from).
- Platform extracts: customer email, asset reference (if present), urgency keywords, and description.
- A draft work order is created with status `pending_review` and the parsed fields pre-populated.
- Operator reviews and confirms the work order before it enters the active queue.

---

## 4. Scheduling & Dispatch

### US-SCH-01 — AI-Powered Schedule Optimisation
**As an** operations manager,  
**I want** the platform to automatically assign open work orders to the best available technicians,  
**so that** SLA deadlines are met and technician travel time is minimised.

**Acceptance Criteria:**
- Hard constraints are enforced before any scoring: skill match, shift availability, daily capacity, SLA deadline.
- Soft scoring ranks candidates by SLA urgency (×4), work order priority (×3), skill quality (×2), travel time (×2), load balance (×1).
- Work orders that cannot be assigned return with a per-technician constraint violation reason map.
- Each optimisation run writes a structured decision record to FlowSpace with rationale and unscheduled count.

---

### US-SCH-02 — View Technician Schedule
**As a** dispatcher,  
**I want** to see a visual calendar of each technician's scheduled jobs,  
**so that** I can identify gaps or conflicts before dispatching.

**Acceptance Criteria:**
- Schedule page renders a week-view calendar with per-technician swim lanes.
- Each scheduled assignment shows job title, customer name, start time, and estimated duration.
- Conflicts (overlapping jobs) are highlighted.
- Dispatcher can drag-and-drop assignments to adjust timing.

---

### US-SCH-03 — Route Optimisation (Google Maps / Haversine)
**As a** dispatcher,  
**I want** to generate an optimal visit sequence for a technician's daily jobs,  
**so that** travel time and fuel costs are minimised.

**Acceptance Criteria:**
- `POST /api/schedule/optimize-route` accepts a list of job addresses and the technician's start location.
- When `GOOGLE_MAPS_API_KEY` is set, real driving durations from the Distance Matrix API are used.
- Without an API key, haversine straight-line distances are used as a fallback.
- Response includes the optimised visit order, estimated total distance, and per-leg driving time.

---

### US-SCH-04 — Shift Management
**As a** workforce manager,  
**I want** to define and manage technician shift patterns (morning, afternoon, night, on-call),  
**so that** the scheduler only assigns jobs within a technician's working hours.

**Acceptance Criteria:**
- Shifts have: technician reference, start/end time, days of week, and effective date range.
- Custom availability windows override default shifts for exception days.
- Scheduler hard constraint H3 (availability) uses shift data before assigning a job.
- Shift calendar is viewable per technician and per team.

---

### US-SCH-05 — Crew / Team Dispatch
**As a** dispatcher,  
**I want** to assign a team of technicians to a single work order,  
**so that** jobs requiring multiple skilled workers are covered correctly.

**Acceptance Criteria:**
- Work order supports a `crew` array in addition to a primary `assigned_to`.
- Each crew member is skills-checked independently.
- All crew members receive dispatch notifications.
- On-site time tracking covers all crew members individually.

---

### US-SCH-06 — Territory Management
**As an** operations manager,  
**I want** to define service territories as geographic boundaries and assign technicians to them,  
**so that** local dispatch rules are enforced and coverage is visualised on a map.

**Acceptance Criteria:**
- Territories are defined by polygon boundaries (GeoJSON).
- Technicians can be assigned to one or more territories.
- Work order creation can auto-select the territory based on the customer's address.
- Territory coverage gaps are visible on the territory map view.

---

## 5. Asset Management & Predictive Maintenance

### US-AST-01 — Register and Track Assets
**As an** asset manager,  
**I want** to register equipment assets with serial number, install date, warranty expiry, and location,  
**so that** the full asset lifecycle is tracked in one place.

**Acceptance Criteria:**
- Asset record contains: name, type, serial number, manufacturer, model, install date, warranty expiry, location (address + GPS), and status.
- Asset can be linked to a customer/site.
- Asset history shows all work orders performed against it.
- Asset register supports search, filter by type/status, and bulk export.

---

### US-AST-02 — Asset Health Dashboard
**As a** maintenance manager,  
**I want** to see a dashboard of asset health scores across my fleet,  
**so that** I can prioritise inspections before failures occur.

**Acceptance Criteria:**
- Dashboard shows count of assets by health status: healthy, warning, critical, unknown.
- Each asset card shows last reading, trend arrow, and days since last maintenance.
- Clicking an asset opens the asset detail with full telemetry history.
- Health score is computed from the most recent IoT readings and ML failure probability.

---

### US-AST-03 — Predictive Maintenance Recommendations
**As a** maintenance manager,  
**I want** to see AI-generated predictions of which assets are at risk of failure in the next 30 days,  
**so that** I can schedule preventive maintenance before costly breakdowns.

**Acceptance Criteria:**
- `/api/assets/at-risk` returns assets with failure probability > configured threshold.
- Each recommendation shows: asset name, failure probability, confidence score, risk level badge (low/medium/high/critical), and recommended action.
- Operator can click "Schedule Maintenance" to create a work order pre-linked to the asset.
- Predictions are generated by the logistic regression model in `server/ml/failure.js`.

---

### US-AST-04 — Maintenance Calendar
**As a** maintenance planner,  
**I want** a calendar view of all scheduled and completed maintenance events per asset,  
**so that** I can plan upcoming preventive maintenance without conflicts.

**Acceptance Criteria:**
- Calendar shows PM events grouped by month.
- Each event links to the underlying work order.
- Recurring PM schedules (e.g. 90-day intervals) are shown as future projected events.
- Overdue events are highlighted in red.

---

### US-AST-05 — Maintenance Trigger Rules
**As a** maintenance engineer,  
**I want** to define rules that automatically create a work order when a sensor threshold is exceeded,  
**so that** reactive maintenance happens without manual intervention.

**Acceptance Criteria:**
- Trigger rule defines: asset type, sensor property, operator (>, <, =, !=), threshold value, and priority of the generated work order.
- When a telemetry reading matches a rule, a work order is auto-created and linked to the asset.
- Trigger creation and work order generation are logged in the audit trail.
- Duplicate suppression prevents multiple work orders from the same trigger within a cooldown window.

---

### US-AST-06 — Remaining Useful Life (RUL) Estimation
**As a** reliability engineer,  
**I want** an estimated remaining useful life for each monitored asset,  
**so that** I can plan capital replacement before unexpected downtime.

**Acceptance Criteria:**
- `POST /api/rul/estimate` accepts asset ID and optional telemetry window.
- Returns: estimated RUL in days, confidence interval, last training date, and model type used.
- RUL is shown on the asset detail page alongside health score.
- Alerts are triggered when RUL drops below a user-configured threshold.

---

## 6. IoT Telemetry & Digital Twins

### US-IOT-01 — Ingest Device Telemetry
**As a** systems integrator,  
**I want** to push sensor readings to the platform via REST API,  
**so that** asset health monitoring uses real-time equipment data.

**Acceptance Criteria:**
- `POST /api/iot-telemetry/readings` accepts device_id, timestamp, and a readings object (key-value sensor properties).
- Authentication is required; tenant isolation enforced.
- Readings are stored and immediately available for dashboards and anomaly detection.
- Returns a `reading_id` for idempotent retry.

> ⚠️ **Known Gap:** Only REST ingestion is supported. MQTT broker integration is not yet implemented. Not suitable for high-frequency sensor fleets (>10 concurrent devices) without architecture changes.

---

### US-IOT-02 — IoT Device Dashboard
**As an** operations manager,  
**I want** a real-time dashboard showing the latest readings for all registered IoT devices,  
**so that** I can monitor equipment status without checking each device individually.

**Acceptance Criteria:**
- Dashboard lists all devices with latest reading timestamp and key property values.
- Stale devices (no reading in >1 hour) are flagged with a warning badge.
- Clicking a device opens the device detail with a time-series chart of recent readings.
- Alerts tab shows unacknowledged anomaly alerts with severity, device, and property.

---

### US-IOT-03 — Acknowledge IoT Alerts
**As a** maintenance operator,  
**I want** to acknowledge alerts generated by IoT anomaly detection,  
**so that** the team knows the alert has been reviewed and is being actioned.

**Acceptance Criteria:**
- `PATCH /api/iot-telemetry/alerts/:id/acknowledge` marks an alert as acknowledged with user ID and timestamp.
- Acknowledged alerts move to a separate "Resolved" list in the UI.
- Unacknowledged alert count is shown as a badge in the navigation.

---

### US-IOT-04 — Digital Twin Viewer
**As an** asset engineer,  
**I want** to view a digital twin representation of a physical asset showing its current state, sensor readings, and anomaly history,  
**so that** I can diagnose issues without being on-site.

**Acceptance Criteria:**
- Digital Twin panel loads for a selected device from the IoT dashboard.
- Shows: device properties, latest telemetry values, health score, anomaly events.
- State changes (e.g. from healthy to warning) are timestamped and listed in a history feed.
- `GET /api/digital-twin/:assetId` returns the full twin state document.

---

## 7. CRM — Accounts, Contacts & Leads

### US-CRM-01 — Manage Customer Accounts
**As a** sales representative,  
**I want** to create, view, update, and deactivate customer account records,  
**so that** all account information is maintained in a single source of truth.

**Acceptance Criteria:**
- Account record holds: company name, industry, website, address, account owner, and status.
- Account can be linked to multiple contacts, deals, and work orders.
- Deactivated accounts are retained for history but excluded from active pipelines.
- Account list supports search by name and filter by industry/owner.

---

### US-CRM-02 — Manage Contacts
**As a** sales representative,  
**I want** to add and manage individual contact records linked to accounts,  
**so that** I know who to reach at each customer organisation.

**Acceptance Criteria:**
- Contact record holds: first/last name, email, phone, role, linked account, and opt-in status.
- Contact list is searchable and filterable by account and role.
- Contacts are matched to CRM activities from calendar and email sync by email address.

---

### US-CRM-03 — Lead Capture and Scoring
**As a** sales representative,  
**I want** to create leads and have the platform automatically score them,  
**so that** I prioritise outreach on the most promising opportunities.

**Acceptance Criteria:**
- Lead record holds: name, company, source, email, phone, budget indicator, and timeline.
- Lead score (0–100) is computed server-side using a multi-factor heuristic (budget, timeline, engagement, company size).
- Leads list sorts by score descending by default.
- Score badge is colour-coded: green (>70), yellow (40–70), red (<40).

---

### US-CRM-04 — Convert Lead to Account and Deal
**As a** sales representative,  
**I want** to convert a qualified lead into an account, contact, and deal in one action,  
**so that** I avoid duplicate data entry when a prospect is ready to progress.

**Acceptance Criteria:**
- `POST /api/crm/leads/:id/convert` creates an account, contact, and deal record using data from the lead.
- Lead status is set to `converted` and the lead record links to the new entities.
- The new deal is placed in the first active pipeline stage.
- Conversion is audited in the CRM activity log.

---

## 8. CRM — Pipeline & Deals

### US-CRM-05 — Kanban Pipeline View
**As a** sales manager,  
**I want** to view my team's deals as a Kanban board with stages,  
**so that** I can see at a glance where each opportunity is in the sales process.

**Acceptance Criteria:**
- Pipeline board renders one column per stage with deal cards.
- Deal card shows: deal name, account, value, expected close date, and owner.
- Cards can be dragged across stages (dnd-kit); the move persists to the database.
- Column totals show the sum of deal values per stage.

---

### US-CRM-06 — Pipeline Stage Configuration
**As a** sales manager,  
**I want** to add, rename, reorder, and remove pipeline stages,  
**so that** the pipeline reflects my actual sales process.

**Acceptance Criteria:**
- Pipeline settings page lists all stages with drag-to-reorder handles.
- Renaming a stage updates all deal cards immediately.
- Removing a stage requires reassignment of existing deals to another stage.
- Changes are saved without a page reload.

---

### US-CRM-07 — Deal Detail and Activity Timeline
**As a** sales representative,  
**I want** to view the full history of interactions and notes on a deal,  
**so that** I have context before any customer conversation.

**Acceptance Criteria:**
- Deal detail page shows: deal value, stage, close date, contacts involved, and linked account.
- Activity timeline shows emails, calls, meetings, and notes in chronological order.
- New activity (note, call log) can be added directly from the deal detail view.

---

### US-CRM-08 — Pipeline Report
**As a** sales director,  
**I want** a report showing pipeline value by stage, win rate, and average deal cycle time,  
**so that** I can forecast revenue and coach my team on conversion bottlenecks.

**Acceptance Criteria:**
- Pipeline report shows: total pipeline value, weighted pipeline (value × stage probability), count by stage.
- Win rate chart compares won vs. lost deals per month.
- Average deal cycle time is shown in days.
- Report can be filtered by owner, date range, and pipeline.

---

## 9. CRM — Calendar & Email Sync

### US-CRMSYNC-01 — Connect a Calendar Account
**As a** sales representative,  
**I want** to connect my Google or Microsoft calendar to the CRM,  
**so that** meetings with customers are automatically logged as CRM activities.

**Acceptance Criteria:**
- `POST /api/crm-calendar/connect` stores the OAuth2 token for Google or Microsoft.
- Only one connection per provider per user is permitted (upsert on reconnect).
- Connected accounts are listed on the Calendar Sync page with provider badge and status.
- Disconnecting removes the token and stops future syncs for that provider.

---

### US-CRMSYNC-02 — Sync Calendar Events to CRM Activities
**As a** sales representative,  
**I want** calendar events with customer contacts as attendees to be automatically logged in the CRM,  
**so that** activity logging is hands-free.

**Acceptance Criteria:**
- `POST /api/crm-calendar/sync/calendar` matches attendee email addresses to CRM contacts.
- A `crm_activity` record of type `meeting` is created for each matched event.
- Events with no matching CRM contact are flagged for manual review.
- Duplicate syncs are idempotent (same event ID does not create duplicate activities).

---

### US-CRMSYNC-03 — Sync Emails to CRM Activities
**As a** sales representative,  
**I want** sent and received emails with CRM contacts to be logged automatically,  
**so that** email communication history is visible without manual copy-paste.

**Acceptance Criteria:**
- `POST /api/crm-calendar/sync/email` matches from/to addresses to CRM contacts and accounts.
- Email subject and snippet are stored in the activity record.
- The linked account_id is derived from the matched contact.
- Activities appear in the deal/contact timeline within seconds of sync.

---

## 10. Financial — General Ledger & Journals

### US-FIN-01 — Post a Journal Entry
**As a** finance manager,  
**I want** to post manual journal entries to the general ledger,  
**so that** accounting adjustments are recorded with a full audit trail.

**Acceptance Criteria:**
- Journal entry requires: date, description, and at least two line items (account code, debit/credit, amount).
- Server validates that total debits equal total credits before posting; mismatched entries are rejected.
- Posted entries cannot be deleted; corrections require a reversing entry.
- Each entry records the posting user ID and timestamp.

---

### US-FIN-02 — Chart of Accounts Management
**As a** finance manager,  
**I want** to create and organise my chart of accounts,  
**so that** the ledger structure matches my reporting requirements.

**Acceptance Criteria:**
- Accounts have: code, name, type (asset/liability/equity/income/expense), and parent account.
- Account hierarchy is displayed as a tree view.
- Accounts used in posted entries cannot be deleted; only deactivated.

---

### US-FIN-03 — Financial Statements
**As a** finance director,  
**I want** to generate a balance sheet, income statement, and cash flow statement for a selected period,  
**so that** I can report on the financial health of the business.

**Acceptance Criteria:**
- Statements pull from posted ledger entries only.
- Balance sheet: assets = liabilities + equity, validated server-side.
- Income statement shows revenue, cost of goods sold, gross profit, operating expenses, and net income.
- Statements can be exported to PDF or CSV.

---

### US-FIN-04 — Intercompany Transactions
**As a** group finance manager,  
**I want** to record and reconcile transactions between entities within the same group,  
**so that** intercompany balances are eliminated in consolidated reporting.

**Acceptance Criteria:**
- Intercompany transaction links two tenant ledgers (entity A and entity B) with mirror entries.
- Reconciliation report shows matching and unmatched intercompany balances.
- Eliminations are applied before generating the consolidated income statement and balance sheet.

---

## 11. Financial — Invoicing & Payments

### US-INV-01 — Create and Send an Invoice
**As a** billing administrator,  
**I want** to generate an invoice from a completed work order and send it to the customer,  
**so that** billing is accurate and timely.

**Acceptance Criteria:**
- Invoice pulls line items, labour rates, and parts from the linked work order.
- Tax is calculated automatically via the tax engine (Avalara, TaxJar, or local heuristic).
- Invoice PDF is generated and attached to the invoice record.
- Invoice is sent to the customer email on confirmation.

> ⚠️ **Known Gap:** Email delivery depends on the communications integration. Until SendGrid/Mailgun is wired, invoices are generated and stored but not dispatched.

---

### US-INV-02 — Electronic Invoicing (e-Invoice)
**As a** finance administrator,  
**I want** to generate legally compliant electronic invoices in supported formats,  
**so that** the business meets e-invoicing mandates in applicable jurisdictions.

**Acceptance Criteria:**
- `POST /api/e-invoice/generate` produces a structured e-invoice document.
- Supported formats include UBL 2.1 and PEPPOL BIS Billing 3.
- Validation errors (missing mandatory fields) are returned before submission.
- Submitted e-invoices are stored with status and submission timestamp.

---

### US-INV-03 — Record a Payment
**As a** billing administrator,  
**I want** to record payments against open invoices,  
**so that** accounts receivable balances are kept current.

**Acceptance Criteria:**
- Payment record links to an invoice and holds: amount, currency, payment method, and date.
- Invoice status transitions from `outstanding` to `partially_paid` or `paid` based on amounts.
- Overpayments create a credit note automatically.
- Payment recording posts the corresponding GL entries (DR Bank / CR AR).

---

### US-INV-04 — Dispute Management
**As a** customer billing contact,  
**I want** to raise a dispute on an invoice I believe is incorrect,  
**so that** the discrepancy is investigated and resolved without delaying other payments.

**Acceptance Criteria:**
- Dispute is raised against a specific invoice line with a reason code and description.
- Disputed invoice is held from collection activity while the dispute is open.
- Finance team can resolve the dispute by issuing a credit note or confirming the original charge.
- Resolution is communicated to the customer.

---

## 12. Financial — Revenue Recognition (ASC 606)

### US-REV-01 — Create a Revenue Contract
**As a** revenue accountant,  
**I want** to create a customer contract with multiple performance obligations,  
**so that** revenue is allocated and recognised in compliance with ASC 606 / IFRS 15.

**Acceptance Criteria:**
- Contract requires: customer, total transaction price, currency, and at least one performance obligation (POB).
- Transaction price is automatically allocated across POBs using relative standalone selling prices.
- Each POB has a delivery type (straight-line over-time or point-in-time) and start/end dates.
- Straight-line POBs generate a monthly recognition schedule automatically.

---

### US-REV-02 — Run Period-End Revenue Recognition
**As a** revenue accountant,  
**I want** to run period-end recognition for a specific month and contract,  
**so that** earned revenue is posted to the ledger and deferred revenue is reduced.

**Acceptance Criteria:**
- `POST /api/revenue/contracts/:id/recognise` commits journal lines: DR Deferred Revenue / CR Revenue.
- Recognition is only permitted for periods that are due (schedule status `due`).
- Double-posting to the same period is prevented.
- Revenue KPI dashboard (total value, recognised, deferred, recognition rate) updates in real time.

---

### US-REV-03 — View Revenue Dashboard
**As a** CFO,  
**I want** a dashboard showing total contracted revenue, amount recognised, deferred balance, and recognition rate,  
**so that** I can monitor revenue performance against targets at a glance.

**Acceptance Criteria:**
- Dashboard shows four KPI cards: total value, recognised, deferred, recognition rate.
- Contract table shows per-contract progress bars (recognised vs. total).
- Clicking a contract opens a detail drawer with POB allocation and monthly schedule.

---

## 13. Financial — Subscription & Recurring Billing

### US-SUB-01 — Create a Subscription Plan
**As a** product manager,  
**I want** to define subscription plans with pricing, billing interval, and currency,  
**so that** the billing engine can generate invoices automatically.

**Acceptance Criteria:**
- Plan requires: name, price, currency, billing interval (monthly/quarterly/annual), and optional trial period.
- When Stripe is configured (`STRIPE_SECRET_KEY`), the plan is mirrored as a Stripe Product + Price.
- Plans are listed in the subscription management UI with plan cards.

---

### US-SUB-02 — Create and Manage a Customer Subscription
**As a** billing administrator,  
**I want** to subscribe a customer to a plan,  
**so that** recurring invoices are generated automatically at each billing period.

**Acceptance Criteria:**
- Subscription creation generates the first invoice immediately (local mode) or via Stripe.
- Subscription supports: active, paused, cancelled (at period end or immediately).
- Billing cycle runner (`POST /api/subscriptions/run-billing-cycle`) generates invoices for all due subscriptions.
- Stripe webhooks (`invoice.paid`, `subscription.deleted`, `subscription.updated`) keep local state in sync.

---

### US-SUB-03 — View Invoice History for a Subscription
**As a** customer,  
**I want** to view all invoices generated under my subscription,  
**so that** I can track my payments and download receipts.

**Acceptance Criteria:**
- Subscription detail drawer shows a full invoice history with status (paid/outstanding/overdue).
- Each invoice is downloadable as PDF.
- Invoice status is updated in real time via Stripe webhook or local billing engine.

---

## 14. Financial — Tax Engine

### US-TAX-01 — Calculate Tax on a Transaction
**As a** billing system,  
**I want** tax to be calculated automatically when an invoice is generated,  
**so that** the correct amount is charged to customers and reported to tax authorities.

**Acceptance Criteria:**
- `POST /api/tax/calculate` accepts: amount, origin address, destination address, product type, and currency.
- Returns: `tax_amount`, `tax_rate`, `provider` (Avalara / TaxJar / local), and `breakdown`.
- Every calculation is persisted to `tax_calculations` for audit.
- When provider APIs are unavailable, the local heuristic (US state rates + country VAT) activates automatically.

---

### US-TAX-02 — Address Validation
**As a** billing administrator,  
**I want** to validate and normalise customer addresses before calculating tax,  
**so that** the correct tax jurisdiction is applied.

**Acceptance Criteria:**
- `POST /api/tax/validate` normalises the address using Avalara when configured.
- Returns a normalised address with county/city/state/zip corrections.
- Pass-through response (original address unchanged) when Avalara is not configured.

---

## 15. Financial — Bank Reconciliation

### US-BANKREC-01 — Import Bank Transactions
**As a** finance team member,  
**I want** to import bank statement transactions from a CSV or OFX file,  
**so that** I can reconcile them against ledger entries.

**Acceptance Criteria:**
- Upload supports CSV (date, description, amount, reference) and OFX format.
- Imported transactions are stored in `bank_transactions` collection with a pending status.
- Duplicate imports (same date + amount + reference) are detected and skipped.

---

### US-BANKREC-02 — Match Transactions to Ledger Entries
**As a** finance team member,  
**I want** the platform to suggest ledger entry matches for each bank transaction,  
**so that** reconciliation is faster and less error-prone.

**Acceptance Criteria:**
- Auto-matching uses: amount, date proximity (±3 days), and description keyword match.
- Matched pairs are shown for operator confirmation before marking as reconciled.
- Unmatched transactions are listed separately for manual investigation.
- Reconciliation summary shows matched count, unmatched count, and reconciled balance.

---

## 16. Financial — Accounts Payable & Fixed Assets

### US-AP-01 — Process a Supplier Invoice
**As an** accounts payable clerk,  
**I want** to record supplier invoices and schedule payment,  
**so that** the business meets payment terms and avoids late penalties.

**Acceptance Criteria:**
- Invoice record contains: supplier, invoice number, amount, due date, cost centre, and line items.
- Approval workflow routes invoice to the responsible manager based on amount threshold.
- On approval, the GL entry is posted: DR Expense / CR AP.
- Payment batch exports to bank transfer file or triggers payment gateway.

---

### US-FA-01 — Register a Fixed Asset and Calculate Depreciation
**As a** finance manager,  
**I want** to register a fixed asset and have the system calculate depreciation automatically,  
**so that** the asset is correctly valued on the balance sheet each period.

**Acceptance Criteria:**
- Fixed asset record contains: name, category, purchase date, cost, residual value, useful life, and depreciation method (straight-line or declining balance).
- Period-end depreciation run posts DR Depreciation Expense / CR Accumulated Depreciation.
- Asset net book value is updated after each run.
- Disposal posts the remaining net book value and records gain/loss.

---

## 17. Financial — Budgeting & Expenses

### US-BUD-01 — Create a Budget
**As a** finance manager,  
**I want** to create departmental or project budgets by GL account and period,  
**so that** actual spending can be tracked against plan.

**Acceptance Criteria:**
- Budget is created for a combination of cost centre, GL account, and period (month/quarter/year).
- Budget vs. actual variance report is available at any time.
- Alerts are triggered when actual spend reaches 80% and 100% of budget.

---

### US-EXP-01 — Submit an Expense Claim
**As an** employee,  
**I want** to submit expense claims with receipts and category codes,  
**so that** I am reimbursed for out-of-pocket business costs.

**Acceptance Criteria:**
- Expense claim has: date, amount, currency, category, description, and receipt attachment.
- Multi-currency claims are converted to base currency using the live exchange rate from `/api/currency`.
- Claim is routed to the line manager for approval; approved claims are posted to the GL.
- Reimbursed claims update the payables balance.

---

## 18. Inventory & Procurement

### US-INV-STOCK-01 — Manage Stock Levels
**As a** warehouse manager,  
**I want** to view current stock levels, record receipts, and process issues to jobs,  
**so that** parts are available when technicians need them.

**Acceptance Criteria:**
- Stock record holds: part number, description, unit of measure, quantity on hand, reorder point, and location.
- `POST /api/inventory/movements` records receipt (+) or issue (-) with reason and work order reference.
- When stock on hand drops below reorder point, a replenishment alert is raised.
- Stock movement history is fully auditable per part.

---

### US-INV-STOCK-02 — Goods Receipt
**As a** warehouse operative,  
**I want** to record goods received against a purchase order,  
**so that** stock is updated accurately and the purchase order is closed when fully received.

**Acceptance Criteria:**
- Goods receipt links to a purchase order and validates received quantities against ordered quantities.
- Over-receipt (beyond 110% of order quantity) requires an approval override.
- Receipt posts a GL entry: DR Inventory / CR AP.
- Purchase order status transitions to `partially_received` or `received`.

---

### US-PROC-01 — Create a Purchase Order
**As a** procurement officer,  
**I want** to create purchase orders for parts and services,  
**so that** supplier commitments are tracked and approved before delivery.

**Acceptance Criteria:**
- PO contains: supplier, line items (part, qty, unit cost), required delivery date, and cost centre.
- Approval workflow applies based on PO value threshold.
- Approved PO is transmitted to the supplier or exported for manual dispatch.
- PO is linked to the receiving goods receipt when goods arrive.

---

### US-INV-OPT-01 — Inventory Optimisation Recommendations
**As a** supply chain manager,  
**I want** AI-driven recommendations for optimal stock levels and reorder quantities,  
**so that** I reduce stockouts and excess inventory simultaneously.

**Acceptance Criteria:**
- `GET /api/inventory-optimisation/recommendations` returns per-part analysis: current stock, demand forecast, recommended reorder point, and recommended order quantity.
- Recommendations are based on historical consumption and the Holt-Winters demand forecast.
- Operator can accept a recommendation which updates the reorder point in the inventory record.

---

## 19. AI Copilot & LLM Assistant

### US-AI-01 — AI Copilot Chat (Global Widget)
**As a** platform user,  
**I want** a persistent AI Copilot available from any page,  
**so that** I can ask questions, get summaries, or request actions without leaving my current context.

**Acceptance Criteria:**
- Copilot widget is visible on every authenticated page as a floating panel.
- Chat supports real-time streaming responses (Server-Sent Events).
- Conversation history is maintained within the session.
- Suggested prompts are displayed when the chat is empty.
- Provider badge indicates whether mock or OpenAI GPT-4o is active.
- Keyboard shortcut (`/`) focuses the input field.

---

### US-AI-02 — AI Assistant Page (Full-Screen)
**As a** power user,  
**I want** a full-screen AI assistant with extended conversation history,  
**so that** I can conduct longer research or analysis sessions.

**Acceptance Criteria:**
- `/assistant` page renders a full-screen chat interface.
- Streaming token-by-token response is displayed in real time.
- History persists for the duration of the browser session.
- System context includes the user's current tenant and role for contextual responses.

---

### US-AI-03 — RAG-Powered Knowledge Queries
**As a** field technician,  
**I want** to ask natural language questions and get answers drawn from the company's knowledge base,  
**so that** I find repair guides and procedures quickly without reading whole documents.

**Acceptance Criteria:**
- Queries are embedded using the configured embedding model.
- Nearest-neighbour vector search retrieves the top-k relevant chunks (Atlas `$vectorSearch` when available; cosine fallback otherwise).
- Retrieved chunks are injected into the LLM context for a grounded response.
- Source references (document name, chunk ID) are shown with the answer.

---

### US-AI-04 — NLP Query Interface
**As a** business analyst,  
**I want** to query operational data using plain English,  
**so that** I get answers without writing SQL or navigating multiple reports.

**Acceptance Criteria:**
- `POST /api/nlp-query/ask` accepts a free-text question.
- The platform interprets the question, maps it to a data collection, and returns structured results.
- Complex queries (e.g. "show me overdue work orders in London assigned to John") return correct filtered records.
- Response includes the interpreted query parameters for transparency.

---

## 20. ML Studio & AutoML

### US-MLS-01 — Create and Train an ML Experiment
**As a** data scientist,  
**I want** to configure and train a machine learning experiment from the ML Studio UI,  
**so that** I can build custom predictive models on tenant data without writing code.

**Acceptance Criteria:**
- Experiment is created with: name, algorithm type (failure prediction, SLA breach, demand forecast), and configuration parameters.
- `POST /api/ml-studio/experiments/:id/train` calls the orchestrator (`server/ml/orchestrator.js`) with real tenant data.
- Training transitions the experiment status: `queued → training → completed` (or `failed`).
- Completion returns real metrics: accuracy, F1, recall, precision. `isSynthetic: true` is flagged when tenant data is insufficient.

---

### US-MLS-02 — Run Prediction Against a Trained Model
**As a** data scientist,  
**I want** to submit new data to a trained model and receive a prediction,  
**so that** I can test model performance before deploying it to production.

**Acceptance Criteria:**
- `POST /api/ml-studio/predict/:model_id` loads weights from the database and dispatches to the correct ML function.
- Returns HTTP 422 with "model not trained" if no weights exist.
- Response includes: prediction, confidence score, latency_ms, and model type.

---

### US-MLS-03 — Monitor Model Performance
**As a** data scientist,  
**I want** to monitor the live performance of deployed models over time,  
**so that** I can detect model drift and retrain when accuracy degrades.

**Acceptance Criteria:**
- Model performance dashboard shows: accuracy trend chart, precision/recall/F1 per evaluation run.
- Drift alert is raised when rolling accuracy drops more than a configurable threshold below baseline.
- `GET /api/model-performance/:model_id/metrics` returns historical performance data.

---

### US-AI-XAI-01 — Explainable AI Dashboard
**As a** compliance officer,  
**I want** to view explanations for AI model predictions,  
**so that** I can satisfy regulatory requirements and customer queries about automated decisions.

**Acceptance Criteria:**
- XAI dashboard shows feature importance scores for the most recent predictions.
- Counterfactual explanation: "If X were Y, the outcome would change to Z."
- Explanations reference the FlowSpace decision record for audit linkage.

---

## 21. Agentic AI (DEX-based)

### US-AGENT-01 — Run an Autonomous AI Agent
**As an** operations manager,  
**I want** to assign a goal to an AI agent and let it autonomously plan and execute a sequence of actions,  
**so that** complex multi-step workflows complete without manual orchestration.

**Acceptance Criteria:**
- `POST /api/agent/run` accepts a natural language goal and optional DEX ExecutionContext ID.
- Agent uses GPT-4o function calling (with mock fallback) to select and invoke tools from a 10-tool registry.
- Execution is bounded by a MAX_TURNS (10) guard to prevent infinite loops.
- Full per-turn trace is returned and stored in `agent_runs`.
- Every agent run writes a FlowSpace decision record.

---

### US-AGENT-02 — View Agent Run History
**As an** operations manager,  
**I want** to review past agent runs, including their goals, tool calls, and outcomes,  
**so that** I can audit what the agent did and why.

**Acceptance Criteria:**
- Agent Console page shows a run history table with: goal, status, start time, and duration.
- Run detail drawer shows an expandable trace accordion with one entry per turn (tool called, input, output).
- Status badges: `running`, `completed`, `failed`, `max_turns_reached`.

---

### US-AGENT-03 — View Available Agent Tools
**As a** developer,  
**I want** to see which tools are available to the AI agent and their schemas,  
**so that** I understand what actions the agent can take and can extend the tool registry.

**Acceptance Criteria:**
- `GET /api/agent/tools` returns the full tool registry with name, description, and JSON Schema for each tool.
- Tools panel in the Agent Console UI renders tool cards with descriptions.
- Adding a new tool to the registry does not require a code change to the agent loop.

---

## 22. Fraud Detection & Anomaly Monitoring

### US-FRAUD-01 — Run Fraud Detection
**As a** fraud analyst,  
**I want** to run the fraud detection engine against financial transactions,  
**so that** suspicious patterns are flagged for investigation before losses occur.

**Acceptance Criteria:**
- `POST /api/functions/run-fraud-detection` triggers the ensemble anomaly detection engine.
- Detection uses four methods in consensus: Z-score, IQR, MAD, and ESD.
- Returns flagged transactions with: anomaly score, confidence, number of methods agreed, and anomaly type.
- Flagged items appear in the Fraud Investigation queue.

---

### US-FRAUD-02 — Investigate and Resolve a Fraud Alert
**As a** fraud analyst,  
**I want** to review a flagged alert, mark it as confirmed fraud or false positive, and log investigation notes,  
**so that** the fraud case is documented for compliance and financial reporting.

**Acceptance Criteria:**
- Alert detail shows: transaction value, detection method, anomaly score, account context.
- Analyst can update investigation status: `open`, `investigating`, `confirmed`, `false_positive`.
- Investigation notes and status changes are timestamped and attributed to the analyst.
- Confirmed fraud triggers a downstream alert to the compliance team.

---

### US-FRAUD-03 — Forgery Detection
**As a** compliance officer,  
**I want** to submit documents for automated forgery analysis,  
**so that** altered invoices or contracts are identified before they are processed.

**Acceptance Criteria:**
- Document (PDF/image) is submitted to the forgery detection endpoint.
- Analysis checks for: metadata inconsistencies, pixel-level manipulation signatures, font anomalies.
- Returns a forgery risk score with the specific indicators that were triggered.
- High-risk documents are quarantined and flagged for manual review.

---

### US-ANOMALY-01 — Real-Time Anomaly Monitoring
**As a** security or operations analyst,  
**I want** a live dashboard showing detected anomalies across all data streams,  
**so that** I can respond to operational or security incidents quickly.

**Acceptance Criteria:**
- Anomaly monitor shows: anomaly type, data source, severity, confidence, and detection timestamp.
- Streaming updates via WebSocket push new anomalies without page refresh.
- Anomalies can be acknowledged or dismissed with a reason.
- Historical anomaly chart shows volume trend over the past 30 days.

---

## 23. Computer Vision & Defect Detection

### US-CV-01 — Analyse a Photo for Defects
**As a** field technician,  
**I want** to upload a photo of equipment and receive an AI-generated defect analysis,  
**so that** I can document and triage faults accurately without specialist knowledge.

**Acceptance Criteria:**
- `POST /api/ai/vision/analyse` accepts a base64-encoded image and optional context note.
- When `OPENAI_API_KEY` is set, GPT-4o Vision analyses the image.
- Returns: `defects[]` (each with severity and location), `overallCondition`, `overallScore`, `description`, `recommendedAction`, and `provider`.
- Mock fallback returns the same schema when no API key is configured.
- Photo analysis result is linkable to the work order as evidence.

---

### US-CV-02 — View Defect Detection Results
**As a** field supervisor,  
**I want** to review AI-generated defect reports on submitted photos,  
**so that** I can approve repair decisions and update the maintenance record.

**Acceptance Criteria:**
- Defect Detection page shows: provider badge (GPT-4o / Mock), overall condition label, recommended action, and a defect list with severity badges and location text.
- Context note entered by the technician is displayed alongside the analysis.
- Supervisor can approve or override the recommended action.

---

## 24. Forecasting & Demand Planning

### US-FORE-01 — Generate a Demand Forecast
**As a** supply chain manager,  
**I want** the platform to generate a demand forecast for inventory items,  
**so that** I can plan stock replenishment before shortages occur.

**Acceptance Criteria:**
- `POST /api/ml/train` trains a Holt-Winters exponential smoothing model on historical consumption data.
- `GET /api/ml/forecast` returns per-item predictions for a configurable horizon (default 30 days).
- Forecast Centre UI displays time-series charts with confidence intervals.
- Forecasts feed the inventory optimisation recommendations.

---

### US-FORE-02 — SLA Breach Prediction
**As an** operations manager,  
**I want** to see which open work orders are at risk of breaching their SLA,  
**so that** I can reprioritise or escalate before the breach occurs.

**Acceptance Criteria:**
- Breach probability is computed for each open work order using the SLA breach ML model.
- Work orders with breach probability > 70% are highlighted in the schedule view.
- Probability score and time-to-breach estimate are shown on the work order card.
- Scheduler hard constraint H4 uses SLA deadline to block assignments that would guarantee a breach.

---

## 25. ESG Reporting

### US-ESG-01 — Log an Emissions Record
**As an** ESG manager,  
**I want** to log direct (Scope 1), purchased energy (Scope 2), and value chain (Scope 3) emission records,  
**so that** the platform builds an auditable emissions inventory.

**Acceptance Criteria:**
- Emission record contains: scope (1/2/3), category, quantity, unit, emission factor, and calculated CO₂e.
- Records are stored in `esg_emissions` with tenant isolation.
- Emissions log is filterable by scope, category, and date range.
- Total CO₂e is shown on the ESG dashboard summary card.

---

### US-ESG-02 — Calculate Scope 3 Emissions
**As an** ESG manager,  
**I want** to calculate Scope 3 emissions from spend data using EPA EEIO factors,  
**so that** I can include supply chain emissions in my carbon footprint without detailed supplier data.

**Acceptance Criteria:**
- Scope 3 Calculator accepts spend per one or more of the 15 EPA EEIO categories.
- Returns CO₂e per category and total Scope 3, using category-specific emission factors.
- Calculated results can be saved directly to the emissions log.
- "Load Sample" populates example spend values for demonstration.

---

### US-ESG-03 — Generate a Compliance Report (GRI / SASB / TCFD)
**As an** ESG director,  
**I want** to generate a compliance report in a selected framework (GRI, SASB, or TCFD) based on the platform's live emissions data,  
**so that** I can fulfil regulatory disclosure requirements or voluntary reporting commitments.

**Acceptance Criteria:**
- `POST /api/esg/reports/generate` accepts `framework` (GRI/SASB/TCFD) and `year`.
- GRI report includes standards 305-1 through 305-5 with computed values from live data.
- SASB report includes sector-specific metric EM-CO-110a.1.
- TCFD report generates governance, strategy, risk management, and metrics & targets sections.
- Generated reports are stored with framework badge and accessible from the Reports tab.

---

### US-ESG-04 — Set and Track Emissions Targets
**As an** ESG manager,  
**I want** to set annual emissions reduction targets and track progress against them,  
**so that** the business has clear accountability for its sustainability commitments.

**Acceptance Criteria:**
- Target record contains: scope, baseline year, target year, baseline CO₂e, and target CO₂e.
- Progress is shown as a percentage reduction chart on the ESG dashboard.
- Alert is triggered when actual emissions trend puts the target at risk.

---

## 26. Compliance & Audit

### US-COMP-01 — Audit Log Review
**As a** compliance officer,  
**I want** to search and review the platform-wide audit log,  
**so that** I can investigate any user action or data change.

**Acceptance Criteria:**
- Every create, update, delete, and login event is written to the audit log with: user, tenant, action, resource type, resource ID, and timestamp.
- Audit log is immutable — no API endpoint permits deletion of log entries.
- Search supports filters: user, action, date range, resource type.
- Log entries can be exported to CSV for external audit tools.

---

### US-COMP-02 — Compliance Policy Management
**As a** compliance officer,  
**I want** to define, publish, and track acknowledgement of compliance policies,  
**so that** the organisation maintains documented evidence of policy awareness.

**Acceptance Criteria:**
- Policy record contains: title, version, effective date, content, and required roles.
- Users with required roles are prompted to acknowledge the policy on next login after publication.
- Acknowledgement log records user ID and timestamp.
- Policy compliance report shows pending vs. acknowledged counts per policy.

---

### US-COMP-03 — Compliance Certificates
**As a** quality manager,  
**I want** to issue and track compliance certificates (e.g. ISO, safety certifications) for assets or personnel,  
**so that** the business can demonstrate certification status at any time.

**Acceptance Criteria:**
- Certificate record contains: type, holder (asset or person), issue date, expiry date, issuing body, and document attachment.
- Expiry alerts are sent 60 and 30 days before expiry.
- Certificate dashboard shows active, expiring-soon, and expired certificates.

---

### US-COMP-04 — Audit Framework Assessments
**As a** compliance officer,  
**I want** to run structured assessments against compliance frameworks (e.g. ISO 27001, SOC 2),  
**so that** gaps are identified and tracked to closure.

**Acceptance Criteria:**
- Framework is selected from a built-in library (ISO 27001, SOC 2 Type II, GDPR).
- Assessment generates a checklist of controls with status: compliant, partial, non-compliant.
- Non-compliant controls generate remediation tasks.
- Assessment history tracks progress over time.

---

## 27. Analytics, Dashboards & Reporting

### US-ANLT-01 — Main Analytics Dashboard
**As a** business user,  
**I want** a pre-built analytics dashboard with key operational metrics,  
**so that** I have an at-a-glance view of business performance.

**Acceptance Criteria:**
- Dashboard shows: work order completion rate, first-time fix rate, technician utilisation, SLA adherence, revenue this period, and open tickets.
- All KPIs update in near-real time.
- Dashboard is filterable by date range and team/territory.

---

### US-ANLT-02 — Custom Dashboard Builder
**As a** power user,  
**I want** to build custom dashboards by selecting, configuring, and arranging charts,  
**so that** I can monitor the metrics most important to my role.

**Acceptance Criteria:**
- Dashboard builder supports: bar charts, line charts, pie charts, KPI cards, and tables.
- Charts are configurable with data source, metric, filters, and colour scheme.
- Layouts are drag-and-drop adjustable.
- Saved dashboards are available to all users with the required role.

---

### US-ANLT-03 — Scheduled Reports
**As a** manager,  
**I want** to schedule reports to run automatically and be delivered to my inbox,  
**so that** I receive regular business summaries without logging in.

**Acceptance Criteria:**
- Scheduled report is configured with: report type, format (CSV/PDF), schedule (daily/weekly/monthly), and recipient email list.
- `POST /api/scheduled-reports/:id/run-now` executes the report and returns a real row count from the target collection.
- Report delivery triggers the communications service (email) when configured.

> ⚠️ **Known Gap:** PDF rendering and email delivery are not yet implemented. The endpoint returns a count confirmation; no file is generated or dispatched until the PDF renderer + communications integration is complete.

---

### US-ANLT-04 — Custom Report Builder
**As a** business analyst,  
**I want** to build ad-hoc reports by selecting fields, filters, and groupings from any data collection,  
**so that** I can answer one-off business questions without engineering support.

**Acceptance Criteria:**
- Report builder lists available data collections and their fields.
- Supports: column selection, filter conditions (equals, contains, greater than, etc.), group-by, sort, and limit.
- Preview shows sample data (first 100 rows).
- Report can be saved, exported to CSV, or added to a dashboard.

---

### US-ANLT-05 — GraphQL Analytics API
**As a** developer or BI tool,  
**I want** to query analytics data via GraphQL,  
**so that** I can build custom integrations or dashboards using a flexible query interface.

**Acceptance Criteria:**
- `POST /api/graphql` accepts GraphQL queries with variables.
- Available query types: `revenueStats`, `revenueContracts`, `taxHistory`, `workOrderStats`, `workOrders`, `assetStats`, `scheduleStats`.
- All queries are tenant-scoped via JWT.
- GraphiQL explorer is available in non-production environments.

---

## 28. Knowledge Base & RAG Engine

### US-KB-01 — Manage Knowledge Base Documents
**As a** content administrator,  
**I want** to upload, edit, and organise knowledge base articles,  
**so that** technicians and the AI assistant have access to accurate reference material.

**Acceptance Criteria:**
- Documents can be uploaded as PDF, DOCX, or plain text.
- On upload, documents are chunked and embedded for vector search.
- Documents are tagged with category, product line, and effective date.
- Deprecated documents can be archived without deletion.

---

### US-KB-02 — Knowledge Base Search
**As a** field technician,  
**I want** to search the knowledge base using natural language,  
**so that** I find relevant procedures and guides without knowing exact document titles.

**Acceptance Criteria:**
- Search endpoint uses vector similarity (Atlas `$vectorSearch` when available; cosine fallback).
- Returns top-k results with title, matched excerpt, and relevance score.
- Results are filtered to the user's tenant content plus any global/shared articles.

---

### US-KB-03 — FAQs Management
**As a** support administrator,  
**I want** to maintain a searchable FAQ library,  
**so that** common customer questions are answered consistently without escalation.

**Acceptance Criteria:**
- FAQ entries have: question, answer, category, and visibility (public / internal).
- Public FAQs are accessible on the customer portal without authentication.
- FAQs are indexed and searchable by keyword.

---

## 29. Customer Portal & Booking

### US-CUST-01 — Customer Self-Service Portal
**As a** customer,  
**I want** to log in to a portal where I can view my service history and open issues,  
**so that** I have visibility of work being done on my behalf without calling the office.

**Acceptance Criteria:**
- Portal shows: open work orders, recent job history, outstanding invoices, and active contracts.
- Customer can download invoices and job completion reports.
- Portal is accessible on mobile and tablet browsers.

---

### US-CUST-02 — Customer Booking
**As a** customer,  
**I want** to book a service appointment via the portal,  
**so that** I can schedule work at a convenient time without speaking to an agent.

**Acceptance Criteria:**
- Booking form presents available time slots based on technician schedules and territory.
- Customer selects slot, describes the issue, and confirms the booking.
- Booking creates a work order with status `booked` and sends a confirmation.
- Customer can view and cancel upcoming bookings from the portal.

---

### US-CUST-03 — Customer 360 View
**As a** customer success manager,  
**I want** to see a complete 360-degree view of a customer — their account, contacts, service history, invoices, CRM deals, and communication history — on one page,  
**so that** I have full context for every customer interaction.

**Acceptance Criteria:**
- Customer 360 page is linked from the account record.
- Shows: account summary, contact list, work order timeline, invoice aging, open deals, and recent activities.
- All data panels update when the account is changed.

---

### US-CUST-04 — Customer Success Management
**As a** customer success manager,  
**I want** to track customer health scores, upcoming renewals, and escalation risks,  
**so that** I proactively retain at-risk accounts.

**Acceptance Criteria:**
- Customer health score is computed from: invoice payment history, ticket volume, SLA adherence, and engagement activity.
- Renewals due in the next 90 days are listed with contract value and risk flag.
- Success manager can add health notes and set follow-up reminders.

---

### US-CUST-05 — Customer Surveys
**As a** customer experience manager,  
**I want** to send satisfaction surveys after job completion,  
**so that** I measure NPS and CSAT and identify improvement opportunities.

**Acceptance Criteria:**
- Survey is triggered automatically on work order completion (when communications are live).
- Survey includes NPS (0–10) and CSAT (1–5) questions with optional comment field.
- Results aggregate into NPS and CSAT dashboards filterable by team/period.

---

## 30. Partner Portal & Subcontractors

### US-PART-01 — Partner Self-Service Portal
**As a** partner organisation,  
**I want** a dedicated portal where I can view assigned work orders and submit updates,  
**so that** I collaborate with the primary operator without needing full platform access.

**Acceptance Criteria:**
- Partner portal is accessible via a separate URL with partner_admin credentials.
- Shows work orders assigned to the partner's organisation.
- Partner can update work order status and submit completion notes.
- Activity is logged in the audit trail with the partner organisation ID.

---

### US-PART-02 — Subcontractor Management
**As an** operations manager,  
**I want** to register subcontractors, track their certifications, and assign work orders to them,  
**so that** I can extend capacity without hiring full-time employees.

**Acceptance Criteria:**
- Subcontractor profile contains: company name, contact, trade specialisms, certifications, and rate card.
- Certification expiry is tracked and triggers renewal reminders.
- Subcontractor can be assigned work orders in the same way as in-house technicians.
- Subcontractor cost is tracked separately from in-house labour for P&L reporting.

---

## 31. Communications Hub

### US-COMMS-01 — Send an Email Notification
**As a** platform system,  
**I want** to send transactional email notifications (work order status, SLA breach, invoice),  
**so that** relevant parties are kept informed without manual intervention.

**Acceptance Criteria:**
- `POST /api/comms/email` accepts: to, subject, body (HTML and plain text), and template variables.
- When SendGrid or Mailgun is configured, the email is dispatched and a delivery receipt is stored.
- Failed deliveries are retried up to three times with exponential backoff.
- All dispatched emails are logged in `comms_messages` for audit.

> ⚠️ **Known Gap:** Outbound email, SMS, and WhatsApp delivery is currently stubbed (`server/services/comms.js`). Messages are logged server-side but not dispatched. Integration with SendGrid/Mailgun (email) and Twilio (SMS/WhatsApp) is required. Estimated fix effort: 2–3 weeks.

---

### US-COMMS-02 — Send an SMS Notification
**As a** platform system,  
**I want** to send SMS notifications to technicians and customers for time-sensitive events,  
**so that** parties without smartphone data access are still reachable.

**Acceptance Criteria:**
- When Twilio is configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`), SMS is dispatched via Twilio SMS API.
- Delivery status is retrieved via Twilio webhook and stored in `comms_messages`.
- Rate limits are enforced to prevent excessive messaging.

> ⚠️ **Known Gap:** See US-COMMS-01.

---

### US-COMMS-03 — Send a WhatsApp Message
**As a** field operations team,  
**I want** to send work order updates via WhatsApp,  
**so that** technicians on WhatsApp receive job details without a separate app.

**Acceptance Criteria:**
- When WhatsApp Business API is configured, messages are dispatched through the WhatsApp API.
- Inbound WhatsApp replies are captured via webhook and linked to the relevant work order or ticket.

> ⚠️ **Known Gap:** See US-COMMS-01.

---

### US-COMMS-04 — Comms Hub Inbox
**As an** operator,  
**I want** a unified inbox showing all inbound messages across email, SMS, and WhatsApp,  
**so that** I respond to customer and technician messages from one interface.

**Acceptance Criteria:**
- Comms Hub shows messages grouped by channel and conversation thread.
- Unread messages are highlighted with a count badge.
- Operator can reply from within the hub; reply is dispatched on the same channel.
- Messages are linked to the relevant CRM contact or work order where possible.

---

## 32. FlowSpace — AI Decision Governance

### US-FLOW-01 — Write a Decision Record
**As a** platform service,  
**I want** significant automated decisions to be written to an immutable decision ledger,  
**so that** every AI or system action is traceable and auditable.

**Acceptance Criteria:**
- `POST /api/flowspace/records` requires: tenantId, domain, actorType, actorId, action, and rationale.
- Records are append-only; no update or delete endpoint exists.
- All records are tenant-scoped; cross-tenant reads return 403.
- Scheduling, agent runs, and ML predictions write to FlowSpace automatically.

---

### US-FLOW-02 — Browse the Decision Ledger
**As a** compliance officer,  
**I want** to browse and search the decision ledger,  
**so that** I can audit the platform's automated decisions for fairness and accuracy.

**Acceptance Criteria:**
- Decision Ledger page lists all records for the tenant with: domain, actor type, action, timestamp, and status.
- Search supports filters by domain, actor, date range.
- Record detail shows: full rationale, lineage context (parent decisions), and linked entity.

---

### US-FLOW-03 — EU AI Act Article 13 Explanation
**As a** data subject or compliance officer,  
**I want** to request a structured explanation of a specific AI decision in compliance with EU AI Act Article 13 and GDPR Article 22,  
**so that** affected individuals understand how automated decisions were made.

**Acceptance Criteria:**
- `POST /api/flowspace/records/:id/explain` generates a structured explanation with: purpose (domain-aware), decision logic, lineage context, significance & impact, human oversight statement, four GDPR data subject rights, and appeal mechanism.
- High-risk AI decisions show an orange human oversight alert.
- Explanations are stored in `decision_explanations` for future audit.
- "AI Act Explain" tab in the Record Detail dialog renders the full explanation.

---

### US-FLOW-04 — Decision Lineage
**As a** compliance auditor,  
**I want** to trace the lineage of a decision to see which prior decisions or data inputs contributed to it,  
**so that** I can reconstruct the full causal chain for an audit.

**Acceptance Criteria:**
- `GET /api/flowspace/records/:id/lineage` returns the decision and all ancestor records in order.
- Lineage view renders as a directed graph or ordered list.
- Each node in the lineage shows: actor, action, and timestamp.

---

## 33. DEX — Execution Contexts

### US-DEX-01 — Create an Execution Context
**As a** workflow architect,  
**I want** to create a DEX ExecutionContext to track the lifecycle of a multi-step process,  
**so that** long-running operations have an auditable state machine.

**Acceptance Criteria:**
- `POST /api/dex/contexts` creates a context with: name, type, initial stage (`created`), and optional metadata.
- Context ID is returned and used to link subsequent steps.
- Context creation is written to the FlowSpace ledger.

---

### US-DEX-02 — Advance Context Stage
**As a** workflow service,  
**I want** to advance a DEX context through its defined stages,  
**so that** the process lifecycle is explicitly tracked rather than inferred from data fields.

**Acceptance Criteria:**
- Valid stage transitions: `created → assigned → in_progress → pending_review → completed → closed`.
- Terminal stages (`completed`, `closed`, `failed`, `cancelled`) cannot be advanced further.
- Invalid transitions return a 409 Conflict with the reason.
- Every stage transition is recorded with timestamp and actor.

---

### US-DEX-03 — DEX Flows
**As a** workflow architect,  
**I want** to define reusable flow templates that specify the permitted stage sequence and required metadata per stage,  
**so that** context execution follows a consistent and validated path.

**Acceptance Criteria:**
- Flow template defines: stage list, required fields per stage, and timeout per stage.
- Contexts created from a template inherit the flow's stage validation rules.
- Expired stage alerts are raised when a stage timeout is exceeded.

---

## 34. Marketplace & Extensions

### US-MKT-01 — Browse and Install Extensions
**As a** tenant administrator,  
**I want** to browse available extensions in the marketplace and install the ones I need,  
**so that** I can extend the platform's capabilities without custom development.

**Acceptance Criteria:**
- Marketplace lists extensions with: name, description, category, price, and install count.
- Search and category filter narrow results.
- `POST /api/marketplace/install` creates an `extension_installations` record; paid extensions generate a billing transaction.
- Installed extensions show an "Uninstall" button instead of "Install".

---

### US-MKT-02 — Submit an Extension
**As a** third-party developer,  
**I want** to submit an extension to the marketplace for review,  
**so that** I can distribute my integration to Guardian Flow customers.

**Acceptance Criteria:**
- `POST /api/marketplace/submit` accepts: name, description, category, version, manifest URL, and pricing.
- Submitted extension enters the review queue with status `pending_review`.
- Developer receives a submission confirmation reference.

---

### US-MKT-03 — Admin: Approve / Reject Extensions
**As a** platform administrator,  
**I want** to review submitted extensions and approve or reject them,  
**so that** only safe and functional extensions are available to tenants.

**Acceptance Criteria:**
- Admin review queue lists all `pending_review` extensions with submission details.
- `POST /api/marketplace/admin/approve/:id` sets status to `approved` and makes the extension publicly listed.
- `POST /api/marketplace/admin/reject/:id` requires a rejection reason; status is set to `rejected` and developer is notified.
- Admin stats card shows total extensions, pending, approved, and total installs.

---

## 35. Developer Platform & API Gateway

### US-DEV-01 — Register an OAuth Application
**As a** developer,  
**I want** to register an OAuth application and obtain a client ID and secret,  
**so that** I can authenticate API calls from my integration.

**Acceptance Criteria:**
- `POST /api/developer-portal/apps` creates an application record with a 256-bit CSPRNG `client_secret`.
- Client secret is shown once at creation; subsequent reads return a masked value.
- `POST /api/developer-portal/apps/:id/regenerate-secret` rotates the secret with a new 256-bit value.
- All OAuth token exchanges are logged against the application record.

---

### US-DEV-02 — View API Usage Statistics
**As a** developer,  
**I want** to see real-time usage statistics for my registered application,  
**so that** I can monitor consumption and debug integration issues.

**Acceptance Criteria:**
- `GET /api/developer-portal/usage` returns: total requests (from `partner_api_usage` collection), top 5 endpoints by call frequency, and error rate.
- Usage data is accurate and sourced from real API call records (not mocked).
- Stats update within a 5-minute window of actual API calls.

---

### US-DEV-03 — OpenAPI Documentation
**As a** developer,  
**I want** to access interactive API documentation,  
**so that** I can explore and test API endpoints without reading source code.

**Acceptance Criteria:**
- `GET /api/docs` renders Swagger UI with the full OpenAPI 3.1 spec.
- `GET /api/openapi.json` returns the machine-readable spec for import into Postman or other tools.
- Spec covers: Auth, Revenue, Tax, AI, Connectors, GraphQL, Org, FlowSpace, DEX, SSO, IoT.
- Security schemes (Bearer JWT, OAuth2) are correctly described.

---

### US-DEV-04 — SDK Access
**As a** developer,  
**I want** to download an official SDK for my preferred language,  
**so that** I can integrate with Guardian Flow without writing raw HTTP calls.

**Acceptance Criteria:**
- `GET /api/sdk` returns available SDK packages with version, language, and download link.
- JavaScript SDK is available and covers the major API domains.
- SDK changelog is accessible from the developer portal.

---

### US-DEV-05 — Webhooks
**As a** developer,  
**I want** to subscribe to platform events via webhooks,  
**so that** my system is notified of important events in real time without polling.

**Acceptance Criteria:**
- Webhook registration accepts: endpoint URL, event types, and optional secret for signature verification.
- Platform signs payloads with HMAC-SHA256 using the provided secret.
- Failed deliveries (4xx/5xx from the endpoint) are retried with exponential backoff.
- Webhook delivery log shows per-delivery status, HTTP response, and retry count.

---

### US-DEV-06 — Partner API Gateway
**As a** partner organisation,  
**I want** to access platform data via a dedicated API gateway endpoint,  
**so that** my integration is isolated from the main tenant API and subject to partner-specific rate limits.

**Acceptance Criteria:**
- Partner API requests are authenticated with partner OAuth credentials.
- Rate limits are enforced per partner application.
- Usage is logged to `partner_api_usage` and visible in the Developer Portal.
- Scope is restricted to the data collections permitted for the partner role.

---

### US-DEV-07 — ERP Connector Management
**As a** system integrator,  
**I want** to configure and run synchronisation between Guardian Flow and an ERP system (SAP, NetSuite, QuickBooks, Salesforce),  
**so that** data stays consistent across systems without manual re-entry.

**Acceptance Criteria:**
- Supported connector types: `salesforce`, `quickbooks`, `sap`, `netsuite`.
- Each connector supports: connect (store credentials), sync (manual trigger), and webhook receive.
- SAP connector uses OData v4 with Basic/OAuth2 authentication.
- NetSuite connector uses OAuth 1.0a with HMAC-SHA256 signatures.
- Sync log records each run with status, entity, records synced, and errors.

> ⚠️ **Known Gap:** `xero` is registered in the connector list but the service file does not yet exist. Sync is polling-only; event-driven webhook sync is not implemented.

---

## 36. Security & SIEM

### US-SEC-01 — Security Event Monitoring
**As a** security administrator,  
**I want** a dashboard showing security events (failed logins, permission violations, suspicious API calls),  
**so that** I can detect and respond to threats in real time.

**Acceptance Criteria:**
- Security monitor shows: recent events by type, event volume trend, high-severity alerts.
- Event types include: `auth.failed`, `auth.mfa_bypass_attempt`, `permission.denied`, `rate_limit.exceeded`, `token.invalid`.
- High-severity events generate push notifications (when push notifications are configured).

---

### US-SEC-02 — SIEM Integration
**As a** security engineer,  
**I want** to forward platform security events to an external SIEM,  
**so that** Guardian Flow events are correlated with the rest of the organisation's security telemetry.

**Acceptance Criteria:**
- SIEM route accepts configured endpoints for log forwarding (Splunk, Datadog, or generic syslog).
- Events are formatted in CEF or JSON depending on the target SIEM.
- Log forwarding is retried on failure; failed events are queued for replay.

---

### US-SEC-03 — Federated Learning (Privacy-Preserving ML)
**As a** privacy officer,  
**I want** ML models to be trained on federated data without raw data leaving each tenant's boundary,  
**so that** the platform improves its models across tenants while respecting data residency requirements.

**Acceptance Criteria:**
- `POST /api/federated-learning/train` initiates a federated training round using gradient aggregation.
- Raw training data never leaves the tenant's partition.
- Aggregated model updates are returned and merged into the global model.
- Each federated round is logged with participation count and round ID.

---

### US-SEC-04 — Data Residency Configuration
**As a** compliance officer,  
**I want** to configure the data residency region for my organisation's data,  
**so that** all tenant data is stored and processed within the required geographic boundary.

**Acceptance Criteria:**
- `POST /api/data-residency/configure` sets the tenant's preferred region (EU, US, APAC).
- Storage and processing services respect the configured region.
- Data residency configuration is logged in the audit trail.
- A data residency certificate can be generated for compliance evidence.

---

## 37. Platform Administration & Configuration

### US-ADMIN-01 — Admin Console
**As a** system administrator,  
**I want** a centralised admin console for managing users, roles, tenants, and platform configuration,  
**so that** I can support customers without direct database access.

**Acceptance Criteria:**
- Admin console is accessible only to `sys_admin` role.
- Tabs for: Users, Tenants, Roles, System Health, Audit Log, and Platform Config.
- User management supports search, role change, and deactivation.
- Platform config changes are audited with before/after values.

---

### US-ADMIN-02 — White-Label Configuration
**As a** channel partner,  
**I want** to customise the platform's branding (logo, colours, domain) for my customers,  
**so that** the platform appears as my own product.

**Acceptance Criteria:**
- White-label configuration accepts: logo URL, primary/secondary colour, custom domain, and product name.
- All authenticated pages render with the configured branding when accessed from the custom domain.
- White-label settings are isolated per tenant; no cross-tenant leakage.

---

### US-ADMIN-03 — Industry Templates & Onboarding
**As a** new tenant administrator,  
**I want** to select an industry template during onboarding that pre-configures work order types, SLA rules, and pipeline stages,  
**so that** the platform is usable within minutes of signup.

**Acceptance Criteria:**
- Available templates: HVAC, Facilities Management, IT Support, Utilities, Property Management.
- Selecting a template seeds: SLA rule set, pipeline stages, work order categories, and suggested skills.
- All seeded data is fully editable after onboarding.
- Template selection is recorded and can be reapplied to reset configuration.

---

### US-ADMIN-04 — System Health & Observability
**As a** DevOps engineer,  
**I want** a system health dashboard showing API latency, error rates, DB connection status, and queue depths,  
**so that** I can detect degradation before customers are impacted.

**Acceptance Criteria:**
- `GET /api/health` returns: DB connection status, memory usage, uptime, and version.
- Observability dashboard (`/api/observability`) shows: P50/P95/P99 API latency, error rate, active WebSocket connections, and queue depth.
- Prometheus-compatible metrics are available at `GET /metrics`.
- Platform component status (DB, ML, AI, Comms) is shown with green/amber/red indicators.

---

### US-ADMIN-05 — A/B Test Manager
**As a** product manager,  
**I want** to create and monitor A/B experiments on platform features,  
**so that** feature decisions are driven by user behaviour data rather than opinion.

**Acceptance Criteria:**
- A/B test is created with: name, feature flag key, traffic split (%), start/end date, and success metric.
- Users are deterministically assigned to variants using a consistent hash of their user ID.
- Results dashboard shows: conversion rate per variant, statistical significance, and recommendation.

---

### US-ADMIN-06 — Launch Readiness Check
**As a** delivery manager,  
**I want** to run a launch readiness check against a predefined checklist,  
**so that** go-live is only approved when all critical items are confirmed.

**Acceptance Criteria:**
- Readiness check covers: security headers, MFA enforced, HTTPS, DB backup, SSL certificate validity, communications integration, rate limits, and audit logging.
- Each item returns a pass/fail/warn status with evidence.
- Failed items block launch approval; warnings require sign-off.
- Readiness report is exportable as PDF for stakeholder sign-off.

---

### US-ADMIN-07 — Platform Metrics & Telemetry
**As a** business analyst,  
**I want** platform-level metrics (active users, feature usage, API call volume) to be tracked and reported,  
**so that** product decisions are informed by actual usage patterns.

**Acceptance Criteria:**
- `trackEvent()` is called automatically via telemetry middleware for every API request.
- Hourly aggregates are flushed to `analytics_hourly_aggregates`.
- Platform Metrics page shows: daily active users, top features by usage, API call trend, and error rate over time.

---

*Document maintained by: Product Team. Last updated: 2026-04-13. Based on codebase HEAD `19080a5`.*
