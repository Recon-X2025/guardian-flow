import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ModularAuthLayout from "@/domains/auth/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/domains/auth/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/domains/auth/config/authConfig";
import { useRBAC, type AppRole } from "@/domains/auth/contexts/RBACContext";
import { useAuth } from "@/domains/auth/contexts/AuthContext";
import { logAuthEvent } from "@/domains/auth/hooks/useAuthAudit";
import { getModuleAwareRedirect, MODULE_RELEVANT_ROLES } from "@/domains/auth/lib/authRedirects";
import { SeedAccountsButton } from "@/domains/shared/components/SeedAccountsButton";
import { ModuleSandboxProvider } from "@/domains/shared/components/ModuleSandboxProvider";
import { toast } from "sonner";

export default function FraudAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.fraud;
  const { hasRole } = useRBAC();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.fraud.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to Fraud Detection. Please use a relevant role.');
      await signOut();
      return;
    }
    if (user?.email) {
      setAuthenticatedEmail(user.email);
    }
  };

  const handleSelectAccount = (selectedEmail: string, selectedPassword: string) => {
    setEmail(selectedEmail);
    setPassword(selectedPassword);
  };

  return (
    <ModularAuthLayout config={config}>
      <div className="space-y-6">
        {authenticatedEmail && (
          <ModuleSandboxProvider 
            module="fraud" 
            email={authenticatedEmail}
            onSandboxReady={() => navigate(getModuleAwareRedirect('fraud', hasRole))}
          />
        )}
        <SeedAccountsButton onSelectAccount={handleSelectAccount} module="fraud" />
        <EnhancedAuthForm 
          config={config} 
          onSuccess={handleAuthSuccess}
          initialEmail={email}
          initialPassword={password}
        />
      </div>
    </ModularAuthLayout>
  );
}
