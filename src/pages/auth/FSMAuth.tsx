import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getRedirectRoute } from "@/utils/getRedirectRoute";

export default function FSMAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.fsm;
  const { roles, loading, refreshRoles } = useRBAC();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    
    // Refresh roles after successful sign-in
    await refreshRoles();
    
    // Wait for RBAC to finish loading
    let attempts = 0;
    while ((loading || roles.length === 0) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Get redirect route - ensure it goes to protected route with AppLayout
    const redirectPath = getRedirectRoute(roles, 'fsm');
    navigate(redirectPath);
  };

  return (
    <ModularAuthLayout config={config} onTestAccountLogin={handleAuthSuccess}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
