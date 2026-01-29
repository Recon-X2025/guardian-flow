import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ModularAuthLayout from "@/domains/auth/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/domains/auth/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/domains/auth/config/authConfig";
import { useRBAC } from "@/domains/auth/contexts/RBACContext";
import { logAuthEvent } from "@/domains/auth/hooks/useAuthAudit";
import { getModuleAwareRedirect } from "@/domains/auth/lib/authRedirects";
import { SeedAccountsButton } from "@/domains/shared/components/SeedAccountsButton";
import { toast } from "sonner";

export default function UnifiedPlatformAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.platform;
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
