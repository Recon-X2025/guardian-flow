-- Forecasting Engine Tables
CREATE TABLE IF NOT EXISTS public.forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL, -- 'engineer_shrinkage', 'repair_volume', 'spend_revenue'
  model_name TEXT NOT NULL,
  algorithm TEXT NOT NULL, -- 'prophet', 'lstm', 'xgboost', 'arima'
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  active BOOLEAN DEFAULT true,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  accuracy_score NUMERIC(5,2),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forecast_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.forecast_models(id),
  forecast_type TEXT NOT NULL,
  target_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forecast_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.forecast_models(id),
  forecast_date DATE NOT NULL,
  predicted_value NUMERIC NOT NULL,
  actual_value NUMERIC,
  error_pct NUMERIC,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_data_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type TEXT NOT NULL, -- 'weather', 'events', 'economic'
  feed_date DATE NOT NULL,
  region TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_data_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage forecast models"
ON public.forecast_models FOR ALL
USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ml_ops'::app_role]));

CREATE POLICY "Users view forecast outputs"
ON public.forecast_outputs FOR SELECT
USING (
  CASE
    WHEN has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]) THEN true
    WHEN tenant_id IS NULL THEN true
    ELSE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  END
);

CREATE POLICY "System creates forecasts"
ON public.forecast_outputs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins view forecast history"
ON public.forecast_history FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ml_ops'::app_role, 'finance_manager'::app_role]));

CREATE POLICY "System manages external feeds"
ON public.external_data_feeds FOR ALL
USING (true);

-- Indexes for performance
CREATE INDEX idx_forecast_outputs_date ON public.forecast_outputs(target_date);
CREATE INDEX idx_forecast_outputs_type ON public.forecast_outputs(forecast_type);
CREATE INDEX idx_forecast_history_date ON public.forecast_history(forecast_date);
CREATE INDEX idx_external_feeds_date ON public.external_data_feeds(feed_date, feed_type);