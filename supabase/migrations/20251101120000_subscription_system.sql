-- ============================================================
-- Guardian Flow: Subscription & Module System
-- Migration: 20251101120000
-- ============================================================

-- 1.1 Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_price NUMERIC(10,2) DEFAULT 0,
  user_limit INTEGER,
  max_modules INTEGER, -- Module selection limit
  module_selection_type TEXT NOT NULL DEFAULT 'fixed' CHECK (module_selection_type IN ('fixed', 'choice', 'all')),
  module_access JSONB DEFAULT '[]', -- For fixed type plans
  features JSONB DEFAULT '{}',
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.1a Create available_modules table (NEW)
CREATE TABLE IF NOT EXISTS public.available_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  industries JSONB DEFAULT '[]',
  required_permissions JSONB DEFAULT '[]',
  dependencies JSONB DEFAULT '[]',
  standalone BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Create tenant_subscriptions table
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  selected_modules JSONB DEFAULT '[]', -- User-selected modules
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'annual')),
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  trial_extended BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 1.3 Create subscription_history table
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_plan_id UUID REFERENCES public.subscription_plans(id),
  to_plan_id UUID REFERENCES public.subscription_plans(id),
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- 1.4 Update tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS signup_source TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_convert_emails_sent INTEGER DEFAULT 0;

-- 1.1b Seed available modules
INSERT INTO public.available_modules (module_id, name, description, category, industries, sort_order) VALUES
('field-service', 'Field Service Management', 'Complete work order lifecycle with dispatch and mobile operations', 'operations', '["manufacturing", "utilities", "healthcare", "telecom", "logistics"]'::jsonb, 1),
('asset-lifecycle', 'Asset Lifecycle Management', 'Track equipment from procurement through retirement with maintenance', 'operations', '["manufacturing", "utilities", "healthcare", "retail"]'::jsonb, 2),
('ai-forecasting', 'AI Forecasting & Scheduling', 'ML-powered demand forecasting and route optimization', 'intelligence', '["all"]'::jsonb, 3),
('fraud-compliance', 'Fraud Detection & Compliance', 'Image forensics, anomaly detection, and case management', 'security', '["finance", "insurance", "all"]'::jsonb, 4),
('marketplace', 'Marketplace & Extensions', 'Third-party integrations and extension marketplace', 'integration', '["all"]'::jsonb, 5),
('analytics-bi', 'Analytics & BI Integration', 'Business intelligence with PowerBI, Tableau, Looker integration', 'intelligence', '["all"]'::jsonb, 6),
('analytics-platform', 'Enterprise Analytics Platform', 'Advanced analytics with ML orchestration and data quality', 'intelligence', '["enterprise", "large-organizations"]'::jsonb, 7),
('customer-portal', 'Customer Portal', 'Self-service portal for customers', 'operations', '["all"]'::jsonb, 8),
('video-training', 'Video Training & Knowledge Base', 'Training management and knowledge base', 'operations', '["all"]'::jsonb, 9),
('compliance-automation', 'Advanced Compliance Automation', 'SOC 2, ISO 27001, and regulatory compliance tools', 'security', '["regulated-industries", "enterprise"]'::jsonb, 10)
ON CONFLICT (module_id) DO NOTHING;

-- 1.5 Seed default plans (with module selection strategy)
INSERT INTO public.subscription_plans (name, display_name, monthly_price, annual_price, user_limit, max_modules, module_selection_type, trial_days, module_access, features) VALUES
('free', 'Free', 0, 0, 5, 1, 'choice', 0, '[]'::jsonb, '{"api_limit": 1000}'::jsonb),
('starter', 'Starter', 99, 990, 10, 3, 'choice', 14, '[]'::jsonb, '{"api_limit": 10000}'::jsonb),
('professional', 'Professional', 299, 2990, 50, 5, 'choice', 30, '[]'::jsonb, '{"api_limit": 100000}'::jsonb),
('enterprise', 'Enterprise', 999, 9990, NULL, NULL, 'all', 30, '[]'::jsonb, '{"api_limit": -1, "dedicated_support": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 1.6 Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- 1.7 Create RLS policies
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
  FOR SELECT USING (active = true);

CREATE POLICY "Anyone can view active modules" ON public.available_modules
  FOR SELECT USING (active = true);

CREATE POLICY "Users can view their tenant subscription" ON public.tenant_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = tenant_subscriptions.tenant_id
    )
  );

CREATE POLICY "Admins can view subscription history" ON public.subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND p.tenant_id = subscription_history.tenant_id
      AND ur.role IN ('sys_admin', 'tenant_admin')
    )
  );

-- 1.8 Create triggers
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.9 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan_id ON public.tenant_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON public.tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant_id ON public.subscription_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_available_modules_active ON public.available_modules(active);

