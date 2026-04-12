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
    let config = await adapter.findOne('white_label_configs', { tenant_id: tenantId });
    if (!config) {
      config = {
        id: randomUUID(),
        tenant_id: tenantId,
        logo_url: '',
        primary_color: '#3B82F6',
        company_name: '',
        domain: '',
        features_enabled: [],
        created_at: new Date().toISOString(),
      };
    }
    res.json({ config });
  } catch (err) {
    logger.error('White label config get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/config', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const existing = await adapter.findOne('white_label_configs', { tenant_id: tenantId });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    if (existing) {
      await adapter.updateOne('white_label_configs', { id: existing.id }, updates);
      res.json({ config: { ...existing, ...updates } });
    } else {
      const config = { id: randomUUID(), tenant_id: tenantId, ...updates, created_at: new Date().toISOString() };
      await adapter.insertOne('white_label_configs', config);
      res.json({ config });
    }
  } catch (err) {
    logger.error('White label config update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/themes', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const themes = await adapter.findMany('white_label_themes', {}, { limit: 20 });
    res.json({ themes });
  } catch (err) {
    logger.error('White label themes error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const token = randomUUID();
    res.json({ preview_token: token, preview_url: `/preview?token=${token}&tenant=${tenantId}`, expires_at: new Date(Date.now() + 3600000).toISOString() });
  } catch (err) {
    logger.error('White label preview error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
