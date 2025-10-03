-- Phase 1: Core Schema Extensions for Production-Grade ReconX

-- ============================================================================
-- 1. MFA & Enhanced Auth
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mfa_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  action_type TEXT NOT NULL, -- 'override_photo', 'override_precheck', 'penalty_dispute'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_mfa_tokens_user ON public.mfa_tokens(user_id);
CREATE INDEX idx_mfa_tokens_expires ON public.mfa_tokens(expires_at) WHERE used_at IS NULL;

ALTER TABLE public.mfa_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA tokens"
  ON public.mfa_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Audit Logs (Money-Affecting Events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'work_order', 'invoice', 'penalty', 'photo_validation'
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  correlation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_correlation ON public.audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- ============================================================================
-- 3. Service Orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  oem_id UUID, -- nullable for default template
  template_content TEXT NOT NULL, -- Handlebars/Mustache template
  template_type TEXT DEFAULT 'handlebars',
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_so_templates_oem ON public.service_order_templates(oem_id);

ALTER TABLE public.service_order_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view templates"
  ON public.service_order_templates FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage templates"
  ON public.service_order_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enhance existing service_orders table
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS customer_signature TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS technician_signature TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS rendered_data JSONB;

-- ============================================================================
-- 4. SaPOS (Sales at Point of Service)
-- ============================================================================
CREATE TYPE public.sapos_offer_status AS ENUM ('generated', 'presented', 'accepted', 'declined', 'expired');

CREATE TABLE IF NOT EXISTS public.sapos_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  customer_id UUID,
  offer_type TEXT NOT NULL, -- 'extended_warranty', 'upgrade', 'accessory'
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  warranty_conflicts BOOLEAN DEFAULT false,
  status public.sapos_offer_status DEFAULT 'generated',
  model_version TEXT, -- AI provenance
  prompt_template_id TEXT, -- AI provenance
  confidence_score NUMERIC(3,2),
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sapos_offers_wo ON public.sapos_offers(work_order_id);
CREATE INDEX idx_sapos_offers_status ON public.sapos_offers(status);

ALTER TABLE public.sapos_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view offers"
  ON public.sapos_offers FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Technicians can create offers"
  ON public.sapos_offers FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['technician'::app_role, 'manager'::app_role, 'admin'::app_role]));

-- ============================================================================
-- 5. Quotes, Invoices, Payments (SaPOS Flow)
-- ============================================================================
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE,
  sapos_offer_id UUID REFERENCES public.sapos_offers(id),
  customer_id UUID,
  total_amount NUMERIC(10,2) NOT NULL,
  status public.quote_status DEFAULT 'draft',
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'on_hold');

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  quote_id UUID REFERENCES public.quotes(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  customer_id UUID,
  subtotal NUMERIC(10,2) NOT NULL,
  penalties NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status public.invoice_status DEFAULT 'draft',
  hold_reason TEXT, -- for fraud investigation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_invoices_wo ON public.invoices(work_order_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view invoices"
  ON public.invoices FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Managers can manage invoices"
  ON public.invoices FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- ============================================================================
-- 6. Enhanced Penalty Tracking
-- ============================================================================
ALTER TABLE public.penalty_matrix ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.penalty_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_code TEXT NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id),
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  disputed BOOLEAN DEFAULT false,
  dispute_reason TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_penalty_apps_wo ON public.penalty_applications(work_order_id);
CREATE INDEX idx_penalty_apps_invoice ON public.penalty_applications(invoice_id);

ALTER TABLE public.penalty_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view penalty applications"
  ON public.penalty_applications FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage penalty applications"
  ON public.penalty_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 7. Fraud & Anomaly Detection
-- ============================================================================
CREATE TYPE public.anomaly_type AS ENUM ('photo_tampering', 'duplicate_photo', 'part_mismatch', 'suspicious_usage', 'data_breach');
CREATE TYPE public.investigation_status AS ENUM ('open', 'in_progress', 'resolved', 'escalated');

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type public.anomaly_type NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  detection_model TEXT, -- AI model used
  confidence_score NUMERIC(3,2),
  metadata JSONB,
  investigation_status public.investigation_status DEFAULT 'open',
  investigator_id UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_fraud_alerts_status ON public.fraud_alerts(investigation_status);
CREATE INDEX idx_fraud_alerts_type ON public.fraud_alerts(anomaly_type);
CREATE INDEX idx_fraud_alerts_resource ON public.fraud_alerts(resource_type, resource_id);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view fraud alerts"
  ON public.fraud_alerts FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

CREATE POLICY "Managers can update investigations"
  ON public.fraud_alerts FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- ============================================================================
-- 8. Enhanced Photo Validations with Anomaly Detection
-- ============================================================================
ALTER TABLE public.photo_validations ADD COLUMN IF NOT EXISTS anomaly_detected BOOLEAN DEFAULT false;
ALTER TABLE public.photo_validations ADD COLUMN IF NOT EXISTS anomaly_details JSONB;
ALTER TABLE public.photo_validations ADD COLUMN IF NOT EXISTS mfa_override_token UUID REFERENCES public.mfa_tokens(id);

-- ============================================================================
-- 9. Work Order Precheck Status
-- ============================================================================
CREATE TYPE public.precheck_status AS ENUM ('pending', 'passed', 'failed', 'overridden');

CREATE TABLE IF NOT EXISTS public.work_order_prechecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID UNIQUE REFERENCES public.work_orders(id) ON DELETE CASCADE,
  inventory_status public.precheck_status DEFAULT 'pending',
  inventory_result JSONB,
  warranty_status public.precheck_status DEFAULT 'pending',
  warranty_result JSONB,
  photo_status public.precheck_status DEFAULT 'pending',
  photo_result JSONB,
  override_reason TEXT,
  override_by UUID REFERENCES auth.users(id),
  override_mfa_token UUID REFERENCES public.mfa_tokens(id),
  can_release BOOLEAN GENERATED ALWAYS AS (
    (inventory_status = 'passed' OR inventory_status = 'overridden') AND
    (warranty_status = 'passed' OR warranty_status = 'overridden') AND
    (photo_status = 'passed' OR photo_status = 'overridden')
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.work_order_prechecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view prechecks"
  ON public.work_order_prechecks FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Managers can manage prechecks"
  ON public.work_order_prechecks FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['manager'::app_role, 'admin'::app_role]));

-- ============================================================================
-- 10. Triggers for Updated_at
-- ============================================================================
CREATE TRIGGER update_mfa_tokens_updated_at BEFORE UPDATE ON public.mfa_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_so_templates_updated_at BEFORE UPDATE ON public.service_order_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sapos_offers_updated_at BEFORE UPDATE ON public.sapos_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penalty_applications_updated_at BEFORE UPDATE ON public.penalty_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fraud_alerts_updated_at BEFORE UPDATE ON public.fraud_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_order_prechecks_updated_at BEFORE UPDATE ON public.work_order_prechecks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();