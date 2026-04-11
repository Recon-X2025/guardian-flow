/**
 * @file server/routes/territories.js
 * @description Territory Planning API — Sprint 34.
 *
 * Routes
 * ------
 * POST   /api/territories                    — create territory
 * GET    /api/territories                    — list territories for tenant
 * GET    /api/territories/:id                — get single territory
 * PUT    /api/territories/:id                — update territory
 * DELETE /api/territories/:id                — delete territory
 * GET    /api/territories/:id/work-orders    — work orders in territory
 * GET    /api/territories/:id/technicians    — technicians with WO counts
 *
 * Security
 * --------
 * All routes require authentication.
 * Tenant isolation enforced via resolved tenantId.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const TERRITORIES_COL = 'territories';
const WO_COL          = 'work_orders';
const USER_COL        = 'users';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

/**
 * Check if a point [lng, lat] is inside a GeoJSON polygon using ray-casting.
 * @param {number[]} point  [longitude, latitude]
 * @param {number[][]} ring  Array of [lng, lat] pairs (polygon ring)
 */
function pointInRing(point, ring) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Extract a bounding-box string from site_address like "lat,lng" or parse any string.
 * Falls back to null if no usable coordinate.
 */
function extractCoords(siteAddress) {
  if (!siteAddress) return null;
  const match = String(siteAddress).match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (match) return [parseFloat(match[2]), parseFloat(match[1])]; // [lng, lat]
  return null;
}

/**
 * Return true if the work order's site is within the territory polygon.
 * Falls back to true (include all) when coordinates cannot be determined.
 */
function woInTerritory(wo, territory) {
  try {
    const polygon = territory.polygon;
    if (!polygon?.geometry?.coordinates?.[0]) return true; // no geometry → include all

    const ring   = polygon.geometry.coordinates[0];
    const coords = extractCoords(wo.site_address);
    if (!coords) return true; // no address coords → include all (fallback)

    return pointInRing(coords, ring);
  } catch {
    return true;
  }
}

// ── POST /api/territories ─────────────────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, polygon, defaultTechnicianIds, managerIds } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const territory = {
      id:                   randomUUID(),
      tenantId,
      name,
      polygon:              polygon              || null,
      defaultTechnicianIds: defaultTechnicianIds || [],
      managerIds:           managerIds           || [],
      createdAt:            new Date().toISOString(),
      updatedAt:            new Date().toISOString(),
    };

    const adapter = await getAdapter();
    await adapter.insertOne(TERRITORIES_COL, territory);

    logger.info('Territory created', { id: territory.id, tenantId });
    res.status(201).json({ territory });
  } catch (error) {
    logger.error('Territories: create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create territory' });
  }
});

// ── GET /api/territories ──────────────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId  = await resolveTenantId(req.user.id);
    const adapter   = await getAdapter();
    const territories = await adapter.findMany(TERRITORIES_COL, { tenantId });

    res.json({ territories });
  } catch (error) {
    logger.error('Territories: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list territories' });
  }
});

// ── GET /api/territories/:id ──────────────────────────────────────────────────

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId  = await resolveTenantId(req.user.id);
    const adapter   = await getAdapter();
    const territory = await adapter.findOne(TERRITORIES_COL, { id: req.params.id, tenantId });

    if (!territory) return res.status(404).json({ error: 'Territory not found' });
    res.json({ territory });
  } catch (error) {
    logger.error('Territories: get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get territory' });
  }
});

// ── PUT /api/territories/:id ──────────────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    const existing = await adapter.findOne(TERRITORIES_COL, { id: req.params.id, tenantId });
    if (!existing) return res.status(404).json({ error: 'Territory not found' });

    const { name, polygon, defaultTechnicianIds, managerIds } = req.body;

    const updates = {
      ...(name                 !== undefined && { name }),
      ...(polygon              !== undefined && { polygon }),
      ...(defaultTechnicianIds !== undefined && { defaultTechnicianIds }),
      ...(managerIds           !== undefined && { managerIds }),
      updatedAt: new Date().toISOString(),
    };

    await adapter.updateOne(TERRITORIES_COL, { id: req.params.id, tenantId }, { $set: updates });
    const updated = await adapter.findOne(TERRITORIES_COL, { id: req.params.id, tenantId });

    res.json({ territory: updated });
  } catch (error) {
    logger.error('Territories: update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update territory' });
  }
});

// ── DELETE /api/territories/:id ───────────────────────────────────────────────

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    const existing = await adapter.findOne(TERRITORIES_COL, { id: req.params.id, tenantId });
    if (!existing) return res.status(404).json({ error: 'Territory not found' });

    await adapter.deleteOne(TERRITORIES_COL, { id: req.params.id, tenantId });

    res.json({ success: true });
  } catch (error) {
    logger.error('Territories: delete error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete territory' });
  }
});

// ── GET /api/territories/:id/work-orders ──────────────────────────────────────

router.get('/:id/work-orders', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    const territory = await adapter.findOne(TERRITORIES_COL, { id: req.params.id, tenantId });
    if (!territory) return res.status(404).json({ error: 'Territory not found' });

    // Fetch open work orders for tenant
    const allWos = await adapter.findMany(WO_COL, { tenant_id: tenantId, status: 'open' });

    // Filter by territory polygon (or return all if no polygon)
    const workOrders = territory.polygon
      ? allWos.filter(wo => woInTerritory(wo, territory))
      : allWos;

    res.json({ work_orders: workOrders, territory_id: req.params.id });
  } catch (error) {
    logger.error('Territories: work-orders error', { error: error.message });
    res.status(500).json({ error: 'Failed to get work orders for territory' });
  }
});

// ── GET /api/territories/:id/technicians ──────────────────────────────────────

router.get('/:id/technicians', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    const territory = await adapter.findOne(TERRITORIES_COL, { id: req.params.id, tenantId });
    if (!territory) return res.status(404).json({ error: 'Territory not found' });

    const techIds = Array.isArray(territory.defaultTechnicianIds)
      ? territory.defaultTechnicianIds
      : [];

    const technicians = await Promise.all(
      techIds.map(async techId => {
        const user = await adapter.findOne(USER_COL, { id: techId });

        // Count open work orders assigned to this technician in this tenant
        let woCount = 0;
        try {
          const wos = await adapter.findMany(WO_COL, {
            tenant_id:    tenantId,
            assigned_to:  techId,
            status:       'open',
          });
          woCount = wos.length;
        } catch { /* ignore */ }

        return {
          id:      techId,
          name:    user?.full_name || user?.email || 'Unknown',
          email:   user?.email     || null,
          wo_count: woCount,
        };
      })
    );

    res.json({ technicians, territory_id: req.params.id });
  } catch (error) {
    logger.error('Territories: technicians error', { error: error.message });
    res.status(500).json({ error: 'Failed to get technicians for territory' });
  }
});

export default router;
