/**
 * Budgeting Routes
 * GET/POST   /api/budgeting/budgets
 * PUT/DELETE /api/budgeting/budgets/:id
 * GET/POST   /api/budgeting/budgets/:id/lines
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/budgets', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const budgets = await adapter.findMany('budgets', { tenant_id: req.user.tenantId });
    res.json({ budgets, total: budgets.length });
  } catch (err) {
    logger.error('Budgeting: list budgets error', { error: err.message });
    res.status(500).json({ error: 'Failed to list budgets' });
  }
});

router.post('/budgets', async (req, res) => {
  try {
    const { name, period_start, period_end, status, version } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const budget = {
      id: randomUUID(), tenant_id: req.user.tenantId, name,
      period_start: period_start || null, period_end: period_end || null,
      status: status || 'draft', version: version || 1,
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('budgets', budget);
    res.status(201).json({ budget });
  } catch (err) {
    logger.error('Budgeting: create budget error', { error: err.message });
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.put('/budgets/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const budget = await adapter.findOne('budgets', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    const allowed = ['name', 'period_start', 'period_end', 'status', 'version'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('budgets', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ budget: { ...budget, ...updates } });
  } catch (err) {
    logger.error('Budgeting: update budget error', { error: err.message });
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

router.delete('/budgets/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const budget = await adapter.findOne('budgets', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    await adapter.deleteOne('budgets', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('Budgeting: delete budget error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

router.get('/budgets/:id/lines', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const lines = await adapter.findMany('budget_lines', { budget_id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ lines, total: lines.length });
  } catch (err) {
    logger.error('Budgeting: list budget lines error', { error: err.message });
    res.status(500).json({ error: 'Failed to list budget lines' });
  }
});

router.post('/budgets/:id/lines', async (req, res) => {
  try {
    const { account_code, description, amount, actual_amount } = req.body;
    if (!account_code || amount === undefined) return res.status(400).json({ error: 'account_code and amount are required' });
    const adapter = await getAdapter();
    const budget = await adapter.findOne('budgets', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    const actual = actual_amount || 0;
    const line = {
      id: randomUUID(), budget_id: req.params.id, tenant_id: req.user.tenantId,
      account_code, description: description || null, amount,
      actual_amount: actual, variance: amount - actual, created_at: new Date(),
    };
    await adapter.insertOne('budget_lines', line);
    res.status(201).json({ line });
  } catch (err) {
    logger.error('Budgeting: create budget line error', { error: err.message });
    res.status(500).json({ error: 'Failed to create budget line' });
  }
});

export default router;
