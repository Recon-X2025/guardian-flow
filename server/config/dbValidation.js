import logger from '../utils/logger.js';

const DEFAULT_PASSWORDS = ['password', '123456', 'admin', 'root', 'mongo', 'mongodb', 'postgres'];

export function validateDatabaseCredentials() {
  const { MONGODB_URI, POSTGRES_URI, DB_ADAPTER, NODE_ENV } = process.env;

  if (NODE_ENV !== 'production') return;

  const adapterName = (DB_ADAPTER || 'mongodb').toLowerCase().trim();

  if (adapterName === 'mongodb') {
    if (!MONGODB_URI) {
      logger.error('MONGODB_URI must be set in production');
      throw new Error('MONGODB_URI is required in production');
    }
    _validateUri(MONGODB_URI, 'MongoDB');
    return;
  }

  if (adapterName === 'postgresql' || adapterName === 'postgres') {
    if (!POSTGRES_URI) {
      logger.error('POSTGRES_URI must be set in production');
      throw new Error('POSTGRES_URI is required in production');
    }
    _validateUri(POSTGRES_URI, 'PostgreSQL');
    return;
  }

  logger.error(`Unknown DB_ADAPTER: "${adapterName}"`);
  throw new Error(`Unknown DB_ADAPTER: "${adapterName}"`);
}

function _validateUri(uri, label) {
  try {
    const url = new URL(uri);
    const password = decodeURIComponent(url.password || '');

    if (password && password.length < 12) {
      logger.error(`Weak ${label} password in production (must be 12+ characters)`);
      throw new Error(`Production ${label} password must be at least 12 characters`);
    }

    if (DEFAULT_PASSWORDS.includes(password?.toLowerCase())) {
      logger.error(`Default ${label} password detected in production`);
      throw new Error(`Production ${label} must not use default passwords`);
    }

    if (url.username && ['admin', 'root', 'mongo', 'postgres'].includes(url.username.toLowerCase())) {
      logger.error(`Default ${label} username detected in production`, { user: url.username });
      throw new Error(`Production ${label} must not use default usernames`);
    }
  } catch (err) {
    if (err.message.includes(`Production ${label}`)) throw err;
    // URL parsing may fail for srv:// URIs — skip validation for those
    logger.warn(`Could not parse ${label} URI for credential validation`);
  }
}
