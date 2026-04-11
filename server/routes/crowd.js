/**
 * @file server/routes/crowd.js
 * @description Crowd Marketplace API — Sprint 35.
 *
 * Routes
 * ------
 * POST /api/crowd/partners                        — create crowd partner
 * GET  /api/crowd/partners                        — list crowd partners for tenant
 * GET  /api/crowd/partners/:id                    — get single partner
 * PUT  /api/crowd/partners/:id/approve            — set status to 'active'
 * PUT  /api/crowd/partners/:id/suspend            — set status to 'suspended'
 * POST /api/work-orders/:id/assign-crowd          — assign WO to crowd partner
 * POST /api/crowd/inbound/accept                  — partner accepts WO (HMAC-verified)
 * POST /api/crowd/inbound/decline                 — partner declines WO (HMAC-verified)
 *
 * Security
 * --------
 * All partner-management routes require authentication + tenant isolation.
 * Inbound webhook routes verify HMAC-SHA256 signature.
 */

import express from 'express';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

const PARTNERS_COL   = 'crowd_partners';
const WO_COL         = 'work_orders';

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function signPayload(secret, payload) {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function verifySig(secret, payload, signature) {
  const expected = Buffer.from(signPayload(secret, payload));
  let incoming;
  try { incoming = Buffer.from(signature, 'hex'); } catch { return false; }
  if (expected.length !== incoming.length) return false;
  return timingSafeEqual(expected, incoming);
}

/** Fire-and-forget HTTP POST to partner webhookUrl */
async function dispatchWebhook(webhookUrl, webhookSecret, payload) {
  try {
    const body    = JSON.stringify(payload);
    const sig     = signPayload(webhookSecret, payload);
    const parsed  = new URL(webhookUrl);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  {
        'Content-Type':             'application/json',
        'Content-Length':           Buffer.byteLength(body),
        'X-GuardianFlow-Signature': sig,
      },
      timeout: 5000,
    };
    const transport = parsed.protocol === 'https:' ? https : http;
    await new Promise((resolve, reject) => {
      const req = transport.request(options, (res) => {
        res.resume(); // drain response
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('webhook timeout')); });
      req.write(body);
      req.end();
    });
  } catch (err) {
    logger.warn('Crowd: webhook dispatch failed', { url: webhookUrl, error: err.message });
  }
}

// ── POST /api/crowd/partners ──────────────────────────────────────────────────

router.post('/partners', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { orgName, contactEmail, skills, territories, certifications, webhookUrl, webhookSecret } = req.body;

    if (!orgName || !contactEmail) {
      return res.status(400).json({ error: 'orgName and contactEmail are required' });
    }

    const adapter = await getAdapter();
    const partner = {
      id:             randomUUID(),
      tenantId,
      orgName,
      contactEmail,
      skills:         Array.isArray(skills)         ? skills         : [],
      territories:    Array.isArray(territories)    ? territories    : [],
      certifications: Array.isArray(certifications) ? certifications : [],
      status:         'invited',
      webhookUrl:     webhookUrl     || null,
      webhookSecret:  webhookSecret  || null,
      createdAt:      new Date().toISOString(),
    };

    await adapter.insertOne(PARTNERS_COL, partner);

    // Log invitation (email service not wired yet)
    logger.info('Crowd: partner invited', { partnerId: partner.id, orgName, contactEmail, tenantId });

    res.status(201).json({ partner });
  } catch (error) {
    logger.error('Crowd: create partner error', { error: error.message });
    res.status(500).json({ error: 'Failed to create crowd partner' });
  }
});

// ── GET /api/crowd/partners ───────────────────────────────────────────────────

router.get('/partners', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const partners = await adapter.findMany(PARTNERS_COL, { tenantId });
    res.json({ partners });
  } catch (error) {
    logger.error('Crowd: list partners error', { error: error.message });
    res.status(500).json({ error: 'Failed to list crowd partners' });
  }
});

// ── GET /api/crowd/partners/:id ───────────────────────────────────────────────

router.get('/partners/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const partner  = await adapter.findOne(PARTNERS_COL, { id: req.params.id, tenantId });
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json({ partner });
  } catch (error) {
    logger.error('Crowd: get partner error', { error: error.message });
    res.status(500).json({ error: 'Failed to get crowd partner' });
  }
});

// ── PUT /api/crowd/partners/:id/approve ──────────────────────────────────────

router.put('/partners/:id/approve', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const partner  = await adapter.findOne(PARTNERS_COL, { id: req.params.id, tenantId });
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    await adapter.updateOne(PARTNERS_COL, { id: req.params.id, tenantId }, { status: 'active' });
    const updated = await adapter.findOne(PARTNERS_COL, { id: req.params.id, tenantId });
    res.json({ partner: updated });
  } catch (error) {
    logger.error('Crowd: approve partner error', { error: error.message });
    res.status(500).json({ error: 'Failed to approve crowd partner' });
  }
});

// ── PUT /api/crowd/partners/:id/suspend ──────────────────────────────────────

router.put('/partners/:id/suspend', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const partner  = await adapter.findOne(PARTNERS_COL, { id: req.params.id, tenantId });
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    await adapter.updateOne(PARTNERS_COL, { id: req.params.id, tenantId }, { status: 'suspended' });
    const updated = await adapter.findOne(PARTNERS_COL, { id: req.params.id, tenantId });
    res.json({ partner: updated });
  } catch (error) {
    logger.error('Crowd: suspend partner error', { error: error.message });
    res.status(500).json({ error: 'Failed to suspend crowd partner' });
  }
});

// ── POST /api/work-orders/:id/assign-crowd ────────────────────────────────────

router.post('/:id/assign-crowd', authenticateToken, async (req, res) => {
  try {
    const tenantId  = await resolveTenantId(req.user.id);
    const { partnerId } = req.body;

    if (!partnerId) return res.status(400).json({ error: 'partnerId is required' });

    const adapter = await getAdapter();

    const wo = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const partner = await adapter.findOne(PARTNERS_COL, { id: partnerId, tenantId });
    if (!partner) return res.status(404).json({ error: 'Crowd partner not found' });
    if (partner.status !== 'active') {
      return res.status(400).json({ error: 'Crowd partner is not active' });
    }

    await adapter.updateOne(
      WO_COL,
      { id: req.params.id, tenant_id: tenantId },
      {
        crowd_partner_id: partnerId,
        crowd_status:     'pending_acceptance',
        updated_at:       new Date().toISOString(),
      },
    );

    if (partner.webhookUrl && partner.webhookSecret) {
      dispatchWebhook(partner.webhookUrl, partner.webhookSecret, {
        event:       'crowd_assignment_created',
        workOrderId: req.params.id,
        tenantId,
      });
    }

    const updated = await adapter.findOne(WO_COL, { id: req.params.id, tenant_id: tenantId });
    res.json({ workOrder: updated });
  } catch (error) {
    logger.error('Crowd: assign-crowd error', { error: error.message });
    res.status(500).json({ error: 'Failed to assign crowd partner to work order' });
  }
});

// ── POST /api/crowd/inbound/accept ────────────────────────────────────────────

router.post('/inbound/accept', async (req, res) => {
  try {
    const { workOrderId, partnerId } = req.body;
    const signature = req.headers['x-guardianflow-signature'];

    if (!workOrderId || !partnerId) {
      return res.status(400).json({ error: 'workOrderId and partnerId are required' });
    }
    if (!signature) return res.status(401).json({ error: 'Missing signature' });

    const adapter = await getAdapter();
    const partner = await adapter.findOne(PARTNERS_COL, { id: partnerId });
    if (!partner || !partner.webhookSecret) {
      return res.status(401).json({ error: 'Invalid partner or missing secret' });
    }

    if (!verifySig(partner.webhookSecret, req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const wo = await adapter.findOne(WO_COL, { id: workOrderId, crowd_partner_id: partnerId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    await adapter.updateOne(
      WO_COL,
      { id: workOrderId },
      { crowd_status: 'accepted', updated_at: new Date().toISOString() },
    );

    logger.info('Crowd: WO accepted', { workOrderId, partnerId });
    res.json({ success: true, crowd_status: 'accepted' });
  } catch (error) {
    logger.error('Crowd: inbound accept error', { error: error.message });
    res.status(500).json({ error: 'Failed to process acceptance' });
  }
});

// ── POST /api/crowd/inbound/decline ───────────────────────────────────────────

router.post('/inbound/decline', async (req, res) => {
  try {
    const { workOrderId, partnerId } = req.body;
    const signature = req.headers['x-guardianflow-signature'];

    if (!workOrderId || !partnerId) {
      return res.status(400).json({ error: 'workOrderId and partnerId are required' });
    }
    if (!signature) return res.status(401).json({ error: 'Missing signature' });

    const adapter = await getAdapter();
    const partner = await adapter.findOne(PARTNERS_COL, { id: partnerId });
    if (!partner || !partner.webhookSecret) {
      return res.status(401).json({ error: 'Invalid partner or missing secret' });
    }

    if (!verifySig(partner.webhookSecret, req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const wo = await adapter.findOne(WO_COL, { id: workOrderId, crowd_partner_id: partnerId });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    await adapter.updateOne(
      WO_COL,
      { id: workOrderId },
      {
        crowd_status:     'declined',
        crowd_partner_id: null,
        updated_at:       new Date().toISOString(),
      },
    );

    logger.info('Crowd: WO declined', { workOrderId, partnerId });
    res.json({ success: true, crowd_status: 'declined' });
  } catch (error) {
    logger.error('Crowd: inbound decline error', { error: error.message });
    res.status(500).json({ error: 'Failed to process decline' });
  }
});

export default router;
