/**
 * @file server/routes/tax.js
 * @description Tax Engine routes — Avalara AvaTax / TaxJar / local fallback.
 *
 * Routes
 * ──────
 *  POST /api/tax/calculate     — calculate tax for a transaction
 *  POST /api/tax/validate      — validate and normalise a shipping address
 *  GET  /api/tax/rates         — list stored historical tax calculations for tenant
 *  GET  /api/tax/config        — return active provider info (no secrets)
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateTax, validateAddress } from '../services/taxEngine.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

function tenantId(req) {
  return req.user?.tenantId ?? req.user?.tenant_id ?? req.user?.id;
}

// ── POST /api/tax/calculate ───────────────────────────────────────────────────

router.post('/calculate', async (req, res) => {
  try {
    const tid = tenantId(req);
    const {
      subtotal, currency, destination, origin, line_items, shipping,
      customer_code, company_code, date, reference_id, reference_type,
    } = req.body;

    if (!subtotal || subtotal < 0) {
      return res.status(400).json({ error: 'subtotal must be a non-negative number' });
    }

    const result = await calculateTax({
      subtotal, currency, destination, origin, line_items, shipping,
      customer_code, company_code, date,
    });

    // Persist calculation for audit trail
    const adapter = await getAdapter();
    const record = {
      id: randomUUID(),
      tenant_id: tid,
      reference_id: reference_id ?? null,
      reference_type: reference_type ?? null,
      subtotal,
      currency: currency ?? 'USD',
      destination: destination ?? null,
      tax_amount: result.tax_amount,
      tax_rate: result.tax_rate,
      provider: result.provider,
      breakdown: result.breakdown,
      calculated_at: new Date().toISOString(),
    };
    await adapter.insertOne('tax_calculations', record);

    logger.info('tax: calculated', {
      tenantId: tid, provider: result.provider, subtotal, tax_amount: result.tax_amount,
    });
    res.json({ ...result, id: record.id, calculated_at: record.calculated_at });
  } catch (err) {
    logger.error('tax: calculate error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/validate ────────────────────────────────────────────────────

router.post('/validate', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'address is required' });
    const result = await validateAddress(address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/rates ────────────────────────────────────────────────────────

router.get('/rates', async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const { limit = 50, offset = 0, reference_id } = req.query;
    const filter = { tenant_id: tid };
    if (reference_id) filter.reference_id = reference_id;
    const calculations = await adapter.findMany('tax_calculations', filter, {
      limit: parseInt(limit),
      skip: parseInt(offset),
      sort: { calculated_at: -1 },
    });
    res.json({ calculations, total: calculations.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/config ───────────────────────────────────────────────────────

router.get('/config', (_req, res) => {
  const provider = (process.env.TAX_PROVIDER ?? 'local').toLowerCase();
  const isConfigured = provider === 'avalara'
    ? !!(process.env.AVALARA_ACCOUNT_ID && process.env.AVALARA_LICENSE_KEY)
    : provider === 'taxjar'
      ? !!process.env.TAXJAR_API_KEY
      : true;

  res.json({
    provider: isConfigured ? provider : 'local',
    configured: isConfigured,
    env: process.env.AVALARA_ENV ?? process.env.TAXJAR_ENV ?? 'sandbox',
  });
});

export default router;
