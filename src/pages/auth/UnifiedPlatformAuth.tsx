import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import { getRedirectRoute } from "@/utils/getRedirectRoute";
import { getModuleAwareRedirect } from "@/lib/authRedirects";
import { SeedAccountsButton } from "@/components/SeedAccountsButton";
import { toast } from "sonner";

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
  const { hasRole } = useRBAC();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuthSuccess = () => {
    logAuthEvent('auth_success', config.module);
    // Platform allows all roles – send to module-aware redirect for platform
    navigate(getModuleAwareRedirect('platform', hasRole));
  };

  const handleSelectAccount = (selectedEmail: string, selectedPassword: string) => {
    setEmail(selectedEmail);
    setPassword(selectedPassword);
  };

  return (
    <ModularAuthLayout config={config}>
      <div className="space-y-6">
        <SeedAccountsButton onSelectAccount={handleSelectAccount} module="platform" />
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
