import React from 'react';
import { useRBAC, AppRole } from '@/domains/auth/contexts/RBACContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ProtectedActionProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: AppRole;
  roles?: AppRole[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  disabledTooltip?: string;
}

export function ProtectedAction({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
  disabledTooltip = 'You do not have permission to perform this action',
}: ProtectedActionProps) {
  const rbac = useRBAC();

  if (rbac.loading) {
    return fallback;
  }

  let hasAccess = true;

  // Check permissions
  if (permission) {
    hasAccess = rbac.hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? permissions.every(p => rbac.hasPermission(p))
      : rbac.hasAnyPermission(permissions);
  }

  // Check roles
  if (hasAccess && role) {
    hasAccess = rbac.hasRole(role);
  } else if (hasAccess && roles) {
    hasAccess = requireAll
      ? roles.every(r => rbac.hasRole(r))
      : rbac.hasAnyRole(roles);
  }

  if (!hasAccess) {
    if (React.isValidElement(children)) {
      // Disable the element and show tooltip
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-not-allowed opacity-50">
              {React.cloneElement(children as React.ReactElement, {
                disabled: true,
                onClick: (e: any) => e.preventDefault(),
              })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}
