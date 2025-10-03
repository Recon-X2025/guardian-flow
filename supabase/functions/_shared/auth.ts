import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  roles: string[];
  permissions: string[];
  tenantId: string | null;
  supabase: SupabaseClient;
}

export interface AuthError {
  code: string;
  message: string;
  allowedActions?: string[];
  correlationId: string;
}

export async function validateAuth(
  req: Request,
  options: {
    requireAuth?: boolean;
    requiredPermissions?: string[];
    requiredRoles?: string[];
    requireAll?: boolean;
  } = {}
): Promise<{ success: true; context: AuthContext } | { success: false; error: AuthError }> {
  const correlationId = crypto.randomUUID();
  const { requireAuth = true, requiredPermissions = [], requiredRoles = [], requireAll = false } = options;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get auth header
  const authHeader = req.headers.get('Authorization');
  
  if (requireAuth && !authHeader) {
    return {
      success: false,
      error: {
        code: 'unauthorized',
        message: 'Missing authorization header',
        correlationId,
      },
    };
  }

  if (!authHeader) {
    // No auth required and no header provided
    return {
      success: true,
      context: {
        user: { id: '', email: '' },
        roles: [],
        permissions: [],
        tenantId: null,
        supabase,
      },
    };
  }

  // Verify user
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return {
      success: false,
      error: {
        code: 'unauthorized',
        message: 'Invalid or expired token',
        correlationId,
      },
    };
  }

  // Fetch user roles
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id);

  if (rolesError) {
    console.error('Error fetching user roles:', rolesError);
    return {
      success: false,
      error: {
        code: 'internal_error',
        message: 'Failed to fetch user roles',
        correlationId,
      },
    };
  }

  const roles = userRoles?.map(r => r.role) || [];
  const tenantId = userRoles?.[0]?.tenant_id || null;

  // Fetch user permissions
  const { data: rolePerms, error: permsError } = await supabase
    .from('role_permissions')
    .select('permissions(name)')
    .in('role', roles);

  if (permsError) {
    console.error('Error fetching permissions:', permsError);
    return {
      success: false,
      error: {
        code: 'internal_error',
        message: 'Failed to fetch user permissions',
        correlationId,
      },
    };
  }

  const permissions = rolePerms
    ?.map((rp: any) => rp.permissions?.name)
    .filter(Boolean) || [];

  // Check required roles
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAll
      ? requiredRoles.every(r => roles.includes(r))
      : requiredRoles.some(r => roles.includes(r));

    if (!hasRequiredRoles) {
      return {
        success: false,
        error: {
          code: 'forbidden',
          message: 'Insufficient role privileges',
          allowedActions: [],
          correlationId,
        },
      };
    }
  }

  // Check required permissions
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(p => permissions.includes(p))
      : requiredPermissions.some(p => permissions.includes(p));

    if (!hasRequiredPermissions) {
      return {
        success: false,
        error: {
          code: 'forbidden',
          message: 'Insufficient permissions to perform this action',
          allowedActions: permissions,
          correlationId,
        },
      };
    }
  }

  return {
    success: true,
    context: {
      user: {
        id: user.id,
        email: user.email,
      },
      roles,
      permissions,
      tenantId,
      supabase,
    },
  };
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  context: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: any;
    actorRole?: string;
    tenantId?: string | null;
    reason?: string;
    mfaVerified?: boolean;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  }
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: context.userId,
      action: context.action,
      resource_type: context.resourceType,
      resource_id: context.resourceId || null,
      changes: context.changes || null,
      actor_role: context.actorRole || null,
      tenant_id: context.tenantId || null,
      reason: context.reason || null,
      mfa_verified: context.mfaVerified || false,
      ip_address: context.ipAddress || null,
      user_agent: context.userAgent || null,
      correlation_id: context.correlationId || crypto.randomUUID(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't block the operation
  }
}

export function createErrorResponse(error: AuthError, status: number = 403) {
  return new Response(
    JSON.stringify(error),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'X-Correlation-ID': error.correlationId,
      },
    }
  );
}
