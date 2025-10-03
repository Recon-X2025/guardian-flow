import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type AppRole = 
  | 'sys_admin'
  | 'tenant_admin'
  | 'ops_manager'
  | 'finance_manager'
  | 'fraud_investigator'
  | 'partner_admin'
  | 'partner_user'
  | 'technician'
  | 'dispatcher'
  | 'customer'
  | 'product_owner'
  | 'support_agent'
  | 'ml_ops'
  | 'billing_agent'
  | 'auditor'
  | 'guest';

interface UserRole {
  id: string;
  role: AppRole;
  tenant_id: string | null;
  granted_at: string;
}

interface RBACContextType {
  roles: UserRole[];
  permissions: string[];
  tenantId: string | null;
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isAdmin: boolean;
  isTenantAdmin: boolean;
  refreshRoles: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRolesAndPermissions = async () => {
    if (!user || !session) {
      setRoles([]);
      setPermissions([]);
      setTenantId(null);
      setLoading(false);
      return;
    }

    try {
      // Call backend auth/me endpoint for server-validated context
      const { data, error } = await supabase.functions.invoke('auth-me', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Fetch full user_roles with metadata for client use
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      setRoles(userRoles || []);
      setPermissions(data.permissions || []);
      setTenantId(data.tenant_id || null);
    } catch (error) {
      console.error('Error fetching roles/permissions:', error);
      setRoles([]);
      setPermissions([]);
      setTenantId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [user, session]);

  const hasRole = (role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return roles.some(r => checkRoles.includes(r.role));
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (checkPermissions: string[]): boolean => {
    return checkPermissions.some(p => permissions.includes(p));
  };

  const isAdmin = hasAnyRole(['sys_admin', 'tenant_admin']);
  const isTenantAdmin = hasRole('tenant_admin');

  const value: RBACContextType = {
    roles,
    permissions,
    tenantId,
    loading,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    isTenantAdmin,
    refreshRoles: fetchRolesAndPermissions,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}
