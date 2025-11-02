import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type EntityType = 
  | 'work_order'
  | 'technician'
  | 'customer'
  | 'site'
  | 'asset'
  | 'ticket'
  | 'invoice'
  | 'dispatch'
  | 'quota'
  | 'penalty';

export type IndustryType = 
  | 'generic'
  | 'healthcare'
  | 'manufacturing'
  | 'utilities'
  | 'logistics'
  | 'finance'
  | 'it'
  | 'retail';

interface Terminology {
  display_name: string;
  plural_form: string;
  description: string;
}

interface IndustryTerminologyContextType {
  industryType: IndustryType;
  terminology: Record<EntityType, Terminology>;
  loading: boolean;
  setIndustryType: (type: IndustryType) => Promise<void>;
  getTerm: (entity: EntityType, plural?: boolean) => string;
  getDescription: (entity: EntityType) => string;
  updateTenantPreference: (industry: IndustryType) => Promise<void>;
}

const IndustryTerminologyContext = createContext<IndustryTerminologyContextType | undefined>(undefined);

const DEFAULT_TERMINOLOGY: Record<EntityType, Terminology> = {
  work_order: { display_name: 'Work Order', plural_form: 'Work Orders', description: 'A request for field service work' },
  technician: { display_name: 'Technician', plural_form: 'Technicians', description: 'Field service technician' },
  customer: { display_name: 'Customer', plural_form: 'Customers', description: 'Service recipient' },
  site: { display_name: 'Site', plural_form: 'Sites', description: 'Service location' },
  asset: { display_name: 'Asset', plural_form: 'Assets', description: 'Equipment or property being serviced' },
  ticket: { display_name: 'Ticket', plural_form: 'Tickets', description: 'Service request ticket' },
  invoice: { display_name: 'Invoice', plural_form: 'Invoices', description: 'Billing document' },
  dispatch: { display_name: 'Dispatch', plural_form: 'Dispatch', description: 'Assignment of work to technician' },
  quota: { display_name: 'Quota', plural_form: 'Quotas', description: 'Performance target' },
  penalty: { display_name: 'Penalty', plural_form: 'Penalties', description: 'SLA violation charge' },
};

export function IndustryTerminologyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [industryType, setIndustryTypeState] = useState<IndustryType>('generic');
  const [terminology, setTerminology] = useState<Record<EntityType, Terminology>>(DEFAULT_TERMINOLOGY);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Initialize: Load tenant preferences and terminology
  useEffect(() => {
    const initializeTerminology = async () => {
      if (!user) {
        setTerminology(DEFAULT_TERMINOLOGY);
        setLoading(false);
        return;
      }

      try {
        // Get user's tenant_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);

          // Try to get tenant config for industry_type
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('config')
            .eq('id', profile.tenant_id)
            .single();

          if (tenantData?.config && typeof tenantData.config === 'object') {
            const config = tenantData.config as Record<string, unknown>;
            if (config.industry_type) {
              const industry = config.industry_type as IndustryType;
              setIndustryTypeState(industry);
              // TODO: Load industry-specific terminology from database after migration
            }
          }
        }

        // Default fallback
        setIndustryTypeState('generic');
        setTerminology(DEFAULT_TERMINOLOGY);
      } catch (error) {
        console.error('Error initializing terminology:', error);
        setIndustryTypeState('generic');
        setTerminology(DEFAULT_TERMINOLOGY);
      } finally {
        setLoading(false);
      }
    };

    initializeTerminology();
  }, [user]);

  // Get terminology term (singular or plural)
  const getTerm = useCallback((entity: EntityType, plural: boolean = false): string => {
    const term = terminology[entity];
    if (!term) return entity;
    return plural ? term.plural_form : term.display_name;
  }, [terminology]);

  // Get description for a term
  const getDescription = useCallback((entity: EntityType): string => {
    return terminology[entity]?.description || '';
  }, [terminology]);

  // Set industry type and save preference
  const setIndustryType = useCallback(async (type: IndustryType) => {
    setIndustryTypeState(type);
    // TODO: Load industry-specific terminology from database after migration
    
    // Save to tenant preferences if logged in
    if (user && tenantId) {
      await updateTenantPreference(type);
    }
  }, [user, tenantId]);

  // Update tenant preference
  const updateTenantPreference = useCallback(async (industry: IndustryType) => {
    if (!tenantId) return;

    try {
      // Get existing config
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('config')
        .eq('id', tenantId)
        .single();

      // Merge with existing config
      const existingConfig = tenantData?.config || {};
      const newConfig = typeof existingConfig === 'object' 
        ? { ...existingConfig, industry_type: industry }
        : { industry_type: industry };

      const { error } = await supabase
        .from('tenants')
        .update({ config: newConfig })
        .eq('id', tenantId);

      if (error) {
        console.error('Error updating tenant preference:', error);
      }
    } catch (error) {
      console.error('Error in updateTenantPreference:', error);
    }
  }, [tenantId]);

  const value: IndustryTerminologyContextType = {
    industryType,
    terminology,
    loading,
    setIndustryType,
    getTerm,
    getDescription,
    updateTenantPreference,
  };

  return (
    <IndustryTerminologyContext.Provider value={value}>
      {children}
    </IndustryTerminologyContext.Provider>
  );
}

export function useIndustryTerminology() {
  const context = useContext(IndustryTerminologyContext);
  if (!context) {
    throw new Error('useIndustryTerminology must be used within IndustryTerminologyProvider');
  }
  return context;
}

// Hook for quick access to single term
export function useTerm(entity: EntityType, plural: boolean = false): string {
  const { getTerm } = useIndustryTerminology();
  return getTerm(entity, plural);
}
