/**
 * @file server/routes/ai-ethics.js
 * @description AI Ethics & Bias Auditing — Sprint 50.
 */
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

// GET /api/ai-ethics/audits
router.get('/audits', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const audits = await adapter.findMany('ethics_audits', { tenant_id: tenantId }, { limit: 50, sort: { created_at: -1 } });
    res.json({ audits });
  } catch (err) {
    logger.error('ai-ethics: list audits error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ai-ethics/audits
router.post('/audits', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { model_id, dataset_description, metrics } = req.body;
    if (!model_id || !dataset_description) {
      return res.status(400).json({ error: 'model_id and dataset_description are required' });
    }

    const m = metrics || {};
    const demographic_parity = m.demographic_parity ?? null;
    const equalised_odds = m.equalised_odds ?? null;
    const result = (demographic_parity !== null && demographic_parity > 0.8 && equalised_odds !== null && equalised_odds > 0.8)
      ? 'pass' : (demographic_parity === null && equalised_odds === null ? 'pending' : 'fail');

    const adapter = await getAdapter();
    const audit = {
      id: randomUUID(),
      tenant_id: tenantId,
      model_id,
      dataset_description,
      metrics: { demographic_parity, equalised_odds },
      result,
      auditor_id: req.user.id,
      created_at: new Date(),
    };
    await adapter.insertOne('ethics_audits', audit);
    res.status(201).json({ audit });
  } catch (err) {
    logger.error('ai-ethics: create audit error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai-ethics/audits/:id
router.get('/audits/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const audit = await adapter.findOne('ethics_audits', { id: req.params.id, tenant_id: tenantId });
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    res.json({ audit });
  } catch (err) {
    logger.error('ai-ethics: get audit error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai-ethics/policies
router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const policies = await adapter.findMany('ethics_policies', { tenant_id: tenantId }, { limit: 20 });
    res.json({ policies });
  } catch (err) {
    logger.error('ai-ethics: get policies error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
