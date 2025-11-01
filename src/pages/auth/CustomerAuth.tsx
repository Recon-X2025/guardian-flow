import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { logAuthEvent } from "@/hooks/useAuthAudit";

export default function CustomerAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.customer;

  const handleAuthSuccess = () => {
    logAuthEvent('auth_success', config.module);
    navigate("/customer-portal");
  };

  return (
    <ModularAuthLayout config={config}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
