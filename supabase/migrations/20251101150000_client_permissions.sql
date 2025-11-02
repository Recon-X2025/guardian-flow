-- ============================================================
-- Guardian Flow: Client Role Permissions
-- Migration: 20251101150000
-- ============================================================

-- 1. Insert client-specific permissions
INSERT INTO public.permissions (name, category, description) VALUES
-- Vendor Management Permissions
('vendor.create', 'vendor', 'Create new vendor entries'),
('vendor.read', 'vendor', 'View vendor information'),
('vendor.update', 'vendor', 'Update vendor details'),
('vendor.delete', 'vendor', 'Remove vendors'),
('vendor.view_all', 'vendor', 'View all vendors'),
('vendor.performance_scorecards', 'vendor', 'Generate vendor performance scorecards'),
('vendor.create_assessment', 'vendor', 'Create vendor risk assessments'),
('vendor.manage_users', 'vendor', 'Manage vendor user access'),

-- Contract Management Permissions
('contract.create', 'contract', 'Create client-vendor contracts'),
('contract.read', 'contract', 'View contract details'),
('contract.update', 'contract', 'Update contract terms'),
('contract.delete', 'contract', 'Terminate contracts'),
('contract.negotiate', 'contract', 'Negotiate contract terms'),
('contract.view_all', 'contract', 'View all contracts'),

-- SLA Management Permissions
('sla.view_all', 'sla', 'View all SLA metrics'),
('sla.breach_review', 'sla', 'Review and approve SLA breaches'),
('sla.configure', 'sla', 'Configure SLA targets'),

-- RFP & Procurement Permissions
('rfp.create', 'rfp', 'Create RFP requests'),
('rfp.read', 'rfp', 'View RFP proposals'),
('rfp.update', 'rfp', 'Update RFP details'),
('rfp.evaluate', 'rfp', 'Evaluate vendor proposals'),
('rfp.approve', 'rfp', 'Approve RFP awards'),

-- Work Order Approval Permissions (Client-specific)
('wo.approve', 'work_order', 'Approve work orders before execution'),
('wo.reject', 'work_order', 'Reject work order requests'),

-- Fraud Investigation Coordination
('fraud.coordinate', 'fraud', 'Coordinate multi-vendor fraud investigations'),
('fraud.vendor_performance', 'fraud', 'View fraud detection vendor performance'),

-- Analytics & Reporting
('report.export', 'report', 'Export reports as PDF/Excel')

ON CONFLICT (name) DO NOTHING;

-- 2. Map permissions to Client Admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_admin'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards', 'vendor.create_assessment',
  'contract.view_all', 'contract.create', 'contract.negotiate',
  'sla.view_all', 'sla.breach_review',
  'invoice.view_all', 'invoice.approve',
  'work_order.view_all', 'work_order.approve',
  'vendor.manage_users', 'rfp.create', 'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 3. Map permissions to Client Operations Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_operations_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards',
  'contract.view_all',
  'sla.view_all', 'sla.breach_review',
  'work_order.view_all', 'work_order.approve', 'work_order.reject',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 4. Map permissions to Client Finance Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_finance_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all',
  'contract.view_all',
  'invoice.view_all', 'invoice.approve',
  'finance.view',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 5. Map permissions to Client Compliance Officer role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_compliance_officer'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.create_assessment',
  'contract.view_all',
  'sla.view_all',
  'audit.read',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 6. Map permissions to Client Procurement Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_procurement_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards', 'vendor.create_assessment',
  'contract.view_all', 'contract.create', 'contract.negotiate',
  'rfp.create', 'rfp.read', 'rfp.update', 'rfp.evaluate', 'rfp.approve',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 7. Map permissions to Client Executive role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_executive'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards',
  'contract.view_all',
  'sla.view_all',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 8. Map permissions to Client Fraud Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_fraud_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all',
  'fraud.view', 'fraud.coordinate', 'fraud.vendor_performance',
  'audit.read',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 9. Also grant basic read permissions to all client roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT client_role::app_role, id FROM public.permissions 
CROSS JOIN (
  VALUES 
    ('client_admin'::app_role),
    ('client_operations_manager'::app_role),
    ('client_finance_manager'::app_role),
    ('client_compliance_officer'::app_role),
    ('client_procurement_manager'::app_role),
    ('client_executive'::app_role),
    ('client_fraud_manager'::app_role)
) AS client_roles(client_role)
WHERE name LIKE '%.read' OR name LIKE '%.view'
  AND category NOT IN ('admin')
ON CONFLICT (role, permission_id) DO NOTHING;

