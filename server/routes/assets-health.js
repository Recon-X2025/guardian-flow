import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { getAssetHealth, getAtRiskAssets, predictFailureProbability } from '../services/ai/predictive.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/at-risk', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const assets = await getAtRiskAssets(tenantId, limit);
    res.json({ assets });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/health', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const health = await getAssetHealth(tenantId, req.params.id);
    res.json(health);
  } catch (e) {
    if (e.message === 'Asset not found') return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

export default router;
