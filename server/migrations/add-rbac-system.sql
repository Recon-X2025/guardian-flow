-- ==========================================
-- RBAC SYSTEM MIGRATION
-- Adds permissions and role_permissions tables for proper RBAC
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create permissions table if not exists
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create role_permissions mapping table
CREATE TABLE role_permissions (
  role TEXT NOT NULL, -- Using TEXT instead of enum for flexibility
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- 3. Insert core permissions (70+ permissions)
INSERT INTO permissions (name, category, description) VALUES
-- Ticketing
('ticket.create', 'ticketing', 'Create new tickets'),
('ticket.read', 'ticketing', 'View tickets'),
('ticket.update', 'ticketing', 'Update ticket details'),
('ticket.assign', 'ticketing', 'Assign tickets to technicians'),
('ticket.close', 'ticketing', 'Close tickets'),
-- Work Orders
('wo.create', 'work_order', 'Create work orders'),
('wo.read', 'work_order', 'View work orders'),
('wo.draft', 'work_order', 'Save draft work orders'),
('wo.release', 'work_order', 'Release work orders to field'),
('wo.assign', 'work_order', 'Assign work orders'),
('wo.update', 'work_order', 'Update work orders'),
('wo.complete', 'work_order', 'Mark work orders complete'),
('wo.close', 'work_order', 'Close work orders'),
-- Service Orders
('so.view', 'service_orders', 'View service orders'),
('so.create', 'service_orders', 'Create service orders'),
('so.update', 'service_orders', 'Update service orders'),
('so.sign', 'service_orders', 'Sign service orders'),
('service_orders.generate', 'service_orders', 'Generate service order documents'),
-- Inventory
('inventory.view', 'inventory', 'View inventory'),
('inventory.procure', 'inventory', 'Procure inventory items'),
('inventory.update', 'inventory', 'Update inventory levels'),
-- Warranty
('warranty.view', 'warranty', 'View warranty information'),
('warranty.create', 'warranty', 'Create warranty claims'),
-- Quotes
('quote.view', 'quotes', 'View quotes'),
('quote.create', 'quotes', 'Create quotes'),
('quote.update', 'quotes', 'Update quotes'),
-- Invoices
('invoice.view', 'invoices', 'View invoices'),
('invoice.create', 'invoices', 'Create invoices'),
('invoice.pay', 'invoices', 'Process invoice payments'),
('invoice.adjust', 'invoices', 'Adjust invoice amounts'),
-- Finance
('finance.view', 'finance', 'View financial data'),
('finance.create', 'finance', 'Create financial records'),
-- Penalties
('penalty.calculate', 'penalties', 'Calculate penalties'),
('penalty.apply', 'penalties', 'Apply penalties'),
-- SaPOS
('sapos.view', 'sapos', 'View SaPOS offers'),
('sapos.generate', 'sapos', 'Generate SaPOS offers with AI'),
('sapos.accept', 'sapos', 'Accept SaPOS offers'),
('sapos.decline', 'sapos', 'Decline SaPOS offers'),
-- Fraud
('fraud.view', 'fraud', 'View fraud alerts'),
('fraud.create', 'fraud', 'Create fraud investigations'),
-- Photos
('photo.validate', 'photos', 'Validate work order photos'),
('photos.validate', 'photos', 'Validate required work order photos'),
('attachment.upload', 'attachments', 'Upload attachments'),
('attachment.view', 'attachments', 'View attachments'),
-- Admin
('admin.config', 'admin', 'Configure system settings'),
('audit.read', 'audit', 'Read audit logs'),
-- ML Ops
('mlops.view', 'ml_ops', 'View ML operations'),
-- Documents & Entities
('documents.view', 'documents', 'View documents'),
('customers.view', 'customers', 'View customers'),
('customers.create', 'customers', 'Create customers'),
('technicians.view', 'technicians', 'View technicians'),
('technicians.create', 'technicians', 'Create technicians'),
('equipment.view', 'equipment', 'View equipment'),
('equipment.create', 'equipment', 'Create equipment'),
('contracts.view', 'contracts', 'View contracts'),
('contracts.create', 'contracts', 'Create contracts'),
('partners.view', 'partners', 'View partners'),
('maintenance.view', 'maintenance', 'View maintenance records'),
('portal.access', 'portal', 'Access customer portal')
ON CONFLICT (name) DO NOTHING;

-- 4. Map permissions to roles
-- Sys Admin: All permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'sys_admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Tenant Admin: Most permissions except ML Ops
INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant_admin', id FROM permissions
WHERE name != 'mlops.view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Ops Manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'ops_manager', id FROM permissions
WHERE name IN (
  'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign',
  'wo.read', 'wo.assign',
  'so.view',
  'inventory.view', 'inventory.procure',
  'warranty.view',
  'audit.read',
  'customers.view', 'technicians.view', 'equipment.view',
  'attachment.upload'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Dispatcher
INSERT INTO role_permissions (role, permission_id)
SELECT 'dispatcher', id FROM permissions
WHERE name IN (
  'ticket.read', 'ticket.create', 'ticket.update',
  'wo.read', 'wo.assign',
  'so.view',
  'attachment.upload'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Technician
INSERT INTO role_permissions (role, permission_id)
SELECT 'technician', id FROM permissions
WHERE name IN (
  'ticket.read',
  'wo.read', 'wo.update', 'wo.complete',
  'so.view', 'so.sign',
  'inventory.view',
  'photo.validate', 'photos.validate',
  'attachment.upload', 'attachment.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Finance Manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'finance_manager', id FROM permissions
WHERE name IN (
  'quote.view', 'quote.create',
  'invoice.view', 'invoice.create', 'invoice.pay', 'invoice.adjust',
  'finance.view', 'finance.create',
  'penalty.calculate', 'penalty.apply',
  'audit.read',
  'contracts.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Fraud Investigator
INSERT INTO role_permissions (role, permission_id)
SELECT 'fraud_investigator', id FROM permissions
WHERE name IN (
  'fraud.view', 'fraud.create',
  'audit.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Auditor (read-only)
INSERT INTO role_permissions (role, permission_id)
SELECT 'auditor', id FROM permissions
WHERE name IN (
  'fraud.view',
  'audit.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Support Agent
INSERT INTO role_permissions (role, permission_id)
SELECT 'support_agent', id FROM permissions
WHERE name IN (
  'ticket.read', 'ticket.create', 'ticket.update',
  'warranty.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Partner Admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'partner_admin', id FROM permissions
WHERE name IN (
  'wo.read', 'wo.update', 'wo.complete',
  'so.view', 'so.create', 'so.sign',
  'inventory.view',
  'equipment.view',
  'sapos.view', 'sapos.generate',
  'attachment.upload', 'attachment.view',
  'photo.validate', 'photos.validate'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Partner User
INSERT INTO role_permissions (role, permission_id)
SELECT 'partner_user', id FROM permissions
WHERE name IN (
  'wo.read', 'wo.update', 'wo.complete',
  'inventory.view',
  'attachment.upload', 'attachment.view',
  'photo.validate', 'photos.validate',
  'so.view', 'so.sign'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Customer
INSERT INTO role_permissions (role, permission_id)
SELECT 'customer', id FROM permissions
WHERE name IN (
  'ticket.create', 'ticket.read',
  'wo.read',
  'so.view',
  'sapos.view', 'sapos.accept', 'sapos.decline',
  'quote.view',
  'invoice.view', 'invoice.pay',
  'portal.access'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_category ON permissions(category);

-- 6. Grant permissions (if using RLS in the future)
-- For now, we'll rely on application-level checks

