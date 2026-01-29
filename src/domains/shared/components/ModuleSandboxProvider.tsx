import { useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/domains/auth/contexts/AuthContext";
import { toast } from "sonner";

interface ModuleSandboxProviderProps {
  module: string;
  email: string;
  onSandboxReady?: (tenantId: string) => void;
}

export function ModuleSandboxProvider({ module, email, onSandboxReady }: ModuleSandboxProviderProps) {
  const { user } = useAuth();

  useEffect(() => {
    const setupModuleSandbox = async () => {
      try {
        if (!user) {
          console.warn('[ModuleSandbox] No user authenticated');
          return;
        }

        // Update user's current module context using direct API call
        const response = await apiClient.request('/api/db/profiles/' + user.id, {
          method: 'PATCH',
          body: JSON.stringify({ current_module_context: module })
        });
        
        if (response.error) {
          console.warn('[ModuleSandbox] Failed to update module context:', response.error);
        } else {
          console.log(`[ModuleSandbox] Module context updated to ${module} for user:`, user.id);
          toast.success(`${module.toUpperCase()} module context set`);
          
          // Call onSandboxReady with user.id as tenant_id
          onSandboxReady?.(user.id);
        }
      } catch (err) {
        console.error('[ModuleSandbox] Setup failed:', err);
        toast.error(`Failed to setup ${module} module context`);
      }
    };

    if (email && module !== 'platform' && user) {
      setupModuleSandbox();
    }
  }, [module, email, user, onSandboxReady]);

  return null;
}
