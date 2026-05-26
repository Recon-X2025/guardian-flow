import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/domains/auth/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/domains/auth/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/domains/auth/config/authConfig";
import { useRBAC } from "@/domains/auth/contexts/RBACContext";
import { logAuthEvent } from "@/domains/auth/hooks/useAuthAudit";
import { getModuleAwareRedirect } from "@/domains/auth/lib/authRedirects";
import { toast } from "sonner";

export default function UnifiedPlatformAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.platform;
  const { hasRole } = useRBAC();

  const handleAuthSuccess = () => {
    logAuthEvent('auth_success', config.module);
    // Platform allows all roles – send to module-aware redirect for platform
    navigate(getModuleAwareRedirect('platform', hasRole));
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
