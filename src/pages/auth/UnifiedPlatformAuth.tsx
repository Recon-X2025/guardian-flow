import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getRedirectRoute } from "@/utils/getRedirectRoute";

export default function UnifiedPlatformAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.platform;
  const { roles, loading, refreshRoles } = useRBAC();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    
    // Refresh roles after successful sign-in
    await refreshRoles();
    // Wait a bit for roles to update
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get redirect route based on user roles for platform module
    const redirectPath = getRedirectRoute(roles, 'platform');
    navigate(redirectPath);
  };
  
  return (
    <ModularAuthLayout config={config} onTestAccountLogin={handleAuthSuccess}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
