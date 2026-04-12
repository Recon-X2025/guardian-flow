/**
 * @file server/routes/intercompany.js
 * @description Intercompany Consolidation — Sprint 38.
 *
 * Routes
 * ------
 * POST /api/finance/intercompany/transactions   — record IC transaction (tenant_admin only)
 * GET  /api/finance/intercompany/transactions   — list IC transactions
 * POST /api/finance/consolidation/run           — consolidated P&L with IC eliminations
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const IC_COL = 'intercompany_transactions';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function hasRole(user, ...roles) {
  const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
  return userRoles.some(r => roles.includes(r));
}

// ── POST /intercompany/transactions ───────────────────────────────────────────

router.post('/intercompany/transactions', authenticateToken, async (req, res) => {
  try {
    if (!hasRole(req.user, 'tenant_admin', 'sys_admin', 'finance_manager')) {
      return res.status(403).json({ error: 'Requires tenant_admin role' });
    }

    const tenantId = await resolveTenantId(req.user.id);
    const { fromEntityId, toEntityId, toTenantId, transactionType, amount, currency = 'USD', description, period } = req.body;

    if (!fromEntityId || !toEntityId || !transactionType || !amount || !period) {
      return res.status(400).json({ error: 'fromEntityId, toEntityId, transactionType, amount, and period are required' });
    }

    const now = new Date().toISOString();
    const tx = {
      id: randomUUID(),
      fromEntityId,
      fromTenantId: tenantId,
      toEntityId,
      toTenantId: toTenantId || tenantId,
      transactionType,
      amount: Number(amount),
      currency,
      description: description || null,
      period,
      eliminationStatus: 'pending',
      createdAt: now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(IC_COL, tx);
    res.status(201).json({ transaction: tx });
  } catch (err) {
    logger.error('IC: create transaction error', { error: err.message });
    res.status(500).json({ error: 'Failed to create IC transaction' });
  }
});

// ── GET /intercompany/transactions ────────────────────────────────────────────

router.get('/intercompany/transactions', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period, entityId } = req.query;
    const filter = { fromTenantId: tenantId };
    if (period)   filter.period       = period;
    if (entityId) filter.fromEntityId = entityId;

    const adapter      = await getAdapter();
    const transactions = await adapter.findMany(IC_COL, filter, { limit: 500 });
    res.json({ transactions, total: transactions.length });
  } catch (err) {
    logger.error('IC: list transactions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list IC transactions' });
  }
});

// ── POST /consolidation/run ───────────────────────────────────────────────────

router.post('/consolidation/run', authenticateToken, async (req, res) => {
  try {
    const { period, entityIds = [] } = req.body;
    if (!period) return res.status(400).json({ error: 'period is required' });

    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    // Gather ledger entries for the period across entities
    let consolidatedRevenue = 0;
    let consolidatedCosts   = 0;
    const entities = [];

    for (const entityId of entityIds) {
      const entries = await adapter.findMany('journal_entries', { tenantId, entityId, period }, { limit: 2000 });
      let revenue = 0;
      let costs   = 0;
      for (const e of entries) {
        if (e.accountType === 'revenue') revenue += Number(e.amount || 0);
        if (e.accountType === 'expense') costs   += Number(e.amount || 0);
      }
      entities.push({ entityId, revenue: Math.round(revenue * 100) / 100, costs: Math.round(costs * 100) / 100 });
      consolidatedRevenue += revenue;
      consolidatedCosts   += costs;
    }

    // IC eliminations for the period
    const icFilter = { fromTenantId: tenantId, period };
    if (entityIds.length > 0) icFilter.fromEntityId = entityIds;
    const icTxs = await adapter.findMany(IC_COL, { fromTenantId: tenantId, period }, { limit: 1000 });
    const relevantIc = entityIds.length > 0
      ? icTxs.filter(t => entityIds.includes(t.fromEntityId) || entityIds.includes(t.toEntityId))
      : icTxs;

    let icEliminationTotal = 0;
    const icEliminations = relevantIc.map(t => {
      icEliminationTotal += Number(t.amount);
      return { txId: t.id, amount: t.amount };
    });

    // Mark as eliminated
    for (const t of relevantIc) {
      await adapter.updateOne(IC_COL, { id: t.id }, { $set: { eliminationStatus: 'eliminated' } });
    }

    consolidatedRevenue -= icEliminationTotal;
    const consolidatedPL = Math.round((consolidatedRevenue - consolidatedCosts) * 100) / 100;

    res.json({
      period,
      entities,
      consolidatedRevenue: Math.round(consolidatedRevenue * 100) / 100,
      consolidatedCosts:   Math.round(consolidatedCosts   * 100) / 100,
      consolidatedPL,
      icEliminations,
    });
  } catch (err) {
    logger.error('IC: consolidation run error', { error: err.message });
    res.status(500).json({ error: 'Failed to run consolidation' });
  }
});

export default router;
