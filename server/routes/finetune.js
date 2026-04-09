import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { createFineTuneJob, getFineTuneJob, listFineTuneJobs, cancelFineTuneJob } from '../services/ai/llm.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.post('/finetune', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { baseModel, dataset, epochs, learningRate, batchSize } = req.body;
    if (!baseModel) return res.status(400).json({ error: 'baseModel is required' });
    const job = await createFineTuneJob(tenantId, { baseModel, dataset, epochs, learningRate, batchSize });
    res.status(201).json({ job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/finetune', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const jobs = await listFineTuneJobs(tenantId);
    res.json({ jobs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/finetune/:jobId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const job = await getFineTuneJob(tenantId, req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json({ job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/finetune/:jobId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const result = await cancelFineTuneJob(tenantId, req.params.jobId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
