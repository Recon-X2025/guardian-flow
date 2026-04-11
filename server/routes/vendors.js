/**
 * @file server/routes/vendors.js
 * @description Vendor Master Management — Sprint 4 (Gap Bridge).
 *
 * Routes
 * ------
 * GET    /api/vendors                  — list vendors (filter: status, country, category)
 * POST   /api/vendors                  — create vendor
 * GET    /api/vendors/:id              — get vendor
 * PUT    /api/vendors/:id              — update vendor
 * DELETE /api/vendors/:id              — deactivate vendor (soft delete)
 * GET    /api/vendors/:id/invoices     — AP invoices for this vendor
 * GET    /api/vendors/:id/payments     — payment history for this vendor
 * POST   /api/vendors/:id/bank-details — upsert bank/payment details
 * GET    /api/vendors/search           — fuzzy search by name/tax code
 *
 * Security
 * --------
 * All routes require JWT (applied in server.js).
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

function tid(req) { return req.user?.tenantId ?? req.user?.tenant_id ?? 'default'; }
function uid(req) { return req.user?.userId || req.user?.id; }
function now() { return new Date().toISOString(); }

const PAYMENT_TERMS = ['net7', 'net14', 'net30', 'net45', 'net60', 'net90', 'immediate', 'cod'];

// ─── LIST ────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const db = getAdapter();
    const { status, country, category, q, limit = 50 } = req.query;
    const filter = { tenant_id: tid(req) };
    if (status) filter.status = status;
    if (country) filter.country = country;
    if (category) filter.category = category;

    let vendors = await db.find('vendors', filter, { sort: { name: 1 }, limit: Math.min(Number(limit), 500) }) || [];
    if (q) {
      const lq = q.toLowerCase();
      vendors = vendors.filter(v =>
        v.name?.toLowerCase().includes(lq) ||
        v.tax_code?.toLowerCase().includes(lq) ||
        v.email?.toLowerCase().includes(lq),
      );
    }
    res.json({ vendors, total: vendors.length });
  } catch (err) {
    logger.error(err, 'GET vendors');
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// ─── CREATE ──────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const {
      name, legalName, category = 'supplier', country = 'US', currency = 'USD',
      taxCode, vatNumber, email, phone, website,
      billingAddress, paymentTerms = 'net30', creditLimit,
      bankDetails, tags = [], notes = '',
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (paymentTerms && !PAYMENT_TERMS.includes(paymentTerms)) {
      return res.status(400).json({ error: `paymentTerms must be one of: ${PAYMENT_TERMS.join(', ')}` });
    }

    // Duplicate check by tax code within tenant
    if (taxCode) {
      const existing = await db.findOne('vendors', { tenant_id: tenantId, tax_code: taxCode });
      if (existing) return res.status(409).json({ error: 'Vendor with this tax code already exists', existingId: existing._id });
    }

    const vendor = {
      _id: randomUUID(),
      tenant_id: tenantId,
      name,
      legal_name: legalName || name,
      category,
      country,
      currency,
      tax_code: taxCode || null,
      vat_number: vatNumber || null,
      email: email || null,
      phone: phone || null,
      website: website || null,
      billing_address: billingAddress || null,
      payment_terms: paymentTerms,
      credit_limit: creditLimit != null ? Number(creditLimit) : null,
      bank_details: bankDetails || null,
      tags,
      notes,
      status: 'active',
      created_by: uid(req),
      created_at: now(),
      updated_at: now(),
    };

    await db.insert('vendors', vendor);
    logger.info({ vendorId: vendor._id }, 'Vendor created');
    res.status(201).json(vendor);
  } catch (err) {
    logger.error(err, 'POST vendor');
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// ─── GET ONE ─────────────────────────────────────────────────────────────────

router.get('/search', async (req, res) => {
  try {
    const db = getAdapter();
    const { q = '', limit = 20 } = req.query;
    const vendors = await db.find('vendors', { tenant_id: tid(req), status: 'active' }, { sort: { name: 1 } }) || [];
    const lq = q.toLowerCase();
    const results = vendors
      .filter(v => v.name?.toLowerCase().includes(lq) || v.tax_code?.toLowerCase().includes(lq))
      .slice(0, Math.min(Number(limit), 100));
    res.json(results);
  } catch (err) {
    logger.error(err, 'GET vendor search');
    res.status(500).json({ error: 'Failed to search vendors' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const vendor = await db.findOne('vendors', { _id: req.params.id, tenant_id: tid(req) });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    logger.error(err, 'GET vendor');
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// ─── UPDATE ──────────────────────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const vendor = await db.findOne('vendors', { _id: req.params.id, tenant_id: tenantId });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const update = { ...vendor, ...req.body, _id: req.params.id, tenant_id: tenantId, updated_at: now() };
    await db.updateOne('vendors', { _id: req.params.id }, update);
    res.json(update);
  } catch (err) {
    logger.error(err, 'PUT vendor');
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// ─── DEACTIVATE ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const vendor = await db.findOne('vendors', { _id: req.params.id, tenant_id: tenantId });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    await db.updateOne('vendors', { _id: req.params.id }, {
      ...vendor,
      status: 'inactive',
      deactivated_by: uid(req),
      deactivated_at: now(),
      updated_at: now(),
    });
    res.json({ success: true, vendorId: req.params.id });
  } catch (err) {
    logger.error(err, 'DELETE vendor');
    res.status(500).json({ error: 'Failed to deactivate vendor' });
  }
});

// ─── VENDOR INVOICES ─────────────────────────────────────────────────────────

router.get('/:id/invoices', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const { status, limit = 50 } = req.query;
    const filter = { tenant_id: tenantId, vendor_id: req.params.id };
    if (status) filter.status = status;
    const invoices = await db.find('ap_invoices', filter, { sort: { invoice_date: -1 }, limit: Math.min(Number(limit), 200) }) || [];
    res.json({ invoices, total: invoices.length });
  } catch (err) {
    logger.error(err, 'GET vendor invoices');
    res.status(500).json({ error: 'Failed to fetch vendor invoices' });
  }
});

// ─── VENDOR PAYMENTS ─────────────────────────────────────────────────────────

router.get('/:id/payments', async (req, res) => {
  try {
    const db = getAdapter();
    const payments = await db.find('ap_payments', {
      tenant_id: tid(req),
      vendor_id: req.params.id,
    }, { sort: { payment_date: -1 }, limit: 200 }) || [];
    res.json({ payments, total: payments.length });
  } catch (err) {
    logger.error(err, 'GET vendor payments');
    res.status(500).json({ error: 'Failed to fetch vendor payments' });
  }
});

// ─── BANK DETAILS ────────────────────────────────────────────────────────────

router.post('/:id/bank-details', async (req, res) => {
  try {
    const db = getAdapter();
    const tenantId = tid(req);
    const vendor = await db.findOne('vendors', { _id: req.params.id, tenant_id: tenantId });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const { bankName, accountNumber, sortCode, iban, swiftBic, currency = 'USD', accountHolderName } = req.body;

    const bankDetails = {
      bank_name: bankName || null,
      account_number: accountNumber || null,
      sort_code: sortCode || null,
      iban: iban || null,
      swift_bic: swiftBic || null,
      currency,
      account_holder_name: accountHolderName || vendor.legal_name || vendor.name,
      updated_at: now(),
    };

    await db.updateOne('vendors', { _id: req.params.id }, {
      ...vendor,
      bank_details: bankDetails,
      updated_at: now(),
    });

    res.json({ success: true, bankDetails });
  } catch (err) {
    logger.error(err, 'POST vendor bank-details');
    res.status(500).json({ error: 'Failed to update bank details' });
  }
});

export default router;
