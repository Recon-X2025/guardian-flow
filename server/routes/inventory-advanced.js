/**
 * Advanced Inventory Routes
 * GET/POST  /api/inventory-adv/stock-movements
 * GET       /api/inventory-adv/stock-movements/history?item_id=
 * GET       /api/inventory-adv/valuation
 * POST      /api/inventory-adv/stock-take
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/stock-movements', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const movements = await adapter.findMany('stock_movements', { tenant_id: req.user.tenantId });
    res.json({ movements, total: movements.length });
  } catch (err) {
    logger.error('Inventory-adv: list movements error', { error: err.message });
    res.status(500).json({ error: 'Failed to list stock movements' });
  }
});

router.post('/stock-movements', async (req, res) => {
  try {
    const { item_id, item_name, movement_type, quantity, unit_cost, reference_id, reference_type, warehouse_from, warehouse_to, notes } = req.body;
    if (!item_id || !movement_type || quantity === undefined) {
      return res.status(400).json({ error: 'item_id, movement_type, and quantity are required' });
    }
    const adapter = await getAdapter();
    const movement = {
      id: randomUUID(), tenant_id: req.user.tenantId, item_id, item_name: item_name || null,
      movement_type, quantity, unit_cost: unit_cost || 0,
      reference_id: reference_id || null, reference_type: reference_type || null,
      warehouse_from: warehouse_from || null, warehouse_to: warehouse_to || null,
      notes: notes || null, created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('stock_movements', movement);
    res.status(201).json({ movement });
  } catch (err) {
    logger.error('Inventory-adv: create movement error', { error: err.message });
    res.status(500).json({ error: 'Failed to create stock movement' });
  }
});

router.get('/stock-movements/history', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const filter = { tenant_id: req.user.tenantId };
    if (req.query.item_id) filter.item_id = req.query.item_id;
    const movements = await adapter.findMany('stock_movements', filter);
    res.json({ movements, total: movements.length });
  } catch (err) {
    logger.error('Inventory-adv: history error', { error: err.message });
    res.status(500).json({ error: 'Failed to get stock movement history' });
  }
});

router.get('/valuation', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const movements = await adapter.findMany('stock_movements', { tenant_id: req.user.tenantId });
    const itemMap = {};
    for (const m of movements) {
      if (!itemMap[m.item_id]) {
        itemMap[m.item_id] = { item_id: m.item_id, item_name: m.item_name, net_quantity: 0, total_value: 0 };
      }
      const qty = Number(m.quantity) || 0;
      const cost = Number(m.unit_cost) || 0;
      if (['goods_receipt', 'return'].includes(m.movement_type)) {
        itemMap[m.item_id].net_quantity += qty;
        itemMap[m.item_id].total_value += qty * cost;
      } else if (['consumption', 'transfer'].includes(m.movement_type)) {
        itemMap[m.item_id].net_quantity -= qty;
      } else {
        itemMap[m.item_id].net_quantity += qty;
        if (qty > 0) itemMap[m.item_id].total_value += qty * cost;
      }
    }
    const valuation = Object.values(itemMap);
    res.json({ valuation, total_items: valuation.length });
  } catch (err) {
    logger.error('Inventory-adv: valuation error', { error: err.message });
    res.status(500).json({ error: 'Failed to compute valuation' });
  }
});

router.post('/stock-take', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    let adjustments_made = 0;
    let total_variance_value = 0;

    for (const item of items) {
      const diff = (Number(item.counted_qty) || 0) - (Number(item.system_qty) || 0);
      if (diff === 0) continue;
      const movement = {
        id: randomUUID(), tenant_id: tenantId, item_id: item.item_id, item_name: item.item_name || null,
        movement_type: 'adjustment', quantity: diff, unit_cost: item.unit_cost || 0,
        reference_type: 'stock_take', notes: 'Stock take adjustment', created_by: req.user.userId, created_at: new Date(),
      };
      await adapter.insertOne('stock_movements', movement);
      adjustments_made++;
      total_variance_value += Math.abs(diff) * (Number(item.unit_cost) || 0);
    }

    res.json({ adjustments_made, total_variance_value });
  } catch (err) {
    logger.error('Inventory-adv: stock-take error', { error: err.message });
    res.status(500).json({ error: 'Failed to process stock take' });
  }
});

export default router;
