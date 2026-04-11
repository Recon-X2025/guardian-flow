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

router.get('/config', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    let config = await adapter.findOne('platform_config', { tenant_id: tenantId });
    if (!config) {
      config = {
        id: randomUUID(),
        tenant_id: tenantId,
        feature_flags: {},
        limits: { max_users: 100, max_assets: 1000, max_integrations: 10 },
        created_at: new Date().toISOString(),
      };
    }
    res.json({ config });
  } catch (err) {
    logger.error('Platform config get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/config', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    if (req.user.role !== 'sys_admin') return res.status(403).json({ error: 'Forbidden' });
    const adapter = await getAdapter();
    const existing = await adapter.findOne('platform_config', { tenant_id: tenantId });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    if (existing) {
      await adapter.updateOne('platform_config', { id: existing.id }, updates);
      res.json({ config: { ...existing, ...updates } });
    } else {
      const config = { id: randomUUID(), tenant_id: tenantId, ...updates, created_at: new Date().toISOString() };
      await adapter.insertOne('platform_config', config);
      res.json({ config });
    }
  } catch (err) {
    logger.error('Platform config update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/rate-limits', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    res.json({
      rate_limits: [
        { endpoint: '/api/', limit: 200, window_ms: 60000, current: Math.floor(Math.random() * 200) },
        { endpoint: '/api/auth', limit: 10, window_ms: 60000, current: Math.floor(Math.random() * 10) },
      ],
      tenant_id: tenantId,
    });
  } catch (err) {
    logger.error('Rate limits error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/quotas', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const quotas = await adapter.findMany('tenant_quotas', { tenant_id: tenantId }, { limit: 50 });
    res.json({ quotas });
  } catch (err) {
    logger.error('Quotas error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
