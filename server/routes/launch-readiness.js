/**
 * @file server/routes/launch-readiness.js
 * @description Production Readiness & Launch — Sprint 52.
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const DEFAULT_CHECKLIST = [
  { id: 'sec-01', category: 'Security', title: 'Secrets rotated and vault configured', status: 'pending' },
  { id: 'sec-02', category: 'Security', title: 'Penetration test completed', status: 'pending' },
  { id: 'sec-03', category: 'Security', title: 'OWASP Top-10 review passed', status: 'pending' },
  { id: 'inf-01', category: 'Infrastructure', title: 'Auto-scaling policies configured', status: 'pending' },
  { id: 'inf-02', category: 'Infrastructure', title: 'Disaster recovery runbook tested', status: 'pending' },
  { id: 'inf-03', category: 'Infrastructure', title: 'CDN and TLS certificates in place', status: 'pending' },
  { id: 'obs-01', category: 'Observability', title: 'Alerting rules deployed', status: 'pending' },
  { id: 'obs-02', category: 'Observability', title: 'Runbooks linked to alerts', status: 'pending' },
  { id: 'db-01',  category: 'Database', title: 'Backups verified and tested', status: 'pending' },
  { id: 'db-02',  category: 'Database', title: 'Migration scripts rolled back successfully', status: 'pending' },
  { id: 'qa-01',  category: 'QA', title: 'E2E test suite green', status: 'pending' },
  { id: 'qa-02',  category: 'QA', title: 'Load test at 2x expected peak', status: 'pending' },
  { id: 'doc-01', category: 'Documentation', title: 'API docs published', status: 'pending' },
  { id: 'doc-02', category: 'Documentation', title: 'Runbook available to on-call team', status: 'pending' },
];

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

async function ensureChecklist(tenantId) {
  const adapter = await getAdapter();
  const existing = await adapter.findMany('launch_checklist', { tenant_id: tenantId }, { limit: 1 });
  if (existing.length === 0) {
    for (const item of DEFAULT_CHECKLIST) {
      await adapter.insertOne('launch_checklist', { ...item, tenant_id: tenantId, updated_at: new Date() });
    }
  }
}

// GET /api/launch/checklist
router.get('/checklist', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    await ensureChecklist(tenantId);
    const adapter = await getAdapter();
    const items = await adapter.findMany('launch_checklist', { tenant_id: tenantId }, { limit: 100 });
    res.json({ items });
  } catch (err) {
    logger.error('launch: get checklist error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/launch/checklist/:itemId
router.put('/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { status, notes } = req.body;
    const VALID = ['pending', 'in_progress', 'done', 'blocked'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const adapter = await getAdapter();
    await adapter.updateOne('launch_checklist', { id: req.params.itemId, tenant_id: tenantId }, { status, notes: notes || null, updated_at: new Date() });
    const item = await adapter.findOne('launch_checklist', { id: req.params.itemId, tenant_id: tenantId });
    res.json({ item });
  } catch (err) {
    logger.error('launch: update checklist item error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/launch/score
router.get('/score', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    await ensureChecklist(tenantId);
    const adapter = await getAdapter();
    const items = await adapter.findMany('launch_checklist', { tenant_id: tenantId }, { limit: 100 });
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    const score = total > 0 ? Math.round((done / total) * 100) : 0;
    res.json({ score, done, total, ready: score === 100 });
  } catch (err) {
    logger.error('launch: get score error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/launch/runbook
router.get('/runbook', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const steps = await adapter.findMany('launch_runbooks', { tenant_id: tenantId }, { limit: 50, sort: { order: 1 } });
    res.json({ steps });
  } catch (err) {
    logger.error('launch: get runbook error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
