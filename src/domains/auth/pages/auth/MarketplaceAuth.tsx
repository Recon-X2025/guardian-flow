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

export default function MarketplaceAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.marketplace;
  const { hasRole } = useRBAC();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.marketplace.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to the Marketplace. Please use a relevant role.');
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
            module="marketplace" 
            email={authenticatedEmail}
            onSandboxReady={() => navigate(getModuleAwareRedirect('marketplace', hasRole))}
          />
        )}
        <SeedAccountsButton onSelectAccount={handleSelectAccount} module="marketplace" />
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
