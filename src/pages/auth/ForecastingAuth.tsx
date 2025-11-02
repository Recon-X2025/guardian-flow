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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForecastingAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.forecasting;
  const { roles, refreshRoles } = useRBAC();

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    
    await refreshRoles();
    
    // Wait for RBAC to finish loading
    let attempts = 0;
    while ((roles.length === 0) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    const redirectPath = getRedirectRoute(roles, 'forecasting');
    navigate(redirectPath);
  };

  return (
    <ModularAuthLayout config={config} onTestAccountLogin={handleAuthSuccess}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
  const { hasRole } = useRBAC();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    const allowed = MODULE_RELEVANT_ROLES.forecasting.some((r) => hasRole(r as AppRole));
    if (!allowed) {
      toast.error('This account does not have access to AI Forecasting & Scheduling. Please use a relevant role.');
      await supabase.auth.signOut();
      return;
    }
    navigate(getModuleAwareRedirect('forecasting', hasRole));
  };

  const handleSelectAccount = (selectedEmail: string, selectedPassword: string) => {
    setEmail(selectedEmail);
    setPassword(selectedPassword);
  };

  return (
    <ModularAuthLayout config={config}>
      <div className="space-y-6">
        <SeedAccountsButton onSelectAccount={handleSelectAccount} module="forecasting" />
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
