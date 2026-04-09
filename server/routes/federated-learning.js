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

router.get('/rounds', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rounds = await adapter.findMany('fl_rounds', { tenant_id: tenantId }, { limit: 50 });
    res.json({ rounds });
  } catch (err) {
    logger.error('FL rounds list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rounds', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { model_id, participants, aggregation_strategy } = req.body;
    if (!model_id) return res.status(400).json({ error: 'model_id is required' });
    const adapter = await getAdapter();
    const round = {
      id: randomUUID(),
      tenant_id: tenantId,
      model_id,
      participants: participants || [],
      aggregation_strategy: aggregation_strategy || 'fedavg',
      status: 'pending',
      gradients_received: 0,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('fl_rounds', round);
    res.status(201).json({ round });
  } catch (err) {
    logger.error('FL round create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/rounds/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const round = await adapter.findOne('fl_rounds', { id: req.params.id, tenant_id: tenantId });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    const updates = await adapter.findMany('fl_participant_updates', { round_id: req.params.id }, { limit: 100 });
    res.json({ round, updates });
  } catch (err) {
    logger.error('FL round get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rounds/:id/submit-gradient', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { gradient_uri, metrics } = req.body;
    const adapter = await getAdapter();
    const round = await adapter.findOne('fl_rounds', { id: req.params.id, tenant_id: tenantId });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    const update = {
      id: randomUUID(),
      round_id: req.params.id,
      tenant_id: tenantId,
      participant_id: req.user.id,
      gradient_uri: gradient_uri || '',
      metrics: metrics || {},
      submitted_at: new Date().toISOString(),
    };
    await adapter.insertOne('fl_participant_updates', update);
    await adapter.updateOne('fl_rounds', { id: req.params.id }, {
      gradients_received: (round.gradients_received || 0) + 1,
    });
    res.status(201).json({ update });
  } catch (err) {
    logger.error('FL submit gradient error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rounds/:id/aggregate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const round = await adapter.findOne('fl_rounds', { id: req.params.id, tenant_id: tenantId });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    await adapter.updateOne('fl_rounds', { id: req.params.id }, {
      status: 'completed',
      aggregated_at: new Date().toISOString(),
      global_model_version: `${round.model_id}-r${Date.now()}`,
    });
    res.json({ aggregated: true, strategy: round.aggregation_strategy });
  } catch (err) {
    logger.error('FL aggregate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
