import { useRBAC } from '@/domains/auth/contexts/RBACContext';
import { canPerformAction, getResourcePermissions, ActionPermission } from '@/domains/auth/config/rolePermissions';

export function useActionPermissions(resource: string) {
  const { roles } = useRBAC();
  const roleStrings = roles.map(r => r.role);
  
  const permissions = getResourcePermissions(roleStrings, resource);
  
  const can = (action: keyof ActionPermission) => {
    return canPerformAction(roleStrings, resource, action);
  };
  
  return {
    ...permissions,
    can,
  };
}
