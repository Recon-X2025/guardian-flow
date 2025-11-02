import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC, type AppRole } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getModuleAwareRedirect, MODULE_RELEVANT_ROLES } from "@/lib/authRedirects";
import { SeedAccountsButton } from "@/components/SeedAccountsButton";
import { ModuleSandboxProvider } from "@/components/ModuleSandboxProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AnalyticsAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.analytics;
  const { hasRole } = useRBAC();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.analytics.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to Advanced Analytics. Please use a relevant role.');
      await supabase.auth.signOut();
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
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
            module="analytics" 
            email={authenticatedEmail}
            onSandboxReady={() => navigate(getModuleAwareRedirect('analytics', hasRole))}
          />
        )}
        <SeedAccountsButton onSelectAccount={handleSelectAccount} module="analytics" />
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
