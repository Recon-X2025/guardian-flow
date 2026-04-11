/**
 * @file server/routes/accounts-payable.js
 * @description Accounts Payable module — Sprint 37.
 *
 * Routes
 * ------
 * POST   /api/ap/invoices                  — create AP invoice
 * GET    /api/ap/invoices                  — list invoices (filter: status, vendorId, dueBefore)
 * GET    /api/ap/invoices/:id              — get single invoice
 * PUT    /api/ap/invoices/:id/approve      — approve invoice (tenant_admin or finance role)
 * PUT    /api/ap/invoices/:id/pay          — mark paid; body: {paymentRef, paymentDate}
 * PUT    /api/ap/invoices/:id/dispute      — mark disputed; body: {reason}
 * POST   /api/ap/invoices/:id/match        — 3-way match engine
 * POST   /api/ap/payment-runs             — bulk payment run; body: {dueBy}
 * GET    /api/ap/aging-report              — aging buckets: current/30/60/90/over90
 *
 * Security
 * --------
 * - All routes require JWT authentication (applied in server.js via /api/ap prefix).
 * - tenantId sourced from authenticated user profile only.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const AP_COL = 'ap_invoices';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── POST /invoices ────────────────────────────────────────────────────────────

router.post('/invoices', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const {
      vendorId, vendorName, invoiceNo, invoiceDate, dueDate,
      lineItems = [], currency = 'USD', totalAmount, taxAmount,
      purchaseOrderRef, goodsReceiptRef,
    } = req.body;

    if (!vendorName || !invoiceNo || !totalAmount) {
      return res.status(400).json({ error: 'vendorName, invoiceNo, and totalAmount are required' });
    }

    const now = new Date().toISOString();
    const invoice = {
      id: randomUUID(),
      tenantId,
      vendorId: vendorId || null,
      vendorName,
      invoiceNo,
      invoiceDate: invoiceDate || now,
      dueDate: dueDate || null,
      lineItems,
      currency,
      totalAmount: Number(totalAmount),
      taxAmount: Number(taxAmount || 0),
      status: 'received',
      purchaseOrderRef: purchaseOrderRef || null,
      goodsReceiptRef: goodsReceiptRef || null,
      threeWayMatchStatus: 'pending',
      paymentRef: null,
      createdAt: now,
      updatedAt: now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(AP_COL, invoice);
    res.status(201).json({ invoice });
  } catch (err) {
    logger.error('AP: create invoice error', { error: err.message });
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ── GET /invoices ─────────────────────────────────────────────────────────────

router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { status, vendorId, dueBefore, limit: rawLimit = '50', skip: rawSkip = '0' } = req.query;

    const filter = { tenantId };
    if (status)   filter.status   = status;
    if (vendorId) filter.vendorId = vendorId;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 200);
    const skip  = Math.max(parseInt(rawSkip, 10) || 0, 0);

    const adapter  = await getAdapter();
    let invoices   = await adapter.findMany(AP_COL, filter, { limit: 500 });

    if (dueBefore) {
      const cutoff = new Date(dueBefore).getTime();
      invoices = invoices.filter(inv => inv.dueDate && new Date(inv.dueDate).getTime() <= cutoff);
    }

    const paginated = invoices.slice(skip, skip + limit);
    res.json({ invoices: paginated, total: invoices.length, limit, skip });
  } catch (err) {
    logger.error('AP: list invoices error', { error: err.message });
    res.status(500).json({ error: 'Failed to list invoices' });
  }
});

// ── GET /invoices/:id ─────────────────────────────────────────────────────────

router.get('/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const invoice  = await adapter.findOne(AP_COL, { id: req.params.id, tenantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
  } catch (err) {
    logger.error('AP: get invoice error', { error: err.message });
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

// ── PUT /invoices/:id/approve ─────────────────────────────────────────────────

router.put('/invoices/:id/approve', authenticateToken, async (req, res) => {
  try {
    const user     = req.user;
    const roles    = user.roles || user.role ? [user.role] : [];
    const allRoles = Array.isArray(user.roles) ? user.roles : roles;
    const allowed  = allRoles.some(r => ['tenant_admin', 'finance', 'finance_manager', 'sys_admin'].includes(r));
    if (!allowed) return res.status(403).json({ error: 'Requires tenant_admin or finance role' });

    const tenantId = await resolveTenantId(user.id);
    const adapter  = await getAdapter();
    const invoice  = await adapter.findOne(AP_COL, { id: req.params.id, tenantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'approved', updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Invoice approved', id: req.params.id });
  } catch (err) {
    logger.error('AP: approve invoice error', { error: err.message });
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
});

// ── PUT /invoices/:id/pay ─────────────────────────────────────────────────────

router.put('/invoices/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { paymentRef, paymentDate } = req.body;
    if (!paymentRef) return res.status(400).json({ error: 'paymentRef is required' });

    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const invoice  = await adapter.findOne(AP_COL, { id: req.params.id, tenantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'paid', paymentRef, paymentDate: paymentDate || new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Invoice marked as paid', id: req.params.id });
  } catch (err) {
    logger.error('AP: pay invoice error', { error: err.message });
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

// ── PUT /invoices/:id/dispute ─────────────────────────────────────────────────

router.put('/invoices/:id/dispute', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const tenantId   = await resolveTenantId(req.user.id);
    const adapter    = await getAdapter();
    const invoice    = await adapter.findOne(AP_COL, { id: req.params.id, tenantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
      $set: { status: 'disputed', disputeReason: reason || null, updatedAt: new Date().toISOString() },
    });
    res.json({ message: 'Invoice disputed', id: req.params.id });
  } catch (err) {
    logger.error('AP: dispute invoice error', { error: err.message });
    res.status(500).json({ error: 'Failed to dispute invoice' });
  }
});

// ── POST /invoices/:id/match ──────────────────────────────────────────────────

router.post('/invoices/:id/match', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const invoice  = await adapter.findOne(AP_COL, { id: req.params.id, tenantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (!invoice.purchaseOrderRef) {
      await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
        $set: { threeWayMatchStatus: 'exception', updatedAt: new Date().toISOString() },
      });
      return res.json({ matchStatus: 'exception', reason: 'No PO reference' });
    }

    // Look up PO amount from purchase_orders collection if it exists
    let poAmount = null;
    try {
      const po = await adapter.findOne('purchase_orders', { id: invoice.purchaseOrderRef, tenantId });
      if (po) poAmount = Number(po.totalAmount || po.total_amount || po.amount || 0);
    } catch {
      // PO collection may not exist; fall through
    }

    if (poAmount === null || poAmount === 0) {
      // No PO record found — treat as exception
      await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
        $set: { threeWayMatchStatus: 'exception', updatedAt: new Date().toISOString() },
      });
      return res.json({ matchStatus: 'exception', reason: 'PO record not found or amount unavailable' });
    }

    const invoiceTotal = Number(invoice.totalAmount);
    const variance     = Math.abs(invoiceTotal - poAmount);
    const variancePct  = poAmount > 0 ? (variance / poAmount) * 100 : 100;

    if (variancePct <= 5) {
      await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
        $set: { threeWayMatchStatus: 'matched', status: 'matched', updatedAt: new Date().toISOString() },
      });
      return res.json({ matchStatus: 'matched', invoiceTotal, poAmount, variance, variancePct: Math.round(variancePct * 100) / 100 });
    }

    await adapter.updateOne(AP_COL, { id: req.params.id, tenantId }, {
      $set: { threeWayMatchStatus: 'exception', updatedAt: new Date().toISOString() },
    });
    res.json({
      matchStatus: 'exception',
      variance: Math.round(variance * 100) / 100,
      variancePct: Math.round(variancePct * 100) / 100,
      invoiceTotal,
      poAmount,
    });
  } catch (err) {
    logger.error('AP: 3-way match error', { error: err.message });
    res.status(500).json({ error: 'Failed to run 3-way match' });
  }
});

// ── POST /payment-runs ────────────────────────────────────────────────────────

router.post('/payment-runs', authenticateToken, async (req, res) => {
  try {
    const { dueBy } = req.body;
    if (!dueBy) return res.status(400).json({ error: 'dueBy date is required' });

    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const cutoff   = new Date(dueBy).getTime();

    const allApproved = await adapter.findMany(AP_COL, { tenantId, status: 'approved' }, { limit: 1000 });
    const due         = allApproved.filter(inv => inv.dueDate && new Date(inv.dueDate).getTime() <= cutoff);

    if (due.length === 0) {
      return res.json({ processedCount: 0, totalAmount: 0, invoiceIds: [] });
    }

    const now        = new Date().toISOString();
    const runRef     = `PAY-RUN-${randomUUID().slice(0, 8).toUpperCase()}`;
    const invoiceIds = due.map(inv => inv.id);
    let   totalAmount = 0;

    for (const inv of due) {
      totalAmount += Number(inv.totalAmount || 0);
      await adapter.updateOne(AP_COL, { id: inv.id, tenantId }, {
        $set: { status: 'paid', paymentRef: runRef, paymentDate: now, updatedAt: now },
      });
    }

    res.json({
      processedCount: due.length,
      totalAmount:    Math.round(totalAmount * 100) / 100,
      invoiceIds,
      paymentRunRef:  runRef,
    });
  } catch (err) {
    logger.error('AP: payment run error', { error: err.message });
    res.status(500).json({ error: 'Failed to process payment run' });
  }
});

// ── GET /aging-report ─────────────────────────────────────────────────────────

router.get('/aging-report', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    // Exclude already-paid invoices from aging
    const invoices = await adapter.findMany(AP_COL, { tenantId }, { limit: 2000 });
    const unpaid   = invoices.filter(inv => inv.status !== 'paid');

    const now = Date.now();
    const buckets = {
      current: { count: 0, amount: 0 },
      days30:  { count: 0, amount: 0 },
      days60:  { count: 0, amount: 0 },
      days90:  { count: 0, amount: 0 },
      over90:  { count: 0, amount: 0 },
    };

    for (const inv of unpaid) {
      const amount = Number(inv.totalAmount || 0);
      if (!inv.dueDate) {
        buckets.current.count++;
        buckets.current.amount += amount;
        continue;
      }
      const daysOverdue = (now - new Date(inv.dueDate).getTime()) / 86400000;
      if (daysOverdue <= 0) {
        buckets.current.count++;
        buckets.current.amount += amount;
      } else if (daysOverdue <= 30) {
        buckets.days30.count++;
        buckets.days30.amount += amount;
      } else if (daysOverdue <= 60) {
        buckets.days60.count++;
        buckets.days60.amount += amount;
      } else if (daysOverdue <= 90) {
        buckets.days90.count++;
        buckets.days90.amount += amount;
      } else {
        buckets.over90.count++;
        buckets.over90.amount += amount;
      }
    }

    // Round amounts
    for (const b of Object.values(buckets)) {
      b.amount = Math.round(b.amount * 100) / 100;
    }

    res.json({ agingReport: buckets, totalInvoices: unpaid.length });
  } catch (err) {
    logger.error('AP: aging report error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate aging report' });
  }
});

export default router;
