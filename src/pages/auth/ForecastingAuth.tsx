import { useNavigate } from "react-router-dom";
import ModularAuthLayout from "@/components/auth/ModularAuthLayout";
import EnhancedAuthForm from "@/components/auth/EnhancedAuthForm";
import { AUTH_MODULES } from "@/config/authConfig";
import { logAuthEvent } from "@/hooks/useAuthAudit";

export default function ForecastingAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.forecasting;

  const handleAuthSuccess = () => {
    logAuthEvent('auth_success', config.module);
    navigate("/modules/enhanced-scheduler");
  };

  return (
    <ModularAuthLayout config={config}>
      <EnhancedAuthForm config={config} onSuccess={handleAuthSuccess} />
    </ModularAuthLayout>
  );
}
