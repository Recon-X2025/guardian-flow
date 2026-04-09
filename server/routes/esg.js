import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const reports = await adapter.findMany('esg_reports', { tenant_id: tenantId }, { limit: 50 });
    res.json({ reports });
  } catch (err) {
    logger.error('ESG reports list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reports', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period, framework, metrics } = req.body;
    if (!period || !framework) return res.status(400).json({ error: 'period and framework are required' });
    const adapter = await getAdapter();
    const report = {
      id: randomUUID(),
      tenant_id: tenantId,
      period,
      framework,
      metrics: metrics || {},
      status: 'draft',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('esg_reports', report);
    res.status(201).json({ report });
  } catch (err) {
    logger.error('ESG report create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const report = await adapter.findOne('esg_reports', { id: req.params.id, tenant_id: tenantId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report });
  } catch (err) {
    logger.error('ESG report get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reports/:id/submit', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const report = await adapter.findOne('esg_reports', { id: req.params.id, tenant_id: tenantId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    await adapter.updateOne('esg_reports', { id: req.params.id }, { status: 'submitted', submitted_at: new Date().toISOString() });
    res.json({ submitted: true });
  } catch (err) {
    logger.error('ESG report submit error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/benchmarks', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const benchmarks = await adapter.findMany('esg_benchmarks', {}, { limit: 50 });
    res.json({ benchmarks });
  } catch (err) {
    logger.error('ESG benchmarks error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
