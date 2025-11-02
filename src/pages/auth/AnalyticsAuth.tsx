import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getRedirectRoute } from "@/utils/getRedirectRoute";

export default function AnalyticsAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.analytics;
  const { roles, refreshRoles } = useRBAC();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    
    await refreshRoles();
    
    // Wait for RBAC to finish loading
    let attempts = 0;
    while ((roles.length === 0) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    const redirectPath = getRedirectRoute(roles, 'analytics');
    navigate(redirectPath);
  };

  return (
    <ModularAuthLayout config={config} onTestAccountLogin={handleAuthSuccess}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
