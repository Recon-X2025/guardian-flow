import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdapter } from '../db/factory.js';
import { enqueueDelivery, attemptDelivery } from '../services/webhooks/delivery.js';
import logger from '../utils/logger.js';

const router = express.Router();

const EVENT_TYPES = [
  'work_order.created', 'work_order.completed', 'work_order.cancelled',
  'asset.created', 'asset.updated', 'asset.decommissioned',
  'invoice.created', 'invoice.paid', 'invoice.overdue',
  'anomaly.detected', 'esg.activity.created',
  'maintenance.triggered', 'iot.threshold.exceeded',
];

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/events', authenticateToken, (req, res) => {
  res.json({ events: EVENT_TYPES });
});

router.get('/:id/delivery-log', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const deliveries = await adapter.findMany(
      'webhook_deliveries',
      { webhookId: req.params.id, tenantId },
      { limit: 50 }
    );
    res.json({ deliveries, total: deliveries.length });
  } catch (err) {
    logger.error('Webhook delivery log error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/retry', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ error: 'deliveryId is required' });

    const adapter = await getAdapter();
    const delivery = await adapter.findOne('webhook_deliveries', {
      id: deliveryId,
      webhookId: req.params.id,
      tenantId,
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.status !== 'dead_letter' && delivery.status !== 'failed') {
      return res.status(400).json({ error: 'Only dead_letter or failed deliveries can be retried' });
    }

    await adapter.updateOne('webhook_deliveries', { id: deliveryId }, {
      attempts: 0,
      status: 'pending',
      nextRetryAt: null,
    });

    attemptDelivery(deliveryId).catch(e =>
      logger.error('Retry delivery attempt failed', { error: e.message })
    );

    res.json({ retried: true, deliveryId });
  } catch (err) {
    logger.error('Webhook retry error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
