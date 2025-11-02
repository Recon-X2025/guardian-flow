import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ModuleSandboxProviderProps {
  module: string;
  email: string;
  onSandboxReady?: (tenantId: string) => void;
}

export function ModuleSandboxProvider({ module, email, onSandboxReady }: ModuleSandboxProviderProps) {
  useEffect(() => {
    const setupModuleSandbox = async () => {
      try {
        const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET;
        
        if (!INTERNAL_SECRET) {
          console.warn('[ModuleSandbox] No internal secret configured');
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-sandbox-tenant', {
          body: {
            email,
            name: `${module.toUpperCase()} User`,
            module_context: module,
          },
          headers: {
            'x-internal-secret': INTERNAL_SECRET,
          },
        });

        if (error) throw error;

        if (data?.success) {
          console.log(`[ModuleSandbox] Sandbox ready for ${module}:`, data.tenant_id);
          
          // Update user's current module context
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ current_module_context: module })
              .eq('id', user.id);
          }

          if (data.reused) {
            toast.info(`Using your existing ${module} sandbox environment`);
          } else {
            toast.success(`${module.toUpperCase()} sandbox environment ready!`);
          }

          onSandboxReady?.(data.tenant_id);
        }
      } catch (err) {
        console.error('[ModuleSandbox] Setup failed:', err);
        toast.error(`Failed to setup ${module} sandbox environment`);
      }
    };

    if (email && module !== 'platform') {
      setupModuleSandbox();
    }
  }, [module, email, onSandboxReady]);

  return null;
}
