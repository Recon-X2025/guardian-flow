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

router.get('/reorder-suggestions', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const suggestions = await adapter.findMany('inventory_reorder_suggestions', { tenant_id: tenantId }, { limit: 100 });
    res.json({ suggestions });
  } catch (err) {
    logger.error('Inventory reorder suggestions error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reorder-suggestions/:itemId/approve', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const suggestion = await adapter.findOne('inventory_reorder_suggestions', { tenant_id: tenantId, id: req.params.itemId });
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });
    await adapter.updateOne('inventory_reorder_suggestions', { id: req.params.itemId }, { status: 'approved', approved_at: new Date().toISOString() });
    const po = {
      id: randomUUID(),
      tenant_id: tenantId,
      item_id: suggestion.item_id,
      quantity: suggestion.suggested_qty,
      status: 'pending',
      source: 'auto_reorder',
      created_at: new Date().toISOString(),
    };
    res.json({ approved: true, purchase_order: po });
  } catch (err) {
    logger.error('Inventory reorder approve error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/abc-analysis', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const analysis = await adapter.findMany('inventory_abc_analysis', { tenant_id: tenantId }, { limit: 200 });
    res.json({ analysis });
  } catch (err) {
    logger.error('Inventory ABC analysis error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/demand-forecast', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const analysis = await adapter.findMany('inventory_abc_analysis', { tenant_id: tenantId }, { limit: 20 });
    const forecast = analysis.map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      classification: item.classification,
      forecast_qty_30d: Math.round((item.avg_monthly_demand || 0) * 1.05),
      forecast_qty_90d: Math.round((item.avg_monthly_demand || 0) * 3.1),
      confidence: item.classification === 'A' ? 'high' : item.classification === 'B' ? 'medium' : 'low',
    }));
    res.json({ forecast });
  } catch (err) {
    logger.error('Inventory demand forecast error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
