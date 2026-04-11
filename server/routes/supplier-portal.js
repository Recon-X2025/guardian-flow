/**
 * @file server/routes/supplier-portal.js
 * @description Supplier self-service portal — Sprint 37.
 *
 * Routes
 * ------
 * POST /api/suppliers/portal/register       — vendor registers for portal
 * POST /api/suppliers/portal/login          — vendor login; returns simple token
 * POST /api/suppliers/portal/submit-invoice — vendor submits AP invoice
 * GET  /api/suppliers/portal/invoices       — vendor views own invoices
 *
 * Security
 * --------
 * - Registration and login are public (no JWT required).
 * - submit-invoice and invoice list require a vendor session token.
 * - Passwords are hashed with SHA-256 (bcrypt not bundled; SHA-256 sufficient
 *   for a demo/portal credential).  In production, replace with bcrypt.
 */

import express from 'express';
import { randomUUID, createHash } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const VENDORS_COL    = 'vendors';
const AP_COL         = 'ap_invoices';
const SESSIONS_COL   = 'vendor_sessions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashPassword(plain) {
  return createHash('sha256').update(plain + process.env.SESSION_SECRET || 'gf-portal-salt').digest('hex');
}

function generateToken() {
  return randomUUID().replace(/-/g, '');
}

async function resolveVendorSession(req, res) {
  const header  = req.headers.authorization || '';
  const token   = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Vendor authentication required' });
    return null;
  }
  const adapter = await getAdapter();
  const session = await adapter.findOne(SESSIONS_COL, { token });
  if (!session || new Date(session.expiresAt) < new Date()) {
    res.status(401).json({ error: 'Invalid or expired vendor session' });
    return null;
  }
  return session;
}

// ── POST /portal/register ─────────────────────────────────────────────────────

router.post('/portal/register', async (req, res) => {
  try {
    const { name, contactEmail, password, address, paymentTermsDays, taxId } = req.body;
    if (!name || !contactEmail || !password) {
      return res.status(400).json({ error: 'name, contactEmail, and password are required' });
    }

    const adapter     = await getAdapter();
    const existing    = await adapter.findOne(VENDORS_COL, { contactEmail });
    const now         = new Date().toISOString();
    const passwordHash = hashPassword(password);

    let vendor;
    if (existing) {
      await adapter.updateOne(VENDORS_COL, { id: existing.id }, {
        $set: { status: 'portal_user', portalPasswordHash: passwordHash, updatedAt: now },
      });
      vendor = { ...existing, status: 'portal_user' };
    } else {
      vendor = {
        id:                randomUUID(),
        tenantId:          null, // portal vendors start without a tenant; assigned by admin later
        name,
        contactEmail,
        address:           address           || null,
        paymentTermsDays:  paymentTermsDays  ? Number(paymentTermsDays) : 30,
        bankAccount:       null,
        taxId:             taxId             || null,
        status:            'portal_user',
        portalPasswordHash: passwordHash,
        createdAt:         now,
        updatedAt:         now,
      };
      await adapter.insertOne(VENDORS_COL, vendor);
    }

    const { portalPasswordHash: _, ...safeVendor } = vendor;
    res.status(201).json({ vendor: safeVendor, message: 'Registered successfully' });
  } catch (err) {
    logger.error('Supplier portal: register error', { error: err.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /portal/login ────────────────────────────────────────────────────────

router.post('/portal/login', async (req, res) => {
  try {
    const { contactEmail, password } = req.body;
    if (!contactEmail || !password) {
      return res.status(400).json({ error: 'contactEmail and password are required' });
    }

    const adapter  = await getAdapter();
    const vendor   = await adapter.findOne(VENDORS_COL, { contactEmail });
    if (!vendor || vendor.status === 'suspended') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hash = hashPassword(password);
    if (hash !== vendor.portalPasswordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token     = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    await adapter.insertOne(SESSIONS_COL, {
      id:        randomUUID(),
      token,
      vendorId:  vendor.id,
      vendorName: vendor.name,
      tenantId:  vendor.tenantId,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    res.json({ token, expiresAt, vendorId: vendor.id, vendorName: vendor.name });
  } catch (err) {
    logger.error('Supplier portal: login error', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /portal/submit-invoice ───────────────────────────────────────────────

router.post('/portal/submit-invoice', async (req, res) => {
  try {
    const session = await resolveVendorSession(req, res);
    if (!session) return;

    const {
      invoiceNo, invoiceDate, dueDate,
      lineItems = [], currency = 'USD', totalAmount, taxAmount,
      purchaseOrderRef, goodsReceiptRef,
    } = req.body;

    if (!invoiceNo || !totalAmount) {
      return res.status(400).json({ error: 'invoiceNo and totalAmount are required' });
    }

    const now     = new Date().toISOString();
    const invoice = {
      id:                  randomUUID(),
      tenantId:            session.tenantId,
      vendorId:            session.vendorId,
      vendorName:          session.vendorName,
      invoiceNo,
      invoiceDate:         invoiceDate || now,
      dueDate:             dueDate     || null,
      lineItems,
      currency,
      totalAmount:         Number(totalAmount),
      taxAmount:           Number(taxAmount || 0),
      status:              'received',
      purchaseOrderRef:    purchaseOrderRef  || null,
      goodsReceiptRef:     goodsReceiptRef   || null,
      threeWayMatchStatus: 'pending',
      paymentRef:          null,
      submittedViaPortal:  true,
      createdAt:           now,
      updatedAt:           now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(AP_COL, invoice);
    res.status(201).json({ invoice });
  } catch (err) {
    logger.error('Supplier portal: submit invoice error', { error: err.message });
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
});

// ── GET /portal/invoices ──────────────────────────────────────────────────────

router.get('/portal/invoices', async (req, res) => {
  try {
    const session = await resolveVendorSession(req, res);
    if (!session) return;

    const adapter  = await getAdapter();
    const filter   = { vendorId: session.vendorId };
    if (session.tenantId) filter.tenantId = session.tenantId;

    const invoices = await adapter.findMany(AP_COL, filter, { limit: 200 });
    res.json({ invoices });
  } catch (err) {
    logger.error('Supplier portal: list invoices error', { error: err.message });
    res.status(500).json({ error: 'Failed to list invoices' });
  }
});

export default router;
