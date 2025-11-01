import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { useRBAC } from "@/contexts/RBACContext";
import { logAuthEvent } from "@/hooks/useAuthAudit";

export default function UnifiedPlatformAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.platform;
  const { hasRole } = useRBAC();

  const getRedirectRoute = () => {
    if (hasRole('dispatcher') || hasRole('technician')) return '/work-orders';
    if (hasRole('finance_manager')) return '/finance';
    if (hasRole('fraud_investigator')) return '/modules/image-forensics';
    if (hasRole('auditor')) return '/compliance-dashboard';
    if (hasRole('customer')) return '/customer-portal';
    return '/dashboard';
  };

  const handleAuthSuccess = () => {
    logAuthEvent('auth_success', config.module);
    navigate(getRedirectRoute());
  };
  return (
    <ModularAuthLayout config={config}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
