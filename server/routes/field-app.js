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

router.get('/sync', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { last_sync } = req.query;
    const adapter = await getAdapter();
    const filter = { tenant_id: tenantId };
    if (last_sync) filter.created_at_gt = last_sync;
    const syncLog = await adapter.findMany('field_app_sync_log', { tenant_id: tenantId }, { limit: 200 });
    const delta = last_sync ? syncLog.filter(e => new Date(e.created_at) > new Date(last_sync)) : syncLog;
    res.json({ delta, sync_token: new Date().toISOString() });
  } catch (err) {
    logger.error('Field app sync get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { mutations } = req.body;
    if (!Array.isArray(mutations)) return res.status(400).json({ error: 'mutations array is required' });
    const adapter = await getAdapter();
    const results = [];
    for (const mutation of mutations) {
      const { collection, operation, payload } = mutation;
      if (!collection || !operation || !payload) {
        results.push({ success: false, error: 'Invalid mutation' });
        continue;
      }
      const logEntry = {
        id: randomUUID(),
        tenant_id: tenantId,
        collection,
        operation,
        payload_id: payload.id || randomUUID(),
        created_at: new Date().toISOString(),
      };
      await adapter.insertOne('field_app_sync_log', logEntry);
      results.push({ success: true, id: logEntry.id });
    }
    res.json({ results, synced_at: new Date().toISOString() });
  } catch (err) {
    logger.error('Field app sync post error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/config', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    let config = await adapter.findOne('field_app_config', { tenant_id: tenantId });
    if (!config) {
      config = {
        id: randomUUID(),
        tenant_id: tenantId,
        offline_mode: true,
        sync_interval_s: 300,
        enabled_modules: ['work_orders', 'assets', 'inventory'],
        created_at: new Date().toISOString(),
      };
    }
    res.json({ config });
  } catch (err) {
    logger.error('Field app config error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/crash-reports', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { stack_trace, app_version, device_info, occurred_at } = req.body;
    const adapter = await getAdapter();
    const report = {
      id: randomUUID(),
      tenant_id: tenantId,
      user_id: req.user.id,
      stack_trace: stack_trace || '',
      app_version: app_version || 'unknown',
      device_info: device_info || {},
      occurred_at: occurred_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('field_app_crash_reports', report);
    res.status(201).json({ report_id: report.id });
  } catch (err) {
    logger.error('Field app crash report error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
