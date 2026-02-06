import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { db } from '../db/client.js';
import logger from '../utils/logger.js';
import { isTokenRevoked, isUserTokenRevokedBefore } from '../db/tokenBlacklist.js';

// Fail fast in production if JWT secret is missing or too short
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    logger.error('FATAL: JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
}
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  logger.warn('Using default JWT secret — set JWT_SECRET env var for production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Check token revocation
    if (decoded.jti && await isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    if (decoded.iat && await isUserTokenRevokedBefore(decoded.userId, decoded.iat)) {
      return res.status(401).json({ error: 'All sessions have been revoked' });
    }

    // Get user from database
    const user = await db.collection('users').findOne(
      { id: decoded.userId, active: true },
      { projection: { id: 1, email: 1, full_name: 1, phone: 1, created_at: 1 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Get user roles
    const roles = await db.collection('user_roles').find(
      { user_id: user.id },
      { projection: { role: 1 } }
    ).toArray();

    // Map database roles to frontend roles
    const roleMap = {
      'admin': 'sys_admin',
      'manager': 'tenant_admin',
      'technician': 'technician',
      'customer': 'customer',
    };

    const mappedRoles = roles.map(r => roleMap[r.role] || r.role);

    req.user = {
      ...user,
      roles: roles.map(r => r.role),
      mappedRoles: mappedRoles,
      tokenData: { jti: decoded.jti, exp: decoded.exp, iat: decoded.iat },
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId) {
  const jti = randomUUID();
  return jwt.sign({ userId, jti }, JWT_SECRET, { expiresIn: '1h' });
}

export { JWT_SECRET };

/**
 * Optional auth - doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.collection('users').findOne(
        { id: decoded.userId, active: true },
        { projection: { id: 1, email: 1, full_name: 1, phone: 1, created_at: 1 } }
      );

      if (user) {
        const roles = await db.collection('user_roles').find(
          { user_id: user.id },
          { projection: { role: 1 } }
        ).toArray();
        req.user = {
          ...user,
          roles: roles.map(r => r.role),
        };
      }
    }
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
}
