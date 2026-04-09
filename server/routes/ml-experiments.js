import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { createExperiment, getExperiment, listExperiments, createRun, listRuns, deployModel } from '../services/ai/automl.js';

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/experiments', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const experiments = await listExperiments(tenantId);
    res.json({ experiments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/experiments', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, dataSource, targetMetric, algorithm } = req.body;
    if (!name || !dataSource || !targetMetric || !algorithm) {
      return res.status(400).json({ error: 'name, dataSource, targetMetric, and algorithm are required' });
    }
    const experiment = await createExperiment(tenantId, { name, dataSource, targetMetric, algorithm });
    res.status(201).json({ experiment });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/experiments/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const experiment = await getExperiment(tenantId, req.params.id);
    if (!experiment) return res.status(404).json({ error: 'Not found' });
    res.json({ experiment });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/experiments/:id/results', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const runs = await listRuns(tenantId, req.params.id);
    res.json({ runs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/experiments/:id/deploy', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const runs = await listRuns(tenantId, req.params.id);
    if (runs.length === 0) return res.status(404).json({ error: 'No runs found for experiment' });
    const bestRun = runs.sort((a, b) => (b.metrics?.accuracy || 0) - (a.metrics?.accuracy || 0))[0];
    const result = await deployModel(tenantId, bestRun.id);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
