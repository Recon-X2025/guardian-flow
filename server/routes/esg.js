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

router.post('/activities', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { period, scope, activityType, quantity, unit } = req.body;
    if (!period || !scope || !activityType || quantity === undefined || !unit) {
      return res.status(400).json({ error: 'period, scope, activityType, quantity, and unit are required' });
    }
    const adapter = await getAdapter();
    const factor = await adapter.findOne('esg_emission_factors', { activityType });
    if (!factor) return res.status(400).json({ error: 'Unknown activityType — no emission factor found' });
    const co2eKg = quantity * factor.factor;
    const activity = {
      id: randomUUID(),
      tenantId,
      period,
      scope,
      activityType,
      quantity,
      unit,
      emissionFactor: factor.factor,
      co2eKg,
      createdAt: new Date().toISOString(),
    };
    await adapter.insertOne('esg_activities', activity);
    res.status(201).json({ activity });
  } catch (err) {
    logger.error('ESG activity create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const filter = { tenantId };
    if (req.query.scope) filter.scope = req.query.scope;
    if (req.query.period) filter.period = req.query.period;
    const activities = await adapter.findMany('esg_activities', filter, { limit: 200 });
    res.json({ activities, total: activities.length });
  } catch (err) {
    logger.error('ESG activities list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/scope', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const year = req.query.year || String(new Date().getFullYear());
    const adapter = await getAdapter();

    const allActivities = await adapter.findMany('esg_activities', { tenantId }, { limit: 5000 });
    const current = allActivities.filter(a => a.period && a.period.includes(year));
    const lastYear = String(Number(year) - 1);
    const prev = allActivities.filter(a => a.period && a.period.includes(lastYear));

    function groupByScope(items) {
      const scopes = { 1: [], 2: [], 3: [] };
      for (const item of items) {
        const s = Number(item.scope);
        if (scopes[s]) scopes[s].push(item);
      }
      return scopes;
    }

    function sumCo2e(items) {
      return items.reduce((sum, a) => sum + (a.co2eKg || 0), 0);
    }

    const curScopes = groupByScope(current);
    const total = sumCo2e(current);
    const lastTotal = sumCo2e(prev);
    const vsLastYear = lastTotal === 0 ? null : ((total - lastTotal) / lastTotal * 100).toFixed(1);

    res.json({
      year,
      scope1: { total_co2e: sumCo2e(curScopes[1]), activities: curScopes[1] },
      scope2: { total_co2e: sumCo2e(curScopes[2]), activities: curScopes[2] },
      scope3: { total_co2e: sumCo2e(curScopes[3]), activities: curScopes[3] },
      total,
      vsLastYear,
    });
  } catch (err) {
    logger.error('ESG scope report error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/cdp-template', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const year = req.query.year || String(new Date().getFullYear());
    const adapter = await getAdapter();

    const allActivities = await adapter.findMany('esg_activities', { tenantId }, { limit: 5000 });
    const current = allActivities.filter(a => a.period && a.period.includes(year));

    function groupByScope(items) {
      const scopes = { 1: [], 2: [], 3: [] };
      for (const item of items) {
        const s = Number(item.scope);
        if (scopes[s]) scopes[s].push(item);
      }
      return scopes;
    }

    const scopes = groupByScope(current);
    const sumCo2e = items => items.reduce((sum, a) => sum + (a.co2eKg || 0), 0);

    const template = {
      governance: {
        oversight: 'Board-level ESG oversight',
        frequency: 'Quarterly',
      },
      risks_opportunities: {
        climate_risk: 'Transition and physical risks assessed annually',
      },
      scope1: {
        total_co2e_kg: sumCo2e(scopes[1]),
        unit: 'kg CO2e',
        activities: scopes[1],
      },
      scope2: {
        total_co2e_kg: sumCo2e(scopes[2]),
        unit: 'kg CO2e',
        activities: scopes[2],
      },
      scope3: {
        total_co2e_kg: sumCo2e(scopes[3]),
        unit: 'kg CO2e',
        activities: scopes[3],
      },
      water: { consumption_m3: 0, source: 'Municipal' },
      energy: { total_kwh: 0, renewable_pct: 0 },
    };

    res.setHeader('Content-Disposition', 'attachment; filename=cdp-template.json');
    res.json(template);
  } catch (err) {
    logger.error('ESG CDP template error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

