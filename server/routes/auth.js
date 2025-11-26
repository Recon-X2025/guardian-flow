import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getOne, getMany, query, transaction } from '../db/query.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Sign up new user
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user already exists
    const existingUser = await getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await transaction(async (client) => {
      // Create user
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, active, created_at)
         VALUES ($1, $2, $3, $4, true, now())`,
        [userId, email, hashedPassword, fullName]
      );

      // Create profile
      await client.query(
        `INSERT INTO profiles (id, email, full_name, created_at)
         VALUES ($1, $2, $3, now())`,
        [userId, email, fullName]
      );

      // Check if this is the first user (before inserting this one)
      const existingUsers = await client.query('SELECT COUNT(*) as count FROM users');
      const isFirstUser = parseInt(existingUsers.rows[0].count) === 0;
      const defaultRole = isFirstUser ? 'admin' : 'technician';
      
      await client.query(
        `INSERT INTO user_roles (user_id, role, created_at)
         VALUES ($1, $2, now())`,
        [userId, defaultRole]
      );
    });

    const token = generateToken(userId);

    res.json({
      user: {
        id: userId,
        email,
        full_name: fullName,
      },
      session: {
        access_token: token,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Sign in
 */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user with password hash
    const user = await getOne(
      `SELECT id, email, password_hash, full_name, phone, active
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user roles
    const roles = await getMany(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [user.id]
    );

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
      },
      session: {
        access_token: token,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

/**
 * Get current user
 */
router.get('/user', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * Get current user with roles and permissions (for RBAC)
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user roles (only select columns that exist in the schema)
    const userRoles = await getMany(
      `SELECT id, role, created_at
       FROM user_roles 
       WHERE user_id = $1`,
      [userId]
    );

    // Get tenant_id from profile (if column exists)
    let tenantId = null;
    try {
      const profile = await getOne(
        `SELECT tenant_id FROM profiles WHERE id = $1`,
        [userId]
      );
      tenantId = profile?.tenant_id || null;
    } catch (error) {
      // tenant_id column might not exist in profiles table
      console.warn('Could not fetch tenant_id from profile:', error.message);
      tenantId = null;
    }
    
    // Map database roles to frontend roles
    const roleMap = {
      'admin': 'sys_admin',
      'manager': 'tenant_admin',
      'technician': 'technician',
      'customer': 'customer',
    };
    
    // Convert roles to frontend format
    const mappedRoles = userRoles.map(ur => {
      const mappedRole = roleMap[ur.role] || ur.role;
      return {
        id: ur.id,
        role: mappedRole,
        tenant_id: null, // Not in current schema
        granted_at: ur.created_at || new Date().toISOString(),
      };
    });
    
    const roles = mappedRoles.map(ur => ur.role);
    console.log('Auth /me - User roles mapped:', roles, 'from DB roles:', userRoles.map(r => r.role));

    // Get permissions for all user roles
    let permissions = [];
    
    try {
      // Try to get permissions from role_permissions table
      // Use role names directly since we're mapping them
      const rolePerms = await getMany(
        `SELECT DISTINCT p.name 
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role = ANY($1::text[])`,
        [roles]
      );
      permissions = rolePerms.map(rp => rp.name);
      
      // If no permissions found in DB, use fallback
      if (permissions.length === 0) {
        console.warn('No permissions found in database for roles:', roles);
        permissions = generatePermissionsFromRoles(roles);
      }
    } catch (error) {
      // If role_permissions table doesn't exist or query fails,
      // generate permissions based on role (fallback)
      console.warn('Could not fetch permissions from database, using fallback:', error.message);
      permissions = generatePermissionsFromRoles(roles);
    }

    res.json({
      user: req.user,
      roles: mappedRoles,
      permissions,
      tenant_id: tenantId,
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    res.status(500).json({ error: 'Failed to get user context' });
  }
});

/**
 * Generate permissions based on roles (fallback when DB permissions not available)
 */
function generatePermissionsFromRoles(roles) {
  const permissions = new Set();
  
  // Map roles to common permissions
  const rolePermissionMap = {
    sys_admin: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign', 'ticket.close',
      'wo.read', 'wo.create', 'wo.draft', 'wo.release', 'wo.assign', 'wo.complete', 'wo.close',
      'so.view', 'so.create', 'so.update',
      'inventory.view', 'inventory.procure', 'inventory.update',
      'warranty.view', 'warranty.create',
      'quote.view', 'quote.create',
      'invoice.view', 'invoice.create', 'invoice.pay',
      'finance.view', 'finance.create',
      'penalty.calculate',
      'sapos.view',
      'fraud.view', 'fraud.create',
      'admin.config', 'audit.read', 'mlops.view',
      'documents.view', 'customers.view', 'technicians.view', 'equipment.view',
      'contracts.view', 'partners.view', 'maintenance.view', 'portal.access',
      'attachment.upload',
    ],
    tenant_admin: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign',
      'wo.read', 'wo.create', 'wo.assign', 'wo.complete',
      'so.view', 'so.create',
      'inventory.view', 'inventory.procure',
      'warranty.view',
      'quote.view', 'quote.create',
      'invoice.view', 'invoice.create',
      'finance.view',
      'admin.config', 'audit.read',
      'documents.view', 'customers.view', 'technicians.view', 'equipment.view',
      'contracts.view',
      'attachment.upload',
    ],
    ops_manager: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign',
      'wo.read', 'wo.assign',
      'so.view',
      'inventory.view', 'inventory.procure',
      'warranty.view',
      'audit.read',
      'customers.view', 'technicians.view', 'equipment.view',
      'attachment.upload',
    ],
    dispatcher: [
      'ticket.read', 'ticket.create', 'ticket.update',
      'wo.read', 'wo.assign',
      'so.view',
      'attachment.upload',
    ],
    technician: [
      'ticket.read',
      'wo.read',
      'so.view',
      'attachment.upload',
    ],
    finance_manager: [
      'quote.view', 'quote.create',
      'invoice.view', 'invoice.create', 'invoice.pay',
      'finance.view', 'finance.create',
      'penalty.calculate',
      'audit.read',
      'contracts.view',
    ],
    fraud_investigator: [
      'fraud.view', 'fraud.create',
      'audit.read',
    ],
    auditor: [
      'fraud.view',
      'audit.read',
    ],
    support_agent: [
      'ticket.read', 'ticket.create', 'ticket.update',
      'warranty.view',
    ],
    partner_admin: [
      'wo.read',
      'inventory.view',
      'equipment.view',
    ],
  };

  roles.forEach(role => {
    const rolePerms = rolePermissionMap[role] || [];
    rolePerms.forEach(perm => permissions.add(perm));
  });

  return Array.from(permissions);
}

/**
 * Sign out (client-side token removal, but we can track here if needed)
 */
router.post('/signout', authenticateToken, (req, res) => {
  res.json({ message: 'Signed out successfully' });
});

/**
 * Assign admin role to a user (for existing users)
 * POST /api/auth/assign-admin
 */
router.post('/assign-admin', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Only allow if current user is admin
    const currentUserRoles = await getMany(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [currentUser.id]
    );
    const isAdmin = currentUserRoles.some(r => r.role === 'admin');
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can assign admin role' });
    }

    // Get target user
    const targetUser = await getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Assign admin role (upsert)
    await query(
      `INSERT INTO user_roles (user_id, role, created_at)
       VALUES ($1, 'admin', now())
       ON CONFLICT (user_id, role) DO NOTHING`,
      [targetUser.id]
    );

    res.json({ message: `Admin role assigned to ${email}` });
  } catch (error) {
    console.error('Assign admin error:', error);
    res.status(500).json({ error: 'Failed to assign admin role' });
  }
});

export default router;

