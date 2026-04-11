/**
 * @file server/routes/expenses.js
 * @description Expense Management — Sprint 38.
 *
 * Routes
 * ------
 * POST /api/expenses                    — create expense claim (draft)
 * GET  /api/expenses                    — list claims
 * GET  /api/expenses/policies           — return per-diem policies
 * GET  /api/expenses/:id                — get claim detail
 * PUT  /api/expenses/:id/submit         — submit claim
 * PUT  /api/expenses/:id/approve        — approve claim (manager/finance)
 * PUT  /api/expenses/:id/reject         — reject claim (manager)
 * PUT  /api/expenses/:id/pay            — mark paid (finance)
 * POST /api/expenses/:id/line-items     — add line item with policy check
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const EXP_COL = 'expense_claims';
const POL_COL = 'expense_policies';

const DEFAULT_POLICIES = {
  meals:         { dailyLimit: 50,   currency: 'USD' },
  accommodation: { dailyLimit: 200,  currency: 'USD' },
  mileage:       { dailyLimit: 0.67, currency: 'USD' },
  tools:         { dailyLimit: 500,  currency: 'USD' },
  other:         { dailyLimit: 500,  currency: 'USD' },
};

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function hasRole(user, ...roles) {
  const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
  return userRoles.some(r => roles.includes(r));
}

async function getPolicies(tenantId) {
  const adapter  = await getAdapter();
  const policies = await adapter.findMany(POL_COL, { tenantId }, { limit: 50 });
  if (policies.length === 0) {
    const defaults = await adapter.findMany(POL_COL, { tenantId: '__default__' }, { limit: 50 });
    return defaults.length > 0 ? defaults : Object.entries(DEFAULT_POLICIES).map(([cat, v]) => ({ category: cat, ...v }));
  }
  return policies;
}

function checkPolicy(lineItem, policies) {
  const pol = policies.find(p => p.category === lineItem.category);
  if (!pol) return 'within_policy';
  return Number(lineItem.amount) <= Number(pol.dailyLimit) ? 'within_policy' : 'flagged';
}

// ── GET /policies ─────────────────────────────────────────────────────────────

router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const policies = await getPolicies(tenantId);
    res.json({ policies });
  } catch (err) {
    logger.error('Expenses: get policies error', { error: err.message });
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period, lineItems = [], currency = 'USD', technicianId } = req.body;

    const policies   = await getPolicies(tenantId);
    const checkedItems = lineItems.map(item => ({
      ...item,
      policyStatus: checkPolicy(item, policies),
    }));
    const totalAmount = checkedItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const now   = new Date().toISOString();
    const claim = {
      id:           randomUUID(),
      employeeId:   req.user.id,
      technicianId: technicianId || null,
      tenantId,
      claimRef:     `EXP-${randomUUID().slice(0, 8).toUpperCase()}`,
      period:       period || now.slice(0, 7),
      lineItems:    checkedItems,
      totalAmount:  Math.round(totalAmount * 100) / 100,
      currency,
      status:       'draft',
      approvedBy:   null,
      paymentDate:  null,
      createdAt:    now,
      updatedAt:    now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(EXP_COL, claim);
    res.status(201).json({ claim });
  } catch (err) {
    logger.error('Expenses: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create expense claim' });
  }
});

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const isAdmin  = hasRole(req.user, 'sys_admin', 'tenant_admin', 'finance', 'finance_manager', 'manager');
    const filter   = isAdmin ? { tenantId } : { tenantId, employeeId: req.user.id };

    const adapter = await getAdapter();
    const claims  = await adapter.findMany(EXP_COL, filter, { limit: 200 });
    res.json({ claims, total: claims.length });
  } catch (err) {
    logger.error('Expenses: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list expense claims' });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const claim    = await adapter.findOne(EXP_COL, { id: req.params.id, tenantId });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const isOwner = claim.employeeId === req.user.id;
    const isAdmin = hasRole(req.user, 'sys_admin', 'tenant_admin', 'finance', 'finance_manager', 'manager');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    res.json({ claim });
  } catch (err) {
    logger.error('Expenses: get error', { error: err.message });
    res.status(500).json({ error: 'Failed to get claim' });
  }
});

// ── PUT /:id/submit ───────────────────────────────────────────────────────────

router.put('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const claim    = await adapter.findOne(EXP_COL, { id: req.params.id, tenantId });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.employeeId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await adapter.updateOne(EXP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'submitted', updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Claim submitted', id: req.params.id });
  } catch (err) {
    logger.error('Expenses: submit error', { error: err.message });
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// ── PUT /:id/approve ──────────────────────────────────────────────────────────

router.put('/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!hasRole(req.user, 'sys_admin', 'tenant_admin', 'finance', 'finance_manager', 'manager')) {
      return res.status(403).json({ error: 'Requires manager or finance role' });
    }
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const claim    = await adapter.findOne(EXP_COL, { id: req.params.id, tenantId });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    await adapter.updateOne(EXP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'approved', approvedBy: req.user.id, updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Claim approved', id: req.params.id });
  } catch (err) {
    logger.error('Expenses: approve error', { error: err.message });
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

// ── PUT /:id/reject ───────────────────────────────────────────────────────────

router.put('/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!hasRole(req.user, 'sys_admin', 'tenant_admin', 'finance', 'finance_manager', 'manager')) {
      return res.status(403).json({ error: 'Requires manager role' });
    }
    const { reason } = req.body;
    const tenantId   = await resolveTenantId(req.user.id);
    const adapter    = await getAdapter();
    const claim      = await adapter.findOne(EXP_COL, { id: req.params.id, tenantId });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    await adapter.updateOne(EXP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'rejected', rejectionReason: reason || null, updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Claim rejected', id: req.params.id });
  } catch (err) {
    logger.error('Expenses: reject error', { error: err.message });
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

// ── PUT /:id/pay ──────────────────────────────────────────────────────────────

router.put('/:id/pay', authenticateToken, async (req, res) => {
  try {
    if (!hasRole(req.user, 'sys_admin', 'tenant_admin', 'finance', 'finance_manager')) {
      return res.status(403).json({ error: 'Requires finance role' });
    }
    const { paymentDate } = req.body;
    const tenantId        = await resolveTenantId(req.user.id);
    const adapter         = await getAdapter();
    const claim           = await adapter.findOne(EXP_COL, { id: req.params.id, tenantId });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    await adapter.updateOne(EXP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'paid', paymentDate: paymentDate || new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Claim marked as paid', id: req.params.id });
  } catch (err) {
    logger.error('Expenses: pay error', { error: err.message });
    res.status(500).json({ error: 'Failed to mark claim as paid' });
  }
});

// ── POST /:id/line-items ──────────────────────────────────────────────────────

router.post('/:id/line-items', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const claim    = await adapter.findOne(EXP_COL, { id: req.params.id, tenantId });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const isOwner = claim.employeeId === req.user.id;
    const isAdmin = hasRole(req.user, 'sys_admin', 'tenant_admin', 'finance', 'finance_manager', 'manager');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { date, category, amount, currency = 'USD', receiptUrl, description } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'category and amount are required' });

    const policies    = await getPolicies(tenantId);
    const newItem     = { date: date || new Date().toISOString().slice(0, 10), category, amount: Number(amount), currency, receiptUrl: receiptUrl || null, description: description || null };
    newItem.policyStatus = checkPolicy(newItem, policies);

    const lineItems   = [...(claim.lineItems || []), newItem];
    const totalAmount = lineItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);

    await adapter.updateOne(EXP_COL, { id: req.params.id, tenantId }, {
      $set: { lineItems, totalAmount: Math.round(totalAmount * 100) / 100, updatedAt: new Date().toISOString() },
    });

    res.status(201).json({ lineItem: newItem, totalAmount: Math.round(totalAmount * 100) / 100 });
  } catch (err) {
    logger.error('Expenses: add line item error', { error: err.message });
    res.status(500).json({ error: 'Failed to add line item' });
  }
});

export default router;
