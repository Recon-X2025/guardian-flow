import logger from '../utils/logger.js';

const DEFAULT_PASSWORDS = ['password', '123456', 'admin', 'root', 'mongo', 'mongodb'];

export function validateDatabaseCredentials() {
  const { MONGODB_URI, NODE_ENV } = process.env;

  if (NODE_ENV !== 'production') return;

  if (!MONGODB_URI) {
    logger.error('MONGODB_URI must be set in production');
    throw new Error('MONGODB_URI is required in production');
  }

  // Check for default/weak passwords embedded in the connection string
  try {
    const url = new URL(MONGODB_URI);
    const password = decodeURIComponent(url.password || '');

    if (password && password.length < 12) {
      logger.error('Weak MongoDB password in production (must be 12+ characters)');
      throw new Error('Production MongoDB password must be at least 12 characters');
    }

    if (DEFAULT_PASSWORDS.includes(password?.toLowerCase())) {
      logger.error('Default MongoDB password detected in production');
      throw new Error('Production MongoDB must not use default passwords');
    }

    if (url.username && ['admin', 'root', 'mongo'].includes(url.username.toLowerCase())) {
      logger.error('Default MongoDB username detected in production', { user: url.username });
      throw new Error('Production MongoDB must not use default usernames');
    }
  } catch (err) {
    if (err.message.includes('Production MongoDB')) throw err;
    // URL parsing may fail for srv:// URIs — skip validation for those
    logger.warn('Could not parse MONGODB_URI for credential validation');
  }
}
