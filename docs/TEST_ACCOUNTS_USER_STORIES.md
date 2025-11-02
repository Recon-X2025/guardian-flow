# Guardian Flow - Test Accounts by User Story

**Version:** 6.1.0  
**Date:** November 1, 2025  
**Document Type:** Test Account Reference  
**Status:** Production Ready

---

## Overview

This document provides a comprehensive mapping of test accounts to user stories across all Guardian Flow modules. Each test account is designed to test specific user story functionality and acceptance criteria.

**Total Test Accounts:** 195+ accounts
- **Platform Users:** 29 accounts (by module and user story)
- **Partner Organizations:** 4 organizations
- **Partner Admins:** 4 accounts
- **Partner Engineers:** 160 accounts (40 per organization)
- **Client Organizations:** 7 enterprise organizations
- **Client Accounts:** 21 accounts across industries

---

## Test Account Organization by Module

### Operations Manager Module

#### US-OP-001: Create and Assign Work Order
**Account:** ops@techcorp.com  
**Password:** Ops123!  
**Role:** ops_manager  
**Purpose:** Test creating work orders, automatic technician assignment, and SLA countdown initiation

#### US-OP-002: Monitor SLA Compliance in Real-Time
**Account:** ops.sla@techcorp.com  
**Password:** Ops123!  
**Role:** ops_manager  
**Purpose:** Test SLA monitoring dashboard, color-coded indicators, and at-risk alerts

#### US-OP-003: Dispatch Technician with Route Optimization
**Account:** ops.dispatch@techcorp.com  
**Password:** Ops123!  
**Role:** ops_manager  
**Purpose:** Test multi-technician dispatch, route optimization, and dynamic re-optimization

#### US-OP-004: Generate Operational Performance Reports
**Account:** ops.reports@techcorp.com  
**Password:** Ops123!  
**Role:** ops_manager  
**Purpose:** Test report generation, KPI tracking, and export capabilities

---

### Finance Manager Module

#### US-FIN-001: Automated Penalty Calculation
**Account:** finance@techcorp.com  
**Password:** Finance123!  
**Role:** finance_manager  
**Purpose:** Test automated penalty calculation on SLA breaches, configurable rules

#### US-FIN-002: Generate Accurate Invoices
**Account:** finance.invoicing@techcorp.com  
**Password:** Finance123!  
**Role:** finance_manager  
**Purpose:** Test invoice generation with multi-currency support, tax calculations, and discounts

#### US-FIN-003: Revenue Forecasting Dashboard
**Account:** finance.forecast@techcorp.com  
**Password:** Finance123!  
**Role:** finance_manager  
**Purpose:** Test AI-generated revenue forecasts, confidence intervals, and trend analysis

#### US-FIN-004: Handle Billing Disputes
**Account:** finance.disputes@techcorp.com  
**Password:** Finance123!  
**Role:** finance_manager  
**Purpose:** Test dispute tracking, resolution workflows, and audit trails

---

### Compliance/Audit Module

#### US-COMP-001: Conduct Quarterly Access Reviews
**Account:** auditor@techcorp.com  
**Password:** Auditor123!  
**Role:** auditor  
**Purpose:** Test access review campaigns, automated notifications, and auto-revocation

#### US-COMP-002: Collect Compliance Evidence
**Account:** auditor.evidence@techcorp.com  
**Password:** Auditor123!  
**Role:** auditor  
**Purpose:** Test automated evidence collection for SOC 2 and ISO 27001

#### US-COMP-003: Monitor Vulnerability Remediation SLAs
**Account:** auditor.vuln@techcorp.com  
**Password:** Auditor123!  
**Role:** auditor  
**Purpose:** Test vulnerability tracking, SLA countdown, and remediation compliance

#### US-COMP-004: Review Immutable Audit Logs
**Account:** auditor.logs@techcorp.com  
**Password:** Auditor123!  
**Role:** auditor  
**Purpose:** Test 7-year audit log archives, tamper-proof verification, and export

---

### Fraud Investigator Module

#### US-FRAUD-001: Detect Document Forgery
**Account:** fraud@techcorp.com  
**Password:** Fraud123!  
**Role:** fraud_investigator  
**Purpose:** Test AI forgery detection, scoring, and manual review queue routing

#### US-FRAUD-002: Investigate Anomalous Behavior
**Account:** fraud.anomaly@techcorp.com  
**Password:** Fraud123!  
**Role:** fraud_investigator  
**Purpose:** Test anomaly detection dashboard, factor explanation, and user flagging

#### US-FRAUD-003: Manage Fraud Cases
**Account:** fraud.cases@techcorp.com  
**Password:** Fraud123!  
**Role:** fraud_investigator  
**Purpose:** Test case management, evidence attachment, and investigation workflows

---

### Technician Module (Field Operations)

#### US-TECH-001: View and Accept Work Orders on Mobile
**Account:** tech.mobile@techcorp.com  
**Password:** Tech123!  
**Role:** technician  
**Purpose:** Test mobile work order viewing, acceptance, and offline mode

#### US-TECH-002: Capture Photos and Upload to Work Order
**Account:** tech.photos@techcorp.com  
**Password:** Tech123!  
**Role:** technician  
**Purpose:** Test photo capture, geotagging, validation, and attachment

#### US-TECH-003: Mark Work Order Complete
**Account:** tech.complete@techcorp.com  
**Password:** Tech123!  
**Role:** technician  
**Purpose:** Test completion workflow, parts tracking, and customer signature capture

---

### System Administrator Module (Platform Management)

#### US-ADMIN-001: Manage User Roles and Permissions
**Account:** admin.rbac@techcorp.com  
**Password:** Admin123!  
**Role:** sys_admin  
**Purpose:** Test role assignment, permission management, and audit trails

#### US-ADMIN-002: Grant Just-In-Time (JIT) Privileged Access
**Account:** admin.jit@techcorp.com  
**Password:** Admin123!  
**Role:** sys_admin  
**Purpose:** Test temporary access grants, auto-expiration, and approval workflows

#### US-ADMIN-003: Monitor System Health
**Account:** admin.health@techcorp.com  
**Password:** Admin123!  
**Role:** sys_admin  
**Purpose:** Test system metrics, edge function performance, and alert management

---

### Product Owner / Developer Module

#### US-DEV-001: Access Comprehensive API Documentation
**Account:** product.api@techcorp.com  
**Password:** Product123!  
**Role:** product_owner  
**Purpose:** Test API documentation, interactive testing, and code examples

#### US-DEV-002: Create Webhooks for Event Notifications
**Account:** product.webhooks@techcorp.com  
**Password:** Product123!  
**Role:** product_owner  
**Purpose:** Test webhook registration, event delivery, and retry mechanisms

#### US-DEV-003: Deploy Extension to Marketplace
**Account:** product.marketplace@techcorp.com  
**Password:** Product123!  
**Role:** product_owner  
**Purpose:** Test extension publishing, security review, and marketplace listing

---

### Support Roles (General Testing)

These accounts don't map to specific user stories but support general platform functionality:

| Account | Password | Role | Purpose |
|---------|----------|------|---------|
| admin@techcorp.com | Admin123! | sys_admin | Full platform admin access |
| dispatch@techcorp.com | Dispatch123! | dispatcher | Dispatch operations |
| customer@example.com | Customer123! | customer | Customer portal |
| mlops@techcorp.com | MLOps123! | ml_ops | ML model management |
| billing@techcorp.com | Billing123! | billing_agent | Billing operations |
| support@techcorp.com | Support123! | support_agent | Customer support |

---

### Partner Organizations (Multi-Tenant Testing)

Each partner organization has 1 admin and 40 engineers for testing tenant isolation:

#### ServicePro Partners
- **Admin:** admin@servicepro.com (Password: Partner123!)
- **Engineers:** engineer1@servicepro.com through engineer40@servicepro.com (Password: Tech123!)

#### TechField Solutions
- **Admin:** admin@techfield.com (Password: Partner123!)
- **Engineers:** engineer1@techfield.com through engineer40@techfield.com (Password: Tech123!)

#### RepairHub Network
- **Admin:** admin@repairhub.com (Password: Partner123!)
- **Engineers:** engineer1@repairhub.com through engineer40@repairhub.com (Password: Tech123!)

#### FixIt Partners
- **Admin:** admin@fixit.com (Password: Partner123!)
- **Engineers:** engineer1@fixit.com through engineer40@fixit.com (Password: Tech123!)

---

### Client Organizations (Enterprise Customers)

#### OEM Client 1 - Technology Manufacturing
**Industry:** Technology Manufacturing  
**Focus:** Multi-vendor field service management  

- **Admin:** oem1.admin@client.com (Password: Client123!) - UC-CLIENT-FSM-001: Monitor Multi-Vendor Performance
- **Operations:** oem1.ops@client.com (Password: Client123!) - UC-CLIENT-FSM-002: Approve Service Orders
- **Finance:** oem1.finance@client.com (Password: Client123!) - UC-CLIENT-FSM-003: Vendor Cost Analysis
- **Procurement:** oem1.procurement@client.com (Password: Client123!) - UC-CLIENT-ASSET-002: Vendor Selection & Contracts

#### OEM Client 2 - Consumer Electronics
**Industry:** Consumer Electronics Manufacturing  
**Focus:** Production line equipment & asset lifecycle management  

- **Admin:** oem2.admin@client.com (Password: Client123!) - UC-CLIENT-ASSET-001: Track Equipment Maintenance
- **Operations:** oem2.ops@client.com (Password: Client123!) - UC-CLIENT-ASSET-001: Production Line Equipment
- **Compliance:** oem2.compliance@client.com (Password: Client123!) - UC-CLIENT-FRAUD-002: Quality & Safety Compliance
- **Executive:** oem2.executive@client.com (Password: Client123!) - UC-CLIENT-ANALYTICS-001: Executive Vendor Dashboards

#### Insurance Client 1 - Financial Services
**Industry:** Insurance  
**Focus:** Fraud detection & compliance management  

- **Admin:** insurance1.admin@client.com (Password: Client123!) - UC-CLIENT-FRAUD-001: Manage Fraud Detection Vendors
- **Fraud:** insurance1.fraud@client.com (Password: Client123!) - UC-CLIENT-FRAUD-002: Coordinate Investigations
- **Compliance:** insurance1.compliance@client.com (Password: Client123!) - UC-CLIENT-ASSET-002: Regulatory Compliance Monitoring

#### Telecom Client 1 - Telecommunications
**Industry:** Telecommunications  
**Focus:** Network infrastructure & vendor cost optimization  

- **Admin:** telecom1.admin@client.com (Password: Client123!) - UC-CLIENT-FSM-001: Network Maintenance Vendors
- **Operations:** telecom1.ops@client.com (Password: Client123!) - UC-CLIENT-FSM-003: Tower & Fiber Vendor Management
- **Finance:** telecom1.finance@client.com (Password: Client123!) - UC-CLIENT-ANALYTICS-002: Vendor Cost Optimization

#### Retail Client 1 - Retail & E-commerce
**Industry:** Retail & E-commerce  
**Focus:** Supply chain & logistics vendor management  

- **Admin:** retail1.admin@client.com (Password: Client123!) - UC-CLIENT-FSM-001: Supply Chain Vendor Management
- **Operations:** retail1.ops@client.com (Password: Client123!) - UC-CLIENT-FSM-003: Delivery Partner Oversight
- **Procurement:** retail1.procurement@client.com (Password: Client123!) - UC-CLIENT-ASSET-002: Logistics Vendor Selection

#### Healthcare Client 1 - Healthcare
**Industry:** Healthcare  
**Focus:** Medical equipment maintenance & regulatory compliance  

- **Admin:** healthcare1.admin@client.com (Password: Client123!) - UC-CLIENT-ASSET-001: Medical Equipment Maintenance
- **Compliance:** healthcare1.compliance@client.com (Password: Client123!) - UC-CLIENT-FRAUD-002: Regulatory Compliance & Audits
- **Executive:** healthcare1.executive@client.com (Password: Client123!) - UC-CLIENT-ANALYTICS-001: Healthcare Vendor Dashboard

---

## Testing Workflows by User Story

### Testing US-OP-001: Work Order Creation
1. Log in as ops@techcorp.com
2. Navigate to Work Orders → Create New
3. Fill in customer, equipment, and service details
4. Verify automatic technician assignment
5. Confirm SLA countdown starts
6. Check customer notification sent

### Testing US-FIN-001: Penalty Calculation
1. Log in as finance@techcorp.com
2. Create a work order that will breach SLA
3. Wait for SLA deadline to pass
4. Verify automatic penalty calculation
5. Check penalty visible on invoice
6. Review audit trail

### Testing US-COMP-001: Access Reviews
1. Log in as auditor@techcorp.com
2. Navigate to Compliance → Access Reviews
3. Create new quarterly campaign
4. Verify review items generated
5. Check email notifications sent
6. Test auto-revocation after 30 days

### Testing US-FRAUD-001: Document Forgery Detection
1. Upload a manipulated photo as tech.photos@techcorp.com
2. Log in as fraud@techcorp.com
3. Navigate to Fraud → Alerts
4. Verify photo flagged with forgery score
5. Review in manual queue
6. Submit feedback to improve model

### Testing US-TECH-001: Mobile Work Orders
1. Log in as tech.mobile@techcorp.com on mobile
2. View assigned work orders list
3. Tap work order to see details
4. Click "Accept" button
5. Verify navigation to customer site works
6. Test offline mode by disabling network

### Testing US-ADMIN-001: Role Management
1. Log in as admin.rbac@techcorp.com
2. Navigate to Settings → Users
3. Assign role to a user
4. Verify role assignment logged
5. Check user receives email notification
6. Review audit trail

### Testing US-DEV-001: API Documentation
1. Log in as product.api@techcorp.com
2. Navigate to Developer → API Docs
3. Browse endpoint documentation
4. Test API call from interactive console
5. Copy code example (Python/JavaScript)
6. Verify authentication methods explained

---

## Tenant Isolation Testing

### Test Scenario 1: Finance Data Isolation
1. Log in as admin@servicepro.com
2. Navigate to Finance page
3. **Expected:** Only see invoices/work orders for ServicePro's 40 engineers
4. **Should NOT see:** Any data from TechField, RepairHub, or FixIt

### Test Scenario 2: Cross-Tenant Access Prevention
1. Log in as admin@techfield.com
2. Attempt to access work order from another tenant (direct URL)
3. **Expected:** Access Denied or 403 error
4. Verify audit log shows unauthorized access attempt

### Test Scenario 3: Partner Admin Scope
1. Log in as admin@repairhub.com
2. Check system settings
3. **Expected:** Can only manage RepairHub tenant configuration
4. Cannot create new tenants or modify global settings

### Test Scenario 4: Client-Vendor Data Isolation
1. Log in as oem1.ops@client.com
2. Navigate to vendor dashboard
3. **Expected:** See only vendors contracted with OEM Client 1
4. **Should NOT see:** Vendors contracted with other clients

### Test Scenario 5: Client SLA Monitoring
1. Log in as retail1.ops@client.com
2. View delivery partner performance dashboard
3. **Expected:** See Retail Client 1-specific delivery SLAs and metrics
4. Filter by delivery partner vendor
5. Verify real-time status updates

### Test Scenario 6: Client Fraud Coordination
1. Log in as insurance1.fraud@client.com
2. Create fraud investigation case
3. Assign to fraud detection vendor
4. **Expected:** Case visible to Insurance Client 1 fraud team and assigned vendor
5. **Should NOT be visible:** To other clients or non-assigned vendors

---

## Client-Specific Testing Workflows

### Testing UC-CLIENT-FSM-001: Multi-Vendor Performance Monitoring
1. Log in as oem1.ops@client.com
2. Navigate to Vendor Performance Dashboard
3. View aggregated SLA compliance across all OEM Client 1 vendors
4. Filter by vendor type, region, or service category
5. Export vendor performance report
6. Verify real-time alerts for at-risk work orders

### Testing UC-CLIENT-ASSET-001: Equipment Maintenance Tracking
1. Log in as oem2.ops@client.com
2. Navigate to Asset Lifecycle Management
3. View all production line equipment
4. Check scheduled maintenance by vendor
5. Review maintenance history for specific equipment
6. Verify vendor MTTR benchmarks

### Testing UC-CLIENT-FRAUD-001: Fraud Vendor Performance
1. Log in as insurance1.admin@client.com
2. Navigate to Fraud Detection Dashboard
3. View fraud detection accuracy by vendor
4. Monitor false positive rates
5. Review ML model performance metrics
6. Export fraud prevention ROI report

### Testing UC-CLIENT-ANALYTICS-001: Executive Vendor Dashboard
1. Log in as oem2.executive@client.com
2. View executive-level vendor KPIs
3. Review cost efficiency trends
4. Check vendor risk assessments
5. Generate executive summary report
6. Compare vendor performance year-over-year

---

## Account Seeding Instructions

### Automatic Seeding (Recommended)
1. Navigate to the authentication page
2. Click "Seed Test Accounts" button
3. Wait for seeding to complete (~30 seconds)
4. Verify success message shows account counts

### Manual Seeding (Alternative)
```bash
# Using Supabase CLI
supabase functions invoke seed-test-accounts --env-file .env.local

# Or using curl
curl -X POST https://your-project.supabase.co/functions/v1/seed-test-accounts \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## Account Maintenance

### Updating Passwords
- All test accounts use standardized passwords by role
- Passwords follow pattern: `[Role]123!` (e.g., Ops123!, Finance123!)
- Never use test accounts in production environments

### Adding New User Story Accounts
When adding new user stories:
1. Update `generateTestAccounts()` function in `supabase/functions/seed-test-accounts/index.ts`
2. Add account with module and userStory metadata
3. Update this documentation with new account details
4. Test account creation and login

### Cleaning Up Test Accounts
```sql
-- Delete all test accounts (use with caution)
DELETE FROM auth.users 
WHERE email LIKE '%@techcorp.com' 
   OR email LIKE '%@servicepro.com' 
   OR email LIKE '%@techfield.com' 
   OR email LIKE '%@repairhub.com' 
   OR email LIKE '%@fixit.com' 
   OR email LIKE 'customer@example.com'
   OR email LIKE '%@client.com';

-- Delete related role assignments
DELETE FROM public.user_roles;

-- Delete client and partner tenants
DELETE FROM public.tenants 
WHERE slug IN ('oem-client-1', 'oem-client-2', 'insurance-client-1', 'telecom-client-1', 'retail-client-1', 'healthcare-client-1', 'servicepro', 'techfield', 'repairhub', 'fixit');
```

---

## Security Notes

⚠️ **IMPORTANT:** 
- Test accounts are for development and QA only
- Never deploy test accounts to production
- Regularly rotate passwords in development environments
- Use strong, unique passwords for production accounts
- Test accounts may have elevated permissions - use cautiously

---

## Quick Reference

### By Password Pattern
- **Ops123!** - Operations Manager accounts
- **Finance123!** - Finance Manager accounts
- **Auditor123!** - Compliance/Audit accounts
- **Fraud123!** - Fraud Investigator accounts
- **Tech123!** - Technician accounts
- **Admin123!** - System Administrator accounts
- **Product123!** - Product Owner/Developer accounts
- **Partner123!** - Partner Admin accounts
- **Client123!** - Client (Enterprise Customer) accounts
- **Dispatch123!** - Dispatcher account
- **Customer123!** - Customer account
- **MLOps123!** - ML Operations account
- **Billing123!** - Billing Agent account
- **Support123!** - Support Agent account

### By Email Pattern
- **ops.***@techcorp.com - Operations variations
- **finance.***@techcorp.com - Finance variations
- **auditor.***@techcorp.com - Audit variations
- **fraud.***@techcorp.com - Fraud variations
- **tech.***@techcorp.com - Technician variations
- **admin.***@techcorp.com - Admin variations
- **product.***@techcorp.com - Product Owner variations
- **admin@***.com - Partner admin accounts
- **engineer{N}@***.com - Partner engineer accounts (1-40)
- **oem1.***@client.com - OEM Client 1 accounts
- **oem2.***@client.com - OEM Client 2 accounts
- **insurance1.***@client.com - Insurance Client 1 accounts
- **telecom1.***@client.com - Telecom Client 1 accounts
- **retail1.***@client.com - Retail Client 1 accounts
- **healthcare1.***@client.com - Healthcare Client 1 accounts

---

**Document Maintenance:**
- Review quarterly and update with new user stories
- Add new test accounts when user stories are added
- Archive deprecated test accounts and documentation
- Keep passwords synchronized with seeding function

