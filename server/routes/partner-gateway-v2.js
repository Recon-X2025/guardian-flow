import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/keys', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const keys = await adapter.findMany('partner_api_keys', { tenant_id: tenantId }, { limit: 50 });
    const safeKeys = keys.map(k => ({ ...k, key_hash: '[redacted]' }));
    res.json({ keys: safeKeys });
  } catch (err) {
    logger.error('Partner keys list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/keys', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { partner_id, scopes, rate_limit_per_min, expires_at } = req.body;
    if (!partner_id) return res.status(400).json({ error: 'partner_id is required' });
    const adapter = await getAdapter();
    const keyValue = `pk_${randomUUID().replace(/-/g, '')}`;
    const apiKey = {
      id: randomUUID(),
      tenant_id: tenantId,
      partner_id,
      scopes: scopes || [],
      rate_limit_per_min: rate_limit_per_min || 60,
      expires_at: expires_at || null,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('partner_api_keys', apiKey);
    res.status(201).json({ key: { ...apiKey, key: keyValue } });
  } catch (err) {
    logger.error('Partner key issue error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/keys/:keyId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const key = await adapter.findOne('partner_api_keys', { id: req.params.keyId, tenant_id: tenantId });
    if (!key) return res.status(404).json({ error: 'Key not found' });
    await adapter.updateOne('partner_api_keys', { id: req.params.keyId }, { status: 'revoked', revoked_at: new Date().toISOString() });
    res.json({ revoked: true });
  } catch (err) {
    logger.error('Partner key revoke error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const usage = await adapter.findMany('partner_api_usage', { tenant_id: tenantId }, { limit: 100 });
    res.json({ usage });
  } catch (err) {
    logger.error('Partner usage error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/webhooks', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { url, events, partner_id } = req.body;
    if (!url || !events) return res.status(400).json({ error: 'url and events are required' });
    const adapter = await getAdapter();
    const webhook = {
      id: randomUUID(),
      tenant_id: tenantId,
      partner_id: partner_id || null,
      url,
      events,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('partner_webhooks', webhook);
    res.status(201).json({ webhook });
  } catch (err) {
    logger.error('Partner webhook register error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
