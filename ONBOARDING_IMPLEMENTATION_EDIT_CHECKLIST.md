# Guardian Flow: Signup & Onboarding Implementation Checklist

**Date:** November 1, 2025  
**Status:** Ready for Implementation

---

## Critical Edits Required

### 1. Database Schema Changes

#### File: `supabase/migrations/[TIMESTAMP]_subscription_system.sql`

```sql
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
```

**Action:** Create new migration file in `supabase/migrations/`

---

### 2. New Frontend Components

#### 2.1 Plan Selector Component

**File:** `src/components/PlanSelector.tsx` (NEW)

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  annualPrice: number;
  userLimit: number | null;
  trialDays: number;
  features: string[];
  isPopular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    price: 0,
    annualPrice: 0,
    userLimit: 5,
    trialDays: 0,
    features: ['Choose 1 Module', '5 Users', 'Basic Support', '1 GB Storage']
  },
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    price: 99,
    annualPrice: 990,
    userLimit: 10,
    trialDays: 14,
    features: ['Choose 3 Modules', '10 Users', 'Email Support', '10 GB Storage']
  },
  {
    id: 'professional',
    name: 'professional',
    displayName: 'Professional',
    price: 299,
    annualPrice: 2990,
    userLimit: 50,
    trialDays: 30,
    isPopular: true,
    features: ['Choose 5 Modules', '50 Users', 'Priority Support', '100 GB Storage']
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 999,
    annualPrice: 9990,
    userLimit: null,
    trialDays: 30,
    features: ['All Modules Included', 'Unlimited Users', 'Dedicated CSM', '1 TB Storage']
  }
];

export default function PlanSelector() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;
    
    // Enterprise plan includes all modules, skip module selection
    if (selectedPlan === 'enterprise') {
      navigate('/auth/onboarding', { 
        state: { 
          planId: selectedPlan, 
          billingCycle,
          selectedModules: [] // Empty array means all modules
        } 
      });
    } else {
      // Other plans require module selection
      navigate('/auth/select-modules', { 
        state: { 
          planId: selectedPlan, 
          billingCycle,
          maxModules: plan.userLimit === 5 ? 1 : plan.userLimit === 10 ? 3 : 5
        } 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">Start your free trial, no credit card required</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'annual' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('annual')}
          >
            Annual <span className="ml-2 text-xs">Save 17%</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {PLANS.map(plan => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all ${
                selectedPlan === plan.id ? 'border-primary ring-2 ring-primary' : ''
              } ${plan.isPopular ? 'border-primary' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle>{plan.displayName}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    ${billingCycle === 'monthly' ? plan.price : Math.floor(plan.annualPrice / 12)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {billingCycle === 'annual' && plan.price > 0 && (
                  <p className="text-xs text-muted-foreground">Billed annually</p>
                )}
                {plan.trialDays > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {plan.trialDays}-day free trial
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={handleContinue} disabled={loading}>
            {loading ? 'Processing...' : selectedPlan === 'free' ? 'Get Started' : `Start ${PLANS.find(p => p.id === selectedPlan)?.trialDays}-Day Free Trial`}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Action:** Create new file `src/components/PlanSelector.tsx`

---

#### 2.1a Module Picker Component (NEW - Required for Module Selection)

**File:** `src/components/ModulePicker.tsx` (NEW)

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Module {
  module_id: string;
  name: string;
  description: string;
  category: string;
  industries: string[];
}

export default function ModulePicker() {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId, billingCycle, maxModules } = location.state || {};
  
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from('available_modules')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      } else if (prev.length < maxModules) {
        return [...prev, moduleId];
      }
      return prev;
    });
  };

  const handleContinue = () => {
    if (maxModules && selectedModules.length !== maxModules) {
      toast.error(`Please select exactly ${maxModules} module${maxModules > 1 ? 's' : ''}`);
      return;
    }
    navigate('/auth/onboarding', {
      state: {
        planId,
        billingCycle,
        selectedModules
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="max-w-6xl mx-auto py-12 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Choose Your Modules</h2>
          {maxModules ? (
            <>
              <p className="text-muted-foreground">
                Select {maxModules} module{maxModules > 1 ? 's' : ''} to get started
              </p>
              <div className="mt-4">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {selectedModules.length} / {maxModules} selected
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Select modules to get started
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(module => (
            <Card
              key={module.module_id}
              className={`cursor-pointer transition-all ${
                selectedModules.includes(module.module_id)
                  ? 'border-primary ring-2 ring-primary'
                  : selectedModules.length >= maxModules
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              onClick={() => selectedModules.length < maxModules && toggleModule(module.module_id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {module.description}
                    </CardDescription>
                  </div>
                  <Checkbox
                    checked={selectedModules.includes(module.module_id)}
                    onCheckedChange={() => toggleModule(module.module_id)}
                    disabled={!selectedModules.includes(module.module_id) && selectedModules.length >= maxModules}
                    className="mt-1"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {module.industries.slice(0, 3).map((industry, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                  {module.industries.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{module.industries.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center pt-6">
          <Button 
            size="lg" 
            onClick={handleContinue}
            disabled={maxModules ? selectedModules.length !== maxModules : selectedModules.length === 0}
          >
            Continue to Company Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Action:** Create new file `src/components/ModulePicker.tsx`

---

#### 2.2 Company Onboarding Component (Updated)

**File:** `src/components/CompanyOnboarding.tsx` (NEW)

```typescript
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INDUSTRIES = [
  'Healthcare',
  'Manufacturing',
  'Utilities & Energy',
  'Logistics & Transportation',
  'Finance & Insurance',
  'Retail & Supply Chain',
  'Other'
];

const TEAM_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501+', label: '501+ employees' }
];

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, planId, billingCycle, selectedModules } = location.state || {};
  
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    teamSize: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.industry || !formData.teamSize) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign up first');
        navigate('/auth');
        return;
      }

      // Get the subscription plan
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('id, trial_days')
        .eq('name', planId)
        .single();

      if (!planData) {
        throw new Error('Plan not found');
      }

      // Create tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.companyName,
          slug: formData.companyName.toLowerCase().replace(/\s+/g, '-'),
          config: {
            industry: formData.industry,
            team_size: formData.teamSize
          }
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          tenant_id: tenantData.id,
          full_name: user.user_metadata?.full_name || 'User'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Assign tenant_admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'tenant_admin',
          tenant_id: tenantData.id
        });

      if (roleError) throw roleError;

      // Create subscription
      const trialEndDate = planData.trial_days > 0 
        ? new Date(Date.now() + planData.trial_days * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const { error: subError } = await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenantData.id,
          plan_id: planData.id,
          selected_modules: selectedModules ? JSON.parse(JSON.stringify(selectedModules)) : [],
          status: planData.trial_days > 0 ? 'trial' : 'active',
          billing_frequency: billingCycle || 'monthly',
          trial_start: planData.trial_days > 0 ? new Date().toISOString() : null,
          trial_end: planData.trial_days > 0 ? trialEndDate.toISOString() : null,
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString()
        });

      if (subError) throw subError;

      toast.success('Welcome to Guardian Flow!');
      navigate('/dashboard?welcome=true');
      
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Company Setup</CardTitle>
          <CardDescription>Tell us about your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData({ ...formData, industry: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size *</Label>
              <Select
                value={formData.teamSize}
                onValueChange={(value) => setFormData({ ...formData, teamSize: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map(size => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Action:** Create new file `src/components/CompanyOnboarding.tsx`

---

#### 2.3 Trial Banner Component

**File:** `src/components/TrialBanner.tsx` (NEW)

```typescript
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrialBannerProps {
  daysRemaining: number;
  onClose?: () => void;
}

export default function TrialBanner({ daysRemaining, onClose }: TrialBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  if (dismissed || daysRemaining <= 0) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <Alert className={`border-l-4 ${isUrgent ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'} mb-4 relative`}>
      {onClose && (
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <AlertTitle className={isUrgent ? 'text-red-900' : 'text-yellow-900'}>
        {isUrgent ? '⚠️ Trial Ending Soon!' : '🎉 Free Trial'}
      </AlertTitle>
      
      <AlertDescription className={isUrgent ? 'text-red-800' : 'text-yellow-800'}>
        {daysRemaining === 1 
          ? 'Your trial expires tomorrow! Upgrade now to keep your data and continue using Guardian Flow.'
          : `Your ${daysRemaining}-day free trial is in progress. Upgrade before it ends to continue access.`
        }
      </AlertDescription>
      
      <div className="mt-3">
        <Button
          size="sm"
          variant={isUrgent ? 'destructive' : 'default'}
          onClick={() => navigate('/settings/subscription')}
        >
          {isUrgent ? 'Upgrade Now' : 'View Plans'}
        </Button>
      </div>
    </Alert>
  );
}
```

**Action:** Create new file `src/components/TrialBanner.tsx`

---

### 3. Updated Existing Files

#### 3.1 Update App.tsx Routes

**File:** `src/App.tsx`

```typescript
// ADD these new routes after line 100:

import PlanSelector from "./components/PlanSelector";
import ModulePicker from "./components/ModulePicker";
import CompanyOnboarding from "./components/CompanyOnboarding";
import TrialBanner from "./components/TrialBanner";

// In the Routes section, add:
<Route path="/auth/select-plan" element={<PlanSelector />} />
<Route path="/auth/select-modules" element={<ModulePicker />} />
<Route path="/auth/onboarding" element={<CompanyOnboarding />} />
```

**Action:** Edit `src/App.tsx` to add new routes

---

#### 3.2 Update Auth.tsx Signup Flow

**File:** `src/pages/Auth.tsx`

**Change lines 46-82** to:

```typescript
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();

  if (signupForm.password !== signupForm.confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }

  if (signupForm.password.length < 6) {
    toast.error('Password too short');
    return;
  }

  setLoading(true);

  try {
    // Create auth user but don't auto-confirm
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: {
          full_name: signupForm.fullName
        }
      }
    });
    
    if (error) throw error;
    
    toast.success('Account created! Redirecting to plan selection...');
    
    // Redirect to plan selection page
    navigate('/auth/select-plan', { 
      state: { 
        email: signupForm.email,
        fullName: signupForm.fullName
      } 
    });
    
  } catch (error: any) {
    console.error('Signup error:', error);
    toast.error(error.message || 'Failed to create account');
  } finally {
    setLoading(false);
  }
};
```

**Action:** Edit `src/pages/Auth.tsx` signup handler

---

#### 3.3 Add Trial Banner to Dashboard

**File:** `src/pages/Dashboard.tsx`

**Add at the top of the return statement:**

```typescript
import TrialBanner from '@/components/TrialBanner';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';

// Inside component:
const { isTrial, trialDaysRemaining } = usePlanFeatures();

// In the return JSX, add after AppLayout opening:
{isTrial && <TrialBanner daysRemaining={trialDaysRemaining} />}
```

**Action:** Edit `src/pages/Dashboard.tsx` to add trial banner

---

### 4. New Hooks

#### 4.1 Plan Features Hook

**File:** `src/hooks/usePlanFeatures.ts` (NEW)

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function usePlanFeatures() {
  const { user } = useAuth();
  
  const { data: subscriptionData } = useQuery(
    ['subscription', user?.id],
    async () => {
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.tenant_id) return null;
      
      const { data: subscription } = await supabase
        .from('tenant_subscriptions')
        .select(`
          id,
          status,
          trial_start,
          trial_end,
          selected_modules,
          subscription_plans (
            id,
            name,
            module_selection_type,
            module_access,
            features
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .single();
      
      return subscription;
    },
    { enabled: !!user }
  );
  
  const isTrial = subscriptionData?.status === 'trial';
  
  const trialDaysRemaining = isTrial && subscriptionData?.trial_end
    ? Math.ceil((new Date(subscriptionData.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const hasFeature = (feature: string): boolean => {
    if (!subscriptionData?.subscription_plans) return false;
    const features = subscriptionData.subscription_plans.features as Record<string, any>;
    return features[feature] === true;
  };
  
  const hasModule = (module: string): boolean => {
    if (!subscriptionData?.subscription_plans) return false;
    
    const plan = subscriptionData.subscription_plans;
    
    // Enterprise plan with 'all' type includes all modules
    if (plan.module_selection_type === 'all') return true;
    
    // For 'choice' type, check selected_modules
    if (plan.module_selection_type === 'choice' && subscriptionData.selected_modules) {
      const modules = subscriptionData.selected_modules as string[];
      return modules.includes(module);
    }
    
    // For 'fixed' type, check module_access
    if (plan.module_selection_type === 'fixed' && plan.module_access) {
      const modules = plan.module_access as string[];
      return modules.includes(module);
    }
    
    return false;
  };
  
  return {
    subscription: subscriptionData,
    isTrial,
    trialDaysRemaining: Math.max(0, trialDaysRemaining),
    currentPlan: subscriptionData?.subscription_plans?.name || null,
    hasFeature,
    hasModule,
    canUpgrade: isTrial || subscriptionData?.status === 'active'
  };
}
```

**Action:** Create new file `src/hooks/usePlanFeatures.ts`

---

### 5. Feature Gate Component

#### 5.1 Feature Gate Wrapper

**File:** `src/components/FeatureGate.tsx` (NEW)

```typescript
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';

interface FeatureGateProps {
  feature?: string;
  module?: string;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  children: ReactNode;
}

export function FeatureGate({ 
  feature, 
  module,
  fallback, 
  showUpgrade = true,
  children 
}: FeatureGateProps) {
  const { hasFeature, hasModule, currentPlan, isTrial } = usePlanFeatures();
  
  let hasAccess = true;
  
  if (feature) {
    hasAccess = hasFeature(feature);
  } else if (module) {
    hasAccess = hasModule(module);
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgrade) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {feature || module} is not available in your current plan
          </p>
          {isTrial && (
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade before your trial ends to unlock this feature
            </p>
          )}
          <Button onClick={() => window.location.href = '/settings/subscription'}>
            Upgrade Now
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return null;
}
```

**Action:** Create new file `src/components/FeatureGate.tsx`

---

## Implementation Summary

### New Files to Create (10 files)
1. ✅ `supabase/migrations/[TIMESTAMP]_subscription_system.sql`
2. ✅ `src/components/PlanSelector.tsx`
3. ✅ `src/components/CompanyOnboarding.tsx`
4. ✅ `src/components/TrialBanner.tsx`
5. ✅ `src/components/FeatureGate.tsx`
6. ✅ `src/hooks/usePlanFeatures.ts`
7. ⚠️ `src/pages/SubscriptionSettings.tsx` (future)
8. ⚠️ `src/components/UpgradeModal.tsx` (future)
9. ⚠️ `src/hooks/useTrialExpiry.ts` (future)
10. ⚠️ `src/utils/trialRestrictions.ts` (future)

### Files to Modify (3 files)
1. ✅ `src/App.tsx` - Add new routes
2. ✅ `src/pages/Auth.tsx` - Update signup flow
3. ✅ `src/pages/Dashboard.tsx` - Add trial banner

### Database Changes
1. ✅ Create `subscription_plans` table
2. ✅ Create `tenant_subscriptions` table
3. ✅ Create `subscription_history` table
4. ✅ Update `tenants` table with new columns
5. ✅ Seed default plans
6. ✅ Create RLS policies

---

## Testing Checklist

### User Flow Testing
- [ ] Sign up with new email → Redirects to plan selection
- [ ] Select Free plan → Completes onboarding → Lands on dashboard
- [ ] Select Professional plan → Shows 30-day trial → Completes onboarding → Dashboard shows trial banner
- [ ] Log out and log back in → Trial banner still shows
- [ ] Create account as tenant_admin → Can access all features

### Feature Gating Testing
- [ ] Free plan user tries to access AI Forecasting → Shows upgrade prompt
- [ ] Professional plan user accesses AI Forecasting → Feature works
- [ ] Trial user sees trial days decreasing daily
- [ ] Trial expires → User redirected to upgrade page

### Data Integrity Testing
- [ ] Subscription created with correct plan_id
- [ ] Trial dates set correctly
- [ ] User assigned correct role
- [ ] Tenant created with correct metadata
- [ ] Historical subscription data tracked

---

## Next Priority Actions

### Immediately (This Week)
1. Create database migration for subscription system
2. Create PlanSelector component
3. Create CompanyOnboarding component
4. Update Auth.tsx signup flow
5. Add routes to App.tsx
6. Test complete signup flow

### Short-term (Next 2 Weeks)
7. Create TrialBanner component
8. Add usePlanFeatures hook
9. Add FeatureGate wrapper
10. Update Dashboard with trial banner
11. Add feature gating to 2-3 premium features

### Medium-term (Next Month)
12. Build SubscriptionSettings page
13. Implement upgrade/downgrade flows
14. Add trial expiry emails
15. Create trial expiry handler
16. Add usage tracking UI

---

**Ready to implement?** Start with database migration and work through component by component.

