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

router.get('/models', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const models = await adapter.findMany('digital_twin_models', { tenant_id: tenantId }, { limit: 50 });
    res.json({ models });
  } catch (err) {
    logger.error('Digital twin models error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/models', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { asset_id, schema_version, state } = req.body;
    if (!asset_id) return res.status(400).json({ error: 'asset_id is required' });
    const adapter = await getAdapter();
    const model = {
      id: randomUUID(),
      tenant_id: tenantId,
      asset_id,
      schema_version: schema_version || '1.0',
      state: state || {},
      last_synced_at: null,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('digital_twin_models', model);
    res.status(201).json({ model });
  } catch (err) {
    logger.error('Digital twin model create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/models/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const model = await adapter.findOne('digital_twin_models', { id: req.params.id, tenant_id: tenantId });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json({ model });
  } catch (err) {
    logger.error('Digital twin model get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/models/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const model = await adapter.findOne('digital_twin_models', { id: req.params.id, tenant_id: tenantId });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('digital_twin_models', { id: req.params.id }, updates);
    res.json({ model: { ...model, ...updates } });
  } catch (err) {
    logger.error('Digital twin model update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/models/:id/sync', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const model = await adapter.findOne('digital_twin_models', { id: req.params.id, tenant_id: tenantId });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const readings = await adapter.findMany('iot_readings', { tenant_id: tenantId, device_id: model.asset_id }, { limit: 20 });
    const newState = { ...model.state };
    for (const r of readings) newState[r.metric] = r.value;
    const syncedAt = new Date().toISOString();
    await adapter.updateOne('digital_twin_models', { id: req.params.id }, { state: newState, last_synced_at: syncedAt });
    await adapter.insertOne('digital_twin_history', {
      id: randomUUID(),
      tenant_id: tenantId,
      model_id: model.id,
      previous_state: model.state,
      new_state: newState,
      synced_at: syncedAt,
    });
    res.json({ synced: true, state: newState, last_synced_at: syncedAt });
  } catch (err) {
    logger.error('Digital twin sync error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/models/:id/history', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const history = await adapter.findMany('digital_twin_history', { tenant_id: tenantId, model_id: req.params.id }, { limit: 100 });
    res.json({ history });
  } catch (err) {
    logger.error('Digital twin history error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/digital-twin/twins
router.post('/twins', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { asset_id } = req.body;
    if (!asset_id) return res.status(400).json({ error: 'asset_id is required' });
    const adapter = await getAdapter();
    const now = new Date().toISOString();
    const twin = {
      id: randomUUID(),
      tenant_id: tenantId,
      asset_id,
      schema: { metrics: [], relationships: [] },
      current_state: {},
      simulation_history: [],
      created_at: now,
      updated_at: now,
    };
    await adapter.insertOne('digital_twins', twin);
    res.status(201).json({ twin });
  } catch (err) {
    logger.error('Digital twin create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/digital-twin/twins
router.get('/twins', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const twins = await adapter.findMany('digital_twins', { tenant_id: tenantId }, { limit: 50 });
    res.json({ twins });
  } catch (err) {
    logger.error('Digital twins list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/digital-twin/twins/:id
router.get('/twins/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const twin = await adapter.findOne('digital_twins', { id: req.params.id, tenant_id: tenantId });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    res.json({ twin });
  } catch (err) {
    logger.error('Digital twin get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/digital-twin/twins/:id/state
router.put('/twins/:id/state', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { metrics } = req.body;
    if (!metrics || typeof metrics !== 'object') return res.status(400).json({ error: 'metrics object is required' });
    const adapter = await getAdapter();
    const twin = await adapter.findOne('digital_twins', { id: req.params.id, tenant_id: tenantId });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });
    const now = new Date().toISOString();
    const newState = { ...twin.current_state, ...metrics };
    const snapshot = { timestamp: now, state: newState };
    const history = Array.isArray(twin.simulation_history) ? twin.simulation_history : [];
    const updatedHistory = [...history, snapshot].slice(-100);
    await adapter.updateOne('digital_twins', { id: twin.id }, {
      current_state: newState,
      simulation_history: updatedHistory,
      updated_at: now,
    });
    res.json({ twin: { ...twin, current_state: newState, simulation_history: updatedHistory, updated_at: now } });
  } catch (err) {
    logger.error('Digital twin state update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/digital-twin/twins/:id/simulate
router.post('/twins/:id/simulate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { inputChanges = {}, timesteps = 10 } = req.body;
    const adapter = await getAdapter();
    const twin = await adapter.findOne('digital_twins', { id: req.params.id, tenant_id: tenantId });
    if (!twin) return res.status(404).json({ error: 'Twin not found' });

    // Linear state-space: start from current_state merged with inputChanges, hold constant
    const initialState = { ...twin.current_state, ...inputChanges };
    const trajectory = [];
    for (let step = 0; step <= timesteps; step++) {
      trajectory.push({ step, state: { ...initialState } });
    }

    // Check IoT rules for this twin's asset_id
    const rules = await adapter.findMany('iot_rules', { tenant_id: tenantId, device_id: twin.asset_id, active: true }, { limit: 50 });
    const alertsProjected = [];
    for (const rule of rules) {
      const val = initialState[rule.metric];
      if (val === undefined) continue;
      let violated = false;
      if (rule.condition === 'gt' && val > rule.threshold) violated = true;
      if (rule.condition === 'lt' && val < rule.threshold) violated = true;
      if (rule.condition === 'gte' && val >= rule.threshold) violated = true;
      if (rule.condition === 'lte' && val <= rule.threshold) violated = true;
      if (rule.condition === 'eq' && val === rule.threshold) violated = true;
      if (violated) {
        alertsProjected.push({ ruleId: rule.id, metric: rule.metric, condition: rule.condition, threshold: rule.threshold, projectedValue: val });
      }
    }

    res.json({ trajectory, alertsProjected });
  } catch (err) {
    logger.error('Digital twin simulate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
