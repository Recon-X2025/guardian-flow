import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { queryKnowledge } from '../services/ai/rag.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.post('/query', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { query, includeDecisionRecords, topK } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    const result = await queryKnowledge(tenantId, query, { includeDecisionRecords: !!includeDecisionRecords, topK: topK || 5 });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
