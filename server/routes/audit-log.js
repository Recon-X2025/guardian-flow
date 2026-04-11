/**
 * Audit Log Routes
 * GET /api/audit-log?from=&to=&actor=&page=&per_page=30
 * GET /api/audit-log/stats
 */

import express from 'express';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const logs = await adapter.findMany('audit_logs', { tenant_id: req.user.tenantId });
    const by_method = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
    const actorCounts = {};
    for (const log of logs) {
      if (log.method && by_method[log.method] !== undefined) by_method[log.method]++;
      if (log.actor_email) {
        actorCounts[log.actor_email] = (actorCounts[log.actor_email] || 0) + 1;
      }
    }
    const top_actors = Object.entries(actorCounts)
      .map(([actor_email, count]) => ({ actor_email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    res.json({ total: logs.length, by_method, top_actors });
  } catch (err) {
    logger.error('AuditLog: stats error', { error: err.message });
    res.status(500).json({ error: 'Failed to get audit log stats' });
  }
});

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { from, to, actor, page: rawPage = '1', per_page: rawPerPage = '30' } = req.query;
    const page = Math.max(parseInt(rawPage, 10) || 1, 1);
    const per_page = Math.min(parseInt(rawPerPage, 10) || 30, 100);

    let logs = await adapter.findMany('audit_logs', { tenant_id: req.user.tenantId });

    if (actor) {
      logs = logs.filter(l => l.actor_email && l.actor_email.toLowerCase().includes(actor.toLowerCase()));
    }
    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(l => new Date(l.created_at) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(l => new Date(l.created_at) <= toDate);
    }

    const total = logs.length;
    const start = (page - 1) * per_page;
    const paginated = logs.slice(start, start + per_page);

    res.json({ logs: paginated, total, page, per_page });
  } catch (err) {
    logger.error('AuditLog: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list audit logs' });
  }
});

export default router;
