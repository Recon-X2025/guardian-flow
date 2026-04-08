import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { findMany } from '../db/query.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/predictions', authenticateToken, async (req, res) => {
  try {
    const { high_risk_only, limit: limitParam = 20 } = req.query;
    const limit = parseInt(limitParam) || 20;

    const filter = high_risk_only === 'true' ? { breach_probability: { $gte: 70 } } : {};
    const predictions = await findMany('sla_predictions', filter, {
      sort: { breach_probability: -1 },
      limit,
    });

    return res.json({ predictions });
  } catch (err) {
    logger.error('GET /sla-monitor/predictions error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await findMany('sla_alerts', { resolved_at: null }, {
      sort: { created_at: -1 },
      limit: 50,
    });

    return res.json({ alerts });
  } catch (err) {
    logger.error('GET /sla-monitor/alerts error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/alert', authenticateToken, async (req, res) => {
  try {
    const { work_order_id, alert_type, breach_probability } = req.body;

    if (!work_order_id || !alert_type) {
      return res.status(400).json({ error: 'work_order_id and alert_type are required' });
    }

    const adapter = await getAdapter();
    const id = randomUUID();

    await adapter.insertOne('sla_alerts', {
      id,
      work_order_id,
      alert_type,
      breach_probability: breach_probability ?? null,
      created_at: new Date(),
    });

    return res.status(201).json({ id, message: 'SLA alert created' });
  } catch (err) {
    logger.error('POST /sla-monitor/alert error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/alert/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();

    await adapter.updateOne(
      'sla_alerts',
      { id: req.params.id },
      { $set: { acknowledged_at: new Date(), acknowledged_by: req.user.id } }
    );

    return res.json({ message: 'Alert acknowledged' });
  } catch (err) {
    logger.error('PATCH /sla-monitor/alert/:id/acknowledge error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
