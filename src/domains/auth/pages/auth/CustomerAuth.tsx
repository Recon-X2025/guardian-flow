import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

export default function CustomerAuth() {
  const navigate = useNavigate();
  const config = AUTH_MODULES.customer;
  const { hasRole, loading: rbacLoading } = useRBAC();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Watch for user and RBAC to be ready after login
  useEffect(() => {
    const handleNavigation = async () => {
      if (!(loginSuccess && user && !rbacLoading)) return;
      
      console.log('CustomerAuth: User and RBAC ready, checking permissions...');
      
      const allowed = MODULE_RELEVANT_ROLES.customer.some((r) => hasRole(r as AppRole));
      if (!allowed) {
        console.warn('CustomerAuth: User does not have customer role.');
        toast.error('This account does not have access to the Customer Portal. Please use a relevant role.');
        signOut();
        setLoginSuccess(false);
        return;
      }
      
      // CRITICAL: Wait for user to be in localStorage (it should be there already)
      // Double-check that localStorage has the user before navigating
      const waitForLocalStorage = () => {
        return new Promise<void>((resolve) => {
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            const storedUser = localStorage.getItem('auth_user');
            const storedSession = localStorage.getItem('auth_session');
            if (storedUser && storedSession) {
              clearInterval(checkInterval);
              resolve();
            } else if (attempts >= 20) {
              // Timeout after 2 seconds
              clearInterval(checkInterval);
              resolve(); // Resolve anyway, user should be set by now
            }
          }, 100);
        });
      };
      
      // Wait for localStorage to have user
      await waitForLocalStorage();
      
      // Set a flag in sessionStorage to indicate we just logged in
      sessionStorage.setItem('just_logged_in', 'true');
      
      // Additional delay to ensure React state has propagated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('CustomerAuth: User has customer access, navigating to portal');
      navigate('/customer-portal', { replace: true });
      setLoginSuccess(false); // Reset flag
      
      // Clear the flag after navigation
      setTimeout(() => {
        sessionStorage.removeItem('just_logged_in');
      }, 3000);
    };
    
    handleNavigation();
  }, [loginSuccess, user, rbacLoading, hasRole, navigate, signOut]);

  const handleAuthSuccess = async () => {
    logAuthEvent('auth_success', config.module);
    console.log('CustomerAuth: Login successful, waiting for user and RBAC...');
    
    // Set flag to trigger useEffect
    setLoginSuccess(true);
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
            module="customer" 
            email={authenticatedEmail}
            onSandboxReady={() => navigate(getModuleAwareRedirect('customer', hasRole))}
          />
        )}
        <SeedAccountsButton onSelectAccount={handleSelectAccount} module="customer" />
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
