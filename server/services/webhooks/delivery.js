import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { getAdapter } from '../../db/factory.js';
import logger from '../../utils/logger.js';

const DELIVERIES_COL = 'webhook_deliveries';
const RETRY_DELAYS_SEC = [60, 300, 1800, 7200, 86400];
const MAX_ATTEMPTS = 5;
const TIMEOUT_MS = 10_000;

function signPayload(secret, body) {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

export async function attemptDelivery(deliveryId) {
  const adapter = await getAdapter();
  const delivery = await adapter.findOne(DELIVERIES_COL, { id: deliveryId });
  if (!delivery) return;

  const body = JSON.stringify(delivery.payload);
  const signature = signPayload(delivery.secret || '', body);
  const now = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(delivery.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GuardianFlow-Signature': signature,
        'X-GuardianFlow-Event': delivery.event,
        'X-GuardianFlow-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      await adapter.updateOne(DELIVERIES_COL, { id: deliveryId }, {
        status: 'delivered', lastAttemptAt: now,
      });
      return { success: true };
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    const attempts = (delivery.attempts || 0) + 1;
    const errorLog = [...(delivery.errorLog || []), { at: now, error: err.message }];

    if (attempts >= MAX_ATTEMPTS) {
      await adapter.updateOne(DELIVERIES_COL, { id: deliveryId }, {
        status: 'dead_letter', attempts, lastAttemptAt: now, errorLog,
      });
    } else {
      const delaySec = RETRY_DELAYS_SEC[attempts - 1] || 86400;
      const nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();
      await adapter.updateOne(DELIVERIES_COL, { id: deliveryId }, {
        status: 'failed', attempts, lastAttemptAt: now, nextRetryAt, errorLog,
      });
    }
    return { success: false, error: err.message };
  }
}

export async function enqueueDelivery(tenantId, webhookId, event, payload, endpointUrl, secret) {
  const adapter = await getAdapter();
  const delivery = {
    id: randomUUID(),
    tenantId,
    webhookId,
    event,
    payload,
    endpointUrl,
    secret,
    status: 'pending',
    attempts: 0,
    lastAttemptAt: null,
    nextRetryAt: null,
    errorLog: [],
    createdAt: new Date().toISOString(),
  };
  await adapter.insertOne(DELIVERIES_COL, delivery);
  attemptDelivery(delivery.id).catch(e => logger.error('Delivery attempt failed', { error: e.message }));
  return delivery;
}
