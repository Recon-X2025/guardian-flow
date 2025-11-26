import jwt from 'jsonwebtoken';
import { getOne, getMany } from '../db/query.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    
    // Get user from database
    const user = await getOne(
      `SELECT id, email, full_name, phone, created_at 
       FROM users 
       WHERE id = $1 AND active = true`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Get user roles
    const roles = await getMany(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [user.id]
    );

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
      roles: roles.map(r => r.role), // Keep original roles
      mappedRoles: mappedRoles, // Add mapped roles for RBAC
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
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Optional auth - doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await getOne(
        `SELECT id, email, full_name, phone, created_at 
         FROM users 
         WHERE id = $1 AND active = true`,
        [decoded.userId]
      );

      if (user) {
        const roles = await getMany(
          `SELECT role FROM user_roles WHERE user_id = $1`,
          [user.id]
        );
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

