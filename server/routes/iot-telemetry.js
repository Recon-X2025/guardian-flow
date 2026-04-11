import express from 'express';
import { randomUUID, createHash } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import mqttBroker from '../services/iot/mqtt-broker.js';

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

// POST /api/iot/devices/register
router.post('/devices/register', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, expected_metrics } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const deviceId = randomUUID();
    const clientId = `gf_${randomUUID().slice(0, 8)}`;
    const password = randomUUID();
    const passwordHash = createHash('sha256').update(password).digest('hex');
    const now = new Date().toISOString();
    const device = {
      id: deviceId,
      tenant_id: tenantId,
      device_id: deviceId,
      name,
      expected_metrics: expected_metrics || [],
      status: 'unknown',
      last_seen_at: null,
      credentials: { clientId, password_hash: passwordHash },
      created_at: now,
      updated_at: now,
    };
    await adapter.insertOne('iot_devices', device);
    logger.info('IoT device registered', { tenantId, deviceId });
    res.status(201).json({ device, clientId, password });
  } catch (err) {
    logger.error('IoT device register error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/iot/devices/:id
router.get('/devices/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const device = await adapter.findOne('iot_devices', { id: req.params.id, tenant_id: tenantId });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const readings = await adapter.findMany('iot_readings', { tenant_id: tenantId, device_id: device.device_id }, { limit: 50 });
    res.json({ device, readings });
  } catch (err) {
    logger.error('IoT device detail error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/iot/rules
router.post('/rules', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { device_id, metric, condition, threshold, action } = req.body;
    if (!device_id || !metric || !condition || threshold === undefined || !action) {
      return res.status(400).json({ error: 'device_id, metric, condition, threshold, and action are required' });
    }
    const validConditions = ['gt', 'lt', 'eq', 'gte', 'lte'];
    if (!validConditions.includes(condition)) return res.status(400).json({ error: `condition must be one of: ${validConditions.join(', ')}` });
    const validActions = ['create_work_order', 'send_alert'];
    if (!validActions.includes(action)) return res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
    const adapter = await getAdapter();
    const rule = {
      id: randomUUID(),
      tenant_id: tenantId,
      device_id,
      metric,
      condition,
      threshold,
      action,
      active: true,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('iot_rules', rule);
    res.status(201).json({ rule });
  } catch (err) {
    logger.error('IoT rule create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/iot/rules
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rules = await adapter.findMany('iot_rules', { tenant_id: tenantId }, { limit: 100 });
    res.json({ rules });
  } catch (err) {
    logger.error('IoT rules list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/iot/rules/:id
router.delete('/rules/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rule = await adapter.findOne('iot_rules', { id: req.params.id, tenant_id: tenantId });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    await adapter.deleteOne('iot_rules', { id: req.params.id });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('IoT rule delete error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/iot/readings
router.post('/readings', authenticateToken, async (req, res) => {
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
    await mqttBroker.processMessage(tenantId, device_id, { [metric]: value });
    res.status(201).json({ reading });
  } catch (err) {
    logger.error('IoT readings ingest error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/iot/mqtt/status
router.get('/mqtt/status', authenticateToken, async (req, res) => {
  res.json(mqttBroker.getStatus());
});

export default router;
