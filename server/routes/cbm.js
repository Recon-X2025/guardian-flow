/**
 * @file server/routes/cbm.js
 * @description Condition-Based Maintenance API — Sprint 30.
 *
 * Routes
 * ------
 * POST /api/cbm/rules          — create CBM rule
 * GET  /api/cbm/rules          — list CBM rules
 * PUT  /api/cbm/rules/:id      — update rule
 * DELETE /api/cbm/rules/:id    — delete rule
 * POST /api/cbm/evaluate       — evaluate all rules against latest telemetry
 * GET  /api/cbm/history        — trigger event history
 */
import express from 'express';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { createRule, listRules, evaluateRules } from '../services/cbm.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// POST /api/cbm/rules
router.post('/rules', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { asset_id, condition, action, name } = req.body;
    if (!asset_id || !condition || !action) {
      return res.status(400).json({ error: 'asset_id, condition, and action are required' });
    }
    const rule = await createRule(tenantId, { asset_id, condition, action, name });
    res.status(201).json({ rule });
  } catch (err) {
    logger.error('CBM: create rule error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cbm/rules
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { asset_id } = req.query;
    const rules = await listRules(tenantId, { asset_id });
    res.json({ rules });
  } catch (err) {
    logger.error('CBM: list rules error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cbm/rules/:id
router.put('/rules/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rule = await adapter.findOne('cbm_rules', { id: req.params.id, tenant_id: tenantId });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const { name, condition, action, active } = req.body;
    await adapter.updateOne('cbm_rules', { id: req.params.id, tenant_id: tenantId }, {
      ...(name !== undefined && { name }),
      ...(condition !== undefined && { condition }),
      ...(action !== undefined && { action }),
      ...(active !== undefined && { active }),
      updated_at: new Date(),
    });
    const updated = await adapter.findOne('cbm_rules', { id: req.params.id });
    res.json({ rule: updated });
  } catch (err) {
    logger.error('CBM: update rule error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cbm/rules/:id
router.delete('/rules/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const rule = await adapter.findOne('cbm_rules', { id: req.params.id, tenant_id: tenantId });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    await adapter.deleteOne('cbm_rules', { id: req.params.id, tenant_id: tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('CBM: delete rule error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cbm/evaluate
router.post('/evaluate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const triggered = await evaluateRules(tenantId);
    res.json({ triggered, count: triggered.length });
  } catch (err) {
    logger.error('CBM: evaluate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cbm/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const history = await adapter.findMany('cbm_trigger_history', { tenant_id: tenantId }, { limit, sort: { triggered_at: -1 } });
    res.json({ history });
  } catch (err) {
    logger.error('CBM: history error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
