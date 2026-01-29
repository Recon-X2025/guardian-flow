import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';
import { getOne, getMany, query, transaction } from '../db/query.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { revokeAccessToken, revokeAllUserTokens } from '../db/tokenBlacklist.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, signinSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.js';

const router = express.Router();

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour (matches JWT)
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function ensureRefreshTokensTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

async function ensurePasswordResetTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

async function createRefreshToken(userId) {
  await ensureRefreshTokensTable();
  const refreshToken = randomUUID();
  const hash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
  // Clean up old tokens for this user (keep max 5)
  await query(
    `DELETE FROM refresh_tokens WHERE user_id = $1 AND id NOT IN (
      SELECT id FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5
    )`,
    [userId]
  ).catch(() => {});
  return { refreshToken, expiresAt };
}

/**
 * Sign up new user
 */
router.post('/signup', validate(signupSchema), async (req, res) => {
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
    const { refreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(userId);

    logger.info('User signed up', { userId, email });

    res.json({
      user: {
        id: userId,
        email,
        full_name: fullName,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: Date.now() + TOKEN_EXPIRY_MS,
        refresh_expires_at: refreshExpiresAt.getTime(),
      },
    });
  } catch (error) {
    logger.error('Signup error', { error: error.message });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Sign in
 */
router.post('/signin', validate(signinSchema), async (req, res) => {
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
    const { refreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(user.id);

    logger.info('User signed in', { userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: Date.now() + TOKEN_EXPIRY_MS,
        refresh_expires_at: refreshExpiresAt.getTime(),
      },
    });
  } catch (error) {
    logger.error('Signin error', { error: error.message });
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
 * Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshSchema), async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    await ensureRefreshTokensTable();
    const hash = hashToken(refresh_token);

    const stored = await getOne(
      `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
      [hash]
    );

    if (!stored || new Date(stored.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify user still active
    const user = await getOne('SELECT id, email, active FROM users WHERE id = $1', [stored.user_id]);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Delete old refresh token (rotation)
    await query('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);

    // Issue new tokens
    const accessToken = generateToken(user.id);
    const { refreshToken: newRefreshToken, expiresAt } = await createRefreshToken(user.id);

    res.json({
      session: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_at: Date.now() + TOKEN_EXPIRY_MS,
        refresh_expires_at: expiresAt.getTime(),
      },
    });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Forgot password — generate reset token
 */
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await getOne('SELECT id FROM users WHERE email = $1 AND active = true', [email]);
    if (!user) {
      // Don't reveal whether user exists
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    await ensurePasswordResetTable();

    // Invalidate previous tokens
    await query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.id]);

    const resetToken = randomUUID();
    const hash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, hash, expiresAt]
    );

    logger.info('Password reset requested', { userId: user.id });

    // Send email (falls back to logging in dev)
    const emailResult = await sendPasswordResetEmail(email, resetToken).catch(err => {
      logger.error('Email send failed', { error: err.message });
      return { success: false };
    });

    const response = { message: 'If that email exists, a reset link has been sent' };
    // Only expose token in dev mode (no email configured)
    if (emailResult?.mode === 'dev') {
      response.reset_token = resetToken;
      response.expires_at = expiresAt.toISOString();
    }
    res.json(response);
  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    res.status(500).json({ error: 'Failed to process password reset' });
  }
});

/**
 * Reset password using reset token
 */
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    await ensurePasswordResetTable();
    const hash = hashToken(token);

    const stored = await getOne(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = $1`,
      [hash]
    );

    if (!stored || stored.used || new Date(stored.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, stored.user_id]);

    // Mark token as used
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [stored.id]);

    // Invalidate all refresh tokens for this user (force re-login)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [stored.user_id]).catch(() => {});

    logger.info('Password reset completed', { userId: stored.user_id });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error', { error: error.message });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * Sign out — invalidate refresh token
 */
router.post('/signout', authenticateToken, async (req, res) => {
  try {
    // Delete all refresh tokens for this user
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]).catch(() => {});
    logger.info('User signed out', { userId: req.user.id });
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    res.json({ message: 'Signed out successfully' });
  }
});

/**
 * Sign out from all devices — revoke all tokens
 */
router.post('/signout-all', authenticateToken, async (req, res) => {
  try {
    // Revoke current access token
    if (req.user.tokenData?.jti) {
      await revokeAccessToken(req.user.tokenData.jti, req.user.id, req.user.tokenData.exp, 'signout_all');
    }
    // Revoke all future tokens issued before now
    await revokeAllUserTokens(req.user.id);
    // Delete all refresh tokens
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]).catch(() => {});
    logger.info('User signed out from all devices', { userId: req.user.id });
    res.json({ message: 'Signed out from all devices' });
  } catch (error) {
    logger.error('Signout-all error', { error: error.message });
    res.status(500).json({ error: 'Failed to sign out from all devices' });
  }
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

