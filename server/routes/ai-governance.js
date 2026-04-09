import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { listAuditLog, createPolicy, listPolicies, getModelRegistry } from '../services/ai/governance.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/governance/log', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { model, from, limit } = req.query;
    const log = await listAuditLog(tenantId, { model, from, limit: limit ? parseInt(limit) : 100 });
    res.json({ log });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/governance/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const policies = await listPolicies(tenantId);
    res.json({ policies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/governance/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, description, rules, enabled } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const policy = await createPolicy(tenantId, { name, description, rules, enabled });
    res.status(201).json({ policy });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/governance/models', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const models = await getModelRegistry(tenantId);
    res.json({ models });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
