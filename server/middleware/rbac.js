import { db } from '../db/client.js';

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
      const userRoles = await db.collection('user_roles').find({ user_id: userId }).toArray();
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
        // Try to check permission from database using $lookup
        const result = await db.collection('role_permissions').aggregate([
          { $match: { role: { $in: mappedRoles } } },
          { $lookup: { from: 'permissions', localField: 'permission_id', foreignField: 'id', as: 'perm' } },
          { $unwind: '$perm' },
          { $match: { 'perm.name': permission } },
        ]).toArray();

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
      const userRoles = await db.collection('user_roles').find({ user_id: userId }).toArray();
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
        const result = await db.collection('role_permissions').aggregate([
          { $match: { role: { $in: mappedRoles } } },
          { $lookup: { from: 'permissions', localField: 'permission_id', foreignField: 'id', as: 'perm' } },
          { $unwind: '$perm' },
          { $match: { 'perm.name': { $in: permissions } } },
        ]).toArray();

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
      const userRoles = await db.collection('user_roles').find({ user_id: userId }).toArray();
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
    const profile = await db.collection('profiles').findOne({ id: userId });
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
    tenant_admin: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.delete',
      'wo.read', 'wo.create', 'wo.update', 'wo.assign',
      'invoice.view', 'invoice.create', 'invoice.pay',
      'report.view', 'schedule.view', 'schedule.manage',
      'portal.access', 'user.manage', 'settings.manage',
    ],
    finance_manager: [
      'invoice.view', 'invoice.create', 'invoice.pay', 'invoice.approve',
      'report.view', 'portal.access', 'wo.read', 'ticket.read',
    ],
    ops_manager: [
      'wo.read', 'wo.create', 'wo.update', 'wo.assign',
      'ticket.read', 'ticket.create', 'ticket.update',
      'schedule.view', 'schedule.manage',
      'report.view', 'portal.access',
    ],
    dispatcher: [
      'wo.read', 'wo.assign',
      'schedule.view', 'schedule.manage',
      'ticket.read', 'portal.access',
    ],
    partner_admin: [
      'portal.access', 'wo.read', 'ticket.read',
      'invoice.view', 'partner.manage',
    ],
    technician: ['wo.read', 'wo.update', 'so.view'],
    customer: ['portal.access', 'ticket.create', 'ticket.read', 'wo.read', 'invoice.view', 'invoice.pay'],
  };

  return roles.some(role => {
    const perms = rolePermissionMap[role] || [];
    return perms.includes('*') || perms.includes(permission);
  });
}
