import { getAdapter } from './factory.js';
import logger from '../utils/logger.js';

// In-memory cache for fast lookups (single-instance)
const blacklistCache = new Set();
let indexesReady = false;

async function ensureIndexes() {
  if (indexesReady) return;
  const adapter = await getAdapter();
  try {
    await Promise.all([
      // TTL index auto-deletes expired tokens
      adapter.ensureIndex('token_blacklist', {
        keys: { expires_at: 1 },
        options: { expireAfterSeconds: 0 },
      }),
      adapter.ensureIndex('token_blacklist', {
        keys: { jti: 1 },
        options: { unique: true },
      }),
      adapter.ensureIndex('user_token_revocations', {
        keys: { user_id: 1 },
        options: { unique: true },
      }),
    ]);
  } catch {
    // Indexes may already exist
  }
  indexesReady = true;
}

export async function revokeAccessToken(jti, userId, expiresAt, reason = 'manual') {
  await ensureIndexes();
  const adapter = await getAdapter();
  blacklistCache.add(jti);
  await adapter.updateOne(
    'token_blacklist',
    { jti },
    {
      $setOnInsert: {
        jti,
        user_id: userId,
        revoked_at: new Date(),
        expires_at: new Date(expiresAt * 1000),
        reason,
      },
    },
    { upsert: true }
  );
  logger.info('Access token revoked', { userId, reason });
}

export async function isTokenRevoked(jti) {
  if (blacklistCache.has(jti)) return true;
  await ensureIndexes();
  const adapter = await getAdapter();
  const row = await adapter.findOne('token_blacklist', {
    jti,
    expires_at: { $gt: new Date() },
  });
  if (row) {
    blacklistCache.add(jti);
    return true;
  }
  return false;
}

export async function revokeAllUserTokens(userId) {
  await ensureIndexes();
  const adapter = await getAdapter();
  await adapter.updateOne(
    'user_token_revocations',
    { user_id: userId },
    { $set: { user_id: userId, revoked_at: new Date() } },
    { upsert: true }
  );
  logger.info('All tokens revoked for user', { userId });
}

export async function isUserTokenRevokedBefore(userId, issuedAt) {
  try {
    const adapter = await getAdapter();
    const row = await adapter.findOne('user_token_revocations', { user_id: userId });
    if (!row) return false;
    return new Date(row.revoked_at) > new Date(issuedAt * 1000);
  } catch {
    return false;
  }
}

// Cleanup expired entries periodically (TTL index handles this, but clear cache)
export async function cleanupExpiredTokens() {
  await ensureIndexes();
  // TTL index handles deletion automatically; just clear the in-memory cache
  blacklistCache.clear();
  logger.info('Cleared blacklist in-memory cache');
}
