/**
 * @file server/routes/vehicle-stock.js
 * @description Technician Vehicle (Truck) Stock API — Sprint 36.
 *
 * Routes
 * ------
 * GET  /api/technicians/:id/vehicle-stock         — get vehicle stock
 * POST /api/technicians/:id/vehicle-stock         — initialize vehicle stock
 * PUT  /api/technicians/:id/vehicle-stock/consume — consume parts
 * PUT  /api/technicians/:id/vehicle-stock/restock — restock parts
 *
 * Security
 * --------
 * All routes require authentication and strict tenant isolation.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const VEHICLES_COL      = 'technician_vehicles';
const TECHNICIANS_COL   = 'technicians';
const NOTIFICATIONS_COL = 'notifications';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── GET /api/technicians/:id/vehicle-stock ────────────────────────────────────

router.get('/:id/vehicle-stock', authenticateToken, async (req, res) => {
  try {
    const tenantId     = await resolveTenantId(req.user.id);
    const technicianId = req.params.id;

    const adapter = await getAdapter();
    const vehicle = await adapter.findOne(VEHICLES_COL, { technicianId, tenantId });

    if (!vehicle) {
      return res.json({ vehicle: null, stockItems: [] });
    }

    res.json({ vehicle });
  } catch (error) {
    logger.error('VehicleStock: get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get vehicle stock' });
  }
});

// ── POST /api/technicians/:id/vehicle-stock ───────────────────────────────────

router.post('/:id/vehicle-stock', authenticateToken, async (req, res) => {
  try {
    const tenantId     = await resolveTenantId(req.user.id);
    const technicianId = req.params.id;
    const { vehicleRef, stockItems = [] } = req.body;

    if (!vehicleRef) {
      return res.status(400).json({ error: 'vehicleRef is required' });
    }

    const adapter = await getAdapter();
    const existing = await adapter.findOne(VEHICLES_COL, { technicianId, tenantId });

    if (existing) {
      await adapter.updateOne(
        VEHICLES_COL,
        { technicianId, tenantId },
        { vehicleRef, stockItems, updatedAt: new Date().toISOString() },
      );
      const updated = await adapter.findOne(VEHICLES_COL, { technicianId, tenantId });
      return res.json({ vehicle: updated });
    }

    const vehicle = {
      technicianId,
      tenantId,
      vehicleRef,
      stockItems,
      updatedAt: new Date().toISOString(),
    };

    await adapter.insertOne(VEHICLES_COL, vehicle);
    logger.info('VehicleStock: initialized', { technicianId, tenantId });
    res.status(201).json({ vehicle });
  } catch (error) {
    logger.error('VehicleStock: init error', { error: error.message });
    res.status(500).json({ error: 'Failed to initialize vehicle stock' });
  }
});

// ── PUT /api/technicians/:id/vehicle-stock/consume ────────────────────────────

router.put('/:id/vehicle-stock/consume', authenticateToken, async (req, res) => {
  try {
    const tenantId     = await resolveTenantId(req.user.id);
    const technicianId = req.params.id;
    const { partId, qty, workOrderId } = req.body;

    if (!partId)       return res.status(400).json({ error: 'partId is required' });
    if (!qty || qty <= 0) return res.status(400).json({ error: 'qty must be a positive number' });

    const adapter = await getAdapter();
    const vehicle = await adapter.findOne(VEHICLES_COL, { technicianId, tenantId });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle stock not found' });

    const stockItems = vehicle.stockItems || [];
    const itemIdx    = stockItems.findIndex(item => item.partId === partId);

    if (itemIdx === -1) {
      return res.status(404).json({ error: `Part ${partId} not found in vehicle stock` });
    }

    const item = stockItems[itemIdx];
    if (item.qty < qty) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${item.qty}, requested: ${qty}` });
    }

    stockItems[itemIdx] = { ...item, qty: item.qty - qty };

    await adapter.updateOne(
      VEHICLES_COL,
      { technicianId, tenantId },
      { stockItems, updatedAt: new Date().toISOString() },
    );

    const remaining  = stockItems[itemIdx].qty;
    const isLowStock = remaining < item.minQty;

    if (isLowStock) {
      const notification = {
        tenantId,
        type:        'low_stock',
        severity:    'warning',
        title:       `Low stock alert: ${item.partName}`,
        message:     `Technician vehicle stock for "${item.partName}" (partId: ${partId}) is below minimum. Current: ${remaining}, Min: ${item.minQty}`,
        technicianId,
        partId,
        partName:    item.partName,
        remaining,
        minQty:      item.minQty,
        workOrderId: workOrderId || null,
        read:        false,
        createdAt:   new Date().toISOString(),
      };

      try {
        await adapter.insertOne(NOTIFICATIONS_COL, notification);
      } catch (_notifErr) {
        // Notifications collection may not exist — log and continue
        logger.warn('VehicleStock: could not insert low-stock notification', {
          partId, technicianId, remaining, minQty: item.minQty,
        });
      }

      logger.warn('VehicleStock: low stock alert', {
        technicianId, partId, remaining, minQty: item.minQty,
      });
    }

    logger.info('VehicleStock: parts consumed', { technicianId, partId, qty, workOrderId });
    res.json({
      message:    'Parts consumed',
      partId,
      consumed:   qty,
      remaining,
      lowStock:   isLowStock,
    });
  } catch (error) {
    logger.error('VehicleStock: consume error', { error: error.message });
    res.status(500).json({ error: 'Failed to consume parts' });
  }
});

// ── PUT /api/technicians/:id/vehicle-stock/restock ────────────────────────────

router.put('/:id/vehicle-stock/restock', authenticateToken, async (req, res) => {
  try {
    const tenantId     = await resolveTenantId(req.user.id);
    const technicianId = req.params.id;
    const { partId, qty } = req.body;

    if (!partId)       return res.status(400).json({ error: 'partId is required' });
    if (!qty || qty <= 0) return res.status(400).json({ error: 'qty must be a positive number' });

    const adapter = await getAdapter();
    const vehicle = await adapter.findOne(VEHICLES_COL, { technicianId, tenantId });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle stock not found' });

    const stockItems = vehicle.stockItems || [];
    const itemIdx    = stockItems.findIndex(item => item.partId === partId);

    if (itemIdx === -1) {
      return res.status(404).json({ error: `Part ${partId} not found in vehicle stock` });
    }

    stockItems[itemIdx] = { ...stockItems[itemIdx], qty: stockItems[itemIdx].qty + qty };

    await adapter.updateOne(
      VEHICLES_COL,
      { technicianId, tenantId },
      { stockItems, updatedAt: new Date().toISOString() },
    );

    logger.info('VehicleStock: parts restocked', { technicianId, partId, qty });
    res.json({
      message:  'Parts restocked',
      partId,
      added:    qty,
      newTotal: stockItems[itemIdx].qty,
    });
  } catch (error) {
    logger.error('VehicleStock: restock error', { error: error.message });
    res.status(500).json({ error: 'Failed to restock parts' });
  }
});

export default router;
