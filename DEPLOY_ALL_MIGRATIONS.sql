-- ============================================================
-- Guardian Flow: Deploy All Client Role Migrations
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- MIGRATION 1: Client Roles
-- ============================================================

DO $$ BEGIN
  -- Add client_admin role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_admin';
  END IF;
  
  -- Add client_operations_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_operations_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_operations_manager';
  END IF;
  
  -- Add client_finance_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_finance_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_finance_manager';
  END IF;
  
  -- Add client_compliance_officer role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_compliance_officer' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_compliance_officer';
  END IF;
  
  -- Add client_procurement_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_procurement_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_procurement_manager';
  END IF;
  
  -- Add client_executive role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_executive' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_executive';
  END IF;
  
  -- Add client_fraud_manager role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_fraud_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_fraud_manager';
  END IF;
END $$;

-- ============================================================
-- MIGRATION 2: Client-Vendor Management System
-- ============================================================

-- 1. Create vendors table
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

-- 2. Create client_vendor_contracts table
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

-- 3. Create vendor_scorecards table
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

-- 4. Create rfp_proposals table
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

-- 5. Create indexes
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

-- 6. Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_proposals ENABLE ROW LEVEL SECURITY;

-- 7. Create helper function for updated_at if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add triggers for updated_at
DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.client_vendor_contracts;
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.client_vendor_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rfp_updated_at ON public.rfp_proposals;
CREATE TRIGGER update_rfp_updated_at BEFORE UPDATE ON public.rfp_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: RLS policies will be added after we verify helper functions exist
-- Some RLS policies may fail if get_user_tenant_id or has_permission don't exist yet

-- ============================================================
-- MIGRATION 3: Client Permissions
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
  'wo.view_all', 'wo.approve',
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
  'wo.view_all', 'wo.approve', 'wo.reject',
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

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check client roles were added
SELECT 'CLIENT ROLES CHECK:' as check_type;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%'
ORDER BY enumlabel;

-- Check tables were created
SELECT 'TABLES CHECK:' as check_type;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals')
ORDER BY table_name;

-- Check permissions were added
SELECT 'PERMISSIONS CHECK:' as check_type;
SELECT COUNT(*) as permission_count
FROM public.permissions 
WHERE category IN ('vendor', 'contract', 'sla', 'rfp');

-- Check role mappings
SELECT 'ROLE MAPPINGS CHECK:' as check_type;
SELECT r.role, COUNT(*) as permission_count 
FROM role_permissions r 
WHERE r.role::text LIKE 'client_%' 
GROUP BY r.role
ORDER BY r.role;

