/**
 * @file server/routes/mfa.js
 * @description MFA TOTP enrollment and validation — Sprint 34.
 *
 * Routes (all mounted under /api/auth/mfa)
 * ----------------------------------------
 * POST /api/auth/mfa/enroll         — generate TOTP secret, return QR URL
 * POST /api/auth/mfa/verify-enroll  — confirm token, activate MFA, return backup codes
 * POST /api/auth/mfa/validate       — validate TOTP (returns JWT on success)
 * POST /api/auth/mfa/disable        — disable MFA (requires password + TOTP)
 *
 * TOTP is implemented using Node.js built-in crypto (HMAC-SHA1 / RFC 6238).
 * No external OTP library required.
 */

import express from 'express';
import { randomBytes, createHmac, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { findOne } from '../db/query.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── In-memory rate limit for /validate ───────────────────────────────────────
// { userId -> { count, windowStart } }
const validateAttempts = new Map();
const RATE_LIMIT_MAX    = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId) {
  const now    = Date.now();
  const record = validateAttempts.get(userId);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    validateAttempts.set(userId, { count: 1, windowStart: now });
    return false; // not rate-limited
  }
  record.count += 1;
  if (record.count > RATE_LIMIT_MAX) return true; // rate-limited
  return false;
}

function resetRateLimit(userId) {
  validateAttempts.delete(userId);
}

// ── TOTP helpers (RFC 6238 / RFC 4226) ───────────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits   = 0;
  let value  = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(encoded) {
  const str    = encoded.toUpperCase().replace(/=+$/, '');
  const bytes  = [];
  let bits     = 0;
  let value    = 0;
  for (const char of str) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * HOTP(key, counter, digits=6) — RFC 4226
 */
function hotp(keyBuffer, counter, digits = 6) {
  const counterBuf = Buffer.alloc(8);
  // Write 64-bit big-endian counter (JS numbers are safe to ~2^53)
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter >>> 0;
  counterBuf.writeUInt32BE(hi, 0);
  counterBuf.writeUInt32BE(lo, 4);

  const mac    = createHmac('sha1', keyBuffer).update(counterBuf).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code   = ((mac[offset] & 0x7f) << 24)
               | (mac[offset + 1] << 16)
               | (mac[offset + 2] << 8)
               |  mac[offset + 3];
  return String(code % Math.pow(10, digits)).padStart(digits, '0');
}

/**
 * TOTP(secret_base32, digits=6, window=30s) — RFC 6238
 * Accepts tokens from the previous, current, and next window (±1 step).
 */
function totpValidate(secretBase32, token, digits = 6) {
  const key     = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (hotp(key, counter + delta, digits) === String(token).padStart(digits, '0')) {
      return true;
    }
  }
  return false;
}

function totpGenerate(secretBase32, digits = 6) {
  const key     = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  return hotp(key, counter, digits);
}

/**
 * Generate a random 20-byte TOTP secret (base32 encoded).
 */
function generateSecret() {
  return base32Encode(randomBytes(20));
}

/**
 * Build an otpauth:// URI for QR code scanning.
 */
function buildOtpauthUrl(secret, email, issuer = 'GuardianFlow') {
  const label    = encodeURIComponent(`${issuer}:${email}`);
  const issuerEnc = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuerEnc}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate 8 random backup codes (10-char alphanumeric).
 */
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(randomBytes(5).toString('hex').toUpperCase()); // 10 hex chars
  }
  return codes;
}

function hashBackupCode(code) {
  return createHash('sha256').update(code.toUpperCase()).digest('hex');
}

// ── POST /api/auth/mfa/enroll ─────────────────────────────────────────────────

router.post('/enroll', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const user    = await adapter.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is already enabled' });
    }

    const secret     = generateSecret();
    const otpauthUrl = buildOtpauthUrl(secret, user.email);
    // Google Charts QR code URL (no data sent to third party — only after user decides to use it)
    const qrCodeUrl  = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`;

    // Store pending secret (not yet active)
    await adapter.updateOne('users', { id: req.user.id }, { $set: { mfa_pending: secret } });

    logger.info('MFA enroll initiated', { userId: req.user.id });
    res.json({ secret, qrCodeUrl, otpauthUrl });
  } catch (error) {
    logger.error('MFA enroll error', { error: error.message });
    res.status(500).json({ error: 'Failed to initiate MFA enrollment' });
  }
});

// ── POST /api/auth/mfa/verify-enroll ──────────────────────────────────────────

router.post('/verify-enroll', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const adapter = await getAdapter();
    const user    = await adapter.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.mfa_pending) {
      return res.status(400).json({ error: 'No pending MFA enrollment. Call /enroll first.' });
    }

    if (!totpValidate(user.mfa_pending, String(token))) {
      return res.status(400).json({ error: 'Invalid TOTP token' });
    }

    // Activate MFA
    const backupCodes  = generateBackupCodes();
    const hashedCodes  = backupCodes.map(hashBackupCode);

    await adapter.updateOne('users', { id: req.user.id }, {
      $set: {
        mfa_secret:  user.mfa_pending,
        mfa_enabled: true,
        mfa_pending: null,
      },
    });

    // Store hashed backup codes
    const adapter2 = await getAdapter();
    // Delete old backup codes first
    await adapter2.deleteMany('mfa_backup_codes', { user_id: req.user.id }).catch(() => {});
    for (const hash of hashedCodes) {
      await adapter2.insertOne('mfa_backup_codes', {
        user_id:    req.user.id,
        code_hash:  hash,
        used:       false,
        created_at: new Date().toISOString(),
      });
    }

    logger.info('MFA enrollment verified', { userId: req.user.id });
    res.json({ success: true, backupCodes });
  } catch (error) {
    logger.error('MFA verify-enroll error', { error: error.message });
    res.status(500).json({ error: 'Failed to verify MFA enrollment' });
  }
});

// ── POST /api/auth/mfa/validate ───────────────────────────────────────────────

router.post('/validate', async (req, res) => {
  try {
    const { token, userId } = req.body;
    if (!token || !userId) {
      return res.status(400).json({ error: 'token and userId are required' });
    }

    // Rate limiting
    if (checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    }

    const user = await findOne('users', { id: userId, active: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({ error: 'MFA is not enabled for this user' });
    }

    // Check TOTP
    if (totpValidate(user.mfa_secret, String(token))) {
      resetRateLimit(userId);
      const accessToken = generateToken(userId);
      logger.info('MFA validated', { userId });
      return res.json({ success: true, access_token: accessToken });
    }

    // Check backup codes
    const adapter        = await getAdapter();
    const codeHash       = hashBackupCode(String(token));
    const backupCodeDoc  = await adapter.findOne('mfa_backup_codes', { user_id: userId, code_hash: codeHash, used: false });
    if (backupCodeDoc) {
      await adapter.updateOne('mfa_backup_codes', { user_id: userId, code_hash: codeHash }, { $set: { used: true } });
      resetRateLimit(userId);
      const accessToken = generateToken(userId);
      logger.info('MFA validated via backup code', { userId });
      return res.json({ success: true, access_token: accessToken });
    }

    logger.warn('MFA validation failed', { userId });
    res.status(401).json({ error: 'Invalid MFA token' });
  } catch (error) {
    logger.error('MFA validate error', { error: error.message });
    res.status(500).json({ error: 'Failed to validate MFA token' });
  }
});

// ── POST /api/auth/mfa/disable ────────────────────────────────────────────────

router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password || !token) {
      return res.status(400).json({ error: 'password and token are required' });
    }

    const adapter = await getAdapter();
    const user    = await adapter.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify TOTP
    if (!totpValidate(user.mfa_secret, String(token))) {
      return res.status(401).json({ error: 'Invalid MFA token' });
    }

    // Clear all MFA fields
    await adapter.updateOne('users', { id: req.user.id }, {
      $set: {
        mfa_secret:  null,
        mfa_enabled: false,
        mfa_pending: null,
      },
    });

    // Remove backup codes
    await adapter.deleteMany('mfa_backup_codes', { user_id: req.user.id }).catch(() => {});

    logger.info('MFA disabled', { userId: req.user.id });
    res.json({ success: true, message: 'MFA has been disabled' });
  } catch (error) {
    logger.error('MFA disable error', { error: error.message });
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

export { totpValidate, totpGenerate, generateSecret, base32Encode, base32Decode, hotp };
export default router;
