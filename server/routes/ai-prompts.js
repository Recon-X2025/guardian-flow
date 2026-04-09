import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { createPrompt, updatePrompt, deletePrompt, testPrompt, listStoredPrompts, getStoredPrompt } from '../services/ai/prompts.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/prompts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const prompts = await listStoredPrompts(tenantId);
    res.json({ prompts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/prompts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, template, variables, description } = req.body;
    if (!name || !template) return res.status(400).json({ error: 'name and template are required' });
    const prompt = await createPrompt(tenantId, { name, template, variables, description });
    res.status(201).json({ prompt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const prompt = await getStoredPrompt(tenantId, req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Not found' });
    res.json({ prompt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const prompt = await updatePrompt(tenantId, req.params.id, req.body);
    res.json({ prompt });
  } catch (e) {
    if (e.message === 'Prompt not found') return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    await deletePrompt(tenantId, req.params.id);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/prompts/:id/test', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { variables } = req.body;
    const result = await testPrompt(tenantId, req.params.id, variables || {});
    res.json(result);
  } catch (e) {
    if (e.message === 'Prompt not found') return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

export default router;
