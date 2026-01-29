import { query, getOne } from './query.js';
import logger from '../utils/logger.js';

// In-memory cache for fast lookups (single-instance)
const blacklistCache = new Set();
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      jti VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL,
      revoked_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      reason VARCHAR(50)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at)`).catch(() => {});
  tableReady = true;
}

export async function revokeAccessToken(jti, userId, expiresAt, reason = 'manual') {
  await ensureTable();
  blacklistCache.add(jti);
  await query(
    `INSERT INTO token_blacklist (jti, user_id, expires_at, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (jti) DO NOTHING`,
    [jti, userId, new Date(expiresAt * 1000), reason]
  );
  logger.info('Access token revoked', { userId, reason });
}

export async function isTokenRevoked(jti) {
  if (blacklistCache.has(jti)) return true;
  await ensureTable();
  const row = await getOne('SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW()', [jti]);
  if (row) {
    blacklistCache.add(jti);
    return true;
  }
  return false;
}

export async function revokeAllUserTokens(userId) {
  await ensureTable();
  // Can't enumerate all JTIs, but we mark a revocation timestamp
  await query(
    `INSERT INTO user_token_revocations (user_id, revoked_at) VALUES ($1, NOW())
     ON CONFLICT (user_id) DO UPDATE SET revoked_at = NOW()`,
    [userId]
  ).catch(async () => {
    // Table might not exist yet
    await query(`
      CREATE TABLE IF NOT EXISTS user_token_revocations (
        user_id UUID PRIMARY KEY,
        revoked_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await query(
      `INSERT INTO user_token_revocations (user_id, revoked_at) VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET revoked_at = NOW()`,
      [userId]
    );
  });
  logger.info('All tokens revoked for user', { userId });
}

export async function isUserTokenRevokedBefore(userId, issuedAt) {
  const row = await getOne(
    'SELECT revoked_at FROM user_token_revocations WHERE user_id = $1',
    [userId]
  ).catch(() => null);
  if (!row) return false;
  return new Date(row.revoked_at) > new Date(issuedAt * 1000);
}

// Cleanup expired entries periodically
export async function cleanupExpiredTokens() {
  await ensureTable();
  const result = await query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
  blacklistCache.clear();
  logger.info('Cleaned up expired blacklist entries', { count: result.rowCount });
}
