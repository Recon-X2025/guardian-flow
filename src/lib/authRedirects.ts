import { AppRole } from "@/contexts/RBACContext";

export type AuthModule = 
  | 'platform'
  | 'fsm'
  | 'asset'
  | 'forecasting'
  | 'fraud'
  | 'marketplace'
  | 'analytics'
  | 'customer'
  | 'training';

/**
 * Determines the best redirect route based on both the authentication module
 * and the user's role. Prioritizes module context while respecting role permissions.
 */
export function getModuleAwareRedirect(
  module: AuthModule,
  hasRole: (role: AppRole) => boolean
): string {
  
  // Module-specific redirects based on role hierarchy
  switch (module) {
    case 'fsm':
      // Field Service Management module
      if (hasRole('technician')) return '/work-orders';
      if (hasRole('dispatcher')) return '/dispatch';
      if (hasRole('ops_manager')) return '/work-orders';
      if (hasRole('finance_manager')) return '/finance';
      return '/work-orders';
    
    case 'asset':
      // Asset Lifecycle Management module
      if (hasRole('technician')) return '/equipment';
      if (hasRole('ops_manager')) return '/equipment';
      if (hasRole('finance_manager')) return '/finance';
      return '/equipment';
    
    case 'forecasting':
      // AI Forecasting & Scheduling module
      if (hasRole('ops_manager')) return '/modules/enhanced-scheduler';
      if (hasRole('dispatcher')) return '/scheduler';
      if (hasRole('finance_manager')) return '/forecast-center';
      return '/modules/enhanced-scheduler';
    
    case 'fraud':
      // Fraud & Compliance module
      if (hasRole('fraud_investigator')) return '/modules/image-forensics';
      if (hasRole('auditor')) return '/compliance-dashboard';
      if (hasRole('finance_manager')) return '/fraud-investigation';
      return '/modules/image-forensics';
    
    case 'marketplace':
      // Marketplace module
      if (hasRole('partner_admin')) return '/marketplace-management';
      if (hasRole('ops_manager')) return '/marketplace';
      return '/marketplace';
    
    case 'analytics':
      // Analytics Platform module
      if (hasRole('finance_manager')) return '/analytics';
      if (hasRole('ops_manager')) return '/analytics';
      if (hasRole('auditor')) return '/analytics-platform';
      return '/analytics-platform';
    
    case 'customer':
      // Customer Portal module
      if (hasRole('customer')) return '/customer-portal';
      if (hasRole('ops_manager')) return '/customers';
      return '/customer-portal';
    
    case 'training':
      // Training & Knowledge Base module
      if (hasRole('technician')) return '/knowledge-base';
      if (hasRole('ops_manager')) return '/training-platform';
      return '/knowledge-base';
    
    case 'platform':
    default:
      // Unified platform - role-based redirect
      if (hasRole('dispatcher') || hasRole('technician')) return '/work-orders';
      if (hasRole('finance_manager')) return '/finance';
      if (hasRole('fraud_investigator')) return '/modules/image-forensics';
      if (hasRole('auditor')) return '/compliance-dashboard';
      if (hasRole('customer')) return '/customer-portal';
      if (hasRole('partner_admin')) return '/partner-portal';
      if (hasRole('ops_manager')) return '/dashboard';
      return '/dashboard';
  }
}
