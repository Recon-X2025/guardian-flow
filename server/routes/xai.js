import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { explainPrediction, getFeatureImportance, generateCounterfactual } from '../services/ai/xai.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.post('/explain', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { modelId, inputData } = req.body;
    if (!modelId) return res.status(400).json({ error: 'modelId is required' });
    const [explanation, counterfactual] = await Promise.all([
      explainPrediction(tenantId, modelId, inputData || {}),
      generateCounterfactual(tenantId, modelId, inputData || {}, 'improved'),
    ]);
    res.json({ ...explanation, counterfactual });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
