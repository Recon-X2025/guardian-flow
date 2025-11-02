-- ============================================================
-- Guardian Flow: Complete Database Setup for New Project
-- Run this FIRST for a fresh Supabase project
-- ============================================================

-- ============================================================
-- STEP 1: CREATE BASE ENUMS (MUST BE FIRST)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
-- Note: If re-running, you MUST manually drop app_role first in Supabase SQL editor:
-- DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
  'sys_admin',
  'tenant_admin',
  'ops_manager',
  'finance_manager',
  'fraud_investigator',
  'partner_admin',
  'partner_user',
  'technician',
  'dispatcher',
  'customer',
  'product_owner',
  'support_agent',
  'ml_ops',
  'billing_agent',
  'auditor',
  'guest',
  'client_admin',
  'client_operations_manager',
  'client_finance_manager',
  'client_compliance_officer',
  'client_procurement_manager',
  'client_executive',
  'client_fraud_manager'
);

-- ============================================================
-- STEP 2: CREATE BASE TABLES
-- ============================================================

-- Create profiles table (must exist before user_roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create audit_logs table (referenced by RBAC migration)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update profiles with tenant columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role, tenant_id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create role_permissions mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Create override_requests table
CREATE TABLE IF NOT EXISTS public.override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  mfa_verified BOOLEAN DEFAULT false,
  mfa_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to audit_logs
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS actor_role TEXT,
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT false;

-- ============================================================
-- STEP 3: INSERT ALL PERMISSIONS
-- ============================================================

INSERT INTO public.permissions (name, category, description) VALUES
-- Core Permissions (70 existing + 29 new client permissions)
('ticket.create', 'ticketing', 'Create new tickets'),
('ticket.read', 'ticketing', 'View tickets'),
('ticket.update', 'ticketing', 'Update ticket details'),
('ticket.assign', 'ticketing', 'Assign tickets to technicians'),
('ticket.close', 'ticketing', 'Close tickets'),
('wo.create', 'work_order', 'Create work orders'),
('wo.read', 'work_order', 'View work orders'),
('wo.draft', 'work_order', 'Save draft work orders'),
('wo.release', 'work_order', 'Release work orders to field'),
('wo.assign', 'work_order', 'Assign work orders'),
('wo.complete', 'work_order', 'Mark work orders complete'),
('wo.close', 'work_order', 'Close work orders'),
('inventory.view', 'inventory', 'View inventory levels'),
('inventory.adjust', 'inventory', 'Adjust inventory quantities'),
('inventory.reserve', 'inventory', 'Reserve parts for work orders'),
('inventory.procure', 'inventory', 'Create procurement orders'),
('warranty.check', 'warranty', 'Check warranty status'),
('warranty.view', 'warranty', 'View warranty records'),
('warranty.override', 'warranty', 'Override warranty decisions'),
('attachment.upload', 'attachments', 'Upload attachments'),
('attachment.view', 'attachments', 'View attachments'),
('attachment.delete', 'attachments', 'Delete attachments'),
('photo.validate', 'photos', 'Validate photo submissions'),
('photo.override', 'photos', 'Override photo validation'),
('so.template.upload', 'service_orders', 'Upload SO templates'),
('so.template.approve', 'service_orders', 'Approve SO templates'),
('so.template.activate', 'service_orders', 'Activate SO templates'),
('so.generate', 'service_orders', 'Generate service orders'),
('so.view', 'service_orders', 'View service orders'),
('so.download', 'service_orders', 'Download service orders'),
('so.sign', 'service_orders', 'Sign service orders'),
('sapos.generate', 'sapos', 'Generate SaPOS offers'),
('sapos.view', 'sapos', 'View SaPOS offers'),
('sapos.accept', 'sapos', 'Accept SaPOS offers'),
('sapos.decline', 'sapos', 'Decline SaPOS offers'),
('quote.create', 'finance', 'Create quotes'),
('quote.view', 'finance', 'View quotes'),
('invoice.create', 'finance', 'Create invoices'),
('invoice.view', 'finance', 'View invoices'),
('invoice.view_all', 'finance', 'View all invoices'),
('invoice.approve', 'finance', 'Approve invoices'),
('invoice.pay', 'finance', 'Process invoice payments'),
('invoice.refund', 'finance', 'Process refunds'),
('invoice.adjust', 'finance', 'Adjust invoice amounts'),
('finance.view', 'finance', 'View financial data'),
('finance.settle', 'finance', 'Settle accounts'),
('finance.payout', 'finance', 'Release payouts (MFA required)'),
('finance.hold', 'finance', 'Place financial holds'),
('finance.unhold', 'finance', 'Remove financial holds'),
('penalty.calculate', 'penalties', 'Calculate penalties'),
('penalty.apply', 'penalties', 'Apply penalties'),
('penalty.dispute', 'penalties', 'Dispute penalties'),
('penalty.resolve', 'penalties', 'Resolve penalty disputes'),
('fraud.view', 'fraud', 'View fraud alerts'),
('fraud.investigate', 'fraud', 'Investigate fraud cases'),
('fraud.label', 'fraud', 'Label fraud outcomes'),
('fraud.resolve', 'fraud', 'Resolve fraud cases'),
('admin.users', 'admin', 'Manage users'),
('admin.tenants', 'admin', 'Manage tenants'),
('admin.config', 'admin', 'Manage configuration'),
('admin.features', 'admin', 'Manage feature flags'),
('mlops.register', 'ml_ops', 'Register ML models'),
('mlops.deploy', 'ml_ops', 'Deploy ML models'),
('mlops.deprecate', 'ml_ops', 'Deprecate ML models'),
('mlops.view', 'ml_ops', 'View model metrics'),
('audit.read', 'audit', 'Read audit logs'),
('override.request', 'overrides', 'Request overrides'),
('override.approve', 'overrides', 'Approve overrides (MFA required)'),
('override.reject', 'overrides', 'Reject override requests'),

-- Client Permissions (29 new)
('vendor.create', 'vendor', 'Create new vendor entries'),
('vendor.read', 'vendor', 'View vendor information'),
('vendor.update', 'vendor', 'Update vendor details'),
('vendor.delete', 'vendor', 'Remove vendors'),
('vendor.view_all', 'vendor', 'View all vendors'),
('vendor.performance_scorecards', 'vendor', 'Generate vendor performance scorecards'),
('vendor.create_assessment', 'vendor', 'Create vendor risk assessments'),
('vendor.manage_users', 'vendor', 'Manage vendor user access'),
('contract.create', 'contract', 'Create client-vendor contracts'),
('contract.read', 'contract', 'View contract details'),
('contract.update', 'contract', 'Update contract terms'),
('contract.delete', 'contract', 'Terminate contracts'),
('contract.negotiate', 'contract', 'Negotiate contract terms'),
('contract.view_all', 'contract', 'View all contracts'),
('sla.view_all', 'sla', 'View all SLA metrics'),
('sla.breach_review', 'sla', 'Review and approve SLA breaches'),
('sla.configure', 'sla', 'Configure SLA targets'),
('rfp.create', 'rfp', 'Create RFP requests'),
('rfp.read', 'rfp', 'View RFP proposals'),
('rfp.update', 'rfp', 'Update RFP details'),
('rfp.evaluate', 'rfp', 'Evaluate vendor proposals'),
('rfp.approve', 'rfp', 'Approve RFP awards'),
('wo.approve', 'work_order', 'Approve work orders before execution'),
('wo.reject', 'work_order', 'Reject work order requests'),
('fraud.coordinate', 'fraud', 'Coordinate multi-vendor fraud investigations'),
('fraud.vendor_performance', 'fraud', 'View fraud detection vendor performance'),
('report.export', 'report', 'Export reports as PDF/Excel')

ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STEP 4: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)) $$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = _permission
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_permission(_user_id UUID, _permissions TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = ANY(_permissions)
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 5: CLIENT-VENDOR TABLES
-- ============================================================

-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_number TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  service_categories TEXT[],
  regions TEXT[],
  capabilities TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'suspended')),
  rating NUMERIC(3,2),
  total_work_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  sla_compliance_rate NUMERIC(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_tenant_id, vendor_number)
);

-- Create client_vendor_contracts table
CREATE TABLE IF NOT EXISTS public.client_vendor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  renewal_terms TEXT,
  value_contract NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT,
  sla_target_minutes INTEGER,
  penalty_per_breach NUMERIC(10,2),
  auto_renew BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending', 'active', 'expired', 'terminated')),
  terms JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_tenant_id, contract_number)
);

-- Create vendor_scorecards table
CREATE TABLE IF NOT EXISTS public.vendor_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scorecard_type TEXT NOT NULL DEFAULT 'monthly' CHECK (scorecard_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
  total_work_orders INTEGER DEFAULT 0,
  completed_on_time INTEGER DEFAULT 0,
  sla_compliance_rate NUMERIC(5,2),
  avg_completion_time_hours NUMERIC(8,2),
  customer_satisfaction_score NUMERIC(3,2),
  quality_score NUMERIC(3,2),
  cost_efficiency_score NUMERIC(3,2),
  overall_score NUMERIC(3,2),
  breach_count INTEGER DEFAULT 0,
  breach_penalty_amount NUMERIC(10,2) DEFAULT 0,
  feedback TEXT,
  recommendations TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  UNIQUE(client_tenant_id, vendor_tenant_id, period_start, period_end, scorecard_type)
);

-- Create rfp_proposals table
CREATE TABLE IF NOT EXISTS public.rfp_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL,
  client_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  proposal_title TEXT NOT NULL,
  proposed_timeline_days INTEGER,
  proposed_budget NUMERIC(12,2),
  proposed_team_size INTEGER,
  approach TEXT,
  qualifications TEXT,
  references_data JSONB DEFAULT '[]',
  pricing_breakdown JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
  score NUMERIC(5,2),
  evaluation_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  evaluated_at TIMESTAMPTZ,
  evaluated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 6: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_override_requests_status ON public.override_requests(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON public.audit_logs(tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendors_client_tenant ON public.vendors(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_tenant ON public.vendors(vendor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON public.client_vendor_contracts(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON public.client_vendor_contracts(vendor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.client_vendor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.client_vendor_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_scorecards_client_vendor ON public.vendor_scorecards(client_tenant_id, vendor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_period ON public.vendor_scorecards(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_scorecards_type ON public.vendor_scorecards(scorecard_type);
CREATE INDEX IF NOT EXISTS idx_rfp_proposals_client ON public.rfp_proposals(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfp_proposals_vendor ON public.rfp_proposals(vendor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfp_proposals_status ON public.rfp_proposals(status);

-- ============================================================
-- STEP 7: TRIGGERS
-- ============================================================

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_override_requests_updated_at BEFORE UPDATE ON public.override_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.client_vendor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfp_updated_at BEFORE UPDATE ON public.rfp_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- STEP 8: RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_proposals ENABLE ROW LEVEL SECURITY;

-- Policies for base tables
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins manage tenants" ON public.tenants FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

CREATE POLICY "Users view own tenant" ON public.tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR has_role(auth.uid(), 'sys_admin'::app_role));

CREATE POLICY "View permissions" ON public.permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage role_permissions" ON public.role_permissions FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

CREATE POLICY "View role_permissions" ON public.role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage user_roles" ON public.user_roles FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Create override requests" ON public.override_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "View own override requests" ON public.override_requests FOR SELECT
  USING (auth.uid() = requester_id OR has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'tenant_admin'::app_role, 'sys_admin'::app_role]));

CREATE POLICY "Managers update overrides" ON public.override_requests FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['ops_manager'::app_role, 'tenant_admin'::app_role, 'sys_admin'::app_role]));

CREATE POLICY "View audit logs" ON public.audit_logs FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role]));

-- Policies for client-vendor tables
CREATE POLICY "Clients view own vendors" ON public.vendors
  FOR SELECT USING (
    client_tenant_id = get_user_tenant_id(auth.uid()) OR
    vendor_tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Clients manage own vendors" ON public.vendors
  FOR ALL USING (
    client_tenant_id = get_user_tenant_id(auth.uid())
    AND has_any_permission(auth.uid(), ARRAY['vendor.create', 'vendor.update', 'vendor.delete'])
  );

CREATE POLICY "Clients view own contracts" ON public.client_vendor_contracts
  FOR SELECT USING (
    client_tenant_id = get_user_tenant_id(auth.uid()) OR
    vendor_tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Clients manage own contracts" ON public.client_vendor_contracts
  FOR ALL USING (
    client_tenant_id = get_user_tenant_id(auth.uid())
    AND has_any_permission(auth.uid(), ARRAY['contract.create', 'contract.update', 'contract.delete'])
  );

CREATE POLICY "Clients view own scorecards" ON public.vendor_scorecards
  FOR SELECT USING (
    client_tenant_id = get_user_tenant_id(auth.uid()) OR
    vendor_tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Clients generate scorecards" ON public.vendor_scorecards
  FOR INSERT WITH CHECK (
    client_tenant_id = get_user_tenant_id(auth.uid())
    AND has_permission(auth.uid(), 'vendor.performance_scorecards')
  );

CREATE POLICY "Clients and vendors view proposals" ON public.rfp_proposals
  FOR SELECT USING (
    client_tenant_id = get_user_tenant_id(auth.uid()) OR
    vendor_tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Vendors submit proposals" ON public.rfp_proposals
  FOR INSERT WITH CHECK (
    vendor_tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Vendors update own proposals" ON public.rfp_proposals
  FOR UPDATE USING (
    vendor_tenant_id = get_user_tenant_id(auth.uid())
    AND status IN ('draft', 'submitted')
  );

CREATE POLICY "Clients evaluate proposals" ON public.rfp_proposals
  FOR UPDATE USING (
    client_tenant_id = get_user_tenant_id(auth.uid())
    AND has_permission(auth.uid(), 'rfp.create')
  );

-- ============================================================
-- STEP 9: MAP PERMISSIONS TO CLIENT ROLES
-- ============================================================

-- Map permissions to Client Admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_admin'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards', 'vendor.create_assessment',
  'contract.view_all', 'contract.create', 'contract.negotiate',
  'sla.view_all', 'sla.breach_review',
  'invoice.view_all', 'invoice.approve',
  'wo.view_all', 'wo.approve',
  'vendor.manage_users', 'rfp.create', 'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Map permissions to Client Operations Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_operations_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards',
  'contract.view_all',
  'sla.view_all', 'sla.breach_review',
  'wo.view_all', 'wo.approve', 'wo.reject',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Map permissions to Client Finance Manager role
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

-- Map permissions to Client Compliance Officer role
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

-- Map permissions to Client Procurement Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_procurement_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards', 'vendor.create_assessment',
  'contract.view_all', 'contract.create', 'contract.negotiate',
  'rfp.create', 'rfp.read', 'rfp.update', 'rfp.evaluate', 'rfp.approve',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Map permissions to Client Executive role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_executive'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all', 'vendor.performance_scorecards',
  'contract.view_all',
  'sla.view_all',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Map permissions to Client Fraud Manager role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_fraud_manager'::app_role, id FROM public.permissions 
WHERE name IN (
  'vendor.view_all',
  'fraud.view', 'fraud.coordinate', 'fraud.vendor_performance',
  'audit.read',
  'report.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Grant basic read permissions to all client roles
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

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check client roles were added
SELECT '✅ CLIENT ROLES:' as check_type, COUNT(*) as count
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%';

-- Check tables were created
SELECT '✅ CLIENT TABLES:' as check_type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals');

-- Check permissions were added
SELECT '✅ CLIENT PERMISSIONS:' as check_type, COUNT(*) as count
FROM public.permissions 
WHERE category IN ('vendor', 'contract', 'sla', 'rfp');

-- Check role mappings
SELECT '✅ CLIENT ROLE MAPPINGS:' as check_type, COUNT(DISTINCT role) as client_role_count
FROM role_permissions 
WHERE role::text LIKE 'client_%';

