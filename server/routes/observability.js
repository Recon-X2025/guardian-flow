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

router.get('/traces', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const traces = await adapter.findMany('obs_traces', { tenant_id: tenantId }, { limit: 100 });
    res.json({ traces });
  } catch (err) {
    logger.error('Observability traces error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/spans/:traceId', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const spans = await adapter.findMany('obs_spans', { tenant_id: tenantId, trace_id: req.params.traceId }, { limit: 200 });
    res.json({ spans });
  } catch (err) {
    logger.error('Observability spans error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/service-map', authenticateToken, async (req, res) => {
  try {
    const serviceMap = [
      { service: 'api-gateway', dependencies: ['auth', 'work-orders', 'assets'] },
      { service: 'auth', dependencies: ['db'] },
      { service: 'work-orders', dependencies: ['db', 'notifications'] },
      { service: 'assets', dependencies: ['db', 'iot'] },
      { service: 'iot', dependencies: ['db'] },
      { service: 'notifications', dependencies: [] },
      { service: 'db', dependencies: [] },
    ];
    res.json({ service_map: serviceMap });
  } catch (err) {
    logger.error('Service map error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/slo-status', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const slos = await adapter.findMany('obs_slo_status', { tenant_id: tenantId }, { limit: 50 });
    res.json({ slos });
  } catch (err) {
    logger.error('SLO status error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
