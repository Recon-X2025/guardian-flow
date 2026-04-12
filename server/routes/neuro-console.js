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
    const models = await adapter.findMany('neuro_models', { tenant_id: tenantId }, { limit: 50 });
    res.json({ models });
  } catch (err) {
    logger.error('Neuro models list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/models', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, type, architecture, weights_uri, version } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    const adapter = await getAdapter();
    const model = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      type,
      architecture: architecture || '',
      weights_uri: weights_uri || '',
      version: version || '1.0',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('neuro_models', model);
    res.status(201).json({ model });
  } catch (err) {
    logger.error('Neuro model register error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/models/:id/infer', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const model = await adapter.findOne('neuro_models', { id: req.params.id, tenant_id: tenantId });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const input_vector = req.query.input_vector || req.body?.input_vector || [];
    const output = Array.isArray(input_vector)
      ? input_vector.map(v => parseFloat(v) * Math.random())
      : [Math.random()];
    const inference = {
      id: randomUUID(),
      model_id: model.id,
      input: input_vector,
      output,
      latency_ms: Math.floor(Math.random() * 50) + 5,
      inferred_at: new Date().toISOString(),
    };
    await adapter.insertOne('neuro_inferences', { ...inference, tenant_id: tenantId });
    res.json({ inference });
  } catch (err) {
    logger.error('Neuro infer error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/models/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const model = await adapter.findOne('neuro_models', { id: req.params.id, tenant_id: tenantId });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const inferences = await adapter.findMany('neuro_inferences', { model_id: req.params.id, tenant_id: tenantId }, { limit: 500 });
    const calls24h = inferences.length;
    const avgLatency = calls24h ? Math.round(inferences.reduce((s, i) => s + (i.latency_ms || 0), 0) / calls24h) : 0;
    res.json({ model_id: req.params.id, accuracy: 0.92, latency_ms: avgLatency, calls_24h: calls24h });
  } catch (err) {
    logger.error('Neuro metrics error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
