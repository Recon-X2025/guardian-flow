/**
 * @file server/routes/inventory.js
 * @description Inventory Management — Sprint 5 (Gap Bridge).
 *   Goods receipts, stock movements, inter-warehouse transfers, purchase requisitions.
 *
 * Routes
 * ------
 * GET    /api/inventory/items                    — list inventory items
 * POST   /api/inventory/items                    — create item
 * GET    /api/inventory/items/:id                — get item
 * PUT    /api/inventory/items/:id                — update item
 *
 * POST   /api/inventory/goods-receipts           — receive goods against a PO
 * GET    /api/inventory/goods-receipts           — list GRs (filter: poId, status)
 * GET    /api/inventory/goods-receipts/:id       — get GR
 * PUT    /api/inventory/goods-receipts/:id/post  — post GR (updates qty_available)
 *
 * GET    /api/inventory/movements                — stock movement history
 * POST   /api/inventory/adjustments              — manual stock adjustment
 *
 * POST   /api/inventory/transfers                — inter-warehouse transfer
 * GET    /api/inventory/transfers                — list transfers
 * PUT    /api/inventory/transfers/:id/complete   — complete transfer
 *
 * GET    /api/inventory/purchase-requisitions    — list PRs
 * POST   /api/inventory/purchase-requisitions    — create PR
 * PUT    /api/inventory/purchase-requisitions/:id/approve — approve PR → draft PO
 *
 * Security: All routes require JWT (applied in server.js).
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

function tid(req) { return req.user?.tenantId ?? req.user?.tenant_id ?? 'default'; }
function uid(req) { return req.user?.userId || req.user?.id; }
function now() { return new Date().toISOString(); }

// ─── helper: record stock movement ──────────────────────────────────────────

async function recordMovement(db, { tenantId, itemId, warehouseId, movementType, qty, unitCost, referenceId, referenceType, actorId, notes = '' }) {
  const mov = {
    _id: randomUUID(),
    tenant_id: tenantId,
    item_id: itemId,
    warehouse_id: warehouseId || null,
    movement_type: movementType, // GR | GI | adjustment | transfer_out | transfer_in | return
    qty: Number(qty),
    unit_cost: Number(unitCost) || 0,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
    actor_id: actorId,
    notes,
    recorded_at: now(),
  };
  await db.insert('stock_movements', mov);
  return mov;
}

// ─── INVENTORY ITEMS ─────────────────────────────────────────────────────────

router.get('/items', async (req, res) => {
  try {
    const db = getAdapter();
    const { category, warehouseId, lowStock, q, limit = 100 } = req.query;
    const filter = { tenant_id: tid(req) };
    if (category) filter.category = category;
    if (warehouseId) filter.warehouse_id = warehouseId;

    let items = await db.find('inventory_items', filter, { sort: { name: 1 }, limit: Math.min(Number(limit), 1000) }) || [];
    if (lowStock === 'true') items = items.filter(i => (i.qty_available || 0) <= (i.reorder_point || 0));
    if (q) {
      const lq = q.toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(lq) || i.sku?.toLowerCase().includes(lq));
    }
    res.json({ items, total: items.length });
  } catch (err) {
    logger.error(err, 'GET inventory items');
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { sku, name, category, warehouseId, unitCost = 0, qtyAvailable = 0, reorderPoint = 0, reorderQty = 0, uom = 'each', notes = '' } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    // Duplicate SKU check
    if (sku) {
      const ex = await db.findOne('inventory_items', { tenant_id: tenantId, sku });
      if (ex) return res.status(409).json({ error: 'SKU already exists', existingId: ex._id });
    }

    const item = {
      _id: randomUUID(),
      tenant_id: tenantId,
      sku: sku || null,
      name,
      category: category || 'general',
      warehouse_id: warehouseId || null,
      unit_cost: Number(unitCost),
      qty_available: Number(qtyAvailable),
      qty_on_order: 0,
      reorder_point: Number(reorderPoint),
      reorder_qty: Number(reorderQty),
      uom,
      notes,
      created_by: uid(req),
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('inventory_items', item);
    res.status(201).json(item);
  } catch (err) {
    logger.error(err, 'POST inventory item');
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

router.get('/items/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const item = await db.findOne('inventory_items', { _id: req.params.id, tenant_id: tid(req) });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    logger.error(err, 'GET inventory item');
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const item = await db.findOne('inventory_items', { _id: req.params.id, tenant_id: tenantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const update = { ...item, ...req.body, _id: req.params.id, tenant_id: tenantId, updated_at: now() };
    await db.updateOne('inventory_items', { _id: req.params.id }, update);
    res.json(update);
  } catch (err) {
    logger.error(err, 'PUT inventory item');
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ─── GOODS RECEIPTS ──────────────────────────────────────────────────────────

router.post('/goods-receipts', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { purchaseOrderId, vendorId, warehouseId, lines, notes = '', receivedDate } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines array is required' });
    }

    const gr = {
      _id: randomUUID(),
      tenant_id: tenantId,
      purchase_order_id: purchaseOrderId || null,
      vendor_id: vendorId || null,
      warehouse_id: warehouseId || null,
      received_date: receivedDate || now().slice(0, 10),
      lines: lines.map(l => ({
        _id: randomUUID(),
        item_id: l.itemId || l.item_id,
        sku: l.sku || null,
        qty_expected: Number(l.qtyExpected || l.qty_expected || l.qty || 0),
        qty_received: Number(l.qtyReceived || l.qty_received || l.qty || 0),
        unit_cost: Number(l.unitCost || l.unit_cost || 0),
        notes: l.notes || '',
      })),
      notes,
      status: 'draft', // draft | posted | cancelled
      created_by: uid(req),
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('goods_receipts', gr);
    res.status(201).json(gr);
  } catch (err) {
    logger.error(err, 'POST goods receipt');
    res.status(500).json({ error: 'Failed to create goods receipt' });
  }
});

router.get('/goods-receipts', async (req, res) => {
  try {
    const db = getAdapter();
    const { purchaseOrderId, status, vendorId, limit = 50 } = req.query;
    const filter = { tenant_id: tid(req) };
    if (purchaseOrderId) filter.purchase_order_id = purchaseOrderId;
    if (status) filter.status = status;
    if (vendorId) filter.vendor_id = vendorId;
    const grs = await db.find('goods_receipts', filter, { sort: { created_at: -1 }, limit: Math.min(Number(limit), 500) }) || [];
    res.json({ goodsReceipts: grs, total: grs.length });
  } catch (err) {
    logger.error(err, 'GET goods receipts');
    res.status(500).json({ error: 'Failed to fetch goods receipts' });
  }
});

router.get('/goods-receipts/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const gr = await db.findOne('goods_receipts', { _id: req.params.id, tenant_id: tid(req) });
    if (!gr) return res.status(404).json({ error: 'Goods receipt not found' });
    res.json(gr);
  } catch (err) {
    logger.error(err, 'GET goods receipt');
    res.status(500).json({ error: 'Failed to fetch goods receipt' });
  }
});

// POST GR — updates qty_available on each item
router.put('/goods-receipts/:id/post', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const gr = await db.findOne('goods_receipts', { _id: req.params.id, tenant_id: tenantId });
    if (!gr) return res.status(404).json({ error: 'Goods receipt not found' });
    if (gr.status === 'posted') return res.status(409).json({ error: 'Already posted' });

    const movements = [];
    for (const line of gr.lines || []) {
      if (!line.item_id || line.qty_received <= 0) continue;
      const item = await db.findOne('inventory_items', { _id: line.item_id, tenant_id: tenantId });
      if (item) {
        const newQty = (item.qty_available || 0) + line.qty_received;
        await db.updateOne('inventory_items', { _id: item._id }, { ...item, qty_available: newQty, updated_at: now() });
      }
      const mov = await recordMovement(db, {
        tenantId, itemId: line.item_id, warehouseId: gr.warehouse_id,
        movementType: 'GR', qty: line.qty_received, unitCost: line.unit_cost,
        referenceId: gr._id, referenceType: 'goods_receipt', actorId: uid(req),
        notes: `Posted GR ${gr._id}`,
      });
      movements.push(mov);
    }

    const posted = { ...gr, status: 'posted', posted_by: uid(req), posted_at: now(), updated_at: now() };
    await db.updateOne('goods_receipts', { _id: req.params.id }, posted);

    res.json({ goodsReceipt: posted, movements });
  } catch (err) {
    logger.error(err, 'POST goods receipt post');
    res.status(500).json({ error: 'Failed to post goods receipt' });
  }
});

// ─── STOCK MOVEMENTS ─────────────────────────────────────────────────────────

router.get('/movements', async (req, res) => {
  try {
    const db = getAdapter();
    const { itemId, warehouseId, movementType, from, to, limit = 100 } = req.query;
    const filter = { tenant_id: tid(req) };
    if (itemId) filter.item_id = itemId;
    if (warehouseId) filter.warehouse_id = warehouseId;
    if (movementType) filter.movement_type = movementType;
    if (from || to) {
      filter.recorded_at = {};
      if (from) filter.recorded_at.$gte = from;
      if (to) filter.recorded_at.$lte = to;
    }
    const movements = await db.find('stock_movements', filter, { sort: { recorded_at: -1 }, limit: Math.min(Number(limit), 2000) }) || [];
    res.json({ movements, total: movements.length });
  } catch (err) {
    logger.error(err, 'GET stock movements');
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Manual adjustment
router.post('/adjustments', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { itemId, warehouseId, adjustmentType = 'increase', qty, reason = '', unitCost } = req.body;

    if (!itemId || qty == null) return res.status(400).json({ error: 'itemId and qty required' });

    const item = await db.findOne('inventory_items', { _id: itemId, tenant_id: tenantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const qtyChange = adjustmentType === 'decrease' ? -Math.abs(Number(qty)) : Math.abs(Number(qty));
    const newQty = Math.max(0, (item.qty_available || 0) + qtyChange);
    await db.updateOne('inventory_items', { _id: itemId }, { ...item, qty_available: newQty, updated_at: now() });

    const mov = await recordMovement(db, {
      tenantId, itemId, warehouseId,
      movementType: 'adjustment', qty: qtyChange,
      unitCost: unitCost || item.unit_cost || 0,
      referenceType: 'manual_adjustment', actorId: uid(req), notes: reason,
    });

    res.status(201).json({ adjustment: { itemId, adjustmentType, qty: qtyChange, newQty, reason }, movement: mov });
  } catch (err) {
    logger.error(err, 'POST stock adjustment');
    res.status(500).json({ error: 'Failed to create adjustment' });
  }
});

// ─── INTER-WAREHOUSE TRANSFERS ───────────────────────────────────────────────

router.post('/transfers', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { fromWarehouseId, toWarehouseId, lines, notes = '', scheduledDate } = req.body;

    if (!fromWarehouseId || !toWarehouseId) return res.status(400).json({ error: 'fromWarehouseId and toWarehouseId required' });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'lines array required' });

    const transfer = {
      _id: randomUUID(),
      tenant_id: tenantId,
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      lines: lines.map(l => ({
        _id: randomUUID(),
        item_id: l.itemId || l.item_id,
        qty: Number(l.qty),
        unit_cost: Number(l.unitCost || l.unit_cost || 0),
        notes: l.notes || '',
      })),
      notes,
      scheduled_date: scheduledDate || null,
      status: 'pending', // pending | in_transit | completed | cancelled
      created_by: uid(req),
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('inventory_transfers', transfer);
    res.status(201).json(transfer);
  } catch (err) {
    logger.error(err, 'POST inventory transfer');
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

router.get('/transfers', async (req, res) => {
  try {
    const db = getAdapter();
    const { status, fromWarehouseId, toWarehouseId, limit = 50 } = req.query;
    const filter = { tenant_id: tid(req) };
    if (status) filter.status = status;
    if (fromWarehouseId) filter.from_warehouse_id = fromWarehouseId;
    if (toWarehouseId) filter.to_warehouse_id = toWarehouseId;
    const transfers = await db.find('inventory_transfers', filter, { sort: { created_at: -1 }, limit: Math.min(Number(limit), 500) }) || [];
    res.json({ transfers, total: transfers.length });
  } catch (err) {
    logger.error(err, 'GET inventory transfers');
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

router.put('/transfers/:id/complete', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const transfer = await db.findOne('inventory_transfers', { _id: req.params.id, tenant_id: tenantId });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status === 'completed') return res.status(409).json({ error: 'Already completed' });

    // Deduct from source, add to destination
    const movements = [];
    for (const line of transfer.lines || []) {
      const item = await db.findOne('inventory_items', { _id: line.item_id, tenant_id: tenantId });
      if (item) {
        const srcQty = Math.max(0, (item.qty_available || 0) - line.qty);
        await db.updateOne('inventory_items', { _id: line.item_id }, { ...item, qty_available: srcQty, updated_at: now() });
      }

      const outMov = await recordMovement(db, {
        tenantId, itemId: line.item_id, warehouseId: transfer.from_warehouse_id,
        movementType: 'transfer_out', qty: -line.qty, unitCost: line.unit_cost,
        referenceId: transfer._id, referenceType: 'transfer', actorId: uid(req),
      });

      // Find or create item at destination
      const destItem = await db.findOne('inventory_items', {
        tenant_id: tenantId, _id: line.item_id,
      });
      if (destItem) {
        const destQty = (destItem.qty_available || 0) + line.qty;
        await db.updateOne('inventory_items', { _id: line.item_id }, { ...destItem, qty_available: destQty, updated_at: now() });
      }

      const inMov = await recordMovement(db, {
        tenantId, itemId: line.item_id, warehouseId: transfer.to_warehouse_id,
        movementType: 'transfer_in', qty: line.qty, unitCost: line.unit_cost,
        referenceId: transfer._id, referenceType: 'transfer', actorId: uid(req),
      });

      movements.push(outMov, inMov);
    }

    const completed = { ...transfer, status: 'completed', completed_by: uid(req), completed_at: now(), updated_at: now() };
    await db.updateOne('inventory_transfers', { _id: req.params.id }, completed);

    res.json({ transfer: completed, movements });
  } catch (err) {
    logger.error(err, 'PUT transfer complete');
    res.status(500).json({ error: 'Failed to complete transfer' });
  }
});

// ─── PURCHASE REQUISITIONS ───────────────────────────────────────────────────

router.get('/purchase-requisitions', async (req, res) => {
  try {
    const db = getAdapter();
    const { status, requestedBy, limit = 50 } = req.query;
    const filter = { tenant_id: tid(req) };
    if (status) filter.status = status;
    if (requestedBy) filter.requested_by = requestedBy;
    const prs = await db.find('purchase_requisitions', filter, { sort: { created_at: -1 }, limit: Math.min(Number(limit), 500) }) || [];
    res.json({ purchaseRequisitions: prs, total: prs.length });
  } catch (err) {
    logger.error(err, 'GET purchase requisitions');
    res.status(500).json({ error: 'Failed to fetch purchase requisitions' });
  }
});

router.post('/purchase-requisitions', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { lines, notes = '', urgency = 'normal', requiredBy } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'lines required' });

    const pr = {
      _id: randomUUID(),
      tenant_id: tenantId,
      lines: lines.map(l => ({
        _id: randomUUID(),
        item_id: l.itemId || l.item_id || null,
        description: l.description || l.name || '',
        qty: Number(l.qty),
        estimated_unit_cost: Number(l.estimatedUnitCost || l.unit_cost || 0),
        preferred_vendor_id: l.preferredVendorId || null,
      })),
      total_estimated: lines.reduce((s, l) => s + (Number(l.qty) * Number(l.estimatedUnitCost || l.unit_cost || 0)), 0),
      notes,
      urgency,
      required_by: requiredBy || null,
      status: 'pending', // pending | approved | rejected | converted
      requested_by: uid(req),
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('purchase_requisitions', pr);
    res.status(201).json(pr);
  } catch (err) {
    logger.error(err, 'POST purchase requisition');
    res.status(500).json({ error: 'Failed to create purchase requisition' });
  }
});

router.put('/purchase-requisitions/:id/approve', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const pr = await db.findOne('purchase_requisitions', { _id: req.params.id, tenant_id: tenantId });
    if (!pr) return res.status(404).json({ error: 'Purchase requisition not found' });
    if (pr.status !== 'pending') return res.status(409).json({ error: `Cannot approve a PR in status: ${pr.status}` });

    // Generate draft Purchase Order
    const po = {
      _id: randomUUID(),
      tenant_id: tenantId,
      requisition_id: pr._id,
      vendor_id: req.body.vendorId || pr.lines[0]?.preferred_vendor_id || null,
      lines: pr.lines.map(l => ({
        _id: randomUUID(),
        item_id: l.item_id,
        description: l.description,
        qty_ordered: l.qty,
        unit_cost: l.estimated_unit_cost,
        qty_received: 0,
      })),
      total_amount: pr.total_estimated,
      status: 'draft',
      notes: pr.notes,
      required_by: pr.required_by,
      approved_by: uid(req),
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('purchase_orders', po);
    const updated = { ...pr, status: 'converted', approved_by: uid(req), approved_at: now(), purchase_order_id: po._id, updated_at: now() };
    await db.updateOne('purchase_requisitions', { _id: pr._id }, updated);

    res.json({ purchaseRequisition: updated, purchaseOrder: po });
  } catch (err) {
    logger.error(err, 'PUT PR approve');
    res.status(500).json({ error: 'Failed to approve purchase requisition' });
  }
});

export default router;
