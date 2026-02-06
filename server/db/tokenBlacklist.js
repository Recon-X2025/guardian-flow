import { db } from './client.js';
import logger from '../utils/logger.js';

// In-memory cache for fast lookups (single-instance)
const blacklistCache = new Set();
let indexesReady = false;

async function ensureIndexes() {
  if (indexesReady) return;
  try {
    // TTL index auto-deletes expired tokens
    await db.collection('token_blacklist').createIndex(
      { expires_at: 1 },
      { expireAfterSeconds: 0 }
    );
    await db.collection('token_blacklist').createIndex({ jti: 1 }, { unique: true });
    await db.collection('user_token_revocations').createIndex({ user_id: 1 }, { unique: true });
  } catch {
    // Indexes may already exist
  }
  indexesReady = true;
}

export async function revokeAccessToken(jti, userId, expiresAt, reason = 'manual') {
  await ensureIndexes();
  blacklistCache.add(jti);
  await db.collection('token_blacklist').updateOne(
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
  const row = await db.collection('token_blacklist').findOne({
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
  await db.collection('user_token_revocations').updateOne(
    { user_id: userId },
    { $set: { user_id: userId, revoked_at: new Date() } },
    { upsert: true }
  );
  logger.info('All tokens revoked for user', { userId });
}

export async function isUserTokenRevokedBefore(userId, issuedAt) {
  try {
    const row = await db.collection('user_token_revocations').findOne({ user_id: userId });
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
