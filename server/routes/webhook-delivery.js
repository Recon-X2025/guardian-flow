/**
 * Webhook Delivery Manager
 * Manages outbound webhook registrations, delivery attempts, and retry logic.
 *
 * Routes:
 *   GET    /api/webhooks                          — list registered webhooks
 *   POST   /api/webhooks                          — register a new webhook
 *   GET    /api/webhooks/:id                      — get webhook details
 *   PUT    /api/webhooks/:id                      — update webhook
 *   DELETE /api/webhooks/:id                      — delete webhook
 *   GET    /api/webhooks/:id/deliveries           — list delivery attempts
 *   POST   /api/webhooks/:id/test                 — send a test event
 *   POST   /api/webhooks/:id/deliveries/:did/retry — retry a failed delivery
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

const COLLECTION = 'webhooks';
const DELIVERY_COLLECTION = 'webhook_deliveries';
const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [1000, 5000, 30000, 300000, 1800000]; // 1s, 5s, 30s, 5m, 30m

// ── GET /api/webhooks ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(COLLECTION, { tenant_id: tenantId }, { sort: { created_at: -1 } });
    res.json({ webhooks: items });
  } catch (err) {
    logger.error('webhook-delivery: list', { error: err.message });
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// ── POST /api/webhooks ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { url, events, secret, description } = req.body;
    if (!url || !events?.length) {
      return res.status(400).json({ error: 'url and events are required' });
    }
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const webhook = {
      id: randomUUID(),
      tenant_id: tenantId,
      url,
      events: Array.isArray(events) ? events : [events],
      secret: secret || randomUUID().replace(/-/g, ''),
      description: description || '',
      active: true,
      created_by: req.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.insert(COLLECTION, webhook);
    res.status(201).json({ webhook });
  } catch (err) {
    logger.error('webhook-delivery: create', { error: err.message });
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// ── GET /api/webhooks/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(COLLECTION, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ webhook: items[0] });
  } catch (err) {
    logger.error('webhook-delivery: get', { error: err.message });
    res.status(500).json({ error: 'Failed to get webhook' });
  }
});

// ── PUT /api/webhooks/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { url, events, description, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (url !== undefined) {
      try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
      updates.url = url;
    }
    if (events !== undefined) updates.events = Array.isArray(events) ? events : [events];
    if (description !== undefined) updates.description = description;
    if (active !== undefined) updates.active = Boolean(active);
    await db.update(COLLECTION, { id: req.params.id, tenant_id: tenantId }, { $set: updates });
    const items = await db.find(COLLECTION, { id: req.params.id, tenant_id: tenantId });
    res.json({ webhook: items[0] });
  } catch (err) {
    logger.error('webhook-delivery: update', { error: err.message });
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// ── DELETE /api/webhooks/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    await db.delete(COLLECTION, { id: req.params.id, tenant_id: tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('webhook-delivery: delete', { error: err.message });
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// ── GET /api/webhooks/:id/deliveries ──────────────────────────────────────────
router.get('/:id/deliveries', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const webhooks = await db.find(COLLECTION, { id: req.params.id, tenant_id: tenantId });
    if (!webhooks.length) return res.status(404).json({ error: 'Webhook not found' });
    const deliveries = await db.find(DELIVERY_COLLECTION, { webhook_id: req.params.id }, { sort: { created_at: -1 }, limit: 100 });
    res.json({ deliveries });
  } catch (err) {
    logger.error('webhook-delivery: list deliveries', { error: err.message });
    res.status(500).json({ error: 'Failed to list deliveries' });
  }
});

// ── POST /api/webhooks/:id/test ───────────────────────────────────────────────
router.post('/:id/test', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const webhooks = await db.find(COLLECTION, { id: req.params.id, tenant_id: tenantId });
    if (!webhooks.length) return res.status(404).json({ error: 'Webhook not found' });
    const webhook = webhooks[0];

    const payload = { event: 'ping', timestamp: new Date().toISOString(), webhook_id: webhook.id };
    const result = await deliverWebhook(webhook, payload);
    res.json({ delivery: result });
  } catch (err) {
    logger.error('webhook-delivery: test', { error: err.message });
    res.status(500).json({ error: 'Failed to send test event' });
  }
});

// ── POST /api/webhooks/:id/deliveries/:did/retry ──────────────────────────────
router.post('/:id/deliveries/:did/retry', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const webhooks = await db.find(COLLECTION, { id: req.params.id, tenant_id: tenantId });
    if (!webhooks.length) return res.status(404).json({ error: 'Webhook not found' });
    const deliveries = await db.find(DELIVERY_COLLECTION, { id: req.params.did, webhook_id: req.params.id });
    if (!deliveries.length) return res.status(404).json({ error: 'Delivery not found' });

    const delivery = deliveries[0];
    const result = await deliverWebhook(webhooks[0], delivery.payload, delivery.id);
    res.json({ delivery: result });
  } catch (err) {
    logger.error('webhook-delivery: retry', { error: err.message });
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

// ── Internal: deliver a webhook with retry tracking ───────────────────────────
async function deliverWebhook(webhook, payload, existingDeliveryId = null) {
  const db = await getAdapter();
  const deliveryId = existingDeliveryId || randomUUID();
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

  let statusCode = null;
  let responseBody = null;
  let success = false;
  let attempt = 0;

  for (let i = 0; i < MAX_RETRIES; i++) {
    attempt = i + 1;
    if (i > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[i - 1] || 1000));
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const resp = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Guardian-Signature': `sha256=${signature}`,
          'X-Guardian-Event': payload.event || 'unknown',
          'X-Guardian-Delivery': deliveryId,
        },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      statusCode = resp.status;
      responseBody = await resp.text().catch(() => '');
      if (resp.ok) { success = true; break; }
    } catch (err) {
      responseBody = err.message;
    }
  }

  const record = {
    id: deliveryId,
    webhook_id: webhook.id,
    event: payload.event || 'unknown',
    payload,
    status: success ? 'success' : 'failed',
    status_code: statusCode,
    response_body: responseBody?.slice(0, 500),
    attempts: attempt,
    created_at: new Date().toISOString(),
  };

  if (existingDeliveryId) {
    await db.update(DELIVERY_COLLECTION, { id: deliveryId }, { $set: { ...record, updated_at: new Date().toISOString() } });
  } else {
    await db.insert(DELIVERY_COLLECTION, record);
  }
  return record;
}

export { deliverWebhook };
export default router;
