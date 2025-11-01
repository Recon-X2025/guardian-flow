import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getModuleAwareRedirect } from "@/lib/authRedirects";

export default function AnalyticsAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.analytics;
  const { hasRole } = useRBAC();

  const handleAuthSuccess = () => {
    logAuthEvent('auth_success', config.module);
    navigate(getModuleAwareRedirect('analytics', hasRole));
  };

  return (
    <ModularAuthLayout config={config}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
