/**
 * @file server/routes/financial-statements.js
 * @description Financial Statements — Sprint 6 + Sprint 12 (Gap Bridge).
 *   Derives P&L, Balance Sheet, and Cash Flow from posted GL journal entries.
 *
 * Routes
 * ------
 * GET /api/finance/statements/pnl            — P&L (Income Statement) for period range
 * GET /api/finance/statements/balance-sheet  — Balance Sheet as at date
 * GET /api/finance/statements/cash-flow      — Cash Flow summary
 * GET /api/finance/statements/trial-balance  — Trial Balance with period filter + drill-down
 *
 * Security: All routes require JWT (applied in server.js).
 */

import express from 'express';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

function tid(req) { return req.user?.tenantId ?? req.user?.tenant_id ?? 'default'; }

// ─── P&L ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/finance/statements/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Derives revenue and expense totals from posted journal entry lines
 * cross-referenced against chart of accounts types.
 */
router.get('/pnl', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { from, to } = req.query;

    // Fetch all accounts
    const accounts = await db.findMany('chart_of_accounts', { tenant_id: tenantId })
      || await db.findMany('accounts', { tenant_id: tenantId })
      || [];

    const accountMap = {};
    for (const a of accounts) accountMap[a.id || a._id] = a;

    // Fetch posted journal entries in range
    const jeFilter = { tenant_id: tenantId, status: 'posted' };
    if (from || to) {
      jeFilter.date = {};
      if (from) jeFilter.date.$gte = from;
      if (to) jeFilter.date.$lte = to;
    }
    const entries = await db.findMany('journal_entries', jeFilter) || [];

    // Accumulate by account
    const balances = {};
    for (const je of entries) {
      for (const line of je.lines || []) {
        if (!balances[line.account_id]) balances[line.account_id] = { debit: 0, credit: 0 };
        balances[line.account_id].debit += line.debit || 0;
        balances[line.account_id].credit += line.credit || 0;
      }
    }

    // Classify into P&L categories
    const revenue = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const [acctId, bal] of Object.entries(balances)) {
      const acct = accountMap[acctId];
      if (!acct) continue;
      const type = acct.type || acct.account_type || '';
      const netCredit = bal.credit - bal.debit; // revenue accounts: credit balance = positive
      const netDebit = bal.debit - bal.credit;

      if (type === 'revenue' || type === 'income') {
        const amount = netCredit;
        revenue.push({ accountId: acctId, name: acct.name, code: acct.code, amount });
        totalRevenue += amount;
      } else if (type === 'expense' || type === 'cost') {
        const amount = netDebit;
        expenses.push({ accountId: acctId, name: acct.name, code: acct.code, amount });
        totalExpenses += amount;
      }
    }

    const grossProfit = totalRevenue - totalExpenses;

    res.json({
      period: { from: from || null, to: to || null },
      revenue: { lines: revenue, total: totalRevenue },
      expenses: { lines: expenses, total: totalExpenses },
      grossProfit,
      netIncome: grossProfit,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(err, 'GET P&L');
    res.status(500).json({ error: 'Failed to generate P&L' });
  }
});

// ─── BALANCE SHEET ───────────────────────────────────────────────────────────

/**
 * GET /api/finance/statements/balance-sheet?asAt=YYYY-MM-DD
 */
router.get('/balance-sheet', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { asAt } = req.query;

    const accounts = await db.findMany('chart_of_accounts', { tenant_id: tenantId })
      || await db.findMany('accounts', { tenant_id: tenantId })
      || [];
    const accountMap = {};
    for (const a of accounts) accountMap[a.id || a._id] = a;

    const jeFilter = { tenant_id: tenantId, status: 'posted' };
    if (asAt) jeFilter.date = { $lte: asAt };
    const entries = await db.findMany('journal_entries', jeFilter) || [];

    const balances = {};
    for (const je of entries) {
      for (const line of je.lines || []) {
        if (!balances[line.account_id]) balances[line.account_id] = { debit: 0, credit: 0 };
        balances[line.account_id].debit += line.debit || 0;
        balances[line.account_id].credit += line.credit || 0;
      }
    }

    const assets = [];
    const liabilities = [];
    const equity = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const [acctId, bal] of Object.entries(balances)) {
      const acct = accountMap[acctId];
      if (!acct) continue;
      const type = acct.type || acct.account_type || '';

      if (type === 'asset') {
        const amount = bal.debit - bal.credit;
        assets.push({ accountId: acctId, name: acct.name, code: acct.code, amount });
        totalAssets += amount;
      } else if (type === 'liability') {
        const amount = bal.credit - bal.debit;
        liabilities.push({ accountId: acctId, name: acct.name, code: acct.code, amount });
        totalLiabilities += amount;
      } else if (type === 'equity') {
        const amount = bal.credit - bal.debit;
        equity.push({ accountId: acctId, name: acct.name, code: acct.code, amount });
        totalEquity += amount;
      }
    }

    res.json({
      asAt: asAt || new Date().toISOString().slice(0, 10),
      assets: { lines: assets, total: totalAssets },
      liabilities: { lines: liabilities, total: totalLiabilities },
      equity: { lines: equity, total: totalEquity },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(err, 'GET Balance Sheet');
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

// ─── CASH FLOW ───────────────────────────────────────────────────────────────

/**
 * GET /api/finance/statements/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Simplified cash flow from AP/AR payment records.
 */
router.get('/cash-flow', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = from;
    if (to) dateFilter.$lte = to;

    // Inflows: AR payments received
    const arFilter = { tenant_id: tenantId, status: 'paid' };
    if (from || to) arFilter.payment_date = dateFilter;
    const arPayments = await db.findMany('invoices', arFilter) || [];
    const operatingInflow = arPayments.reduce((s, p) => s + (Number(p.total) || Number(p.amount) || 0), 0);

    // Outflows: AP payments made
    const apFilter = { tenant_id: tenantId, status: 'paid' };
    if (from || to) apFilter.payment_date = dateFilter;
    const apPayments = await db.findMany('ap_invoices', apFilter) || [];
    const operatingOutflow = apPayments.reduce((s, p) => s + (Number(p.total_amount) || Number(p.amount) || 0), 0);

    const netOperating = operatingInflow - operatingOutflow;

    res.json({
      period: { from: from || null, to: to || null },
      operating: {
        inflows: operatingInflow,
        outflows: operatingOutflow,
        net: netOperating,
      },
      investing: { net: 0, note: 'Fixed asset data pending Sprint 12' },
      financing: { net: 0, note: 'Equity/debt data pending Sprint 26' },
      netCashFlow: netOperating,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(err, 'GET Cash Flow');
    res.status(500).json({ error: 'Failed to generate cash flow statement' });
  }
});

// ─── TRIAL BALANCE WITH PERIOD FILTER + DRILL-DOWN ──────────────────────────

/**
 * GET /api/finance/statements/trial-balance?from=YYYY-MM-DD&to=YYYY-MM-DD&accountId=X
 * Sprint 3 task 3.5: period filter + drill-down to individual JE lines.
 */
router.get('/trial-balance', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { from, to, accountId } = req.query;

    const accounts = await db.findMany('chart_of_accounts', { tenant_id: tenantId })
      || await db.findMany('accounts', { tenant_id: tenantId })
      || [];
    const accountMap = {};
    for (const a of accounts) accountMap[a.id || a._id] = a;

    const jeFilter = { tenant_id: tenantId, status: 'posted' };
    if (from || to) {
      jeFilter.date = {};
      if (from) jeFilter.date.$gte = from;
      if (to) jeFilter.date.$lte = to;
    }
    const entries = await db.findMany('journal_entries', jeFilter) || [];

    // Drill-down: if accountId provided, return individual JE lines for that account
    if (accountId) {
      const lines = [];
      for (const je of entries) {
        for (const line of je.lines || []) {
          if (line.account_id === accountId) {
            lines.push({ jeId: je.id || je._id, jeRef: je.reference, date: je.date, description: je.description, debit: line.debit, credit: line.credit });
          }
        }
      }
      const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
      const account = accountMap[accountId];
      return res.json({ account, lines, totalDebit, totalCredit, balance: totalDebit - totalCredit });
    }

    // Full trial balance
    const balances = {};
    for (const je of entries) {
      for (const line of je.lines || []) {
        if (!balances[line.account_id]) balances[line.account_id] = { debit: 0, credit: 0 };
        balances[line.account_id].debit += line.debit || 0;
        balances[line.account_id].credit += line.credit || 0;
      }
    }

    const rows = Object.entries(balances).map(([acctId, bal]) => ({
      accountId: acctId,
      name: accountMap[acctId]?.name || acctId,
      code: accountMap[acctId]?.code || null,
      type: accountMap[acctId]?.type || null,
      debit: bal.debit,
      credit: bal.credit,
      balance: bal.debit - bal.credit,
    })).sort((a, b) => (a.code || '').localeCompare(b.code || ''));

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    res.json({
      period: { from: from || null, to: to || null },
      rows,
      totals: { debit: totalDebit, credit: totalCredit },
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    });
  } catch (err) {
    logger.error(err, 'GET Trial Balance');
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
});

export default router;
