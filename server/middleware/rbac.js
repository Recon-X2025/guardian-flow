import { getMany, getOne } from '../db/query.js';

/**
 * RBAC Middleware - Check if user has required permissions or roles
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userId = req.user.id;
      
      // Get user roles
      const userRoles = await getMany(
        `SELECT role FROM user_roles WHERE user_id = $1`,
        [userId]
      );
      
      const roles = userRoles.map(r => r.role);
      
      // Map database roles to frontend roles
      const roleMap = {
        'admin': 'sys_admin',
        'manager': 'tenant_admin',
        'technician': 'technician',
        'customer': 'customer',
      };
      
      const mappedRoles = roles.map(r => roleMap[r] || r);
      
      // Check if user has permission
      let hasPermission = false;
      
      try {
        // Try to check permission from database
        const result = await getMany(
          `SELECT DISTINCT p.name 
           FROM permissions p
           INNER JOIN role_permissions rp ON p.id = rp.permission_id
           WHERE rp.role = ANY($1::text[]) AND p.name = $2`,
          [mappedRoles, permission]
        );
        
        hasPermission = result.length > 0;
      } catch (error) {
        // If permission check fails, use fallback
        console.warn('Permission check failed, using fallback:', error.message);
        hasPermission = checkPermissionFallback(mappedRoles, permission);
      }
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `You do not have the '${permission}' permission`,
          required: permission,
          roles: mappedRoles
        });
      }
      
      // Attach user context with roles for further use
      req.user.roles = mappedRoles;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(permissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userId = req.user.id;
      
      // Get user roles
      const userRoles = await getMany(
        `SELECT role FROM user_roles WHERE user_id = $1`,
        [userId]
      );
      
      const roles = userRoles.map(r => r.role);
      
      // Map database roles to frontend roles
      const roleMap = {
        'admin': 'sys_admin',
        'manager': 'tenant_admin',
        'technician': 'technician',
        'customer': 'customer',
      };
      
      const mappedRoles = roles.map(r => roleMap[r] || r);
      
      // Check if user has any of the required permissions
      let hasAnyPermission = false;
      
      try {
        const result = await getMany(
          `SELECT DISTINCT p.name 
           FROM permissions p
           INNER JOIN role_permissions rp ON p.id = rp.permission_id
           WHERE rp.role = ANY($1::text[]) AND p.name = ANY($2::text[])`,
          [mappedRoles, permissions]
        );
        
        hasAnyPermission = result.length > 0;
      } catch (error) {
        // Fallback
        hasAnyPermission = permissions.some(perm => 
          checkPermissionFallback(mappedRoles, perm)
        );
      }
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `You do not have any of the required permissions`,
          required: permissions,
          roles: mappedRoles
        });
      }
      
      req.user.roles = mappedRoles;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Require specific role
 */
export function requireRole(role) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userId = req.user.id;
      
      // Get user roles
      const userRoles = await getMany(
        `SELECT role FROM user_roles WHERE user_id = $1`,
        [userId]
      );
      
      const roles = userRoles.map(r => r.role);
      
      // Map database roles to frontend roles
      const roleMap = {
        'admin': 'sys_admin',
        'manager': 'tenant_admin',
        'technician': 'technician',
        'customer': 'customer',
      };
      
      const mappedRoles = roles.map(r => roleMap[r] || r);
      const mappedRole = roleMap[role] || role;
      
      if (!mappedRoles.includes(mappedRole)) {
        return res.status(403).json({ 
          error: 'Insufficient role',
          message: `You do not have the '${mappedRole}' role`,
          required: mappedRole,
          roles: mappedRoles
        });
      }
      
      req.user.roles = mappedRoles;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Role check failed' });
    }
  };
}

/**
 * Get tenant ID for user (for tenant isolation)
 */
export async function getUserTenantId(userId) {
  try {
    const profile = await getOne(
      `SELECT tenant_id FROM profiles WHERE id = $1`,
      [userId]
    );
    return profile?.tenant_id || null;
  } catch (error) {
    return null;
  }
}

/**
 * Fallback permission checker (when DB query fails)
 */
function checkPermissionFallback(roles, permission) {
  // Sys admin has all permissions
  if (roles.includes('sys_admin')) {
    return true;
  }
  
  // Permission map (fallback)
  const rolePermissionMap = {
    sys_admin: ['*'], // All permissions
    tenant_admin: ['ticket.read', 'ticket.create', 'wo.read', 'wo.create', 'portal.access'],
    customer: ['portal.access', 'ticket.create', 'ticket.read', 'wo.read', 'invoice.view', 'invoice.pay'],
    technician: ['wo.read', 'wo.update', 'so.view'],
  };
  
  return roles.some(role => {
    const perms = rolePermissionMap[role] || [];
    return perms.includes('*') || perms.includes(permission);
  });
}

