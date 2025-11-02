import { useLocation } from 'react-router-dom';
import { ModuleId, AUTH_MODULES } from '@/config/authConfig';

/**
 * Detects the current module context based on the route
 * This allows components to show module-specific branding and behavior
 */
export function useModuleContext(): { moduleId: ModuleId | null; moduleName: string; tagline: string } {
  const location = useLocation();
  const path = location.pathname;

  // Determine module based on route patterns
  if (path.startsWith('/work-orders') || path.startsWith('/dispatch') || path.startsWith('/tickets') || path.startsWith('/scheduler')) {
    return {
      moduleId: 'fsm',
      moduleName: AUTH_MODULES.fsm.name,
      tagline: AUTH_MODULES.fsm.tagline
    };
  }
  
  if (path.startsWith('/equipment') || path.startsWith('/assets') || path.startsWith('/asset-')) {
    return {
      moduleId: 'asset',
      moduleName: AUTH_MODULES.asset.name,
      tagline: AUTH_MODULES.asset.tagline
    };
  }
  
  if (path.startsWith('/forecast') || path.startsWith('/forecasting')) {
    return {
      moduleId: 'forecasting',
      moduleName: AUTH_MODULES.forecasting.name,
      tagline: AUTH_MODULES.forecasting.tagline
    };
  }
  
  if (path.startsWith('/fraud') || path.startsWith('/compliance-dashboard') || path.startsWith('/forgery-detection') || path.startsWith('/anomaly')) {
    return {
      moduleId: 'fraud',
      moduleName: AUTH_MODULES.fraud.name,
      tagline: AUTH_MODULES.fraud.tagline
    };
  }
  
  if (path.startsWith('/marketplace') || path.startsWith('/developer-portal')) {
    return {
      moduleId: 'marketplace',
      moduleName: AUTH_MODULES.marketplace.name,
      tagline: AUTH_MODULES.marketplace.tagline
    };
  }
  
  if (path.startsWith('/analytics-platform') || path.startsWith('/analytics-integrations') || path.startsWith('/models') || path.startsWith('/observability')) {
    return {
      moduleId: 'analytics',
      moduleName: AUTH_MODULES.analytics.name,
      tagline: AUTH_MODULES.analytics.tagline
    };
  }
  
  if (path.startsWith('/customer-portal')) {
    return {
      moduleId: 'customer',
      moduleName: AUTH_MODULES.customer.name,
      tagline: AUTH_MODULES.customer.tagline
    };
  }
  
  if (path.startsWith('/training') || path.startsWith('/help') || path.startsWith('/knowledge-base')) {
    return {
      moduleId: 'training',
      moduleName: AUTH_MODULES.training.name,
      tagline: AUTH_MODULES.training.tagline
    };
  }

  // Default to platform
  return {
    moduleId: 'platform',
    moduleName: AUTH_MODULES.platform.name,
    tagline: AUTH_MODULES.platform.tagline
  };
}

