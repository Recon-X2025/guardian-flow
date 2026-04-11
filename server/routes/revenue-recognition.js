/**
 * @file server/routes/revenue-recognition.js
 * @description Revenue Recognition engine — ASC 606 / IFRS 15 compliance.
 *
 * Original routes (Sprint 29):
 *   GET  /contracts               — list contracts (rev_rec_contracts)
 *   POST /contracts               — create contract (rev_rec_contracts)
 *   POST /contracts/:id/recognize — recognize revenue for a period
 *   GET  /contracts/:id/schedule  — list recognition schedule entries
 *   GET  /summary                 — recognized/deferred totals
 *
 * Sprint 37 additions (revenue_contracts / revenue_schedules collections):
 *   POST /asc606/contracts                         — create ASC 606 contract with SSP allocation
 *   GET  /asc606/contracts                         — list ASC 606 contracts
 *   GET  /asc606/contracts/:id                     — get contract with obligations
 *   POST /asc606/contracts/:id/recognize           — recognize obligations for a period
 *   GET  /asc606/contracts/:id/waterfall           — period-by-period waterfall schedule
 *   GET  /asc606/reports/disclosure                — ASC 606 disclosure report
 */

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

router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const contracts = await adapter.findMany('rev_rec_contracts', { tenant_id: tenantId }, { limit: 50 });
    res.json({ contracts });
  } catch (err) {
    logger.error('Rev rec contracts list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/contracts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { customer_id, total_value, obligations, start_date, end_date } = req.body;
    if (!customer_id || !total_value || !obligations) {
      return res.status(400).json({ error: 'customer_id, total_value, and obligations are required' });
    }
    const adapter = await getAdapter();
    const contract = {
      id: randomUUID(),
      tenant_id: tenantId,
      customer_id,
      total_value,
      obligations,
      start_date,
      end_date,
      recognized_amount: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('rev_rec_contracts', contract);
    res.status(201).json({ contract });
  } catch (err) {
    logger.error('Rev rec contract create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/contracts/:id/recognize', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period_start, period_end } = req.body;
    const adapter = await getAdapter();
    const contract = await adapter.findOne('rev_rec_contracts', { id: req.params.id, tenant_id: tenantId });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    const contractStart = new Date(contract.start_date).getTime();
    const contractEnd = new Date(contract.end_date).getTime();
    const totalDays = (contractEnd - contractStart) / 86400000;
    const periodStartMs = new Date(period_start).getTime();
    const periodEndMs = new Date(period_end).getTime();
    const periodDays = Math.min(periodEndMs, contractEnd) - Math.max(periodStartMs, contractStart);
    const periodDaysClamped = Math.max(0, periodDays / 86400000);
    const recognizedAmount = totalDays > 0 ? (periodDaysClamped / totalDays) * contract.total_value : 0;
    const schedule = {
      id: randomUUID(),
      tenant_id: tenantId,
      contract_id: contract.id,
      period_start,
      period_end,
      recognized_amount: Math.round(recognizedAmount * 100) / 100,
      deferred_amount: Math.round((contract.total_value - recognizedAmount) * 100) / 100,
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('rev_rec_schedules', schedule);
    res.json({ schedule });
  } catch (err) {
    logger.error('Rev rec recognize error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/contracts/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const schedules = await adapter.findMany('rev_rec_schedules', { tenant_id: tenantId, contract_id: req.params.id }, { limit: 100 });
    res.json({ schedules });
  } catch (err) {
    logger.error('Rev rec schedule error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const schedules = await adapter.findMany('rev_rec_schedules', { tenant_id: tenantId }, { limit: 500 });
    const recognized = schedules.reduce((s, r) => s + (r.recognized_amount || 0), 0);
    const deferred = schedules.reduce((s, r) => s + (r.deferred_amount || 0), 0);
    res.json({ recognized: Math.round(recognized * 100) / 100, deferred: Math.round(deferred * 100) / 100, entries: schedules.length });
  } catch (err) {
    logger.error('Rev rec summary error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 37 — ASC 606 / IFRS 15 routes (revenue_contracts collection)
// ═══════════════════════════════════════════════════════════════════════════

const RC_COL  = 'revenue_contracts';
const RS_COL  = 'revenue_schedules';

// ── POST /asc606/contracts ────────────────────────────────────────────────────
// Create a revenue contract; auto-allocate transaction price via SSP ratio.

router.post('/asc606/contracts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const {
      customerId, contractNo, contractDate,
      performanceObligations = [],
      transactionPrice, currency = 'USD',
      allocationMethod = 'ssa',
    } = req.body;

    if (!customerId || !transactionPrice || !performanceObligations.length) {
      return res.status(400).json({ error: 'customerId, transactionPrice, and performanceObligations are required' });
    }

    const totalSSP = performanceObligations.reduce((s, o) => s + Number(o.ssp || 0), 0);
    const allocated = performanceObligations.map(o => ({
      id:              o.id || randomUUID(),
      description:     o.description || '',
      ssp:             Number(o.ssp || 0),
      allocatedAmount: totalSSP > 0
        ? Math.round((Number(o.ssp || 0) / totalSSP) * Number(transactionPrice) * 100) / 100
        : 0,
      status:          'open',
      satisfiedDate:   null,
    }));

    const now      = new Date().toISOString();
    const contract = {
      id:                    randomUUID(),
      tenantId,
      customerId,
      contractNo:            contractNo    || `CTR-${Date.now()}`,
      contractDate:          contractDate  || now,
      performanceObligations: allocated,
      transactionPrice:      Number(transactionPrice),
      currency,
      allocationMethod,
      status:                'active',
      createdAt:             now,
      updatedAt:             now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(RC_COL, contract);
    res.status(201).json({ contract });
  } catch (err) {
    logger.error('ASC606: create contract error', { error: err.message });
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// ── GET /asc606/contracts ─────────────────────────────────────────────────────

router.get('/asc606/contracts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const contracts = await adapter.findMany(RC_COL, { tenantId }, { limit: 100 });
    res.json({ contracts });
  } catch (err) {
    logger.error('ASC606: list contracts error', { error: err.message });
    res.status(500).json({ error: 'Failed to list contracts' });
  }
});

// ── GET /asc606/contracts/:id ─────────────────────────────────────────────────

router.get('/asc606/contracts/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const contract = await adapter.findOne(RC_COL, { id: req.params.id, tenantId });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json({ contract });
  } catch (err) {
    logger.error('ASC606: get contract error', { error: err.message });
    res.status(500).json({ error: 'Failed to get contract' });
  }
});

// ── POST /asc606/contracts/:id/recognize ──────────────────────────────────────
// Body: { period: 'YYYY-MM', obligationIds: [...] }

router.post('/asc606/contracts/:id/recognize', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period, obligationIds = [] } = req.body;
    if (!period) return res.status(400).json({ error: 'period (YYYY-MM) is required' });

    const adapter  = await getAdapter();
    const contract = await adapter.findOne(RC_COL, { id: req.params.id, tenantId });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const recognized = [];
    const now        = new Date().toISOString();

    const updatedObligations = contract.performanceObligations.map(ob => {
      if (obligationIds.length && !obligationIds.includes(ob.id)) return ob;
      if (ob.status === 'satisfied') return ob;

      recognized.push({ obligationId: ob.id, amount: ob.allocatedAmount, period });
      return { ...ob, status: 'satisfied', satisfiedDate: now };
    });

    // Persist revenue_schedule entries
    for (const r of recognized) {
      const existing = await adapter.findOne(RS_COL, { contractId: contract.id, obligationId: r.obligationId, period });
      if (!existing) {
        await adapter.insertOne(RS_COL, {
          id:              randomUUID(),
          contractId:      contract.id,
          obligationId:    r.obligationId,
          tenantId,
          period,
          amount:          r.amount,
          recognized:      true,
          journalEntryRef: null,
          createdAt:       now,
        });
      }
    }

    // Update contract obligations + status
    const allSatisfied = updatedObligations.every(o => o.status === 'satisfied');
    await adapter.updateOne(RC_COL, { id: contract.id, tenantId }, {
      $set: {
        performanceObligations: updatedObligations,
        status:    allSatisfied ? 'completed' : contract.status,
        updatedAt: now,
      },
    });

    res.json({ recognized });
  } catch (err) {
    logger.error('ASC606: recognize error', { error: err.message });
    res.status(500).json({ error: 'Failed to recognize revenue' });
  }
});

// ── GET /asc606/contracts/:id/waterfall ───────────────────────────────────────

router.get('/asc606/contracts/:id/waterfall', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const contract = await adapter.findOne(RC_COL, { id: req.params.id, tenantId });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const schedules = await adapter.findMany(RS_COL, { contractId: contract.id, tenantId }, { limit: 200 });

    // Build period map
    const periodMap = {};
    for (const s of schedules) {
      if (!periodMap[s.period]) periodMap[s.period] = { amount: 0, recognized: false };
      periodMap[s.period].amount     += Number(s.amount || 0);
      periodMap[s.period].recognized  = periodMap[s.period].recognized || s.recognized;
    }

    const periods = Object.keys(periodMap).sort().map(p => ({
      period:     p,
      amount:     Math.round(periodMap[p].amount * 100) / 100,
      recognized: periodMap[p].recognized,
    }));

    // Add cumulative
    let cumulative = 0;
    for (const p of periods) {
      cumulative    += p.amount;
      p.cumulativeAmount = Math.round(cumulative * 100) / 100;
    }

    res.json({ contractId: contract.id, transactionPrice: contract.transactionPrice, periods });
  } catch (err) {
    logger.error('ASC606: waterfall error', { error: err.message });
    res.status(500).json({ error: 'Failed to build waterfall' });
  }
});

// ── GET /asc606/reports/disclosure ───────────────────────────────────────────

router.get('/asc606/reports/disclosure', authenticateToken, async (req, res) => {
  try {
    const tenantId  = await resolveTenantId(req.user.id);
    const adapter   = await getAdapter();
    const contracts = await adapter.findMany(RC_COL, { tenantId, status: 'active' }, { limit: 500 });
    const schedules = await adapter.findMany(RS_COL, { tenantId }, { limit: 2000 });

    let contractAssets      = 0;
    let contractLiabilities = 0;
    const remainingPerformanceObligations = [];

    for (const c of contracts) {
      const contractSchedules = schedules.filter(s => s.contractId === c.id);
      const recognizedTotal   = contractSchedules.reduce((s, e) => s + (e.recognized ? Number(e.amount || 0) : 0), 0);

      if (recognizedTotal > c.transactionPrice) {
        contractAssets += recognizedTotal - c.transactionPrice;
      } else if (recognizedTotal < c.transactionPrice) {
        contractLiabilities += c.transactionPrice - recognizedTotal;
      }

      for (const ob of (c.performanceObligations || [])) {
        if (ob.status !== 'satisfied') {
          remainingPerformanceObligations.push({
            contractId:   c.id,
            contractNo:   c.contractNo,
            obligationId: ob.id,
            description:  ob.description,
            amount:       ob.allocatedAmount,
          });
        }
      }
    }

    res.json({
      contractAssets:                  Math.round(contractAssets * 100) / 100,
      contractLiabilities:             Math.round(contractLiabilities * 100) / 100,
      remainingPerformanceObligations,
    });
  } catch (err) {
    logger.error('ASC606: disclosure report error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate disclosure report' });
  }
});

export default router;
