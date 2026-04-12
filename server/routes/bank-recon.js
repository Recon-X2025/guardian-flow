/**
 * Bank Reconciliation Routes
 * GET/POST  /api/bank-recon/accounts
 * POST      /api/bank-recon/accounts/:id/import-statement
 * GET       /api/bank-recon/accounts/:id/transactions
 * POST      /api/bank-recon/match
 * GET       /api/bank-recon/accounts/:id/reconciliation
 * POST      /api/bank-recon/accounts/:id/auto-match
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/accounts', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const accounts = await adapter.findMany('bank_accounts', { tenant_id: req.user.tenantId });
    res.json({ accounts, total: accounts.length });
  } catch (err) {
    logger.error('BankRecon: list accounts error', { error: err.message });
    res.status(500).json({ error: 'Failed to list bank accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const { account_name, bank_name, account_number, currency, current_balance } = req.body;
    if (!account_name) return res.status(400).json({ error: 'account_name is required' });
    const adapter = await getAdapter();
    const account = {
      id: randomUUID(), tenant_id: req.user.tenantId, account_name, bank_name: bank_name || null,
      account_number: account_number || null, currency: currency || 'USD',
      current_balance: current_balance || 0, created_at: new Date(),
    };
    await adapter.insertOne('bank_accounts', account);
    res.status(201).json({ account });
  } catch (err) {
    logger.error('BankRecon: create account error', { error: err.message });
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

router.post('/accounts/:id/import-statement', async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions array is required' });
    }
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const account = await adapter.findOne('bank_accounts', { id: req.params.id, tenant_id: tenantId });
    if (!account) return res.status(404).json({ error: 'Bank account not found' });

    const saved = [];
    for (const t of transactions) {
      const record = {
        id: randomUUID(), tenant_id: tenantId, bank_account_id: req.params.id,
        date: t.date ? new Date(t.date) : new Date(), description: t.description || null,
        amount: t.amount || 0, currency: t.currency || account.currency,
        reference: t.reference || null, matched: false, match_id: null, created_at: new Date(),
      };
      await adapter.insertOne('bank_transactions', record);
      saved.push(record);
    }
    res.status(201).json({ imported: saved.length, transactions: saved });
  } catch (err) {
    logger.error('BankRecon: import statement error', { error: err.message });
    res.status(500).json({ error: 'Failed to import bank statement' });
  }
});

router.get('/accounts/:id/transactions', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const transactions = await adapter.findMany('bank_transactions', {
      bank_account_id: req.params.id, tenant_id: req.user.tenantId,
    });
    res.json({ transactions, total: transactions.length });
  } catch (err) {
    logger.error('BankRecon: list transactions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list bank transactions' });
  }
});

router.post('/match', async (req, res) => {
  try {
    const { bank_transaction_id, journal_entry_id } = req.body;
    if (!bank_transaction_id || !journal_entry_id) {
      return res.status(400).json({ error: 'bank_transaction_id and journal_entry_id are required' });
    }
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const match = {
      id: randomUUID(), bank_transaction_id, journal_entry_id,
      matched_at: new Date(), tenant_id: tenantId,
    };
    await adapter.insertOne('bank_recon_matches', match);
    await adapter.updateOne('bank_transactions', { id: bank_transaction_id, tenant_id: tenantId }, {
      matched: true, match_id: match.id,
    });
    res.status(201).json({ match });
  } catch (err) {
    logger.error('BankRecon: match error', { error: err.message });
    res.status(500).json({ error: 'Failed to create match' });
  }
});

router.get('/accounts/:id/reconciliation', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const account = await adapter.findOne('bank_accounts', { id: req.params.id, tenant_id: tenantId });
    if (!account) return res.status(404).json({ error: 'Bank account not found' });

    const transactions = await adapter.findMany('bank_transactions', { bank_account_id: req.params.id, tenant_id: tenantId });
    const matched = transactions.filter(t => t.matched);
    const unmatched = transactions.filter(t => !t.matched);
    const unmatched_balance = unmatched.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    res.json({
      account,
      unmatched_count: unmatched.length,
      matched_count: matched.length,
      unmatched_balance,
    });
  } catch (err) {
    logger.error('BankRecon: reconciliation error', { error: err.message });
    res.status(500).json({ error: 'Failed to get reconciliation' });
  }
});

router.post('/accounts/:id/auto-match', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const unmatched = await adapter.findMany('bank_transactions', {
      bank_account_id: req.params.id, tenant_id: tenantId, matched: false,
    });
    const journalEntries = await adapter.findMany('journal_entries', { tenant_id: tenantId });
    let matched_count = 0;

    for (const txn of unmatched) {
      const txnDate = new Date(txn.date);
      const txnAmount = Number(txn.amount);
      const matchedEntry = journalEntries.find(je => {
        const entryDate = new Date(je.created_at);
        const dayDiff = Math.abs((txnDate - entryDate) / (1000 * 60 * 60 * 24));
        const amountDiff = Math.abs((Number(je.total_amount) || 0) - txnAmount);
        return dayDiff <= 3 && amountDiff <= 0.01;
      });
      if (matchedEntry) {
        const match = {
          id: randomUUID(), bank_transaction_id: txn.id, journal_entry_id: matchedEntry.id,
          matched_at: new Date(), tenant_id: tenantId,
        };
        await adapter.insertOne('bank_recon_matches', match);
        await adapter.updateOne('bank_transactions', { id: txn.id, tenant_id: tenantId }, {
          matched: true, match_id: match.id,
        });
        matched_count++;
      }
    }

    res.json({ matched_count });
  } catch (err) {
    logger.error('BankRecon: auto-match error', { error: err.message });
    res.status(500).json({ error: 'Failed to auto-match transactions' });
  }
});

export default router;
