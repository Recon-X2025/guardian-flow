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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const budgets = await adapter.findMany('budget_plans', { tenant_id: tenantId }, { limit: 50 });
    res.json({ budgets });
  } catch (err) {
    logger.error('Budgets list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, fiscal_year, dimensions, line_items } = req.body;
    if (!name || !fiscal_year) {
      return res.status(400).json({ error: 'name and fiscal_year are required' });
    }
    const adapter = await getAdapter();
    const budget = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      fiscal_year,
      dimensions: dimensions || [],
      line_items: line_items || [],
      total_budget: (line_items || []).reduce((s, i) => s + (i.amount || 0), 0),
      status: 'draft',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('budget_plans', budget);
    res.status(201).json({ budget });
  } catch (err) {
    logger.error('Budget create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const budgets = await adapter.findMany('budget_plans', { tenant_id: tenantId }, { limit: 100 });
    const totalBudget = budgets.reduce((s, b) => s + (b.total_budget || 0), 0);
    res.json({ total_budgets: budgets.length, total_budget: totalBudget, budgets });
  } catch (err) {
    logger.error('Budget summary error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const budget = await adapter.findOne('budget_plans', { id: req.params.id, tenant_id: tenantId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ budget });
  } catch (err) {
    logger.error('Budget get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const budget = await adapter.findOne('budget_plans', { id: req.params.id, tenant_id: tenantId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('budget_plans', { id: req.params.id }, updates);
    res.json({ budget: { ...budget, ...updates } });
  } catch (err) {
    logger.error('Budget update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/variance', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const budget = await adapter.findOne('budget_plans', { id: req.params.id, tenant_id: tenantId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    const actuals = await adapter.findMany('budget_actuals', { tenant_id: tenantId, budget_id: req.params.id }, { limit: 200 });
    const variance = (budget.line_items || []).map(item => {
      const actual = actuals.find(a => a.account === item.account);
      const actualAmt = actual?.amount || 0;
      return {
        account: item.account,
        budget: item.amount,
        actual: actualAmt,
        variance: actualAmt - item.amount,
        variance_pct: item.amount ? Math.round(((actualAmt - item.amount) / item.amount) * 10000) / 100 : null,
      };
    });
    res.json({ variance });
  } catch (err) {
    logger.error('Budget variance error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
