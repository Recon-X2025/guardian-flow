/**
 * Goods Receipt Routes
 * GET/POST /api/goods-receipt
 * GET      /api/goods-receipt/:id
 * PUT      /api/goods-receipt/:id/post
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const receipts = await adapter.findMany('goods_receipts', { tenant_id: req.user.tenantId });
    res.json({ receipts, total: receipts.length });
  } catch (err) {
    logger.error('GR: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list goods receipts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { po_id, supplier_id, receipt_date, lines, total_value } = req.body;
    const adapter = await getAdapter();
    const receipt = {
      id: randomUUID(), tenant_id: req.user.tenantId,
      po_id: po_id || null, supplier_id: supplier_id || null,
      receipt_date: receipt_date || new Date(), lines: lines || [],
      status: 'draft', total_value: total_value || 0,
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('goods_receipts', receipt);
    res.status(201).json({ receipt });
  } catch (err) {
    logger.error('GR: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create goods receipt' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const receipt = await adapter.findOne('goods_receipts', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!receipt) return res.status(404).json({ error: 'Goods receipt not found' });
    res.json({ receipt });
  } catch (err) {
    logger.error('GR: get error', { error: err.message });
    res.status(500).json({ error: 'Failed to get goods receipt' });
  }
});

router.put('/:id/post', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const receipt = await adapter.findOne('goods_receipts', { id: req.params.id, tenant_id: tenantId });
    if (!receipt) return res.status(404).json({ error: 'Goods receipt not found' });
    if (receipt.status === 'posted') return res.status(409).json({ error: 'Already posted' });

    await adapter.updateOne('goods_receipts', { id: req.params.id, tenant_id: tenantId }, { status: 'posted', posted_at: new Date() });

    for (const line of (receipt.lines || [])) {
      const movement = {
        id: randomUUID(), tenant_id: tenantId, item_id: line.item_id, item_name: line.item_name || null,
        movement_type: 'goods_receipt', quantity: line.received_qty || line.quantity || 0,
        unit_cost: line.unit_price || line.unit_cost || 0,
        reference_id: receipt.id, reference_type: 'goods_receipt',
        created_by: req.user.userId, created_at: new Date(),
      };
      await adapter.insertOne('stock_movements', movement);
      try {
        const invItem = await adapter.findOne('inventory_items', { id: line.item_id, tenant_id: tenantId });
        if (invItem) {
          const newStock = (Number(invItem.current_stock) || 0) + (Number(line.received_qty || line.quantity) || 0);
          await adapter.updateOne('inventory_items', { id: line.item_id, tenant_id: tenantId }, { current_stock: newStock });
        }
      } catch {
        // Non-critical — item may not be in inventory
      }
    }

    res.json({ posted: true, id: req.params.id });
  } catch (err) {
    logger.error('GR: post error', { error: err.message });
    res.status(500).json({ error: 'Failed to post goods receipt' });
  }
});

export default router;
