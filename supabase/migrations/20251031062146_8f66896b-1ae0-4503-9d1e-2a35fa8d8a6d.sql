-- SLA Monitoring Enhancement Tables
CREATE TABLE public.sla_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL, -- 'response_time', 'resolution_time', 'quality_score'
  threshold_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sla_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'response_time', 'resolution_time', 'ftf_rate', 'csat_score'
  threshold_value NUMERIC NOT NULL,
  warning_value NUMERIC,
  unit TEXT NOT NULL, -- 'hours', 'days', 'percentage', 'score'
  applies_to JSONB DEFAULT '{}', -- filters: region, priority, service_type
  alert_enabled BOOLEAN DEFAULT true,
  escalation_rules JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI/ML Infrastructure Tables
CREATE TABLE public.ml_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'sla_breach_prediction', 'workload_forecast', 'anomaly_detection', 'quality_prediction'
  model_version TEXT NOT NULL,
  framework TEXT NOT NULL, -- 'tensorflow', 'pytorch', 'scikit-learn', 'xgboost'
  status TEXT NOT NULL DEFAULT 'training', -- 'training', 'active', 'deprecated', 'failed'
  accuracy_score NUMERIC,
  precision_score NUMERIC,
  recall_score NUMERIC,
  f1_score NUMERIC,
  training_data_size INTEGER,
  features JSONB DEFAULT '[]',
  hyperparameters JSONB DEFAULT '{}',
  deployed_at TIMESTAMP WITH TIME ZONE,
  last_retrained_at TIMESTAMP WITH TIME ZONE,
  next_retrain_at TIMESTAMP WITH TIME ZONE,
  model_metadata JSONB DEFAULT '{}',
  explainability_enabled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ml_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  prediction_output JSONB NOT NULL,
  confidence_score NUMERIC,
  actual_outcome JSONB,
  feedback_provided BOOLEAN DEFAULT false,
  feedback_correct BOOLEAN,
  prediction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  outcome_time TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- API Marketplace & Monetization Tables
CREATE TABLE public.api_usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  api_endpoint TEXT NOT NULL,
  http_method TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  response_time_ms NUMERIC,
  status_code INTEGER,
  error_count INTEGER DEFAULT 0,
  data_transferred_kb NUMERIC DEFAULT 0,
  billing_tier TEXT, -- 'free', 'basic', 'pro', 'enterprise'
  cost_incurred NUMERIC DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.partner_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL, -- first 8 chars for display
  name TEXT NOT NULL,
  scopes JSONB DEFAULT '[]', -- ['read:orders', 'write:customers', etc]
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  billing_tier TEXT NOT NULL DEFAULT 'free',
  monthly_quota INTEGER,
  usage_this_month INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.white_label_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,
  theme_config JSONB DEFAULT '{}',
  feature_flags JSONB DEFAULT '{}',
  custom_css TEXT,
  email_templates JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extension_id UUID,
  partner_id UUID REFERENCES public.partners(id),
  event_type TEXT NOT NULL, -- 'view', 'install', 'uninstall', 'rating', 'revenue'
  event_data JSONB DEFAULT '{}',
  user_id UUID,
  revenue_amount NUMERIC DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's SLA violations"
  ON public.sla_violations FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their tenant's SLA thresholds"
  ON public.sla_thresholds FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view ML models"
  ON public.ml_models FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR tenant_id IS NULL);

CREATE POLICY "Users can view ML predictions"
  ON public.ml_predictions FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Partners can view their API usage"
  ON public.api_usage_metrics FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Partners can manage their API keys"
  ON public.partner_api_keys FOR ALL
  USING (partner_id IN (SELECT id FROM public.partners WHERE id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Partners can manage their white-label configs"
  ON public.white_label_configs FOR ALL
  USING (partner_id IN (SELECT id FROM public.partners WHERE id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can view marketplace analytics"
  ON public.marketplace_analytics FOR SELECT
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_sla_violations_updated_at
  BEFORE UPDATE ON public.sla_violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_thresholds_updated_at
  BEFORE UPDATE ON public.sla_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ml_models_updated_at
  BEFORE UPDATE ON public.ml_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_api_keys_updated_at
  BEFORE UPDATE ON public.partner_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_configs_updated_at
  BEFORE UPDATE ON public.white_label_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_sla_violations_tenant_id ON public.sla_violations(tenant_id);
CREATE INDEX idx_sla_violations_work_order_id ON public.sla_violations(work_order_id);
CREATE INDEX idx_sla_violations_detected_at ON public.sla_violations(detected_at DESC);
CREATE INDEX idx_sla_thresholds_tenant_id ON public.sla_thresholds(tenant_id);
CREATE INDEX idx_ml_models_status ON public.ml_models(status);
CREATE INDEX idx_ml_predictions_tenant_id ON public.ml_predictions(tenant_id);
CREATE INDEX idx_ml_predictions_model_id ON public.ml_predictions(model_id);
CREATE INDEX idx_api_usage_partner_id ON public.api_usage_metrics(partner_id);
CREATE INDEX idx_api_usage_recorded_at ON public.api_usage_metrics(recorded_at DESC);
CREATE INDEX idx_partner_api_keys_partner_id ON public.partner_api_keys(partner_id);
CREATE INDEX idx_white_label_configs_partner_id ON public.white_label_configs(partner_id);
CREATE INDEX idx_marketplace_analytics_extension_id ON public.marketplace_analytics(extension_id);
CREATE INDEX idx_marketplace_analytics_recorded_at ON public.marketplace_analytics(recorded_at DESC);