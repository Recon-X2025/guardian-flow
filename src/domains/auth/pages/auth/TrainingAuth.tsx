import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ModularAuthLayout from "@/domains/auth/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/domains/auth/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/domains/auth/config/authConfig";
import { useRBAC, type AppRole } from "@/domains/auth/contexts/RBACContext";
import { useAuth } from "@/domains/auth/contexts/AuthContext";
import { logAuthEvent } from "@/domains/auth/hooks/useAuthAudit";
import { getModuleAwareRedirect, MODULE_RELEVANT_ROLES } from "@/domains/auth/lib/authRedirects";
import { ModuleSandboxProvider } from "@/domains/shared/components/ModuleSandboxProvider";
import { toast } from "sonner";

export default function TrainingAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.training;
  const { hasRole } = useRBAC();
  const { user, signOut } = useAuth();
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.training.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to Video Training. Please use a relevant role.');
      await signOut();
      return;
    }
    if (user?.email) {
      setAuthenticatedEmail(user.email);
    }
  };

  return (
    <ModularAuthLayout config={config}>
      <div className="space-y-6">
        {authenticatedEmail && (
          <ModuleSandboxProvider 
            module="training" 
            email={authenticatedEmail}
            onSandboxReady={() => navigate(getModuleAwareRedirect('training', hasRole))}
          />
        )}
        <EnhancedAuthForm 
          config={config} 
          onSuccess={handleAuthSuccess}
        />
      </div>
    </ModularAuthLayout>
  );
}
