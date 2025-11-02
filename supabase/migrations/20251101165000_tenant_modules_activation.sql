-- ============================================================
-- Guardian Flow: Tenant Module Activation
-- Migration: 20251101165000
-- ============================================================
-- This migration creates the tenant_modules junction table
-- to track which modules are enabled for each tenant
-- and provides functionality for dynamic sidebar filtering

-- 1. Create tenant_modules junction table
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES public.available_modules(module_id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMPTZ,
  enabled_by UUID REFERENCES public.profiles(id),
  disabled_at TIMESTAMPTZ,
  disabled_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);

-- 2. Create index for quick lookups
CREATE INDEX idx_tenant_modules_tenant ON public.tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_enabled ON public.tenant_modules(tenant_id, enabled) WHERE enabled = true;
CREATE INDEX idx_tenant_modules_module ON public.tenant_modules(module_id);

-- 3. Create function to get tenant's enabled modules
CREATE OR REPLACE FUNCTION public.get_tenant_enabled_modules(_tenant_id UUID)
RETURNS TABLE (
  module_id TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  enabled BOOLEAN,
  enabled_at TIMESTAMPTZ
) LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT 
    am.module_id,
    am.name,
    am.description,
    am.category,
    COALESCE(tm.enabled, false) as enabled,
    tm.enabled_at
  FROM public.available_modules am
  LEFT JOIN public.tenant_modules tm 
    ON tm.module_id = am.module_id 
    AND tm.tenant_id = _tenant_id
  WHERE am.active = true
  ORDER BY am.sort_order, am.name;
$$;

-- 4. Create function to enable module for tenant
CREATE OR REPLACE FUNCTION public.enable_module_for_tenant(
  _tenant_id UUID,
  _module_id TEXT,
  _enabled_by UUID DEFAULT auth.uid()
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_module_exists BOOLEAN;
  v_dependencies TEXT[];
  v_dep TEXT;
  v_dep_enabled BOOLEAN;
BEGIN
  -- Check if module exists
  SELECT EXISTS(SELECT 1 FROM public.available_modules WHERE module_id = _module_id AND active = true)
  INTO v_module_exists;
  
  IF NOT v_module_exists THEN
    RAISE EXCEPTION 'Module % does not exist or is not active', _module_id;
  END IF;
  
  -- Check dependencies
  SELECT dependencies INTO v_dependencies
  FROM public.available_modules
  WHERE module_id = _module_id;
  
  IF v_dependencies IS NOT NULL AND array_length(v_dependencies, 1) > 0 THEN
    FOREACH v_dep IN ARRAY v_dependencies
    LOOP
      SELECT COALESCE(enabled, false) INTO v_dep_enabled
      FROM public.tenant_modules
      WHERE tenant_id = _tenant_id AND module_id = v_dep;
      
      IF NOT v_dep_enabled THEN
        RAISE EXCEPTION 'Module % requires module % to be enabled first', _module_id, v_dep;
      END IF;
    END LOOP;
  END IF;
  
  -- Insert or update tenant module
  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled, enabled_at, enabled_by)
  VALUES (_tenant_id, _module_id, true, now(), _enabled_by)
  ON CONFLICT (tenant_id, module_id) 
  DO UPDATE SET 
    enabled = true,
    enabled_at = CASE WHEN enabled = false THEN now() ELSE enabled_at END,
    enabled_by = _enabled_by,
    disabled_at = NULL,
    disabled_by = NULL,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- 5. Create function to disable module for tenant
CREATE OR REPLACE FUNCTION public.disable_module_for_tenant(
  _tenant_id UUID,
  _module_id TEXT,
  _disabled_by UUID DEFAULT auth.uid()
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_dependents TEXT[];
  v_dep TEXT;
BEGIN
  -- Check if any modules depend on this one
  SELECT array_agg(module_id) INTO v_dependents
  FROM public.available_modules
  WHERE dependencies @> ARRAY[_module_id]::jsonb;
  
  IF v_dependents IS NOT NULL AND array_length(v_dependents, 1) > 0 THEN
    -- Check which dependents are enabled
    FOREACH v_dep IN ARRAY v_dependents
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.tenant_modules
        WHERE tenant_id = _tenant_id AND module_id = v_dep AND enabled = true
      ) THEN
        RAISE EXCEPTION 'Cannot disable module %. Module % depends on it.', _module_id, v_dep;
      END IF;
    END LOOP;
  END IF;
  
  -- Disable the module
  UPDATE public.tenant_modules
  SET 
    enabled = false,
    disabled_at = now(),
    disabled_by = _disabled_by,
    updated_at = now()
  WHERE tenant_id = _tenant_id AND module_id = _module_id;
  
  RETURN true;
END;
$$;

-- 6. Create function to check if module is enabled for tenant
CREATE OR REPLACE FUNCTION public.is_module_enabled(
  _tenant_id UUID,
  _module_id TEXT
) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.tenant_modules WHERE tenant_id = _tenant_id AND module_id = _module_id),
    false
  );
$$;

-- 7. Create function to auto-enable modules from subscription
CREATE OR REPLACE FUNCTION public.sync_modules_from_subscription(
  _tenant_id UUID
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_plan_id UUID;
  v_selected_modules TEXT[];
  v_module TEXT;
  v_enabled_count INTEGER := 0;
BEGIN
  -- Get tenant's active subscription
  SELECT plan_id, selected_modules INTO v_plan_id, v_selected_modules
  FROM public.tenant_subscriptions
  WHERE tenant_id = _tenant_id AND status = 'active'
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for tenant %', _tenant_id;
  END IF;
  
  -- Get plan module access
  SELECT COALESCE(module_access, '[]'::jsonb) INTO v_selected_modules
  FROM public.subscription_plans
  WHERE id = v_plan_id
  LIMIT 1;
  
  -- Enable each selected module
  IF v_selected_modules IS NOT NULL THEN
    FOREACH v_module IN ARRAY v_selected_modules::TEXT[]
    LOOP
      BEGIN
        PERFORM public.enable_module_for_tenant(_tenant_id, v_module);
        v_enabled_count := v_enabled_count + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue with other modules
        RAISE WARNING 'Failed to enable module %: %', v_module, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN v_enabled_count;
END;
$$;

-- 8. Enable RLS
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- Users can view their tenant's modules
CREATE POLICY "Users view own tenant modules" ON public.tenant_modules
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Tenant admins can manage modules
CREATE POLICY "Tenant admins manage modules" ON public.tenant_modules
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
  );

-- 10. Add trigger for updated_at
CREATE TRIGGER update_tenant_modules_timestamp
BEFORE UPDATE ON public.tenant_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- 11. Initialize modules for existing tenants with active subscriptions
DO $$
DECLARE
  v_tenant RECORD;
  v_count INTEGER;
BEGIN
  -- For each tenant with active subscription, initialize their modules
  FOR v_tenant IN 
    SELECT DISTINCT ts.tenant_id, ts.selected_modules
    FROM public.tenant_subscriptions ts
    WHERE ts.status = 'active'
  LOOP
    BEGIN
      v_count := public.sync_modules_from_subscription(v_tenant.tenant_id);
      RAISE NOTICE 'Initialized % modules for tenant %', v_count, v_tenant.tenant_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to initialize modules for tenant %: %', v_tenant.tenant_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- 12. Add comments
COMMENT ON TABLE public.tenant_modules IS
'Junction table tracking which modules are enabled for each tenant.
Used for dynamic sidebar filtering, feature gating, and subscription management.';

COMMENT ON FUNCTION public.get_tenant_enabled_modules(UUID) IS
'Returns all available modules with their enabled status for a given tenant.
Used by UI to filter navigation and show/hide features.';

COMMENT ON FUNCTION public.enable_module_for_tenant(UUID, TEXT, UUID) IS
'Enables a module for a tenant with dependency checking.
Automatically enables prerequisites if not already enabled.';

COMMENT ON FUNCTION public.disable_module_for_tenant(UUID, TEXT, UUID) IS
'Disables a module for a tenant with dependent checking.
Prevents disabling if other enabled modules depend on it.';

COMMENT ON FUNCTION public.is_module_enabled(UUID, TEXT) IS
'Quick check if a specific module is enabled for a tenant.';

COMMENT ON FUNCTION public.sync_modules_from_subscription(UUID) IS
'Synchronizes enabled modules from tenant subscription.
Used during onboarding and subscription changes.';

-- ============================================================
-- COMPLETION NOTES
-- ============================================================
-- This migration enables dynamic module activation/deactivation
-- Next steps:
-- 1. Create React hook to fetch enabled modules
-- 2. Update AppSidebar to filter navigation by enabled modules
-- 3. Build admin UI for module management
-- 4. Add upgrade prompts for locked features

