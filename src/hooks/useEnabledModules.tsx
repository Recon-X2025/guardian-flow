import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';

export interface EnabledModule {
  module_id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  enabled_at: string | null;
}

export function useEnabledModules() {
  const { user } = useAuth();
  const { tenantId } = useRBAC();
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [allModules, setAllModules] = useState<EnabledModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnabledModules = useCallback(async () => {
    if (!user || !tenantId) {
      setEnabledModules([]);
      setAllModules([]);
      setLoading(false);
      return;
    }

    try {
      // TODO: After migration 20251101165000 is applied, uncomment this
      // For now, return all modules as enabled until migration runs
      /*
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('module_id')
        .eq('tenant_id', tenantId)
        .eq('enabled', true);

      if (error) {
        console.error('Error fetching enabled modules:', error);
        setEnabledModules([]);
      } else {
        const moduleIds = data?.map(m => m.module_id) || [];
        setEnabledModules(moduleIds);
      }
      */

      // Temporary: return default enabled modules
      setEnabledModules([
        'field-service',
        'asset-lifecycle',
        'ai-forecasting',
        'fraud-compliance',
        'analytics-bi',
        'customer-portal',
        'video-training'
      ]);
    } catch (error) {
      console.error('Error in fetchEnabledModules:', error);
      setEnabledModules([]);
      setAllModules([]);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => {
    fetchEnabledModules();
  }, [fetchEnabledModules]);

  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    return enabledModules.includes(moduleId);
  }, [enabledModules]);

  const refresh = useCallback(() => {
    fetchEnabledModules();
  }, [fetchEnabledModules]);

  return {
    enabledModules,
    allModules,
    loading,
    isModuleEnabled,
    refresh,
  };
}

