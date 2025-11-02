import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  module_selection_type: 'fixed' | 'choice' | 'all';
  module_access: string[];
  features: Record<string, any>;
}

interface SubscriptionData {
  id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  trial_start: string | null;
  trial_end: string | null;
  selected_modules: string[];
  subscription_plans: SubscriptionPlan | null;
}

export function usePlanFeatures() {
  const { user } = useAuth();
  
  const { data: subscriptionData } = useQuery<SubscriptionData | null>({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.tenant_id) return null;
      
      const { data: subscription, error } = await supabase
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
      
      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      
      return subscription;
    },
    enabled: !!user
  });
  
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

