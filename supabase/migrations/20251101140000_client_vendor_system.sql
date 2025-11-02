-- ============================================================
-- Guardian Flow: Client-Vendor Management System
-- Migration: 20251101140000
-- ============================================================

-- 1. Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_number TEXT NOT NULL, -- Unique vendor identifier
  contact_email TEXT,
  contact_phone TEXT,
  service_categories TEXT[], -- Array of service types
  regions TEXT[], -- Geographic coverage
  capabilities TEXT[], -- Special capabilities
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'suspended')),
  rating NUMERIC(3,2), -- Overall rating 0.00-5.00
  total_work_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  sla_compliance_rate NUMERIC(5,2), -- Percentage
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
  rfp_id UUID NOT NULL, -- References future RFP table
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
CREATE INDEX idx_vendors_client_tenant ON public.vendors(client_tenant_id);
CREATE INDEX idx_vendors_vendor_tenant ON public.vendors(vendor_tenant_id);
CREATE INDEX idx_vendors_status ON public.vendors(status);

CREATE INDEX idx_contracts_client ON public.client_vendor_contracts(client_tenant_id);
CREATE INDEX idx_contracts_vendor ON public.client_vendor_contracts(vendor_tenant_id);
CREATE INDEX idx_contracts_status ON public.client_vendor_contracts(status);
CREATE INDEX idx_contracts_dates ON public.client_vendor_contracts(start_date, end_date);

CREATE INDEX idx_scorecards_client_vendor ON public.vendor_scorecards(client_tenant_id, vendor_tenant_id);
CREATE INDEX idx_scorecards_period ON public.vendor_scorecards(period_start, period_end);
CREATE INDEX idx_scorecards_type ON public.vendor_scorecards(scorecard_type);

CREATE INDEX idx_rfp_proposals_client ON public.rfp_proposals(client_tenant_id);
CREATE INDEX idx_rfp_proposals_vendor ON public.rfp_proposals(vendor_tenant_id);
CREATE INDEX idx_rfp_proposals_status ON public.rfp_proposals(status);

-- 6. Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_proposals ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for vendors
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

-- 8. RLS Policies for contracts
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

-- 9. RLS Policies for scorecards
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

-- 10. RLS Policies for RFP proposals
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

-- 11. Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.client_vendor_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfp_updated_at BEFORE UPDATE ON public.rfp_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

