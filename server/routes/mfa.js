/**
 * MFA Routes
 * POST /api/mfa/setup   - generate TOTP secret
 * POST /api/mfa/verify  - verify token and enable MFA
 * GET  /api/mfa/status  - get MFA status
 * POST /api/mfa/disable - disable MFA
 */

import express from 'express';
import { randomUUID, createHmac } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

function generateSecret() {
  return randomUUID().replace(/-/g, '').substring(0, 20).toUpperCase();
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  let tmp = BigInt(counter);
  for (let i = 7; i >= 0; i--) { buf[i] = Number(tmp & 0xffn); tmp >>= 8n; }
  const hmac = createHmac('sha1', Buffer.from(secret, 'utf8'));
  const digest = hmac.update(buf).digest();
  const offset = digest[19] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(code % 1000000).padStart(6, '0');
}

function verifyTotp(secret, token) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -1; i <= 1; i++) {
    if (hotp(secret, counter + i) === token) return true;
  }
  return false;
}

router.post('/setup', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const secret = generateSecret();
    const existing = await adapter.findOne('mfa_configs', { user_id: userId, tenant_id: tenantId });
    if (existing) {
      await adapter.updateOne('mfa_configs', { user_id: userId, tenant_id: tenantId }, { secret, enabled: false });
    } else {
      await adapter.insertOne('mfa_configs', {
        id: randomUUID(), user_id: userId, tenant_id: tenantId,
        type: 'totp', secret, enabled: false, created_at: new Date(),
      });
    }
    res.json({
      secret,
      otpauth_url: 'otpauth://totp/GuardianFlow:' + userId + '?secret=' + secret + '&issuer=GuardianFlow',
    });
  } catch (err) {
    logger.error('MFA: setup error', { error: err.message });
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    const adapter = await getAdapter();
    const config = await adapter.findOne('mfa_configs', {
      user_id: req.user.userId, tenant_id: req.user.tenantId,
    });
    if (!config) return res.status(404).json({ error: 'MFA not configured. Call /setup first.' });
    if (!verifyTotp(config.secret, token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    await adapter.updateOne('mfa_configs', { user_id: req.user.userId, tenant_id: req.user.tenantId }, { enabled: true });
    res.json({ verified: true, enabled: true });
  } catch (err) {
    logger.error('MFA: verify error', { error: err.message });
    res.status(500).json({ error: 'Failed to verify MFA token' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const config = await adapter.findOne('mfa_configs', {
      user_id: req.user.userId, tenant_id: req.user.tenantId,
    });
    res.json({ enabled: config?.enabled || false, type: config?.type || null });
  } catch (err) {
    logger.error('MFA: status error', { error: err.message });
    res.status(500).json({ error: 'Failed to get MFA status' });
  }
});

router.post('/disable', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const config = await adapter.findOne('mfa_configs', {
      user_id: req.user.userId, tenant_id: req.user.tenantId,
    });
    if (!config) return res.status(404).json({ error: 'MFA not configured' });
    await adapter.updateOne('mfa_configs', { user_id: req.user.userId, tenant_id: req.user.tenantId }, { enabled: false });
    res.json({ disabled: true });
  } catch (err) {
    logger.error('MFA: disable error', { error: err.message });
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

export default router;
