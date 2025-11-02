# Guardian Flow: Signup Architecture Corrections

**Date:** November 1, 2025  
**Context:** Updated understanding of platform architecture

---

## Key Correction: Modular Enterprise Platform

**Previous Misconception:** Guardian Flow treated as Field Service Management-first product

**Actual Architecture:** Guardian Flow is an **extensible, modular enterprise operations platform** with FSM as one of 9+ independent modules.

---

## Platform Architecture Overview

### Guardian Flow = Modular Suite

```
Guardian Flow Platform
├── Core Infrastructure
│   ├── Multi-Tenant Architecture
│   ├── RBAC & Security (16 roles)
│   ├── Audit & Compliance (7-year retention)
│   └── API Gateway (Paid API access)
│
├── Field Service Management (FSM) Module
│   ├── Work Orders & Dispatch
│   ├── Technician Management
│   └── Mobile Field Operations
│
├── Asset Lifecycle Management Module
│   ├── Equipment Tracking
│   ├── Maintenance Scheduling
│   └── Warranty Management
│
├── AI Forecasting & Scheduling Module
│   ├── 7-Level Hierarchical Forecasting
│   ├── Demand Prediction
│   └── Route Optimization
│
├── Fraud Detection & Compliance Module
│   ├── Image Forensics
│   ├── Anomaly Detection
│   └── Case Management
│
├── Marketplace & Extensions Module
│   ├── Third-Party Integrations
│   ├── Extension Library
│   └── Developer Console
│
├── Analytics & BI Integration Module
│   ├── Business Intelligence
│   ├── Data Integration (PowerBI, Tableau, etc.)
│   └── Custom Reports
│
├── Enterprise Analytics Platform Module
│   ├── ML Orchestration
│   ├── Data Quality Validation
│   └── Advanced Analytics
│
├── Customer Portal Module
│   ├── Self-Service Portal
│   ├── Service Requests
│   └── Order Tracking
│
├── Video Training & Knowledge Base Module
│   ├── Training Management
│   ├── Phishing Campaigns
│   └── Certification Tracking
│
└── Advanced Compliance Automation Module
    ├── SOC 2 & ISO 27001 Tools
    ├── Access Reviews
    └── Vulnerability Management
```

---

## Impact on Signup/Onboarding Design

### Critical Design Changes Required

#### 1. **Plan Selection Must Support Module Selection**

**Previous Design:**
```
Signup → Plan Selection (Free/Starter/Pro/Enterprise) → Dashboard
```

**Corrected Design:**
```
Signup → Plan Selection → Module Selection → Industry Selection → Dashboard
```

#### 2. **Module Picker Required**

For Free/Starter/Professional tiers, users must choose which modules they want:
- **Free:** Pick 1 module
- **Starter:** Pick 3 modules  
- **Professional:** Pick 5 modules
- **Enterprise:** All modules included

#### 3. **Industry Context Matters**

Different industries need different module combinations:
- **Manufacturing:** Asset Management + Field Service + Predictive Maintenance
- **Healthcare:** Asset Lifecycle + Compliance + Customer Portal
- **Finance:** Fraud Detection + Analytics + Compliance
- **Logistics:** Field Service + Forecasting + Marketplace

#### 4. **Module-Specific Onboarding**

After plan/module selection, provide module-specific setup:
- Configure module-specific workflows
- Import industry templates
- Set up module-specific integrations

---

## Updated Onboarding Flow

### Complete User Journey

```
Step 1: Landing Page (/)
  → Marketing messaging: "Modular Enterprise Operations Platform"
  → Hero: "Choose the modules you need, scale as you grow"
  → CTA: "Start Free Trial"

Step 2: Email Capture (/auth)
  → Email + Password signup
  → No auto-confirm, redirect to plan selection

Step 3: Plan Selection (/auth/select-plan)
  → Show 4 tiers with module limits
  → Explain: "Choose modules that fit your needs"
  → Continue to module selection

Step 4: Module Selection (/auth/select-modules)
  ┌─────────────────────────────────────┐
  │ Your Professional Plan (5 modules)  │
  ├─────────────────────────────────────┤
  │ Available Modules:                  │
  │ ☑ Field Service Management         │
  │ ☐ Asset Lifecycle Management       │
  │ ☑ AI Forecasting & Scheduling      │
  │ ☐ Fraud Detection & Compliance     │
  │ ☐ Marketplace & Extensions         │
  │ ☑ Analytics & BI Integration       │
  │ ☐ Customer Portal                  │
  │ ☐ Video Training & Knowledge Base  │
  │ ☐ Advanced Compliance Automation   │
  └─────────────────────────────────────┘
  → Must select exactly the allowed number
  → Show module descriptions and use cases
  → Recommend bundles by industry

Step 5: Industry Selection (/auth/select-industry)
  → Healthcare, Manufacturing, Utilities, etc.
  → Customize workflows and templates
  → Import industry-specific demo data

Step 6: Company Setup (/auth/onboarding)
  → Company name, team size, etc.
  → Create tenant with selected modules
  → Assign subscription

Step 7: Welcome Wizard (/dashboard?welcome=true)
  → Module-specific tours
  → Import sample data
  → Set up integrations
  → First action prompts
```

---

## Updated Database Schema

### Enhanced Subscription Plans Table

```sql
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'starter', 'professional', 'enterprise'
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_price NUMERIC(10,2) DEFAULT 0,
  
  -- Limits
  user_limit INTEGER, -- NULL = unlimited
  max_modules INTEGER, -- Module selection limit
  
  -- Module selection strategy
  module_selection_type TEXT NOT NULL DEFAULT 'fixed' CHECK (module_selection_type IN ('fixed', 'choice', 'all')),
  -- 'fixed' = predefined modules (legacy)
  -- 'choice' = user picks from available
  -- 'all' = all modules included
  
  -- Predefined modules (for fixed type)
  module_access JSONB DEFAULT '[]', -- List of module IDs
  
  -- Features enabled
  features JSONB DEFAULT '{}', -- Feature flags
  
  -- Stripe integration
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  
  -- Trial
  trial_days INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### New: Module Definitions Table

```sql
CREATE TABLE public.available_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL UNIQUE, -- 'field-service', 'asset-lifecycle', etc.
  name TEXT NOT NULL, -- 'Field Service Management'
  description TEXT NOT NULL,
  category TEXT, -- 'operations', 'intelligence', 'security', 'integration'
  icon TEXT, -- Icon identifier
  industries JSONB DEFAULT '[]', -- Industries this module serves
  required_permissions JSONB DEFAULT '[]', -- Permissions needed
  dependencies JSONB DEFAULT '[]', -- Other modules required
  standalone BOOLEAN DEFAULT true, -- Can be used alone
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed modules
INSERT INTO public.available_modules (module_id, name, description, category, industries) VALUES
('field-service', 'Field Service Management', 'Complete work order lifecycle with dispatch and mobile operations', 'operations', '["manufacturing", "utilities", "healthcare", "telecom", "logistics"]'),
('asset-lifecycle', 'Asset Lifecycle Management', 'Track equipment from procurement through retirement with maintenance', 'operations', '["manufacturing", "utilities", "healthcare", "retail"]'),
('ai-forecasting', 'AI Forecasting & Scheduling', 'ML-powered demand forecasting and route optimization', 'intelligence', '["all"]'),
('fraud-compliance', 'Fraud Detection & Compliance', 'Image forensics, anomaly detection, and case management', 'security', '["finance", "insurance", "all"]'),
('marketplace', 'Marketplace & Extensions', 'Third-party integrations and extension marketplace', 'integration', '["all"]'),
('analytics-bi', 'Analytics & BI Integration', 'Business intelligence with PowerBI, Tableau, Looker integration', 'intelligence', '["all"]'),
('analytics-platform', 'Enterprise Analytics Platform', 'Advanced analytics with ML orchestration and data quality', 'intelligence', '["enterprise", "large-organizations"]'),
('customer-portal', 'Customer Portal', 'Self-service portal for customers', 'operations', '["all"]'),
('video-training', 'Video Training & Knowledge Base', 'Training management and knowledge base', 'operations', '["all"]'),
('compliance-automation', 'Advanced Compliance Automation', 'SOC 2, ISO 27001, and regulatory compliance tools', 'security', '["regulated-industries", "enterprise"]');
```

### Enhanced Tenant Subscriptions

```sql
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  
  -- Selected modules (for choice-based plans)
  selected_modules JSONB DEFAULT '[]', -- List of module IDs
  
  -- Status
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'annual')),
  
  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  trial_extended BOOLEAN DEFAULT false,
  
  -- Subscription period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  
  -- Billing
  auto_renew BOOLEAN DEFAULT true,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id)
);
```

---

## Updated Implementation Components

### 1. Module Picker Component

**File:** `src/components/ModulePicker.tsx` (NEW)

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  module_id: string;
  name: string;
  description: string;
  category: string;
  industries: string[];
}

interface ModulePickerProps {
  planId: string;
  maxModules: number;
  onSelectionComplete: (selectedModules: string[]) => void;
}

export default function ModulePicker({ planId, maxModules, onSelectionComplete }: ModulePickerProps) {
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
    if (selectedModules.length !== maxModules) {
      alert(`Please select exactly ${maxModules} modules`);
      return;
    }
    onSelectionComplete(selectedModules);
  };

  if (loading) {
    return <div>Loading modules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Modules</h2>
        <p className="text-muted-foreground">
          Select {maxModules} module{maxModules > 1 ? 's' : ''} to get started
        </p>
        <div className="mt-4">
          <Badge variant="secondary">
            {selectedModules.length} / {maxModules} selected
          </Badge>
        </div>
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
                {module.industries.slice(0, 3).map(industry => (
                  <Badge key={industry} variant="outline" className="text-xs">
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

      <div className="text-center">
        <Button 
          size="lg" 
          onClick={handleContinue}
          disabled={selectedModules.length !== maxModules}
        >
          Continue to Company Setup
        </Button>
      </div>
    </div>
  );
}
```

---

### 2. Updated Company Onboarding

**Update to:** `src/components/CompanyOnboarding.tsx`

**Changes Required:**
- Accept `selectedModules` as prop/state
- Store selected modules in subscription
- Module-specific configuration prompts

---

### 3. Updated Plan Seed Data

**File:** `ONBOARDING_IMPLEMENTATION_EDIT_CHECKLIST.md` - Section 1.5

```sql
-- Seed default plans with module selection strategy
INSERT INTO public.subscription_plans (
  name, display_name, monthly_price, annual_price, 
  user_limit, max_modules, module_selection_type, 
  trial_days, module_access, features
) VALUES
('free', 'Free', 0, 0, 5, 1, 'choice', 0, '[]', '{"api_limit": 1000}'::jsonb),
('starter', 'Starter', 99, 990, 10, 3, 'choice', 14, '[]', '{"api_limit": 10000}'::jsonb),
('professional', 'Professional', 299, 2990, 50, 5, 'choice', 30, '[]', '{"api_limit": 100000}'::jsonb),
('enterprise', 'Enterprise', 999, 9990, NULL, NULL, 'all', 30, '[]', '{"api_limit": -1, "dedicated_support": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;
```

---

## Module Gating Implementation

### Feature Gate Enhancement

**File:** `src/components/FeatureGate.tsx`

```typescript
interface FeatureGateProps {
  module?: string; // Check if module is enabled
  feature?: string; // Check if feature is enabled
  fallback?: ReactNode;
  showUpgrade?: boolean;
  children: ReactNode;
}

export function FeatureGate({ module, feature, ...props }: FeatureGateProps) {
  const { hasModule, hasFeature, currentPlan } = usePlanFeatures();
  
  let hasAccess = true;
  
  if (module) {
    // Check if user's subscription includes this module
    hasAccess = hasModule(module);
  } else if (feature) {
    // Check if user's subscription enables this feature
    hasAccess = hasFeature(feature);
  }
  
  if (!hasAccess) {
    return props.showUpgrade ? (
      <UpgradePrompt module={module} feature={feature} currentPlan={currentPlan} />
    ) : (
      props.fallback || null
    );
  }
  
  return <>{props.children}</>;
}
```

---

## Updated Signup Flow Summary

### Complete Flow

```
1. Landing Page
   ↓
2. Email Signup (/auth)
   ↓
3. Plan Selection (/auth/select-plan)
   - Choose Free, Starter, Pro, Enterprise
   ↓
4. Module Selection (/auth/select-modules) ⭐ NEW
   - Free: Pick 1 module
   - Starter: Pick 3 modules
   - Professional: Pick 5 modules
   - Enterprise: All modules (skip this step)
   ↓
5. Industry Selection (/auth/select-industry)
   - Load industry-specific configurations
   ↓
6. Company Setup (/auth/onboarding)
   - Create tenant with selected modules
   - Set up subscription
   ↓
7. Welcome Wizard (/dashboard)
   - Module-specific tours
   - Sample data import
   ↓
8. Dashboard
   - Only show enabled modules
   - Feature gates on premium features
```

---

## Testing Considerations

### Module Selection Testing

1. **Test exactly N modules required** (no more, no less)
2. **Test module dependencies** (some modules may require others)
3. **Test module isolation** (users only see their modules)
4. **Test module switching** (upgrade/downgrade preserves data)
5. **Test industry templates** (correct modules for industry)

### Feature Gating Testing

1. **Disabled modules hidden** from navigation
2. **Module-specific routes** redirect to upgrade
3. **API endpoints** enforce module access
4. **Data isolation** for module-specific tables

---

## Migration for Existing Users

### Grandfathering Strategy

1. **Analyze current module usage** per tenant
2. **Assign appropriate plan** based on modules used
3. **Set trial period** for transition
4. **Communicate changes** with migration path
5. **Extend trial** for active users

### Example Migration

```sql
-- Identify tenants using multiple modules
WITH tenant_modules AS (
  SELECT 
    p.tenant_id,
    COUNT(DISTINCT CASE WHEN wo.work_order_type IS NOT NULL THEN 'field-service' END) as has_fsm,
    COUNT(DISTINCT CASE WHEN eq.id IS NOT NULL THEN 'asset-lifecycle' END) as has_asset,
    -- ... etc
  FROM profiles p
  LEFT JOIN work_orders wo ON wo.tenant_id = p.tenant_id
  LEFT JOIN equipment eq ON eq.tenant_id = p.tenant_id
  GROUP BY p.tenant_id
)
UPDATE tenant_subscriptions ts
SET 
  selected_modules = CASE
    WHEN tm.has_fsm + tm.has_asset + ... >= 5 THEN '["all"]'::jsonb
    WHEN tm.has_fsm + tm.has_asset + ... >= 3 THEN '["field-service", "asset-lifecycle", "customer-portal"]'::jsonb
    ELSE '["field-service"]'::jsonb
  END,
  plan_id = CASE
    WHEN tm.has_fsm + tm.has_asset + ... >= 5 THEN (SELECT id FROM subscription_plans WHERE name = 'professional')
    WHEN tm.has_fsm + tm.has_asset + ... >= 3 THEN (SELECT id FROM subscription_plans WHERE name = 'starter')
    ELSE (SELECT id FROM subscription_plans WHERE name = 'free')
  END
FROM tenant_modules tm
WHERE ts.tenant_id = tm.tenant_id;
```

---

## Documentation Updates Required

1. ✅ `PLATFORM_SIGNUP_ONBOARDING_AUDIT.md` - Updated
2. ✅ `ONBOARDING_IMPLEMENTATION_EDIT_CHECKLIST.md` - Updated
3. ⚠️ `ModuleSelector.tsx` - NEW component needed
4. ⚠️ Database migration - Add module tables
5. ⚠️ Feature gating updates
6. ⚠️ Welcome wizard - Module-specific tours

---

**Next Steps:**
1. Create `src/components/ModulePicker.tsx`
2. Update CompanyOnboarding to handle module selection
3. Update database schema with module tables
4. Update feature gates across all module pages
5. Test complete flow end-to-end

