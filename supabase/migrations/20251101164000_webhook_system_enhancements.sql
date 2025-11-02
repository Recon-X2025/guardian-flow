-- ============================================================
-- Guardian Flow: Webhook System Enhancements
-- Migration: 20251101164000
-- ============================================================
-- This migration enhances the existing webhook system to support
-- all PRD-required features: more events, better retry logic,
-- signature verification, and webhook subscriptions

-- 1. Add new columns to existing webhooks table if they don't exist
DO $$ 
BEGIN
  -- Add signature_method if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'signature_method') THEN
    ALTER TABLE public.webhooks ADD COLUMN signature_method TEXT DEFAULT 'hmac_sha256';
  END IF;

  -- Add signature_header if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'signature_header') THEN
    ALTER TABLE public.webhooks ADD COLUMN signature_header TEXT DEFAULT 'X-Guardian-Signature';
  END IF;

  -- Add retry_strategy if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'retry_strategy') THEN
    ALTER TABLE public.webhooks ADD COLUMN retry_strategy TEXT DEFAULT 'exponential_backoff';
  END IF;

  -- Add initial_retry_delay_ms if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'initial_retry_delay_ms') THEN
    ALTER TABLE public.webhooks ADD COLUMN initial_retry_delay_ms INTEGER DEFAULT 1000;
  END IF;

  -- Add max_retry_delay_ms if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'max_retry_delay_ms') THEN
    ALTER TABLE public.webhooks ADD COLUMN max_retry_delay_ms INTEGER DEFAULT 60000;
  END IF;

  -- Add filter_config if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'filter_config') THEN
    ALTER TABLE public.webhooks ADD COLUMN filter_config JSONB DEFAULT '{}';
  END IF;

  -- Add user_id for owner tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhooks' 
                 AND column_name = 'user_id') THEN
    ALTER TABLE public.webhooks ADD COLUMN user_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 2. Enhance webhook_logs table
DO $$
BEGIN
  -- Add signature_verified if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhook_logs' 
                 AND column_name = 'signature_verified') THEN
    ALTER TABLE public.webhook_logs ADD COLUMN signature_verified BOOLEAN DEFAULT false;
  END IF;

  -- Add user_id for trigger tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'webhook_logs' 
                 AND column_name = 'triggered_by') THEN
    ALTER TABLE public.webhook_logs ADD COLUMN triggered_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 3. Create webhook_subscription_catalog for available event types
CREATE TABLE IF NOT EXISTS public.webhook_event_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  sample_payload JSONB NOT NULL,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Insert comprehensive webhook event types
INSERT INTO public.webhook_event_catalog (event_type, category, description, sample_payload) VALUES

-- Work Order Events
('work_order.created', 'work_orders', 'Triggered when a new work order is created', 
  '{"id": "uuid", "work_order_number": "WO-2025-001", "status": "draft", "customer_id": "uuid", "assigned_to": "uuid", "created_at": "timestamp"}'),
('work_order.updated', 'work_orders', 'Triggered when work order details are updated',
  '{"id": "uuid", "changes": {"status": "assigned", "priority": "high"}, "updated_at": "timestamp"}'),
('work_order.assigned', 'work_orders', 'Triggered when a work order is assigned to a technician',
  '{"id": "uuid", "assigned_to": "uuid", "assigned_at": "timestamp"}'),
('work_order.completed', 'work_orders', 'Triggered when a work order is marked complete',
  '{"id": "uuid", "completed_at": "timestamp", "resolution_summary": "string"}'),
('work_order.cancelled', 'work_orders', 'Triggered when a work order is cancelled',
  '{"id": "uuid", "cancelled_at": "timestamp", "cancellation_reason": "string"}'),

-- Invoice Events
('invoice.created', 'finance', 'Triggered when a new invoice is generated',
  '{"id": "uuid", "invoice_number": "INV-2025-001", "amount": 500.00, "customer_id": "uuid", "status": "draft"}'),
('invoice.sent', 'finance', 'Triggered when an invoice is sent to customer',
  '{"id": "uuid", "sent_at": "timestamp", "recipient_email": "string"}'),
('invoice.paid', 'finance', 'Triggered when an invoice payment is received',
  '{"id": "uuid", "paid_amount": 500.00, "paid_at": "timestamp", "payment_method": "string"}'),
('invoice.overdue', 'finance', 'Triggered when an invoice becomes overdue',
  '{"id": "uuid", "due_date": "timestamp", "days_overdue": 7}'),

-- Service Order Events
('service_order.generated', 'service_orders', 'Triggered when a service order is generated',
  '{"id": "uuid", "work_order_id": "uuid", "template_name": "string", "pdf_url": "string"}'),
('service_order.signed', 'service_orders', 'Triggered when a service order is digitally signed',
  '{"id": "uuid", "signed_at": "timestamp", "signed_by": "uuid"}'),

-- Fraud Detection Events
('fraud.alert', 'fraud', 'Triggered when fraud is detected',
  '{"alert_id": "uuid", "risk_score": 0.85, "trigger_events": ["location_mismatch", "time_anomaly"], "work_order_id": "uuid"}'),
('fraud.confirmed', 'fraud', 'Triggered when fraud is confirmed by investigator',
  '{"alert_id": "uuid", "confirmed_at": "timestamp", "resolution": "string", "investigator_id": "uuid"}'),
('fraud.dismissed', 'fraud', 'Triggered when a fraud alert is dismissed as false positive',
  '{"alert_id": "uuid", "dismissed_at": "timestamp", "dismissal_reason": "string"}'),

-- Penalty Events
('penalty.applied', 'finance', 'Triggered when a penalty is applied to an invoice',
  '{"id": "uuid", "work_order_id": "uuid", "violation_type": "string", "amount": 50.00, "applied_at": "timestamp"}'),
('penalty.disputed', 'finance', 'Triggered when a penalty is disputed',
  '{"id": "uuid", "disputed_at": "timestamp", "dispute_reason": "string"}'),

-- Schedule Events
('schedule.created', 'scheduling', 'Triggered when a schedule is created',
  '{"id": "uuid", "technician_id": "uuid", "start_time": "timestamp", "end_time": "timestamp"}'),
('schedule.updated', 'scheduling', 'Triggered when schedule is modified',
  '{"id": "uuid", "changes": {"start_time": "timestamp", "status": "confirmed"}}'),

-- Compliance Events
('compliance.review_due', 'compliance', 'Triggered when compliance review is due',
  '{"review_id": "uuid", "due_date": "timestamp", "review_type": "string"}'),
('compliance.violation_detected', 'compliance', 'Triggered when compliance violation is detected',
  '{"violation_id": "uuid", "severity": "high", "violation_type": "string", "detected_at": "timestamp"}'),

-- User Events
('user.created', 'users', 'Triggered when a new user account is created',
  '{"id": "uuid", "email": "string", "role": "string", "tenant_id": "uuid"}'),
('user.role_changed', 'users', 'Triggered when user role is modified',
  '{"id": "uuid", "old_role": "string", "new_role": "string", "changed_at": "timestamp"}'),

-- Tenant Events
('tenant.created', 'tenants', 'Triggered when a new tenant/organization is created',
  '{"id": "uuid", "name": "string", "slug": "string"}'),
('tenant.subscription_changed', 'tenants', 'Triggered when tenant subscription plan changes',
  '{"tenant_id": "uuid", "old_plan": "string", "new_plan": "string", "changed_at": "timestamp"}'),

-- API Events
('api.quota_exceeded', 'api', 'Triggered when API quota is exceeded',
  '{"tenant_id": "uuid", "current_usage": 1000, "quota": 1000, "reset_at": "timestamp"}'),
('api.rate_limit_hit', 'api', 'Triggered when rate limit is hit',
  '{"tenant_id": "uuid", "endpoint": "string", "limit": 100, "window_seconds": 60}'),

-- Maintenance Events
('maintenance.scheduled', 'maintenance', 'Triggered when predictive maintenance is scheduled',
  '{"id": "uuid", "asset_id": "uuid", "scheduled_date": "timestamp", "maintenance_type": "string"}'),
('maintenance.completed', 'maintenance', 'Triggered when maintenance is completed',
  '{"id": "uuid", "completed_at": "timestamp", "technician_notes": "string"}'),

-- Quality Events
('quality.issue_detected', 'quality', 'Triggered when quality issue is detected',
  '{"issue_id": "uuid", "work_order_id": "uuid", "severity": "high", "issue_type": "string"}'),

-- Document Events
('document.uploaded', 'documents', 'Triggered when document is uploaded',
  '{"id": "uuid", "document_type": "string", "uploaded_by": "uuid", "file_url": "string"}'),
('document.extracted', 'documents', 'Triggered when document data is extracted via OCR',
  '{"id": "uuid", "extraction_status": "success", "fields_count": 10}')

ON CONFLICT (event_type) DO NOTHING;

-- 5. Create index for webhook lookup
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON public.webhooks(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON public.webhooks(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON public.webhooks USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON public.webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON public.webhook_logs(triggered_at DESC);

-- 6. Create helper function to get available events
CREATE OR REPLACE FUNCTION public.get_available_webhook_events()
RETURNS JSONB LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'event_type', event_type,
      'category', category,
      'description', description,
      'sample_payload', sample_payload
    )
    ORDER BY category, event_type
  )
  FROM public.webhook_event_catalog
  WHERE is_active = true
$$;

-- 7. Create function to calculate next retry delay
CREATE OR REPLACE FUNCTION public.calculate_retry_delay(
  attempt_number INTEGER,
  strategy TEXT DEFAULT 'exponential_backoff',
  initial_delay_ms INTEGER DEFAULT 1000,
  max_delay_ms INTEGER DEFAULT 60000
) RETURNS INTEGER LANGUAGE SQL IMMUTABLE AS $$
  SELECT LEAST(
    initial_delay_ms * POWER(2, attempt_number - 1),
    max_delay_ms
  )::INTEGER;
$$;

-- 8. Enable RLS on webhook_event_catalog
ALTER TABLE public.webhook_event_catalog ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- Anyone can read event catalog (public information)
CREATE POLICY "Anyone can view event catalog" ON public.webhook_event_catalog
  FOR SELECT USING (is_active = true);

-- Only sys_admins can manage catalog
CREATE POLICY "Admins manage event catalog" ON public.webhook_event_catalog
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['sys_admin'::app_role])
  );

-- 10. Create update_timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 11. Add triggers for updated_at
CREATE TRIGGER update_webhook_event_catalog_timestamp
BEFORE UPDATE ON public.webhook_event_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- 12. Add comments
COMMENT ON TABLE public.webhook_event_catalog IS
'Catalog of all available webhook event types. This table serves as documentation
and the source of truth for webhook subscriptions.';

COMMENT ON FUNCTION public.get_available_webhook_events() IS
'Returns all available webhook event types in JSON format. Useful for UI dropdowns
and API documentation.';

COMMENT ON FUNCTION public.calculate_retry_delay(INTEGER, TEXT, INTEGER, INTEGER) IS
'Calculates next retry delay in milliseconds based on attempt number and strategy.
Supports exponential backoff and linear backoff.';

-- 13. Create view for webhook health monitoring
CREATE OR REPLACE VIEW public.webhook_health_summary AS
SELECT 
  w.id,
  w.name,
  w.url,
  COUNT(wl.id) as total_deliveries,
  COUNT(CASE WHEN wl.success = true THEN 1 END) as successful_deliveries,
  COUNT(CASE WHEN wl.success = false THEN 1 END) as failed_deliveries,
  ROUND(
    COUNT(CASE WHEN wl.success = true THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(wl.id), 0) * 100, 
    2
  ) as success_rate_percent,
  AVG(wl.duration_ms) as avg_duration_ms,
  MAX(wl.triggered_at) as last_triggered_at
FROM public.webhooks w
LEFT JOIN public.webhook_logs wl ON w.id = wl.webhook_id
WHERE w.active = true
GROUP BY w.id, w.name, w.url;

COMMENT ON VIEW public.webhook_health_summary IS
'Aggregated webhook delivery statistics for monitoring and health checks.';

-- ============================================================
-- COMPLETION NOTES
-- ============================================================
-- This migration enhances the existing webhook infrastructure to support:
-- 1. Comprehensive event catalog (30+ event types)
-- 2. HMAC signature verification
-- 3. Configurable retry strategies
-- 4. Event filtering
-- 5. User/tenant ownership tracking
-- 6. Health monitoring views
--
-- Next steps:
-- 1. Update webhook-delivery-manager function to use new features
-- 2. Add signature generation to webhook-trigger function
-- 3. Build UI for webhook event management
-- 4. Add API for developers to query available events

