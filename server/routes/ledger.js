/**
 * @file server/routes/ledger.js
 * @description General Ledger API — Chart of Accounts, Journal Entries, Trial Balance, Periods.
 *
 * Routes
 * ------
 * GET    /api/ledger/accounts            — list chart of accounts for tenant
 * POST   /api/ledger/accounts            — create account
 * GET    /api/ledger/accounts/:id        — get single account
 * PUT    /api/ledger/accounts/:id        — update account
 * DELETE /api/ledger/accounts/:id        — delete account
 *
 * POST   /api/ledger/entries             — post journal entry (must be balanced)
 * GET    /api/ledger/entries             — list journal entries
 *
 * GET    /api/ledger/trial-balance       — trial balance (debits vs credits per account)
 *
 * GET    /api/ledger/periods             — list accounting periods
 * POST   /api/ledger/periods             — create accounting period
 *
 * Security
 * --------
 * - All routes require authentication (applied by server.js middleware).
 * - Tenant isolation is enforced via tenant_id from req.user.tenantId.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const VALID_ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];

// ── Chart of Accounts ─────────────────────────────────────────────────────────

router.get('/accounts', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const accounts = await adapter.findMany('chart_of_accounts', {
      tenant_id: req.user.tenantId,
    });
    res.json({ accounts, total: accounts.length });
  } catch (error) {
    logger.error('Ledger: list accounts error', { error: error.message });
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const { account_code, name, account_type, description, parent_account_id } = req.body;

    if (!account_code || !name || !account_type) {
      return res.status(400).json({ error: 'account_code, name, and account_type are required' });
    }
    if (!VALID_ACCOUNT_TYPES.includes(account_type)) {
      return res.status(400).json({
        error: `account_type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`,
      });
    }

    const adapter = await getAdapter();

    const existing = await adapter.findOne('chart_of_accounts', {
      tenant_id: req.user.tenantId,
      account_code,
    });
    if (existing) {
      return res.status(409).json({ error: 'Account code already exists for this tenant' });
    }

    const account = {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      account_code,
      name,
      account_type,
      description: description ?? null,
      parent_account_id: parent_account_id ?? null,
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await adapter.insertOne('chart_of_accounts', account);
    res.status(201).json({ account });
  } catch (error) {
    logger.error('Ledger: create account error', { error: error.message });
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const account = await adapter.findOne('chart_of_accounts', {
      id: req.params.id,
      tenant_id: req.user.tenantId,
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account });
  } catch (error) {
    logger.error('Ledger: get account error', { error: error.message });
    res.status(500).json({ error: 'Failed to get account' });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const { name, account_type, description, parent_account_id } = req.body;

    if (account_type && !VALID_ACCOUNT_TYPES.includes(account_type)) {
      return res.status(400).json({
        error: `account_type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`,
      });
    }

    const adapter = await getAdapter();
    const account = await adapter.findOne('chart_of_accounts', {
      id: req.params.id,
      tenant_id: req.user.tenantId,
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined)              updates.name = name;
    if (account_type !== undefined)      updates.account_type = account_type;
    if (description !== undefined)       updates.description = description;
    if (parent_account_id !== undefined) updates.parent_account_id = parent_account_id;

    await adapter.updateOne(
      'chart_of_accounts',
      { id: req.params.id, tenant_id: req.user.tenantId },
      updates,
    );

    res.json({ account: { ...account, ...updates } });
  } catch (error) {
    logger.error('Ledger: update account error', { error: error.message });
    res.status(500).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const account = await adapter.findOne('chart_of_accounts', {
      id: req.params.id,
      tenant_id: req.user.tenantId,
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    await adapter.deleteOne('chart_of_accounts', {
      id: req.params.id,
      tenant_id: req.user.tenantId,
    });
    res.json({ deleted: true });
  } catch (error) {
    logger.error('Ledger: delete account error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ── Journal Entries ───────────────────────────────────────────────────────────

router.post('/entries', async (req, res) => {
  try {
    const { description, period_id, lines, reference, date } = req.body;

    if (!description || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({
        error: 'description and at least two lines (debit + credit) are required',
      });
    }

    // Validate each line has required fields
    for (const line of lines) {
      if (!line.account_id || (line.debit == null && line.credit == null)) {
        return res.status(400).json({
          error: 'Each line must have account_id and either debit or credit amount',
        });
      }
    }

    // Double-entry balance check: sum(debits) must equal sum(credits)
    const totalDebits  = lines.reduce((sum, l) => sum + (Number(l.debit)  || 0), 0);
    const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      return res.status(400).json({
        error: `Journal entry is not balanced: debits (${totalDebits}) != credits (${totalCredits})`,
      });
    }
    if (totalDebits === 0) {
      return res.status(400).json({ error: 'Journal entry must have non-zero amounts' });
    }

    const adapter = await getAdapter();

    // Sprint 3: Period-close lock
    const entryDate = date || new Date().toISOString().slice(0, 10);
    const [eYear, eMonth] = entryDate.split('-').map(Number);
    if (eYear && eMonth) {
      const periodForDate = await adapter.findOne('accounting_periods', {
        tenant_id: req.user.tenantId, year: eYear, month: eMonth,
      });
      if (periodForDate && periodForDate.status === 'closed') {
        return res.status(422).json({
          error: `Period ${eYear}-${String(eMonth).padStart(2, '0')} is closed.`,
          period: periodForDate,
        });
      }
    }

    const entry = {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      description,
      reference: reference ?? null,
      period_id: period_id ?? null,
      date: entryDate,
      lines: lines.map(l => ({
        id: randomUUID(),
        account_id: l.account_id,
        debit:  Number(l.debit)  || 0,
        credit: Number(l.credit) || 0,
        description: l.description || '',
      })),
      total_amount: totalDebits,
      status: 'posted',
      posted_by: req.user.id || req.user.userId,
      created_at: new Date().toISOString(),
    };

    await adapter.insertOne('journal_entries', entry);

    // Sprint 3: GL audit log
    await adapter.insertOne('gl_audit_log', {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      action: 'post',
      entity: 'journal_entry',
      entity_id: entry.id,
      actor_id: req.user.id || req.user.userId,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ entry });
  } catch (error) {
    logger.error('Ledger: create entry error', { error: error.message });
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.get('/entries', async (req, res) => {
  try {
    const { period_id, status, limit: rawLimit = '50', skip: rawSkip = '0' } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 200);
    const skip  = Math.max(parseInt(rawSkip, 10) || 0, 0);

    const filter = { tenant_id: req.user.tenantId };
    if (period_id) filter.period_id = period_id;
    if (status)    filter.status    = status;

    const adapter = await getAdapter();
    const entries = await adapter.findMany('journal_entries', filter, { limit, skip });
    res.json({ entries, limit, skip });
  } catch (error) {
    logger.error('Ledger: list entries error', { error: error.message });
    res.status(500).json({ error: 'Failed to list journal entries' });
  }
});

// ── Trial Balance ─────────────────────────────────────────────────────────────

router.get('/trial-balance', async (req, res) => {
  try {
    const adapter = await getAdapter();

    const accounts = await adapter.findMany('chart_of_accounts', {
      tenant_id: req.user.tenantId,
    });
    const entries = await adapter.findMany('journal_entries', {
      tenant_id: req.user.tenantId,
      status: 'posted',
    });

    // Aggregate debits and credits per account
    const accountMap = {};
    for (const acc of accounts) {
      accountMap[acc.id] = {
        account_id:   acc.id,
        account_code: acc.account_code,
        name:         acc.name,
        account_type: acc.account_type,
        total_debits:  0,
        total_credits: 0,
      };
    }

    for (const entry of entries) {
      for (const line of entry.lines ?? []) {
        if (accountMap[line.account_id]) {
          accountMap[line.account_id].total_debits  += Number(line.debit)  || 0;
          accountMap[line.account_id].total_credits += Number(line.credit) || 0;
        }
      }
    }

    const rows = Object.values(accountMap);
    const grandTotalDebits  = rows.reduce((s, r) => s + r.total_debits, 0);
    const grandTotalCredits = rows.reduce((s, r) => s + r.total_credits, 0);
    const isBalanced = Math.abs(grandTotalDebits - grandTotalCredits) < 0.001;

    res.json({
      rows,
      grand_total_debits:  grandTotalDebits,
      grand_total_credits: grandTotalCredits,
      is_balanced: isBalanced,
    });
  } catch (error) {
    logger.error('Ledger: trial balance error', { error: error.message });
    res.status(500).json({ error: 'Failed to compute trial balance' });
  }
});

// ── Accounting Periods ────────────────────────────────────────────────────────

router.get('/periods', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const periods = await adapter.findMany('accounting_periods', {
      tenant_id: req.user.tenantId,
    });
    res.json({ periods, total: periods.length });
  } catch (error) {
    logger.error('Ledger: list periods error', { error: error.message });
    res.status(500).json({ error: 'Failed to list periods' });
  }
});

router.post('/periods', async (req, res) => {
  try {
    const { year, month, name, status } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const adapter = await getAdapter();

    const existing = await adapter.findOne('accounting_periods', {
      tenant_id: req.user.tenantId,
      year: Number(year),
      month: Number(month),
    });
    if (existing) {
      return res.status(409).json({ error: 'Accounting period already exists for this year/month' });
    }

    const period = {
      id: randomUUID(),
      tenant_id: req.user.tenantId,
      year: Number(year),
      month: Number(month),
      name: name ?? `${year}-${String(month).padStart(2, '0')}`,
      status: status ?? 'open',
      created_at: new Date().toISOString(),
    };

    await adapter.insertOne('accounting_periods', period);
    res.status(201).json({ period });
  } catch (error) {
    logger.error('Ledger: create period error', { error: error.message });
    res.status(500).json({ error: 'Failed to create period' });
  }
});

// ── P&L, Balance Sheet, Cash Flow ─────────────────────────────────────────────

router.get('/pnl', async (req, res) => {
  try {
    const { from, to } = req.query;
    const adapter = await getAdapter();
    let entries = await adapter.findMany('journal_entries', { tenant_id: req.user.tenantId });

    if (from) {
      const fromDate = new Date(from);
      entries = entries.filter(e => new Date(e.created_at) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      entries = entries.filter(e => new Date(e.created_at) <= toDate);
    }

    const accounts = await adapter.findMany('chart_of_accounts', { tenant_id: req.user.tenantId });
    const accountMap = {};
    for (const acc of accounts) { accountMap[acc.id] = acc; }

    const revenue_by_account = {};
    const expense_by_account = {};
    let revenue_total = 0;
    let expense_total = 0;

    for (const entry of entries) {
      for (const line of entry.lines ?? []) {
        const acc = accountMap[line.account_id];
        if (!acc) continue;
        const type = acc.account_type;
        if (type === 'revenue') {
          const amt = (Number(line.credit) || 0) - (Number(line.debit) || 0);
          revenue_by_account[acc.name] = (revenue_by_account[acc.name] || 0) + amt;
          revenue_total += amt;
        } else if (type === 'expense') {
          const amt = (Number(line.debit) || 0) - (Number(line.credit) || 0);
          expense_by_account[acc.name] = (expense_by_account[acc.name] || 0) + amt;
          expense_total += amt;
        }
      }
    }

    res.json({ revenue_total, expense_total, net_income: revenue_total - expense_total, revenue_by_account, expense_by_account });
  } catch (error) {
    logger.error('Ledger: pnl error', { error: error.message });
    res.status(500).json({ error: 'Failed to compute P&L' });
  }
});

router.get('/balance-sheet', async (req, res) => {
  try {
    const adapter  = await getAdapter();
    const tenantId = req.user.tenantId;
    const accounts = await adapter.findMany('chart_of_accounts', { tenant_id: tenantId });
    const entries  = await adapter.findMany('journal_entries', { tenant_id: tenantId });

    const accMap = {};
    for (const acc of accounts) {
      accMap[acc.id] = { ...acc, balance: Number(acc.balance) || 0 };
    }
    for (const entry of entries) {
      for (const line of entry.lines ?? []) {
        if (!accMap[line.account_id]) continue;
        accMap[line.account_id].balance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      }
    }

    let total_assets = 0, total_liabilities = 0;
    for (const acc of Object.values(accMap)) {
      if (acc.account_type === 'asset')     total_assets      += acc.balance;
      if (acc.account_type === 'liability') total_liabilities += acc.balance;
    }

    res.json({ total_assets, total_liabilities, equity: total_assets - total_liabilities });
  } catch (error) {
    logger.error('Ledger: balance-sheet error', { error: error.message });
    res.status(500).json({ error: 'Failed to compute balance sheet' });
  }
});

router.get('/cash-flow', async (req, res) => {
  try {
    const { from, to } = req.query;
    const adapter = await getAdapter();
    let entries = await adapter.findMany('journal_entries', { tenant_id: req.user.tenantId });
    const accounts = await adapter.findMany('chart_of_accounts', { tenant_id: req.user.tenantId });
    const accountMap = {};
    for (const acc of accounts) { accountMap[acc.id] = acc; }

    if (from) { const d = new Date(from); entries = entries.filter(e => new Date(e.created_at) >= d); }
    if (to)   { const d = new Date(to);   entries = entries.filter(e => new Date(e.created_at) <= d); }

    let revenue = 0, expense = 0;
    for (const entry of entries) {
      for (const line of entry.lines ?? []) {
        const acc = accountMap[line.account_id];
        if (!acc) continue;
        if (acc.account_type === 'revenue') revenue += (Number(line.credit) || 0) - (Number(line.debit) || 0);
        if (acc.account_type === 'expense') expense += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      }
    }

    const net_income = revenue - expense;
    res.json({
      net_income,
      operating_activities: net_income * 0.8,
      investing_activities: 0,
      financing_activities: 0,
      total_cash_flow: net_income * 0.8,
    });
  } catch (error) {
    logger.error('Ledger: cash-flow error', { error: error.message });
    res.status(500).json({ error: 'Failed to compute cash flow' });
// ── Sprint 3: Journal Entry Reversal ─────────────────────────────────────────

/**
 * POST /api/ledger/entries/:id/reverse
 * Creates a counter-entry that exactly reverses the original JE.
 */
router.post('/entries/:id/reverse', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;

    const original = await adapter.findOne('journal_entries', { id: req.params.id, tenant_id: tenantId })
      || await adapter.findOne('journal_entries', { _id: req.params.id, tenant_id: tenantId });
    if (!original) return res.status(404).json({ error: 'Journal entry not found' });
    if (original.reversed_by) return res.status(409).json({ error: 'Entry already reversed', reversedBy: original.reversed_by });

    // Check period is not closed for reversal date
    const reversalDate = req.body.reversalDate || new Date().toISOString().slice(0, 10);
    const [rYear, rMonth] = reversalDate.split('-').map(Number);
    const period = await adapter.findOne('accounting_periods', { tenant_id: tenantId, year: rYear, month: rMonth });
    if (period?.status === 'closed') {
      return res.status(422).json({ error: 'Cannot reverse into a closed period', period: `${rYear}-${rMonth}` });
    }

    const reversalId = randomUUID();
    const reversal = {
      id: reversalId,
      tenant_id: tenantId,
      reference: `REV-${original.reference || original.id}`,
      description: req.body.description || `Reversal of ${original.reference || original.id}`,
      date: reversalDate,
      currency: original.currency || 'USD',
      lines: (original.lines || []).map(l => ({
        account_id: l.account_id,
        debit: l.credit || 0,
        credit: l.debit || 0,
        description: `Reversal: ${l.description || ''}`,
      })),
      is_reversal: true,
      reverses: original.id || original._id,
      created_by: req.user.id || req.user.userId,
      created_at: new Date().toISOString(),
    };

    await adapter.insertOne('journal_entries', reversal);

    // Mark original as reversed
    await adapter.updateOne('journal_entries', { id: original.id || original._id }, {
      ...original,
      reversed_by: reversalId,
      reversed_at: new Date().toISOString(),
    });

    // Audit log
    await adapter.insertOne('gl_audit_log', {
      id: randomUUID(),
      tenant_id: tenantId,
      action: 'reversal',
      entity: 'journal_entry',
      entity_id: original.id || original._id,
      reversal_id: reversalId,
      actor_id: req.user.id || req.user.userId,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ reversal, reversedEntry: { ...original, reversed_by: reversalId } });
  } catch (err) {
    logger.error('Ledger: reversal error', { error: err.message });
    res.status(500).json({ error: 'Failed to create reversal' });
  }
});

// ── Sprint 3: Period Close / Reopen ───────────────────────────────────────────

router.put('/periods/:id/close', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const period = await adapter.findOne('accounting_periods', { id: req.params.id, tenant_id: tenantId })
      || await adapter.findOne('accounting_periods', { _id: req.params.id, tenant_id: tenantId });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status === 'closed') return res.status(409).json({ error: 'Period already closed' });

    const updated = { ...period, status: 'closed', closed_by: req.user.id || req.user.userId, closed_at: new Date().toISOString() };
    await adapter.updateOne('accounting_periods', { id: req.params.id }, updated);

    await adapter.insertOne('gl_audit_log', {
      id: randomUUID(),
      tenant_id: tenantId,
      action: 'period_close',
      entity: 'accounting_period',
      entity_id: req.params.id,
      actor_id: req.user.id || req.user.userId,
      created_at: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    logger.error('Ledger: period close error', { error: err.message });
    res.status(500).json({ error: 'Failed to close period' });
  }
});

router.put('/periods/:id/reopen', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const period = await adapter.findOne('accounting_periods', { id: req.params.id, tenant_id: tenantId })
      || await adapter.findOne('accounting_periods', { _id: req.params.id, tenant_id: tenantId });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status !== 'closed') return res.status(409).json({ error: 'Period is not closed' });

    const updated = { ...period, status: 'open', reopened_by: req.user.id || req.user.userId, reopened_at: new Date().toISOString() };
    await adapter.updateOne('accounting_periods', { id: req.params.id }, updated);

    await adapter.insertOne('gl_audit_log', {
      id: randomUUID(),
      tenant_id: tenantId,
      action: 'period_reopen',
      entity: 'accounting_period',
      entity_id: req.params.id,
      actor_id: req.user.id || req.user.userId,
      created_at: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    logger.error('Ledger: period reopen error', { error: err.message });
    res.status(500).json({ error: 'Failed to reopen period' });
  }
});

// ── Sprint 3: GL Audit Log ────────────────────────────────────────────────────

router.get('/audit', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { action, entityId, from, to, limit = 100 } = req.query;
    const filter = { tenant_id: req.user.tenantId };
    if (action) filter.action = action;
    if (entityId) filter.entity_id = entityId;
    if (from || to) {
      filter.created_at = {};
      if (from) filter.created_at.$gte = from;
      if (to) filter.created_at.$lte = to;
    }
    const entries = await adapter.findMany('gl_audit_log', filter, { sort: { created_at: -1 }, limit: Math.min(Number(limit), 1000) }) || [];
    res.json({ entries, total: entries.length });
  } catch (err) {
    logger.error('Ledger: audit log error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch GL audit log' });
  }
});

export default router;
