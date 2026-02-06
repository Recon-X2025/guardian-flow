import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';
import { db } from '../db/client.js';
import { findOne, findMany, transaction } from '../db/query.js';
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

async function ensureRefreshTokensIndexes() {
  try {
    await db.collection('refresh_tokens').createIndex({ token_hash: 1 });
    await db.collection('refresh_tokens').createIndex({ user_id: 1 });
    await db.collection('refresh_tokens').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  } catch {
    // Indexes may already exist
  }
}

async function ensurePasswordResetIndexes() {
  try {
    await db.collection('password_reset_tokens').createIndex({ token_hash: 1 });
    await db.collection('password_reset_tokens').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  } catch {
    // Indexes may already exist
  }
}

async function createRefreshToken(userId) {
  await ensureRefreshTokensIndexes();
  const refreshToken = randomUUID();
  const hash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);
  await db.collection('refresh_tokens').insertOne({
    id: randomUUID(),
    user_id: userId,
    token_hash: hash,
    expires_at: expiresAt,
    created_at: new Date(),
  });
  // Clean up old tokens for this user (keep max 5)
  try {
    const allTokens = await db.collection('refresh_tokens')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();
    if (allTokens.length > 5) {
      const toDelete = allTokens.slice(5).map(t => t.id);
      await db.collection('refresh_tokens').deleteMany({ id: { $in: toDelete } });
    }
  } catch { /* ignore */ }
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
    const existingUser = await findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await transaction(async (session) => {
      // Create user
      await db.collection('users').insertOne({
        id: userId,
        email,
        password_hash: hashedPassword,
        full_name: fullName,
        active: true,
        created_at: new Date(),
      }, { session });

      // Create profile
      await db.collection('profiles').insertOne({
        id: userId,
        email,
        full_name: fullName,
        created_at: new Date(),
      }, { session });

      // Check if this is the first user
      const userCount = await db.collection('users').countDocuments({}, { session });
      const defaultRole = userCount <= 1 ? 'admin' : 'technician';

      await db.collection('user_roles').insertOne({
        user_id: userId,
        role: defaultRole,
        created_at: new Date(),
      }, { session });
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
    const user = await findOne('users', { email });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user roles
    const roles = await findMany('user_roles', { user_id: user.id });

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

    // Get user roles
    const userRoles = await findMany('user_roles', { user_id: userId });

    // Get tenant_id from profile
    let tenantId = null;
    try {
      const profile = await findOne('profiles', { id: userId });
      tenantId = profile?.tenant_id || null;
    } catch (error) {
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
        id: ur.id || ur._id,
        role: mappedRole,
        tenant_id: null,
        granted_at: ur.created_at || new Date().toISOString(),
      };
    });

    const roles = mappedRoles.map(ur => ur.role);
    console.log('Auth /me - User roles mapped:', roles, 'from DB roles:', userRoles.map(r => r.role));

    // Get permissions for all user roles
    let permissions = [];

    try {
      const rolePerms = await db.collection('role_permissions').aggregate([
        { $match: { role: { $in: roles } } },
        { $lookup: { from: 'permissions', localField: 'permission_id', foreignField: 'id', as: 'perm' } },
        { $unwind: '$perm' },
        { $group: { _id: null, names: { $addToSet: '$perm.name' } } },
      ]).toArray();

      permissions = rolePerms[0]?.names || [];

      if (permissions.length === 0) {
        console.warn('No permissions found in database for roles:', roles);
        permissions = generatePermissionsFromRoles(roles);
      }
    } catch (error) {
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

    await ensureRefreshTokensIndexes();
    const hash = hashToken(refresh_token);

    const stored = await findOne('refresh_tokens', { token_hash: hash });

    if (!stored || new Date(stored.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify user still active
    const user = await findOne('users', { id: stored.user_id });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Delete old refresh token (rotation)
    await db.collection('refresh_tokens').deleteOne({ id: stored.id });

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

    const user = await findOne('users', { email, active: true });
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    await ensurePasswordResetIndexes();

    // Invalidate previous tokens
    await db.collection('password_reset_tokens').updateMany(
      { user_id: user.id, used: false },
      { $set: { used: true } }
    );

    const resetToken = randomUUID();
    const hash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.collection('password_reset_tokens').insertOne({
      id: randomUUID(),
      user_id: user.id,
      token_hash: hash,
      expires_at: expiresAt,
      used: false,
      created_at: new Date(),
    });

    logger.info('Password reset requested', { userId: user.id });

    const emailResult = await sendPasswordResetEmail(email, resetToken).catch(err => {
      logger.error('Email send failed', { error: err.message });
      return { success: false };
    });

    const response = { message: 'If that email exists, a reset link has been sent' };
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

    await ensurePasswordResetIndexes();
    const hash = hashToken(token);

    const stored = await findOne('password_reset_tokens', { token_hash: hash });

    if (!stored || stored.used || new Date(stored.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.collection('users').updateOne(
      { id: stored.user_id },
      { $set: { password_hash: hashedPassword } }
    );

    // Mark token as used
    await db.collection('password_reset_tokens').updateOne(
      { id: stored.id },
      { $set: { used: true } }
    );

    // Invalidate all refresh tokens for this user
    await db.collection('refresh_tokens').deleteMany({ user_id: stored.user_id }).catch(() => {});

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
    await db.collection('refresh_tokens').deleteMany({ user_id: req.user.id }).catch(() => {});
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
    if (req.user.tokenData?.jti) {
      await revokeAccessToken(req.user.tokenData.jti, req.user.id, req.user.tokenData.exp, 'signout_all');
    }
    await revokeAllUserTokens(req.user.id);
    await db.collection('refresh_tokens').deleteMany({ user_id: req.user.id }).catch(() => {});
    logger.info('User signed out from all devices', { userId: req.user.id });
    res.json({ message: 'Signed out from all devices' });
  } catch (error) {
    logger.error('Signout-all error', { error: error.message });
    res.status(500).json({ error: 'Failed to sign out from all devices' });
  }
});

/**
 * Assign admin role to a user
 */
router.post('/assign-admin', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const currentUserRoles = await findMany('user_roles', { user_id: currentUser.id });
    const isAdmin = currentUserRoles.some(r => r.role === 'admin');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can assign admin role' });
    }

    const targetUser = await findOne('users', { email });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Assign admin role (upsert)
    await db.collection('user_roles').updateOne(
      { user_id: targetUser.id, role: 'admin' },
      { $setOnInsert: { user_id: targetUser.id, role: 'admin', created_at: new Date() } },
      { upsert: true }
    );

    res.json({ message: `Admin role assigned to ${email}` });
  } catch (error) {
    console.error('Assign admin error:', error);
    res.status(500).json({ error: 'Failed to assign admin role' });
  }
});

export default router;
