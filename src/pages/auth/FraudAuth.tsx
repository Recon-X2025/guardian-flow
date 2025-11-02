import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getRedirectRoute } from "@/utils/getRedirectRoute";

export default function FraudAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.fraud;
  const { roles, refreshRoles, loading: rbacLoading } = useRBAC();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    
    // Refresh roles after successful sign-in
    await refreshRoles();
    
    // Wait for RBAC to finish loading
    let attempts = 0;
    while ((rbacLoading || roles.length === 0) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Get redirect route based on roles and module
    const redirectPath = getRedirectRoute(roles, 'fraud');
    
    // Navigate to protected route (which has AppLayout with sidebar)
    navigate(redirectPath);
  };

  return (
    <ModularAuthLayout config={config} onTestAccountLogin={handleAuthSuccess}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
