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

function checkCondition(value, operator, threshold) {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'lt': return value < threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    case 'eq': return value === threshold;
    default: return false;
  }
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rules = await adapter.findMany('maintenance_trigger_rules', { tenant_id: tenantId }, { limit: 100 });
    res.json({ rules });
  } catch (err) {
    logger.error('Maintenance triggers list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { asset_id, condition, action } = req.body;
    if (!asset_id || !condition || !action) {
      return res.status(400).json({ error: 'asset_id, condition, and action are required' });
    }
    const adapter = await getAdapter();
    const rule = {
      id: randomUUID(),
      tenant_id: tenantId,
      asset_id,
      condition,
      action,
      enabled: true,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('maintenance_trigger_rules', rule);
    res.status(201).json({ rule });
  } catch (err) {
    logger.error('Maintenance trigger create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/evaluate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rules = await adapter.findMany('maintenance_trigger_rules', { tenant_id: tenantId, enabled: true }, { limit: 100 });
    const triggered = [];
    for (const rule of rules) {
      const { metric, operator, threshold } = rule.condition || {};
      if (!metric || !operator || threshold === undefined) continue;
      const readings = await adapter.findMany('iot_readings', { tenant_id: tenantId, device_id: rule.asset_id, metric }, { limit: 1 });
      const latest = readings[0];
      if (!latest) continue;
      if (checkCondition(latest.value, operator, threshold)) {
        triggered.push({ rule, reading: latest });
        await adapter.insertOne('maintenance_trigger_history', {
          id: randomUUID(),
          tenant_id: tenantId,
          rule_id: rule.id,
          reading_id: latest.id,
          triggered_at: new Date().toISOString(),
          value: latest.value,
        });
      }
    }
    res.json({ triggered });
  } catch (err) {
    logger.error('Maintenance trigger evaluate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const history = await adapter.findMany('maintenance_trigger_history', { tenant_id: tenantId }, { limit: 100 });
    res.json({ history });
  } catch (err) {
    logger.error('Maintenance trigger history error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
