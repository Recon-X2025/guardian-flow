import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/domains/auth/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/domains/auth/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/domains/auth/config/authConfig";
import { useRBAC, type AppRole } from "@/domains/auth/contexts/RBACContext";
import { useAuth } from "@/domains/auth/contexts/AuthContext";
import { logAuthEvent } from "@/domains/auth/hooks/useAuthAudit";
import { getModuleAwareRedirect, MODULE_RELEVANT_ROLES } from "@/domains/auth/lib/authRedirects";
import { toast } from "sonner";

export default function ForecastingAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.forecasting;
  const { hasRole } = useRBAC();
  const { signOut } = useAuth();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.forecasting.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to AI Forecasting & Scheduling. Please use a relevant role.');
      await signOut();
      return;
    }
    navigate(getModuleAwareRedirect('forecasting', hasRole));
  };

  return (
    <ModularAuthLayout config={config}>
      <div className="space-y-6">
        <EnhancedAuthForm 
          config={config} 
          onSuccess={handleAuthSuccess}
        />
      </div>
    </ModularAuthLayout>
  );
}
