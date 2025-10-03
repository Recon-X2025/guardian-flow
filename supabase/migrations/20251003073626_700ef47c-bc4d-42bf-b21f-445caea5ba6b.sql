-- ==========================================
-- RBAC FOUNDATION - CORRECTED VERSION
-- ==========================================

-- 1. Drop existing app_role enum and recreate with all 16 roles
DROP TYPE IF EXISTS public.app_role CASCADE;

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
  'guest'
);

-- 2. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT;

-- 4. Recreate user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role, tenant_id)
);

-- 5. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create role_permissions mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- 7. Create override_requests table
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

-- 8. Enhance audit_logs (user_id already exists, add new columns)
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS actor_role TEXT,
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT false;

-- 9. Insert core permissions (70 total)
INSERT INTO public.permissions (name, category, description) VALUES
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
('override.reject', 'overrides', 'Reject override requests')
ON CONFLICT (name) DO NOTHING;

-- 10. Helper functions
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

-- 11. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies
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

-- 13. Triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_override_requests_updated_at BEFORE UPDATE ON public.override_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Indexes
CREATE INDEX idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_override_requests_status ON public.override_requests(status, expires_at);
CREATE INDEX idx_audit_logs_tenant_user ON public.audit_logs(tenant_id, user_id, created_at DESC);