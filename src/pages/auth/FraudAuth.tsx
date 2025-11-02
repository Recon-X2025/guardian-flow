import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getRedirectRoute } from "@/utils/getRedirectRoute";
import { useRBAC, type AppRole } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getModuleAwareRedirect, MODULE_RELEVANT_ROLES } from "@/lib/authRedirects";
import { SeedAccountsButton } from "@/components/SeedAccountsButton";
import { ModuleSandboxProvider } from "@/components/ModuleSandboxProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FraudAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.fraud;
  const { roles, refreshRoles, loading: rbacLoading } = useRBAC();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    
    // Refresh roles after successful sign-in
    await refreshRoles();
    
    // Wait for RBAC to finish loading
    let attempts = 0;
    while ((rbacLoading || roles.length === 0) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Get redirect route based on roles and module
    const redirectPath = getRedirectRoute(roles, 'fraud');
    
    // Navigate to protected route (which has AppLayout with sidebar)
    navigate(redirectPath);
  };

  return (
    <ModularAuthLayout config={config} onTestAccountLogin={handleAuthSuccess}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
  const { hasRole } = useRBAC();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.fraud.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to Fraud Detection. Please use a relevant role.');
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
