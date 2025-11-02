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
  | 'guest'
  | 'client_admin'
  | 'client_operations_manager'
  | 'client_finance_manager'
  | 'client_compliance_officer'
  | 'client_procurement_manager'
  | 'client_executive'
  | 'client_fraud_manager';

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
      // Fetch full user_roles with metadata for client use
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('❌ Roles fetch error:', rolesError);
        setRoles([]);
        setPermissions([]);
        setTenantId(null);
        setLoading(false);
        return;
      }

      console.log('✅ Loaded user roles:', userRoles?.length || 0, 'roles');
      if (userRoles && userRoles.length > 0) {
        console.log('📋 User roles:', userRoles.map(r => r.role));
      }
      setRoles(userRoles || []);

      // Fetch permissions for the user's roles
      if (userRoles && userRoles.length > 0) {
        const roleNames = userRoles.map(r => r.role);
        console.log('🔍 Fetching permissions for roles:', roleNames);
        
        // Fetch role_permissions
        const { data: rolePerms, error: permsError } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .in('role', roleNames as any);

        if (permsError) {
          console.error('❌ Permissions fetch error:', permsError);
          console.error('Error details:', {
            message: permsError.message,
            details: permsError.details,
            hint: permsError.hint,
            roles: roleNames
          });
          setPermissions([]);
        } else {
          console.log('🔍 Fetched role_permissions:', rolePerms?.length || 0);
          
          // Get unique permission IDs
          const permissionIds = [...new Set(rolePerms?.map(rp => rp.permission_id).filter(Boolean) || [])];
          console.log('🔍 Unique permission IDs:', permissionIds.length);
          
          // Fetch permission names
          const { data: permsData, error: permsNameError } = await supabase
            .from('permissions')
            .select('name')
            .in('id', permissionIds);

          if (permsNameError) {
            console.error('❌ Permission names fetch error:', permsNameError);
            setPermissions([]);
          } else {
            const permissions = permsData?.map(p => p.name) || [];
            
            console.log('✅ Loaded permissions:', permissions.length, 'permissions');
            console.log('📋 ALL permissions:', permissions);
            setPermissions(permissions);
          }
        }
      } else {
        console.warn('⚠️ No user roles found for user:', user.id);
        setPermissions([]);
      }

      // Set tenant_id from first role or profile
      const tenantId = userRoles?.[0]?.tenant_id || null;
      setTenantId(tenantId);

      // If tenant_id not in roles, fetch from profile
      if (!tenantId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
        }
      }
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

  const refreshRoles = async (): Promise<void> => {
    await fetchRolesAndPermissions();
  };

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
    refreshRoles,
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
