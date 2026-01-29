import logger from '../utils/logger.js';

const DEFAULT_USERS = ['postgres', 'root', 'admin', 'user'];
const DEFAULT_PASSWORDS = ['postgres', 'password', '123456', 'admin', 'root'];

export function validateDatabaseCredentials() {
  const { DB_USER, DB_PASSWORD, NODE_ENV } = process.env;

  if (NODE_ENV !== 'production') return;

  if (DEFAULT_USERS.includes(DB_USER?.toLowerCase())) {
    logger.error('Default database username detected in production', { user: DB_USER });
    throw new Error('Production database must not use default usernames');
  }

  if (!DB_PASSWORD || DB_PASSWORD.length < 16) {
    logger.error('Weak database password in production (must be 16+ characters)');
    throw new Error('Production database password must be at least 16 characters');
  }

  if (DEFAULT_PASSWORDS.includes(DB_PASSWORD?.toLowerCase())) {
    logger.error('Default database password detected in production');
    throw new Error('Production database must not use default passwords');
  }
}
