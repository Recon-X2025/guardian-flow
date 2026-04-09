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

router.post('/ingest', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { device_id, metric, value, unit, timestamp } = req.body;
    if (!device_id || metric === undefined || value === undefined) {
      return res.status(400).json({ error: 'device_id, metric, and value are required' });
    }
    const adapter = await getAdapter();
    const reading = {
      id: randomUUID(),
      tenant_id: tenantId,
      device_id,
      metric,
      value,
      unit: unit || '',
      timestamp: timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('iot_readings', reading);
    const existing = await adapter.findOne('iot_devices', { tenant_id: tenantId, device_id });
    if (existing) {
      await adapter.updateOne('iot_devices', { id: existing.id }, {
        last_seen: reading.timestamp,
        last_metric: metric,
        last_value: value,
        updated_at: new Date().toISOString(),
      });
    } else {
      await adapter.insertOne('iot_devices', {
        id: randomUUID(),
        tenant_id: tenantId,
        device_id,
        last_seen: reading.timestamp,
        last_metric: metric,
        last_value: value,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    res.status(201).json({ reading });
  } catch (err) {
    logger.error('IoT ingest error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const devices = await adapter.findMany('iot_devices', { tenant_id: tenantId }, { limit: 50 });
    res.json({ devices });
  } catch (err) {
    logger.error('IoT devices error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/readings', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { device_id, metric, limit = 100 } = req.query;
    const adapter = await getAdapter();
    const filter = { tenant_id: tenantId };
    if (device_id) filter.device_id = device_id;
    if (metric) filter.metric = metric;
    const readings = await adapter.findMany('iot_readings', filter, { limit: parseInt(limit, 10) });
    res.json({ readings });
  } catch (err) {
    logger.error('IoT readings error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/devices/:deviceId/readings', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const readings = await adapter.findMany('iot_readings', { tenant_id: tenantId, device_id: req.params.deviceId }, { limit: 200 });
    res.json({ readings });
  } catch (err) {
    logger.error('IoT device readings error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
