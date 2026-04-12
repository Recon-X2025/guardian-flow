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

router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const policies = await adapter.findMany('sla_policies', { tenant_id: tenantId }, { limit: 50 });
    res.json({ policies });
  } catch (err) {
    logger.error('SLA policies error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/policies', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, service_type, tiers } = req.body;
    if (!name || !service_type) return res.status(400).json({ error: 'name and service_type are required' });
    const adapter = await getAdapter();
    const policy = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      service_type,
      tiers: tiers || [],
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('sla_policies', policy);
    res.status(201).json({ policy });
  } catch (err) {
    logger.error('SLA policy create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/evaluate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { work_order_id, service_type, created_at: createdAt, resolved_at: resolvedAt, priority } = req.body;
    const adapter = await getAdapter();
    const policies = await adapter.findMany('sla_policies', { tenant_id: tenantId, service_type }, { limit: 10 });
    const policy = policies[0];
    if (!policy) return res.json({ breached: false, message: 'No matching policy' });
    const tier = (policy.tiers || []).find(t => t.name === priority) || policy.tiers?.[0];
    if (!tier) return res.json({ breached: false, message: 'No matching tier' });
    const createdMs = new Date(createdAt).getTime();
    const resolvedMs = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
    const elapsedHrs = (resolvedMs - createdMs) / 3600000;
    const breached = elapsedHrs > (tier.resolution_time_hrs || 24);
    const evaluation = {
      id: randomUUID(),
      tenant_id: tenantId,
      work_order_id,
      policy_id: policy.id,
      tier_name: tier.name,
      elapsed_hrs: Math.round(elapsedHrs * 100) / 100,
      resolution_time_hrs: tier.resolution_time_hrs,
      breached,
      evaluated_at: new Date().toISOString(),
    };
    await adapter.insertOne('sla_evaluations', evaluation);
    if (breached) {
      await adapter.insertOne('sla_breaches', {
        id: randomUUID(),
        tenant_id: tenantId,
        work_order_id,
        policy_id: policy.id,
        elapsed_hrs: evaluation.elapsed_hrs,
        penalty_pct: tier.penalty_pct || 0,
        created_at: new Date().toISOString(),
      });
    }
    res.json({ evaluation, breached });
  } catch (err) {
    logger.error('SLA evaluate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/breaches', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const breaches = await adapter.findMany('sla_breaches', { tenant_id: tenantId }, { limit: 100 });
    res.json({ breaches });
  } catch (err) {
    logger.error('SLA breaches error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const evals = await adapter.findMany('sla_evaluations', { tenant_id: tenantId }, { limit: 500 });
    const total = evals.length;
    const breached = evals.filter(e => e.breached).length;
    const complianceRate = total ? Math.round(((total - breached) / total) * 10000) / 100 : 100;
    const avgResolution = total ? Math.round(evals.reduce((s, e) => s + (e.elapsed_hrs || 0), 0) / total * 100) / 100 : 0;
    res.json({ total_evaluations: total, breaches: breached, compliance_rate_pct: complianceRate, avg_resolution_hrs: avgResolution });
  } catch (err) {
    logger.error('SLA metrics error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
