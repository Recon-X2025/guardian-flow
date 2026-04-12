import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
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

const SAMPLE_MODELS = [
  'guardianflow-maintenance-predictor',
  'guardianflow-demand-forecast',
  'guardianflow-anomaly-detector',
  'guardianflow-nlp-query',
  'guardianflow-rul-model',
];

router.get('/ai-governance/models', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    let models = await adapter.findMany('model_registry', {}, { limit: 100 });
    if (!models || models.length === 0) {
      models = SAMPLE_MODELS.map(name => ({
        id: randomUUID(),
        model_name: name,
        provider: 'internal',
        risk_tier: 'minimal',
        eu_ai_act_category: 'General Purpose',
        intended_purpose: 'Operational analytics',
        high_risk_justification: null,
        last_review_date: new Date(),
        pending_approval_from: null,
        active: true,
        created_at: new Date(),
      }));
      for (const m of models) await adapter.insertOne('model_registry', m);
    }
    res.json({ models });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/ai-governance/models/:id/risk-tier', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { riskTier, justification, approverId } = req.body;
    if (!riskTier) return res.status(400).json({ error: 'riskTier is required' });
    const validTiers = ['minimal', 'limited', 'high', 'prohibited'];
    if (!validTiers.includes(riskTier)) return res.status(400).json({ error: 'Invalid riskTier' });
    if ((riskTier === 'high' || riskTier === 'prohibited') && !justification) {
      return res.status(400).json({ error: 'justification is required for high/prohibited tier' });
    }
    const adapter = await getAdapter();
    const model = await adapter.findOne('model_registry', { id: req.params.id });
    if (!model) return res.status(404).json({ error: 'Model not found' });

    const update = { risk_tier: riskTier, high_risk_justification: justification || null, last_review_date: new Date() };
    if ((riskTier === 'high' || riskTier === 'prohibited') && approverId) {
      update.pending_approval_from = approverId;
      update.status = 'pending_approval';
    } else {
      update.pending_approval_from = null;
      update.status = 'active';
    }
    await adapter.updateOne('model_registry', { id: req.params.id }, { $set: update });
    res.json({ success: true, ...update });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/ai-governance/compliance-report', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const models = await adapter.findMany('model_registry', {}, { limit: 1000 });
    const byTier = { minimal: 0, limited: 0, high: 0, prohibited: 0 };
    const now = new Date();
    const overdueReview = [];
    for (const m of models) {
      const tier = m.risk_tier || 'minimal';
      if (byTier[tier] !== undefined) byTier[tier]++;
      const lastReview = m.last_review_date ? new Date(m.last_review_date) : null;
      if (!lastReview || (now - lastReview) > 90 * 24 * 3600 * 1000) overdueReview.push(m);
    }
    res.json({
      totalModels: models.length,
      byTier,
      overdueReview,
      euAiActChecklist: [
        { article: 'Art.9 Risk Management', status: 'compliant' },
        { article: 'Art.10 Data Governance', status: 'compliant' },
        { article: 'Art.13 Transparency', status: 'partial' },
        { article: 'Art.14 Human Oversight', status: 'partial' },
        { article: 'Art.15 Accuracy', status: 'compliant' },
      ],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/ai-governance/llm-usage', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    let logs = [];
    try { logs = await adapter.findMany('llm_usage_logs', { tenantId }, { sort: { timestamp: -1 }, limit: 1000 }); } catch { logs = []; }
    const todayLogs = logs.filter(l => new Date(l.timestamp) >= todayStart);
    const callsToday = todayLogs.length;
    const tokenUsed = todayLogs.reduce((s, l) => s + (l.prompt_tokens || 0) + (l.completion_tokens || 0), 0);
    const contentFlags = logs.filter(l => l.content_flagged).slice(0, 50).map(l => ({ timestamp: l.timestamp, endpoint: l.endpoint, flag_reason: l.flag_reason }));
    let tokenLimit = 1000000;
    try {
      const budget = await adapter.findOne('tenant_token_budgets', { tenantId });
      if (budget) tokenLimit = budget.monthly_limit;
    } catch { /* use default */ }
    res.json({ callsToday, tokenUsed, tokenLimit, contentFlags });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
