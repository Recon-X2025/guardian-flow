/**
 * @file server/routes/revenue.js
 * @description Revenue Recognition routes — ASC 606 / IFRS 15 compliant.
 *
 * Entities
 * ─────────
 *  revenue_contracts     — master contract (customer, total value, term dates)
 *  revenue_pobs          — performance obligations within a contract
 *  revenue_schedules     — amortised recognition schedule (one row per period)
 *  revenue_journal_lines — committed journal lines once a period is recognised
 *
 * Key Endpoints
 * ─────────────
 *  POST   /api/revenue/contracts              — create contract + split into POBs
 *  GET    /api/revenue/contracts              — list contracts (tenant-scoped)
 *  GET    /api/revenue/contracts/:id          — single contract with POBs + schedule
 *  PUT    /api/revenue/contracts/:id          — update contract metadata
 *  POST   /api/revenue/contracts/:id/pobs     — add a performance obligation
 *  PUT    /api/revenue/pobs/:id               — update standalone selling price / % allocation
 *  POST   /api/revenue/contracts/:id/recognise — run period-end recognition for a contract
 *  GET    /api/revenue/dashboard              — tenant-wide recognition dashboard
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

// ── Helpers ──────────────────────────────────────────────────────────────────

function tenantId(req) {
  return req.user?.tenantId ?? req.user?.tenant_id ?? req.user?.id;
}

/**
 * Allocate contract price to POBs using relative standalone selling prices (SSP).
 * Returns the same POBs array with `allocated_amount` filled in.
 */
function allocateTransactionPrice(totalAmount, pobs) {
  const totalSSP = pobs.reduce((s, p) => s + (p.standalone_selling_price ?? 0), 0);
  if (totalSSP === 0) {
    // Fallback: equal allocation
    const equal = totalAmount / pobs.length;
    return pobs.map(p => ({ ...p, allocated_amount: Math.round(equal * 100) / 100 }));
  }
  let remaining = totalAmount;
  return pobs.map((p, i) => {
    const isLast = i === pobs.length - 1;
    const allocated = isLast
      ? Math.round(remaining * 100) / 100
      : Math.round((totalAmount * (p.standalone_selling_price / totalSSP)) * 100) / 100;
    remaining -= allocated;
    return { ...p, allocated_amount: allocated };
  });
}

/**
 * Build monthly recognition schedule for a POB.
 * For service POBs uses straight-line over the term.
 * For point-in-time POBs (delivery_type === 'point') recognises 100% on delivery_date.
 */
function buildSchedule(contractId, pobId, pob, tenantId) {
  const rows = [];
  const allocated = pob.allocated_amount ?? 0;

  if (pob.delivery_type === 'point') {
    rows.push({
      id: randomUUID(),
      tenant_id: tenantId,
      contract_id: contractId,
      pob_id: pobId,
      period: pob.delivery_date ? pob.delivery_date.slice(0, 7) : new Date().toISOString().slice(0, 7),
      amount: allocated,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    return rows;
  }

  // Straight-line over-time
  const start = new Date(pob.start_date ?? new Date().toISOString().slice(0, 10));
  const end   = new Date(pob.end_date   ?? start);
  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const months = Math.max(monthsDiff, 1);
  const perMonth = Math.round((allocated / months) * 100) / 100;
  let remainingAmt = allocated;

  for (let m = 0; m < months; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const period = d.toISOString().slice(0, 7); // YYYY-MM
    const isLast = m === months - 1;
    const amount = isLast ? Math.round(remainingAmt * 100) / 100 : perMonth;
    remainingAmt -= amount;
    rows.push({
      id: randomUUID(),
      tenant_id: tenantId,
      contract_id: contractId,
      pob_id: pobId,
      period,
      amount,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }
  return rows;
}

// ── POST /api/revenue/contracts ──────────────────────────────────────────────

router.post('/contracts', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const {
      customer_id, customer_name, description, contract_date, currency = 'USD',
      total_amount, performance_obligations = [],
    } = req.body;

    if (!total_amount || total_amount <= 0) {
      return res.status(400).json({ error: 'total_amount must be a positive number' });
    }
    if (!performance_obligations.length) {
      return res.status(400).json({ error: 'At least one performance obligation is required' });
    }

    const contractId = randomUUID();
    const now = new Date().toISOString();

    // Allocate transaction price
    const allocatedPobs = allocateTransactionPrice(total_amount, performance_obligations);

    // Build and insert POBs + schedules
    const insertedPobs = [];
    for (const pob of allocatedPobs) {
      const pobId = randomUUID();
      const pobDoc = {
        id: pobId,
        tenant_id: tid,
        contract_id: contractId,
        description: pob.description,
        delivery_type: pob.delivery_type ?? 'over_time', // 'over_time' | 'point'
        standalone_selling_price: pob.standalone_selling_price ?? 0,
        allocated_amount: pob.allocated_amount,
        start_date: pob.start_date ?? null,
        end_date: pob.end_date ?? null,
        delivery_date: pob.delivery_date ?? null,
        recognised_amount: 0,
        status: 'pending',
        created_at: now,
        updated_at: now,
      };
      await adapter.insertOne('revenue_pobs', pobDoc);

      const scheduleRows = buildSchedule(contractId, pobId, pobDoc, tid);
      for (const row of scheduleRows) {
        await adapter.insertOne('revenue_schedules', row);
      }
      insertedPobs.push(pobDoc);
    }

    const contract = {
      id: contractId,
      tenant_id: tid,
      customer_id: customer_id ?? null,
      customer_name: customer_name ?? null,
      description: description ?? null,
      contract_date: contract_date ?? now.slice(0, 10),
      currency,
      total_amount,
      recognised_amount: 0,
      deferred_amount: total_amount,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    await adapter.insertOne('revenue_contracts', contract);

    logger.info('revenue: contract created', { contractId, tenantId: tid, total_amount });
    res.status(201).json({ contract, performance_obligations: insertedPobs });
  } catch (err) {
    logger.error('revenue: create contract error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/revenue/contracts ───────────────────────────────────────────────

router.get('/contracts', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const { status, limit = 50, offset = 0 } = req.query;
    const filter = { tenant_id: tid };
    if (status) filter.status = status;
    const contracts = await adapter.findMany('revenue_contracts', filter, {
      limit: parseInt(limit),
      skip: parseInt(offset),
      sort: { contract_date: -1 },
    });
    res.json({ contracts, total: contracts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/revenue/contracts/:id ───────────────────────────────────────────

router.get('/contracts/:id', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const contract = await adapter.findOne('revenue_contracts', { id: req.params.id, tenant_id: tid });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    const pobs = await adapter.findMany('revenue_pobs', { contract_id: req.params.id, tenant_id: tid });
    const schedules = await adapter.findMany('revenue_schedules', { contract_id: req.params.id, tenant_id: tid });
    res.json({ contract, performance_obligations: pobs, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/revenue/contracts/:id ───────────────────────────────────────────

router.put('/contracts/:id', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const existing = await adapter.findOne('revenue_contracts', { id: req.params.id, tenant_id: tid });
    if (!existing) return res.status(404).json({ error: 'Contract not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('revenue_contracts', { id: req.params.id }, updates);
    res.json({ contract: { ...existing, ...updates } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/revenue/contracts/:id/pobs ─────────────────────────────────────

router.post('/contracts/:id/pobs', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const contract = await adapter.findOne('revenue_contracts', { id: req.params.id, tenant_id: tid });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const pobId = randomUUID();
    const now = new Date().toISOString();
    const { description, delivery_type = 'over_time', standalone_selling_price = 0,
            allocated_amount, start_date, end_date, delivery_date } = req.body;

    const pobDoc = {
      id: pobId, tenant_id: tid, contract_id: req.params.id,
      description, delivery_type, standalone_selling_price,
      allocated_amount: allocated_amount ?? 0,
      start_date: start_date ?? null, end_date: end_date ?? null,
      delivery_date: delivery_date ?? null, recognised_amount: 0, status: 'pending',
      created_at: now, updated_at: now,
    };
    await adapter.insertOne('revenue_pobs', pobDoc);

    const scheduleRows = buildSchedule(req.params.id, pobId, pobDoc, tid);
    for (const row of scheduleRows) {
      await adapter.insertOne('revenue_schedules', row);
    }

    res.status(201).json({ pob: pobDoc, schedules: scheduleRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/revenue/pobs/:id ────────────────────────────────────────────────

router.put('/pobs/:id', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const existing = await adapter.findOne('revenue_pobs', { id: req.params.id, tenant_id: tid });
    if (!existing) return res.status(404).json({ error: 'POB not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('revenue_pobs', { id: req.params.id }, updates);
    res.json({ pob: { ...existing, ...updates } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/revenue/contracts/:id/recognise ────────────────────────────────

router.post('/contracts/:id/recognise', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const contract = await adapter.findOne('revenue_contracts', { id: req.params.id, tenant_id: tid });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const { period } = req.body; // e.g. "2026-04"
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'period must be YYYY-MM format' });
    }

    // Find all pending schedule rows for this period
    const rows = await adapter.findMany('revenue_schedules', {
      contract_id: req.params.id, tenant_id: tid, period, status: 'pending',
    });
    if (rows.length === 0) {
      return res.json({ recognised: [], total_recognised: 0, message: 'No pending rows for this period' });
    }

    const now = new Date().toISOString();
    const journalLines = [];
    let totalRecognised = 0;

    for (const row of rows) {
      // Recognise the row
      await adapter.updateOne('revenue_schedules', { id: row.id }, {
        status: 'recognised', recognised_at: now,
      });

      // Update POB recognised amount
      const pob = await adapter.findOne('revenue_pobs', { id: row.pob_id, tenant_id: tid });
      if (pob) {
        await adapter.updateOne('revenue_pobs', { id: row.pob_id }, {
          recognised_amount: (pob.recognised_amount ?? 0) + row.amount,
          updated_at: now,
        });
      }

      // Write journal lines
      const drLine = {
        id: randomUUID(), tenant_id: tid, contract_id: req.params.id, pob_id: row.pob_id,
        schedule_id: row.id, period, account_type: 'deferred_revenue',
        direction: 'debit', amount: row.amount, currency: contract.currency ?? 'USD',
        recognised_at: now,
      };
      const crLine = {
        id: randomUUID(), tenant_id: tid, contract_id: req.params.id, pob_id: row.pob_id,
        schedule_id: row.id, period, account_type: 'revenue',
        direction: 'credit', amount: row.amount, currency: contract.currency ?? 'USD',
        recognised_at: now,
      };
      await adapter.insertOne('revenue_journal_lines', drLine);
      await adapter.insertOne('revenue_journal_lines', crLine);
      journalLines.push(drLine, crLine);
      totalRecognised += row.amount;
    }

    // Update contract totals
    await adapter.updateOne('revenue_contracts', { id: req.params.id }, {
      recognised_amount: (contract.recognised_amount ?? 0) + totalRecognised,
      deferred_amount: Math.max(0, (contract.deferred_amount ?? 0) - totalRecognised),
      updated_at: now,
    });

    logger.info('revenue: period recognised', { contractId: req.params.id, period, totalRecognised });
    res.json({ recognised: rows, journal_lines: journalLines, total_recognised: totalRecognised });
  } catch (err) {
    logger.error('revenue: recognise error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/revenue/dashboard ───────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const contracts = await adapter.findMany('revenue_contracts', { tenant_id: tid });
    const totalContractValue   = contracts.reduce((s, c) => s + (c.total_amount ?? 0), 0);
    const totalRecognised      = contracts.reduce((s, c) => s + (c.recognised_amount ?? 0), 0);
    const totalDeferred        = contracts.reduce((s, c) => s + (c.deferred_amount ?? 0), 0);
    const activeContracts      = contracts.filter(c => c.status === 'active').length;

    // Schedules for current month
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const duePeriod = await adapter.findMany('revenue_schedules', {
      tenant_id: tid, period: currentPeriod, status: 'pending',
    });
    const dueThisPeriod = duePeriod.reduce((s, r) => s + (r.amount ?? 0), 0);

    res.json({
      total_contract_value: totalContractValue,
      total_recognised: totalRecognised,
      total_deferred: totalDeferred,
      active_contracts: activeContracts,
      recognition_rate: totalContractValue > 0
        ? Math.round((totalRecognised / totalContractValue) * 10000) / 100
        : 0,
      due_this_period: dueThisPeriod,
      current_period: currentPeriod,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
