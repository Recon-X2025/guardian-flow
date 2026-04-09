import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { analyseImage, listAnalyses, getAnalysis } from '../services/ai/vision.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.post('/vision/analyse', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });
    const buffer = Buffer.from(imageBase64, 'base64');
    const result = await analyseImage(tenantId, buffer, mimeType || 'image/jpeg');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/vision/analyses', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { assetId } = req.query;
    const analyses = await listAnalyses(tenantId, assetId);
    res.json({ analyses });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/vision/analyses/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const analysis = await getAnalysis(tenantId, req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Not found' });
    res.json({ analysis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
