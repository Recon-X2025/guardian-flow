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

router.get('/scores', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const scores = await adapter.findMany('customer_success_scores', { tenant_id: tenantId }, { limit: 100 });
    res.json({ scores });
  } catch (err) {
    logger.error('Customer success scores error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/scores/:customerId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const score = await adapter.findOne('customer_success_scores', { tenant_id: tenantId, customer_id: req.params.customerId });
    if (!score) return res.status(404).json({ error: 'Score not found' });
    res.json({ score });
  } catch (err) {
    logger.error('Customer success score get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/scores/:customerId/recalculate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const existing = await adapter.findOne('customer_success_scores', { tenant_id: tenantId, customer_id: req.params.customerId });
    const score = {
      id: existing?.id || randomUUID(),
      tenant_id: tenantId,
      customer_id: req.params.customerId,
      churn_risk: Math.round(Math.random() * 100),
      nps: Math.round((Math.random() * 200) - 100),
      usage_score: Math.round(Math.random() * 100),
      support_load: Math.round(Math.random() * 20),
      health_score: Math.round(Math.random() * 100),
      last_calculated: new Date().toISOString(),
    };
    if (existing) {
      await adapter.updateOne('customer_success_scores', { id: existing.id }, score);
    } else {
      await adapter.insertOne('customer_success_scores', score);
    }
    res.json({ score });
  } catch (err) {
    logger.error('Customer success recalculate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/cohorts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const cohorts = await adapter.findMany('customer_cohorts', { tenant_id: tenantId }, { limit: 50 });
    res.json({ cohorts });
  } catch (err) {
    logger.error('Customer cohorts error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
