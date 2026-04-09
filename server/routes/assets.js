/**
 * @file server/routes/assets.js
 * @description Asset Install Base & Parent-Child Hierarchy API — Sprint 13.
 *
 * Routes
 * ------
 * GET    /api/assets                        — list assets for tenant
 * POST   /api/assets                        — create asset
 * GET    /api/assets/:id                    — get single asset
 * PUT    /api/assets/:id                    — update asset
 * DELETE /api/assets/:id                    — delete asset
 * POST   /api/assets/:id/children           — link parent-child relationship
 * GET    /api/assets/:id/tree               — full hierarchy tree
 * POST   /api/assets/:id/service-history    — add service history entry
 * GET    /api/assets/:id/service-history    — list service history
 *
 * Security
 * --------
 * - All routes require authentication.
 * - tenantId sourced from authenticated user profile (never request body).
 * - Strict tenant isolation on every query.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const ASSETS_COL         = 'assets';
const RELATIONS_COL      = 'asset_relationships';
const SERVICE_HISTORY_COL = 'asset_service_history';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── GET /api/assets ───────────────────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { category, status, limit: rawLimit = '50', skip: rawSkip = '0' } = req.query;

    const filter = { tenant_id: tenantId };
    if (category) filter.category = category;
    if (status)   filter.status   = status;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 200);
    const skip  = Math.max(parseInt(rawSkip, 10) || 0, 0);

    const adapter = await getAdapter();
    const assets  = await adapter.findMany(ASSETS_COL, filter, { limit, skip });

    res.json({ assets, limit, skip });
  } catch (error) {
    logger.error('Assets: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

// ── POST /api/assets ──────────────────────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, serial_number, category, install_date, warranty_expiry, status, parent_id, metadata } = req.body;

    if (!name || !serial_number) {
      return res.status(400).json({ error: 'name and serial_number are required' });
    }

    const adapter = await getAdapter();
    const asset = {
      id:              randomUUID(),
      tenant_id:       tenantId,
      name,
      serial_number,
      category:        category        || null,
      install_date:    install_date    || null,
      warranty_expiry: warranty_expiry || null,
      status:          status          || 'active',
      parent_id:       parent_id       || null,
      metadata:        metadata        || {},
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    };

    await adapter.insertOne(ASSETS_COL, asset);
    res.status(201).json({ asset });
  } catch (error) {
    logger.error('Assets: create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// ── GET /api/assets/:id ───────────────────────────────────────────────────────

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    res.json({ asset });
  } catch (error) {
    logger.error('Assets: get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get asset' });
  }
});

// ── PUT /api/assets/:id ───────────────────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const existing = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    const { name, serial_number, category, install_date, warranty_expiry, status, parent_id, metadata } = req.body;

    const updates = {
      ...(name            !== undefined && { name }),
      ...(serial_number   !== undefined && { serial_number }),
      ...(category        !== undefined && { category }),
      ...(install_date    !== undefined && { install_date }),
      ...(warranty_expiry !== undefined && { warranty_expiry }),
      ...(status          !== undefined && { status }),
      ...(parent_id       !== undefined && { parent_id }),
      ...(metadata        !== undefined && { metadata }),
      updated_at: new Date().toISOString(),
    };

    await adapter.updateOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId }, updates);
    const updated = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    res.json({ asset: updated });
  } catch (error) {
    logger.error('Assets: update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// ── DELETE /api/assets/:id ────────────────────────────────────────────────────

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const existing = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    await adapter.deleteOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Assets: delete error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ── POST /api/assets/:id/children ─────────────────────────────────────────────

router.post('/:id/children', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { child_id } = req.body;

    if (!child_id) return res.status(400).json({ error: 'child_id is required' });

    const adapter = await getAdapter();
    const parent  = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });
    const child   = await adapter.findOne(ASSETS_COL, { id: child_id,      tenant_id: tenantId });

    if (!parent) return res.status(404).json({ error: 'Parent asset not found' });
    if (!child)  return res.status(404).json({ error: 'Child asset not found' });
    if (req.params.id === child_id) {
      return res.status(400).json({ error: 'An asset cannot be its own child' });
    }

    const existing = await adapter.findOne(RELATIONS_COL, {
      tenant_id: tenantId,
      parent_id: req.params.id,
      child_id,
    });
    if (existing) return res.status(409).json({ error: 'Relationship already exists' });

    const relationship = {
      id:        randomUUID(),
      tenant_id: tenantId,
      parent_id: req.params.id,
      child_id,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne(RELATIONS_COL, relationship);

    // Also update parent_id on the child asset for convenience
    await adapter.updateOne(ASSETS_COL, { id: child_id, tenant_id: tenantId }, {
      parent_id:  req.params.id,
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({ relationship });
  } catch (error) {
    logger.error('Assets: link children error', { error: error.message });
    res.status(500).json({ error: 'Failed to link child asset' });
  }
});

// ── GET /api/assets/:id/tree ──────────────────────────────────────────────────

router.get('/:id/tree', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const root     = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!root) return res.status(404).json({ error: 'Asset not found' });

    // Load all tenant assets once, then build tree in memory
    const allAssets = await adapter.findMany(ASSETS_COL, { tenant_id: tenantId });
    const assetMap  = new Map(allAssets.map(a => [a.id, { ...a, children: [] }]));

    function buildTree(nodeId) {
      const node = assetMap.get(nodeId);
      if (!node) return null;
      const children = allAssets
        .filter(a => a.parent_id === nodeId)
        .map(a => buildTree(a.id))
        .filter(Boolean);
      return { ...node, children };
    }

    const tree = buildTree(req.params.id);
    res.json({ tree });
  } catch (error) {
    logger.error('Assets: tree error', { error: error.message });
    res.status(500).json({ error: 'Failed to build asset tree' });
  }
});

// ── POST /api/assets/:id/service-history ──────────────────────────────────────

router.post('/:id/service-history', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const { date, type, description, technician_id, cost, next_service_date } = req.body;
    if (!date || !type) return res.status(400).json({ error: 'date and type are required' });

    const entry = {
      id:               randomUUID(),
      tenant_id:        tenantId,
      asset_id:         req.params.id,
      date,
      type,
      description:      description      || null,
      technician_id:    technician_id    || null,
      cost:             cost             ?? null,
      next_service_date: next_service_date || null,
      created_by:       req.user.id,
      created_at:       new Date().toISOString(),
    };

    await adapter.insertOne(SERVICE_HISTORY_COL, entry);
    res.status(201).json({ entry });
  } catch (error) {
    logger.error('Assets: service-history create error', { error: error.message });
    res.status(500).json({ error: 'Failed to add service history entry' });
  }
});

// ── GET /api/assets/:id/service-history ───────────────────────────────────────

router.get('/:id/service-history', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(ASSETS_COL, { id: req.params.id, tenant_id: tenantId });

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const skip  = Math.max(parseInt(req.query.skip  || '0',  10), 0);

    const entries = await adapter.findMany(
      SERVICE_HISTORY_COL,
      { tenant_id: tenantId, asset_id: req.params.id },
      { limit, skip },
    );

    res.json({ entries, limit, skip });
  } catch (error) {
    logger.error('Assets: service-history list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list service history' });
  }
});

export default router;
