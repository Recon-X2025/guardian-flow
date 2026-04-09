import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { findMany, countDocuments } from '../db/query.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/event', authenticateToken, async (req, res) => {
  try {
    const { event_type, severity = 'low', details = {} } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ error: 'severity must be one of: low, medium, high, critical' });
    }

    const adapter = await getAdapter();
    const id = randomUUID();

    await adapter.insertOne('security_events', {
      id,
      tenant_id: req.user.tenantId || null,
      event_type,
      severity,
      user_id: req.user.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      details,
      created_at: new Date(),
    });

    return res.status(201).json({ message: 'Security event recorded', id });
  } catch (err) {
    logger.error('POST /security-monitor/event error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { severity, limit: limitParam = 50, page: pageParam = 1 } = req.query;

    const limit = Math.min(parseInt(limitParam) || 50, 200);
    const page = parseInt(pageParam) || 1;

    const roles = await findMany('user_roles', { user_id: req.user.id });
    const isAdmin = roles.some(r => r.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const filter = {};
    if (severity) {
      filter.severity = severity;
    }

    const adapter = await getAdapter();
    const skip = (page - 1) * limit;

    const events = await findMany('security_events', filter, { sort: { created_at: -1 }, limit, skip });
    const total = await countDocuments('security_events', filter).catch(() => events.length);

    return res.json({ events, total, page, limit });
  } catch (err) {
    logger.error('GET /security-monitor/events error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/health', (_req, res) => {
  return res.json({ status: 'ok', service: 'security-monitor', timestamp: new Date() });
});

export default router;
