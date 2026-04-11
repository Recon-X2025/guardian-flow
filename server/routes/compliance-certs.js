/**
 * @file server/routes/compliance-certs.js
 * @description Asset Compliance Certificates API — Sprint 36.
 *
 * Routes
 * ------
 * POST   /api/assets/:id/compliance-certs          — create cert
 * GET    /api/assets/:id/compliance-certs          — list certs for asset
 * PUT    /api/assets/compliance-certs/:certId      — update cert
 * DELETE /api/assets/compliance-certs/:certId      — delete cert
 *
 * Security
 * --------
 * All routes require authentication and strict tenant isolation.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const CERTS_COL  = 'asset_compliance_certs';
const ASSETS_COL = 'assets';

const CERT_TYPES = ['calibration', 'safety', 'insurance', 'warranty'];

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

/** Compute status based on expiryDate relative to now. */
function computeStatus(expiryDate) {
  if (!expiryDate) return 'valid';
  const now    = Date.now();
  const expiry = new Date(expiryDate).getTime();
  const diff   = expiry - now;
  if (diff <= 0) return 'expired';
  if (diff <= 30 * 24 * 60 * 60 * 1000) return 'expiring_soon';
  return 'valid';
}

// ── POST /api/assets/:id/compliance-certs ────────────────────────────────────

router.post('/:id/compliance-certs', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { id: assetId } = req.params;
    const { certType, issuer, issuedDate, expiryDate, documentUrl } = req.body;

    if (!certType || !CERT_TYPES.includes(certType)) {
      return res.status(400).json({ error: `certType must be one of: ${CERT_TYPES.join(', ')}` });
    }
    if (!issuer)     return res.status(400).json({ error: 'issuer is required' });
    if (!expiryDate) return res.status(400).json({ error: 'expiryDate is required' });

    const adapter = await getAdapter();
    const asset = await adapter.findOne(ASSETS_COL, { id: assetId, tenant_id: tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const cert = {
      id:          randomUUID(),
      assetId,
      tenantId,
      certType,
      issuer,
      issuedDate:  issuedDate  || null,
      expiryDate,
      documentUrl: documentUrl || null,
      status:      computeStatus(expiryDate),
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };

    await adapter.insertOne(CERTS_COL, cert);
    logger.info('ComplianceCerts: cert created', { certId: cert.id, assetId, tenantId });
    res.status(201).json({ cert });
  } catch (error) {
    logger.error('ComplianceCerts: create error', { error: error.message });
    res.status(500).json({ error: 'Failed to create compliance certificate' });
  }
});

// ── GET /api/assets/:id/compliance-certs ─────────────────────────────────────

router.get('/:id/compliance-certs', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { id: assetId } = req.params;

    const adapter = await getAdapter();
    const asset = await adapter.findOne(ASSETS_COL, { id: assetId, tenant_id: tenantId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const certs = await adapter.findMany(CERTS_COL, { assetId, tenantId });

    // Recompute status dynamically so stored value is always fresh
    const certsWithStatus = certs.map(c => ({
      ...c,
      status: computeStatus(c.expiryDate),
    }));

    res.json({ certs: certsWithStatus });
  } catch (error) {
    logger.error('ComplianceCerts: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list compliance certificates' });
  }
});

// ── PUT /api/assets/compliance-certs/:certId ─────────────────────────────────

router.put('/compliance-certs/:certId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { certId } = req.params;
    const { certType, issuer, issuedDate, expiryDate, documentUrl } = req.body;

    if (certType && !CERT_TYPES.includes(certType)) {
      return res.status(400).json({ error: `certType must be one of: ${CERT_TYPES.join(', ')}` });
    }

    const adapter = await getAdapter();
    const existing = await adapter.findOne(CERTS_COL, { id: certId, tenantId });
    if (!existing) return res.status(404).json({ error: 'Certificate not found' });

    const updates = {
      ...(certType    !== undefined && { certType }),
      ...(issuer      !== undefined && { issuer }),
      ...(issuedDate  !== undefined && { issuedDate }),
      ...(expiryDate  !== undefined && { expiryDate, status: computeStatus(expiryDate) }),
      ...(documentUrl !== undefined && { documentUrl }),
      updatedAt: new Date().toISOString(),
    };

    await adapter.updateOne(CERTS_COL, { id: certId, tenantId }, updates);
    const updated = await adapter.findOne(CERTS_COL, { id: certId, tenantId });

    res.json({ cert: { ...updated, status: computeStatus(updated.expiryDate) } });
  } catch (error) {
    logger.error('ComplianceCerts: update error', { error: error.message });
    res.status(500).json({ error: 'Failed to update compliance certificate' });
  }
});

// ── DELETE /api/assets/compliance-certs/:certId ──────────────────────────────

router.delete('/compliance-certs/:certId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { certId } = req.params;

    const adapter = await getAdapter();
    const existing = await adapter.findOne(CERTS_COL, { id: certId, tenantId });
    if (!existing) return res.status(404).json({ error: 'Certificate not found' });

    await adapter.deleteOne(CERTS_COL, { id: certId, tenantId });
    logger.info('ComplianceCerts: cert deleted', { certId, tenantId });
    res.json({ message: 'Certificate deleted' });
  } catch (error) {
    logger.error('ComplianceCerts: delete error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete compliance certificate' });
  }
});

export default router;
