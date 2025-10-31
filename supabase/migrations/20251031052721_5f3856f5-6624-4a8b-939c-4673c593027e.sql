-- Phase 1: Analytics & Monitoring Tables
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID,
  dashboard_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  position JSONB NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  report_type TEXT NOT NULL,
  schedule_cron TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  tenant_id UUID,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_score NUMERIC NOT NULL,
  metrics JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  tenant_id UUID,
  generated_at TIMESTAMPTZ NOT NULL,
  rows_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  trace_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: AI/ML & Marketplace Tables
CREATE TABLE IF NOT EXISTS sapos_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL,
  customer_id UUID,
  ticket_id UUID,
  accepted BOOLEAN NOT NULL,
  feedback_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_test_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  variants JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  variant TEXT NOT NULL,
  converted BOOLEAN DEFAULT false,
  conversion_value NUMERIC,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  pricing_model TEXT NOT NULL,
  price NUMERIC,
  rating NUMERIC,
  install_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extension_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID REFERENCES marketplace_extensions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  installed_at TIMESTAMPTZ DEFAULT now(),
  config JSONB
);

CREATE TABLE IF NOT EXISTS extension_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID REFERENCES marketplace_extensions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID REFERENCES marketplace_extensions(id),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_status TEXT NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Mobile & Communication Tables (mobile_sync_queue already exists)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notification_queue(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT NOT NULL,
  provider_response JSONB
);

CREATE TABLE IF NOT EXISTS customer_communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  preferred_channel TEXT DEFAULT 'email',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 4: Portal & Compliance Tables
CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID,
  customer_id UUID NOT NULL,
  reason TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customer_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  work_order_id UUID,
  survey_type TEXT NOT NULL,
  responses JSONB NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  anomaly_score NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  compliance_score NUMERIC,
  findings JSONB,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dashboards" ON analytics_dashboards FOR ALL USING (auth.uid() = user_id);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own widgets" ON dashboard_widgets FOR ALL USING (
  dashboard_id IN (SELECT id FROM analytics_dashboards WHERE user_id = auth.uid())
);

ALTER TABLE extension_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own installations" ON extension_installations FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX idx_health_metrics_timestamp ON system_health_metrics(timestamp);
CREATE INDEX idx_ab_results_experiment ON ab_test_results(experiment_id);
CREATE INDEX idx_notifications_status ON notification_queue(status, scheduled_for);
CREATE INDEX idx_disputes_customer ON disputes(customer_id);
CREATE INDEX idx_behavior_events_user ON user_behavior_events(user_id, timestamp);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_dashboards_updated_at BEFORE UPDATE ON analytics_dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ab_experiments_updated_at BEFORE UPDATE ON ab_test_experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_extensions_updated_at BEFORE UPDATE ON marketplace_extensions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();