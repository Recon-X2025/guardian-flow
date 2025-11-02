-- ============================================================
-- Guardian Flow: Fix Missing Permissions for Route Access
-- Migration: 20251101162000
-- ============================================================
-- This migration adds missing permissions required by routes in App.tsx
-- Many routes check for permissions that don't exist in the database

-- 1. Insert missing permissions
INSERT INTO public.permissions (name, category, description) VALUES
-- Customer Management
('customers.view', 'customers', 'View customer information'),
('customers.create', 'customers', 'Create new customers'),
('customers.update', 'customers', 'Update customer details'),
('customers.delete', 'customers', 'Delete customers'),

-- Technician Management
('technicians.view', 'technicians', 'View technician information'),
('technicians.create', 'technicians', 'Create new technicians'),
('technicians.update', 'technicians', 'Update technician details'),
('technicians.delete', 'technicians', 'Delete technicians'),

-- Equipment Management
('equipment.view', 'equipment', 'View equipment information'),
('equipment.create', 'equipment', 'Create new equipment'),
('equipment.update', 'equipment', 'Update equipment details'),
('equipment.delete', 'equipment', 'Delete equipment'),

-- Contract Management
('contracts.view', 'contracts', 'View service contracts'),
('contracts.create', 'contracts', 'Create new contracts'),
('contracts.update', 'contracts', 'Update contract details'),
('contracts.delete', 'contracts', 'Delete contracts'),

-- Customer Portal Access
('portal.access', 'portal', 'Access customer portal'),

-- Predictive Maintenance
('maintenance.view', 'maintenance', 'View maintenance schedules'),
('maintenance.create', 'maintenance', 'Create maintenance tasks'),
('maintenance.update', 'maintenance', 'Update maintenance details'),
('maintenance.delete', 'maintenance', 'Delete maintenance tasks'),

-- Partner Portal
('partners.view', 'partners', 'View partner information'),
('partners.create', 'partners', 'Create new partners'),
('partners.update', 'partners', 'Update partner details'),
('partners.delete', 'partners', 'Delete partners'),

-- Compliance Module
('compliance.view', 'compliance', 'View compliance dashboard'),
('compliance.manage', 'compliance', 'Manage compliance tasks'),
('compliance.report', 'compliance', 'Generate compliance reports'),

-- Analytics Platform (note the colon in the route, but use dot in DB)
('analytics.view', 'analytics', 'View analytics platform'),
('analytics.export', 'analytics', 'Export analytics data'),

-- Invoice Management Extensions
('invoice.view_all', 'finance', 'View all invoices across tenants'),
('invoice.approve', 'finance', 'Approve invoices'),

-- Work Order Extensions
('work_order.view_all', 'work_order', 'View all work orders across tenants')

ON CONFLICT (name) DO NOTHING;

-- 2. Map permissions to sys_admin (gets all permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'sys_admin'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view', 'customers.create', 'customers.update', 'customers.delete',
  'technicians.view', 'technicians.create', 'technicians.update', 'technicians.delete',
  'equipment.view', 'equipment.create', 'equipment.update', 'equipment.delete',
  'contracts.view', 'contracts.create', 'contracts.update', 'contracts.delete',
  'portal.access',
  'maintenance.view', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
  'partners.view', 'partners.create', 'partners.update', 'partners.delete',
  'compliance.view', 'compliance.manage', 'compliance.report',
  'analytics.view', 'analytics.export',
  'invoice.view_all', 'invoice.approve',
  'work_order.view_all'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 3. Map permissions to tenant_admin (all except admin-only)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tenant_admin'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view', 'customers.create', 'customers.update', 'customers.delete',
  'technicians.view', 'technicians.create', 'technicians.update', 'technicians.delete',
  'equipment.view', 'equipment.create', 'equipment.update', 'equipment.delete',
  'contracts.view', 'contracts.create', 'contracts.update', 'contracts.delete',
  'maintenance.view', 'maintenance.create', 'maintenance.update', 'maintenance.delete',
  'partners.view', 'partners.create', 'partners.update', 'partners.delete',
  'compliance.view', 'compliance.manage', 'compliance.report',
  'analytics.view', 'analytics.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 4. Map permissions to ops_manager (operations-focused)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ops_manager'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view', 'customers.create', 'customers.update',
  'technicians.view', 'technicians.create', 'technicians.update',
  'equipment.view', 'equipment.create', 'equipment.update',
  'contracts.view',
  'maintenance.view', 'maintenance.create', 'maintenance.update',
  'compliance.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 5. Map permissions to finance_manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance_manager'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'contracts.view', 'contracts.update',
  'invoices.view', 'invoice.view_all', 'invoice.approve',
  'compliance.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 6. Map permissions to fraud_investigator
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fraud_investigator'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'compliance.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 7. Map permissions to partner_admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_admin'::app_role, id FROM public.permissions
WHERE name IN (
  'technicians.view', 'technicians.update',
  'equipment.view', 'equipment.update',
  'customers.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 8. Map permissions to partner_user
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'partner_user'::app_role, id FROM public.permissions
WHERE name IN (
  'technicians.view',
  'equipment.view',
  'customers.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 9. Map permissions to technician
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'technician'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'equipment.view', 'equipment.update'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 10. Map permissions to dispatcher
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'dispatcher'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'technicians.view',
  'equipment.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 11. Map permissions to customer
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'customer'::app_role, id FROM public.permissions
WHERE name IN (
  'portal.access',
  'equipment.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 12. Map permissions to product_owner
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'product_owner'::app_role, id FROM public.permissions
WHERE name IN (
  'analytics.view', 'analytics.export',
  'compliance.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 13. Map permissions to support_agent
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'support_agent'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view', 'customers.update',
  'portal.access'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 14. Map permissions to ml_ops
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ml_ops'::app_role, id FROM public.permissions
WHERE name IN (
  'analytics.view', 'analytics.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 15. Map permissions to billing_agent
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'billing_agent'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'invoice.view', 'invoice.view_all'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 16. Map permissions to auditor
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor'::app_role, id FROM public.permissions
WHERE name IN (
  'compliance.view', 'compliance.report',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 17. Map permissions to client_admin (from client roles migration)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_admin'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'contracts.view', 'contracts.create', 'contracts.update',
  'compliance.view', 'compliance.report',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 18. Map permissions to client_operations_manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_operations_manager'::app_role, id FROM public.permissions
WHERE name IN (
  'customers.view',
  'contracts.view',
  'compliance.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 19. Map permissions to client_finance_manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_finance_manager'::app_role, id FROM public.permissions
WHERE name IN (
  'contracts.view',
  'invoice.view_all', 'invoice.approve',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 20. Map permissions to client_compliance_officer
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_compliance_officer'::app_role, id FROM public.permissions
WHERE name IN (
  'compliance.view', 'compliance.manage', 'compliance.report'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 21. Map permissions to client_procurement_manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_procurement_manager'::app_role, id FROM public.permissions
WHERE name IN (
  'contracts.view', 'contracts.create', 'contracts.update'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 22. Map permissions to client_executive
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_executive'::app_role, id FROM public.permissions
WHERE name IN (
  'analytics.view',
  'compliance.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 23. Map permissions to client_fraud_manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_fraud_manager'::app_role, id FROM public.permissions
WHERE name IN (
  'compliance.view', 'compliance.report',
  'fraud.view', 'fraud.investigate'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- COMPLETION NOTES
-- ============================================================
-- After running this migration, all roles should have appropriate
-- permissions mapped for route access. The key missing permissions were:
-- - customers.view, technicians.view, equipment.view, contracts.view
-- - portal.access, maintenance.view, partners.view
-- - compliance.view, analytics.view
--
-- These permissions are now added and mapped to all relevant roles.

