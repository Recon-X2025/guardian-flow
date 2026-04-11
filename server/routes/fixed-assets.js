/**
 * @file server/routes/fixed-assets.js
 * @description Fixed Assets & Depreciation — Sprint 38.
 *
 * Routes
 * ------
 * POST  /api/finance/fixed-assets                       — create asset
 * GET   /api/finance/fixed-assets                       — list assets
 * GET   /api/finance/fixed-assets/:id                   — single asset + depreciation history
 * PUT   /api/finance/fixed-assets/:id                   — update asset
 * POST  /api/finance/fixed-assets/depreciation-run      — run depreciation for period
 * PUT   /api/finance/fixed-assets/:id/dispose           — dispose asset
 * GET   /api/finance/fixed-assets/:id/depreciation-schedule — remaining schedule
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const FA_COL  = 'fixed_assets';
const DEP_COL = 'depreciation_entries';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── POST / ────────────────────────────────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const {
      entityId, assetName, assetClass, acquisitionDate, acquisitionCost,
      depreciationMethod = 'straight_line', usefulLifeMonths, residualValue = 0,
    } = req.body;

    if (!assetName || !acquisitionCost || !usefulLifeMonths) {
      return res.status(400).json({ error: 'assetName, acquisitionCost, and usefulLifeMonths are required' });
    }

    const cost = Number(acquisitionCost);
    const now  = new Date().toISOString();
    const asset = {
      id: randomUUID(),
      tenantId,
      entityId: entityId || null,
      assetName,
      assetClass: assetClass || 'machinery',
      acquisitionDate: acquisitionDate || now,
      acquisitionCost: cost,
      depreciationMethod,
      usefulLifeMonths: Number(usefulLifeMonths),
      residualValue: Number(residualValue),
      bookValue: cost,
      accumulatedDepreciation: 0,
      assetStatus: 'active',
      disposalDate: null,
      disposalProceeds: null,
      createdAt: now,
      updatedAt: now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(FA_COL, asset);
    res.status(201).json({ asset });
  } catch (err) {
    logger.error('FixedAssets: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { status, assetClass } = req.query;
    const filter = { tenantId };
    if (status)     filter.assetStatus = status;
    if (assetClass) filter.assetClass  = assetClass;

    const adapter = await getAdapter();
    const assets  = await adapter.findMany(FA_COL, filter, { limit: 500 });
    res.json({ assets, total: assets.length });
  } catch (err) {
    logger.error('FixedAssets: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

// ── POST /depreciation-run ────────────────────────────────────────────────────
// Must be defined before /:id to avoid route conflict

router.post('/depreciation-run', authenticateToken, async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'period (YYYY-MM) is required' });

    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const assets   = await adapter.findMany(FA_COL, { tenantId, assetStatus: 'active' }, { limit: 1000 });

    let assetsProcessed   = 0;
    let totalDepreciation = 0;

    for (const asset of assets) {
      let monthlyDep = 0;
      const bv = Number(asset.bookValue);
      const rv = Number(asset.residualValue);

      if (asset.depreciationMethod === 'straight_line') {
        monthlyDep = (Number(asset.acquisitionCost) - rv) / Number(asset.usefulLifeMonths);
      } else if (asset.depreciationMethod === 'declining_balance') {
        monthlyDep = (bv * 2) / Number(asset.usefulLifeMonths);
      } else {
        // units_of_production — use straight-line as fallback
        monthlyDep = (Number(asset.acquisitionCost) - rv) / Number(asset.usefulLifeMonths);
      }

      monthlyDep = Math.max(0, Math.min(monthlyDep, bv - rv));
      if (monthlyDep <= 0) continue;

      const newBookValue = Math.max(rv, bv - monthlyDep);
      const newAccumDep  = Number(asset.accumulatedDepreciation) + monthlyDep;
      const newStatus    = newBookValue <= rv ? 'fully_depreciated' : 'active';

      const entry = {
        id: randomUUID(),
        assetId: asset.id,
        tenantId,
        period,
        amount: Math.round(monthlyDep * 100) / 100,
        bookValueAfter: Math.round(newBookValue * 100) / 100,
        journalRef: `DEP-${period}-${asset.id.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
      };

      await adapter.insertOne(DEP_COL, entry);
      await adapter.updateOne(FA_COL, { id: asset.id, tenantId }, {
        $set: {
          bookValue: Math.round(newBookValue * 100) / 100,
          accumulatedDepreciation: Math.round(newAccumDep * 100) / 100,
          assetStatus: newStatus,
          updatedAt: new Date().toISOString(),
        },
      });

      totalDepreciation += monthlyDep;
      assetsProcessed++;
    }

    res.json({
      period,
      assetsProcessed,
      totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    });
  } catch (err) {
    logger.error('FixedAssets: depreciation run error', { error: err.message });
    res.status(500).json({ error: 'Failed to run depreciation' });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(FA_COL, { id: req.params.id, tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const history = await adapter.findMany(DEP_COL, { assetId: asset.id, tenantId }, { limit: 500 });
    res.json({ asset, depreciationHistory: history });
  } catch (err) {
    logger.error('FixedAssets: get error', { error: err.message });
    res.status(500).json({ error: 'Failed to get asset' });
  }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(FA_COL, { id: req.params.id, tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const allowed = ['assetName', 'assetClass', 'depreciationMethod', 'usefulLifeMonths', 'residualValue', 'entityId'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date().toISOString();

    await adapter.updateOne(FA_COL, { id: req.params.id, tenantId }, { $set: updates });
    res.json({ message: 'Asset updated', id: req.params.id });
  } catch (err) {
    logger.error('FixedAssets: update error', { error: err.message });
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// ── PUT /:id/dispose ──────────────────────────────────────────────────────────

router.put('/:id/dispose', authenticateToken, async (req, res) => {
  try {
    const { disposalDate, disposalProceeds = 0 } = req.body;
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(FA_COL, { id: req.params.id, tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const proceeds            = Number(disposalProceeds);
    const bookValueAtDisposal = Number(asset.bookValue);
    const gainLoss            = Math.round((proceeds - bookValueAtDisposal) * 100) / 100;

    await adapter.updateOne(FA_COL, { id: req.params.id, tenantId }, {
      $set: {
        assetStatus: 'disposed',
        disposalDate: disposalDate || new Date().toISOString(),
        disposalProceeds: proceeds,
        updatedAt: new Date().toISOString(),
      },
    });

    res.json({ gainLoss, bookValueAtDisposal });
  } catch (err) {
    logger.error('FixedAssets: dispose error', { error: err.message });
    res.status(500).json({ error: 'Failed to dispose asset' });
  }
});

// ── GET /:id/depreciation-schedule ───────────────────────────────────────────

router.get('/:id/depreciation-schedule', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const asset    = await adapter.findOne(FA_COL, { id: req.params.id, tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const schedule = [];
    let bv = Number(asset.bookValue);
    const rv  = Number(asset.residualValue);
    const ulf = Number(asset.usefulLifeMonths);

    // Determine starting period
    const now  = new Date();
    let year   = now.getFullYear();
    let month  = now.getMonth() + 1;

    for (let i = 0; i < ulf && bv > rv; i++) {
      let charge = 0;
      if (asset.depreciationMethod === 'straight_line') {
        charge = (Number(asset.acquisitionCost) - rv) / ulf;
      } else if (asset.depreciationMethod === 'declining_balance') {
        charge = (bv * 2) / ulf;
      } else {
        charge = (Number(asset.acquisitionCost) - rv) / ulf;
      }
      charge = Math.max(0, Math.min(charge, bv - rv));
      bv -= charge;
      bv = Math.max(rv, bv);

      const period = `${year}-${String(month).padStart(2, '0')}`;
      schedule.push({ period, charge: Math.round(charge * 100) / 100, bookValueAfter: Math.round(bv * 100) / 100 });

      month++;
      if (month > 12) { month = 1; year++; }
      if (bv <= rv) break;
    }

    res.json({ schedule });
  } catch (err) {
    logger.error('FixedAssets: schedule error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate schedule' });
  }
});

export default router;
