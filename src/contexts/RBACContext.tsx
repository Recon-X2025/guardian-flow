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
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRolesAndPermissions = async () => {
    if (!user) {
      setRoles([]);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      setRoles(userRoles || []);

      // Fetch permissions based on roles
      if (userRoles && userRoles.length > 0) {
        const roleNames = userRoles.map(r => r.role);
        
        const { data: rolePerms, error: permsError } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(name)')
          .in('role', roleNames);

        if (permsError) throw permsError;

        const permissionNames = rolePerms
          ?.map((rp: any) => rp.permissions?.name)
          .filter(Boolean) || [];

        setPermissions(permissionNames);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching roles/permissions:', error);
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [user]);

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
