-- ============================================================
-- COMPLETE 213 TEST ACCOUNTS SEEDING SQL
-- ============================================================
-- This is a complete list of ALL test accounts
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- IMPORTANT: You cannot create auth users directly via SQL
-- You MUST either:
-- 1. Use the Node.js script (seed-accounts.js) with SERVICE_ROLE_KEY
-- 2. Invoke the Edge Function (seed-test-accounts)
-- 3. Manually create via Dashboard Auth UI

-- This file is for REFERENCE ONLY showing all accounts needed

-- ============================================================
-- PLATFORM ACCOUNTS (29 accounts)
-- ============================================================

-- Core Admin (1)
-- admin@techcorp.com | Admin123! | sys_admin

-- Operations (4)
-- ops@techcorp.com | Ops123! | ops_manager
-- ops.sla@techcorp.com | Ops123! | ops_manager
-- ops.dispatch@techcorp.com | Ops123! | ops_manager
-- ops.reports@techcorp.com | Ops123! | ops_manager

-- Finance (4)
-- finance@techcorp.com | Finance123! | finance_manager
-- finance.invoicing@techcorp.com | Finance123! | finance_manager
-- finance.forecast@techcorp.com | Finance123! | finance_manager
-- finance.disputes@techcorp.com | Finance123! | finance_manager

-- Compliance (4)
-- auditor@techcorp.com | Auditor123! | auditor
-- auditor.evidence@techcorp.com | Auditor123! | auditor
-- auditor.vuln@techcorp.com | Auditor123! | auditor
-- auditor.logs@techcorp.com | Auditor123! | auditor

-- Fraud (3)
-- fraud@techcorp.com | Fraud123! | fraud_investigator
-- fraud.anomaly@techcorp.com | Fraud123! | fraud_investigator
-- fraud.cases@techcorp.com | Fraud123! | fraud_investigator

-- Technicians (3)
-- tech.mobile@techcorp.com | Tech123! | technician
-- tech.photos@techcorp.com | Tech123! | technician
-- tech.complete@techcorp.com | Tech123! | technician

-- Admin variants (3)
-- admin.rbac@techcorp.com | Admin123! | sys_admin
-- admin.jit@techcorp.com | Admin123! | sys_admin
-- admin.health@techcorp.com | Admin123! | sys_admin

-- Product/Developer (3)
-- product.api@techcorp.com | Product123! | product_owner
-- product.webhooks@techcorp.com | Product123! | product_owner
-- product.marketplace@techcorp.com | Product123! | product_owner

-- Support (4)
-- dispatch@techcorp.com | Dispatch123! | dispatcher
-- customer@example.com | Customer123! | customer
-- mlops@techcorp.com | MLOps123! | ml_ops
-- billing@techcorp.com | Billing123! | billing_agent
-- support@techcorp.com | Support123! | support_agent

-- ============================================================
-- PARTNER ACCOUNTS (164 accounts)
-- ============================================================

-- ServicePro (41 accounts)
-- admin@servicepro.com | Partner123! | partner_admin
-- engineer1@servicepro.com | Tech123! | technician
-- engineer2@servicepro.com | Tech123! | technician
-- ... engineer3-40 ...

-- TechField (41 accounts)
-- admin@techfield.com | Partner123! | partner_admin
-- engineer1@techfield.com | Tech123! | technician
-- ... engineer2-40 ...

-- RepairHub (41 accounts)
-- admin@repairhub.com | Partner123! | partner_admin
-- engineer1@repairhub.com | Tech123! | technician
-- ... engineer2-40 ...

-- FixIt (41 accounts)
-- admin@fixit.com | Partner123! | partner_admin
-- engineer1@fixit.com | Tech123! | technician
-- ... engineer2-40 ...

-- ============================================================
-- CLIENT ACCOUNTS (20 accounts)
-- ============================================================

-- OEM Client 1 (4)
-- oem1.admin@client.com | Client123! | client_admin
-- oem1.ops@client.com | Client123! | client_operations_manager
-- oem1.finance@client.com | Client123! | client_finance_manager
-- oem1.procurement@client.com | Client123! | client_procurement_manager

-- OEM Client 2 (4)
-- oem2.admin@client.com | Client123! | client_admin
-- oem2.ops@client.com | Client123! | client_operations_manager
-- oem2.compliance@client.com | Client123! | client_compliance_officer
-- oem2.executive@client.com | Client123! | client_executive

-- Insurance Client 1 (3)
-- insurance1.admin@client.com | Client123! | client_admin
-- insurance1.fraud@client.com | Client123! | client_fraud_manager
-- insurance1.compliance@client.com | Client123! | client_compliance_officer

-- Telecom Client 1 (3)
-- telecom1.admin@client.com | Client123! | client_admin
-- telecom1.ops@client.com | Client123! | client_operations_manager
-- telecom1.finance@client.com | Client123! | client_finance_manager

-- Retail Client 1 (3)
-- retail1.admin@client.com | Client123! | client_admin
-- retail1.ops@client.com | Client123! | client_operations_manager
-- retail1.procurement@client.com | Client123! | client_procurement_manager

-- Healthcare Client 1 (3)
-- healthcare1.admin@client.com | Client123! | client_admin
-- healthcare1.compliance@client.com | Client123! | client_compliance_officer
-- healthcare1.executive@client.com | Client123! | client_executive

-- ============================================================
-- TOTAL: 29 + 164 + 20 = 213 accounts
-- ============================================================

-- This file is for reference only
-- Use seed-accounts.js with SERVICE_ROLE_KEY to create all accounts

