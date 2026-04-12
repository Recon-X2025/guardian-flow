/**
 * @file server/routes/webhook-delivery.js
 * @description Webhook Delivery Manager
 *
 * Provides reliable webhook delivery with retry logic, delivery tracking, and
 * per-tenant webhook endpoint management.
 *
 * Routes
 * ------
 * POST   /api/webhook-delivery/endpoints          — register a webhook endpoint
 * GET    /api/webhook-delivery/endpoints          — list endpoints for tenant
 * DELETE /api/webhook-delivery/endpoints/:id      — remove an endpoint
 * POST   /api/webhook-delivery/trigger            — enqueue a webhook delivery
 * GET    /api/webhook-delivery/deliveries         — list recent deliveries
 * POST   /api/webhook-delivery/deliveries/:id/retry — manually retry a failed delivery
 *
 * Retry schedule (exponential backoff):
 *   Attempt 1 → immediate
 *   Attempt 2 → 30 s
 *   Attempt 3 → 5 min
 * After 3 failures the delivery is marked "failed" and no further retries occur.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import crypto from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const ENDPOINTS_COLLECTION  = 'webhook_endpoints';
const DELIVERIES_COLLECTION = 'webhook_deliveries';

const RETRY_DELAYS_MS = [0, 30_000, 300_000]; // attempt 1, 2, 3
const MAX_ATTEMPTS    = 3;
const TIMEOUT_MS      = 10_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sign the payload body with HMAC-SHA256 using the endpoint's signing secret.
 * Returns the hex digest as the X-GuardianFlow-Signature header value.
 */
function signPayload(secret, body) {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

/**
 * Attempt to deliver a webhook payload to a single endpoint URL.
 * Returns { success, statusCode, responseBody, durationMs }.
 */
async function attemptDelivery(url, secret, eventType, payload) {
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GuardianFlow-Event':     eventType,
        'X-GuardianFlow-Signature': signature,
        'X-GuardianFlow-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const responseBody = await response.text().catch(() => '');
    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 500),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: null,
      responseBody: err.message,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Execute the delivery attempt, update the delivery record, and schedule a
 * retry if needed.  Runs asynchronously — caller does not await this.
 */
async function executeDelivery(deliveryId) {
  const adapter = await getAdapter();
  const delivery = await adapter.findOne(DELIVERIES_COLLECTION, { id: deliveryId });

  if (!delivery) {
    logger.warn('[webhook-delivery] delivery record not found', { deliveryId });
    return;
  }

  const endpoint = await adapter.findOne(ENDPOINTS_COLLECTION, { id: delivery.endpoint_id });
  if (!endpoint || !endpoint.active) {
    await adapter.updateOne(DELIVERIES_COLLECTION, { id: deliveryId }, {
      status: 'cancelled',
      updated_at: new Date(),
    });
    return;
  }

  const attemptNumber = (delivery.attempt_count || 0) + 1;
  logger.info('[webhook-delivery] attempting delivery', { deliveryId, attemptNumber, url: endpoint.url });

  const result = await attemptDelivery(
    endpoint.url,
    endpoint.signing_secret,
    delivery.event_type,
    delivery.payload,
  );

  const updates = {
    attempt_count: attemptNumber,
    last_attempt_at: new Date(),
    last_status_code: result.statusCode,
    last_response_body: result.responseBody,
    last_duration_ms: result.durationMs,
    updated_at: new Date(),
  };

  if (result.success) {
    updates.status = 'delivered';
    updates.delivered_at = new Date();
    logger.info('[webhook-delivery] delivered', { deliveryId, statusCode: result.statusCode });
  } else if (attemptNumber >= MAX_ATTEMPTS) {
    updates.status = 'failed';
    logger.warn('[webhook-delivery] permanently failed', { deliveryId, attemptNumber });
  } else {
    updates.status = 'pending';
    const delayMs = RETRY_DELAYS_MS[attemptNumber] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    updates.next_attempt_at = new Date(Date.now() + delayMs);
    logger.info('[webhook-delivery] scheduled retry', { deliveryId, delayMs, attemptNumber });
    setTimeout(() => executeDelivery(deliveryId), delayMs);
  }

  await adapter.updateOne(DELIVERIES_COLLECTION, { id: deliveryId }, updates);
}

// ── POST /api/webhook-delivery/endpoints ─────────────────────────────────────

router.post('/endpoints', authenticateToken, async (req, res) => {
  try {
    const { url, event_types, description } = req.body;
    const tenantId = req.user.tenantId;

    if (!url || !event_types || !Array.isArray(event_types) || event_types.length === 0) {
      return res.status(400).json({ error: 'url and event_types[] are required' });
    }

    try { new URL(url); } catch {
      return res.status(400).json({ error: 'url must be a valid URL' });
    }

    const adapter = await getAdapter();
    const endpoint = {
      id: randomUUID(),
      tenant_id: tenantId,
      url,
      event_types,
      description: description || '',
      signing_secret: crypto.randomBytes(32).toString('hex'),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await adapter.insertOne(ENDPOINTS_COLLECTION, endpoint);

    // Return endpoint without exposing the raw signing secret in full
    res.status(201).json({
      data: { ...endpoint, signing_secret: `${endpoint.signing_secret.slice(0, 8)}…` },
    });
  } catch (err) {
    logger.error('[webhook-delivery] create endpoint error', { err: err.message });
    res.status(500).json({ error: 'Failed to create webhook endpoint' });
  }
});

// ── GET /api/webhook-delivery/endpoints ──────────────────────────────────────

router.get('/endpoints', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const endpoints = await adapter.findMany(ENDPOINTS_COLLECTION, {
      tenant_id: req.user.tenantId,
    });
    // Strip secrets from list view
    const sanitised = (endpoints || []).map(ep => ({ ...ep, signing_secret: undefined }));
    res.json({ data: sanitised });
  } catch (err) {
    logger.error('[webhook-delivery] list endpoints error', { err: err.message });
    res.status(500).json({ error: 'Failed to list endpoints' });
  }
});

// ── DELETE /api/webhook-delivery/endpoints/:id ───────────────────────────────

router.delete('/endpoints/:id', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const endpoint = await adapter.findOne(ENDPOINTS_COLLECTION, {
      id: req.params.id, tenant_id: req.user.tenantId,
    });
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });

    await adapter.updateOne(ENDPOINTS_COLLECTION, { id: req.params.id }, {
      active: false, updated_at: new Date(),
    });
    res.json({ message: 'Endpoint deactivated' });
  } catch (err) {
    logger.error('[webhook-delivery] delete endpoint error', { err: err.message });
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

// ── POST /api/webhook-delivery/trigger ───────────────────────────────────────

router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const { event_type, payload } = req.body;
    const tenantId = req.user.tenantId;

    if (!event_type || !payload) {
      return res.status(400).json({ error: 'event_type and payload are required' });
    }

    const adapter = await getAdapter();

    // Find all active endpoints subscribed to this event type
    const endpoints = await adapter.findMany(ENDPOINTS_COLLECTION, {
      tenant_id: tenantId,
      active: true,
    });

    const subscribed = (endpoints || []).filter(ep =>
      Array.isArray(ep.event_types) &&
      (ep.event_types.includes(event_type) || ep.event_types.includes('*'))
    );

    if (subscribed.length === 0) {
      return res.json({ message: 'No subscribed endpoints', deliveries: [] });
    }

    const deliveries = await Promise.all(subscribed.map(async ep => {
      const delivery = {
        id: randomUUID(),
        tenant_id: tenantId,
        endpoint_id: ep.id,
        event_type,
        payload,
        status: 'pending',
        attempt_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        next_attempt_at: new Date(),
      };
      await adapter.insertOne(DELIVERIES_COLLECTION, delivery);
      // Fire and forget — first attempt is immediate
      setImmediate(() => executeDelivery(delivery.id));
      return { deliveryId: delivery.id, endpointId: ep.id, url: ep.url };
    }));

    res.json({ message: 'Webhook deliveries enqueued', deliveries });
  } catch (err) {
    logger.error('[webhook-delivery] trigger error', { err: err.message });
    res.status(500).json({ error: 'Failed to trigger webhooks' });
  }
});

// ── GET /api/webhook-delivery/deliveries ─────────────────────────────────────

router.get('/deliveries', authenticateToken, async (req, res) => {
  try {
    const { status, limit = '50' } = req.query;
    const adapter = await getAdapter();
    const filter = { tenant_id: req.user.tenantId };
    if (status) filter.status = status;

    const deliveries = await adapter.findMany(DELIVERIES_COLLECTION, filter, {
      sort: { created_at: -1 },
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });
    res.json({ data: deliveries || [] });
  } catch (err) {
    logger.error('[webhook-delivery] list deliveries error', { err: err.message });
    res.status(500).json({ error: 'Failed to list deliveries' });
  }
});

// ── POST /api/webhook-delivery/deliveries/:id/retry ──────────────────────────

router.post('/deliveries/:id/retry', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const delivery = await adapter.findOne(DELIVERIES_COLLECTION, {
      id: req.params.id, tenant_id: req.user.tenantId,
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.status === 'delivered') {
      return res.status(400).json({ error: 'Delivery already succeeded' });
    }

    // Reset attempt count so the full 3-retry cycle runs again
    await adapter.updateOne(DELIVERIES_COLLECTION, { id: delivery.id }, {
      status: 'pending',
      attempt_count: 0,
      updated_at: new Date(),
      next_attempt_at: new Date(),
    });

    setImmediate(() => executeDelivery(delivery.id));
    res.json({ message: 'Retry enqueued', deliveryId: delivery.id });
  } catch (err) {
    logger.error('[webhook-delivery] retry error', { err: err.message });
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

export default router;
