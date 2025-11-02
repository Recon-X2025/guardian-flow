import { AppRole } from '@/contexts/RBACContext';
import { ModuleId } from '@/config/authConfig';

// Type for UserRole object (matches RBACContext structure)
type UserRole = {
  id: string;
  role: AppRole;
  tenant_id: string | null;
  granted_at: string;
};

/**
 * Determines the appropriate redirect route after authentication based on user roles and module context
 */
export function getRedirectRoute(
  roles: AppRole[] | UserRole[],
  moduleId?: ModuleId
): string {
  // Extract role strings if UserRole objects are passed
  const roleStrings: AppRole[] = roles.map(r => {
    if (typeof r === 'string') {
      return r as AppRole;
    }
    return (r as UserRole).role as AppRole;
  });
  // If signing in to a specific module, prioritize module-specific landing page
  if (moduleId) {
    return getModuleLandingPage(moduleId, roleStrings);
  }

  // For platform sign-in, determine route based on roles
  return getPlatformRedirectRoute(roleStrings);
}

/**
 * Gets the module-specific landing page based on module and user roles
 */
function getModuleLandingPage(moduleId: ModuleId, roles: AppRole[]): string {
  switch (moduleId) {
    case 'fsm':
      // Field Service Management - always redirect to protected routes with AppLayout
      if (roles.includes('dispatcher') || roles.includes('technician') || roles.includes('ops_manager')) {
        return '/work-orders'; // Protected route with AppLayout
      }
      // For other roles, use work orders or dashboard (both have AppLayout)
      return '/work-orders';
    
    case 'asset':
      // Asset Lifecycle Management - redirect to protected route with AppLayout
      // If /equipment doesn't exist or user doesn't have access, fallback to dashboard
      return '/equipment'; // Should be protected route with AppLayout
    
    case 'forecasting':
      // AI Forecasting & Scheduling - redirect to protected route with AppLayout
      return '/forecast'; // Should be protected route with AppLayout
    
    case 'fraud':
      // Fraud Detection & Compliance
      // Always redirect to protected routes with AppLayout (not public module pages)
      if (roles.includes('fraud_investigator') || roles.includes('client_fraud_manager')) {
        return '/fraud'; // Protected route with AppLayout - requires fraud.view permission
      }
      if (roles.includes('auditor') || roles.includes('client_compliance_officer')) {
        return '/compliance-dashboard'; // Protected route with AppLayout
      }
      // For other roles without fraud permissions, redirect to dashboard
      // They can access fraud features from there if they have permissions
      return '/dashboard';
    
    case 'marketplace':
      // Extension Marketplace
      if (roles.includes('partner_admin') || roles.includes('sys_admin')) {
        return '/marketplace-management';
      }
      return '/marketplace';
    
    case 'analytics':
      // Enterprise Analytics Platform - redirect based on role and permissions
      // Finance Managers use analytics-bi for financial reporting but should go to Finance dashboard
      if (roles.includes('finance_manager') || roles.includes('client_finance_manager')) {
        return '/finance'; // Finance Managers should access Finance dashboard, not Analytics Platform
      }
      // ML Ops and Product Owners can access full Analytics Platform
      if (roles.includes('ml_ops') || roles.includes('product_owner')) {
        return '/analytics-platform';
      }
      // For other roles, try analytics-platform, but fallback to dashboard if no access
      // This prevents Access Denied for roles that shouldn't be using analytics module
      if (roles.includes('sys_admin') || roles.includes('tenant_admin')) {
        return '/analytics-platform';
      }
      // Default fallback to dashboard for roles without analytics permissions
      return '/dashboard';
    
    case 'customer':
      // Customer Portal - redirect to protected route with AppLayout
      return '/customer-portal'; // Should be protected route with AppLayout
    
    case 'training':
      // Video Training & Knowledge Base - redirect to protected route with AppLayout
      return '/training'; // Protected route with AppLayout
    
    case 'forensics':
      // Image Forensics & Investigation - redirect to protected route (forensics is under fraud module)
      // Use fraud dashboard which has AppLayout
      if (roles.includes('fraud_investigator')) {
        return '/fraud'; // Protected route with AppLayout
      }
      return '/fraud'; // Fallback to fraud dashboard
    
    case 'platform':
    default:
      // Platform - use role-based redirect
      return getPlatformRedirectRoute(roles);
  }
}

/**
 * Gets the platform redirect route based on user roles
 */
function getPlatformRedirectRoute(roles: AppRole[]): string {
  // Client roles -> Vendor dashboards (TODO: create these pages)
  if (roles.includes('client_admin') || roles.includes('client_executive')) {
    return '/dashboard'; // Temporary: redirect to main dashboard until client pages created
  }
  if (roles.includes('client_operations_manager')) {
    return '/dashboard'; // Temporary
  }
  if (roles.includes('client_finance_manager')) {
    return '/finance'; // Use existing finance dashboard
  }
  if (roles.includes('client_compliance_officer')) {
    return '/compliance-dashboard'; // Use existing compliance dashboard
  }
  if (roles.includes('client_procurement_manager')) {
    return '/dashboard'; // Temporary
  }
  if (roles.includes('client_fraud_manager')) {
    return '/fraud'; // Use existing fraud dashboard
  }
  
  // Admin roles -> Platform dashboard
  if (roles.includes('sys_admin') || roles.includes('tenant_admin')) {
    return '/dashboard';
  }
  
  // Field service roles -> Work orders
  if (roles.includes('dispatcher') || roles.includes('technician')) {
    return '/work-orders';
  }
  
  // Operations management
  if (roles.includes('ops_manager')) {
    return '/dashboard';
  }
  
  // Finance roles -> Finance dashboard
  if (roles.includes('finance_manager')) {
    return '/finance';
  }
  
  // Fraud & compliance roles
  if (roles.includes('fraud_investigator')) {
    return '/fraud';
  }
  if (roles.includes('auditor')) {
    return '/compliance-dashboard';
  }
  
  // Partner roles -> Marketplace
  if (roles.includes('partner_admin') || roles.includes('partner_user')) {
    return '/marketplace';
  }
  
  // Analytics/ML roles -> Analytics platform
  if (roles.includes('ml_ops') || roles.includes('product_owner')) {
    return '/analytics-platform';
  }
  
  // Customer role -> Customer portal
  if (roles.includes('customer')) {
    return '/customer-portal';
  }
  
  // Support/Training roles
  if (roles.includes('support_agent')) {
    return '/training';
  }
  
  // Billing agent -> Payments/Invoicing
  if (roles.includes('billing_agent')) {
    return '/payments';
  }
  
  // Default: Platform dashboard
  return '/dashboard';
}

