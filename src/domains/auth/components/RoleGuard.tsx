import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC, AppRole } from '@/domains/auth/contexts/RBACContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  role?: AppRole;
  roles?: AppRole[];
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
  showError?: boolean;
}

export function RoleGuard({
  children,
  role,
  roles,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/',
  showError = true,
}: RoleGuardProps) {
  const rbac = useRBAC();

  if (rbac.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
    if (showError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-6 w-6 text-destructive" />
                <CardTitle>Access Denied</CardTitle>
              </div>
              <CardDescription>
                You do not have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please contact your administrator if you believe you should have access to this resource.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
