/**
 * ESG Routes
 * GET/POST /api/esg/emissions
 * GET      /api/esg/emissions/summary?year=
 * GET/POST /api/esg/targets
 * GET      /api/esg/targets/:id/progress
 * GET/POST /api/esg/reports
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/emissions/summary', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const { year } = req.query;
    let records = await adapter.findMany('emissions_records', { tenant_id: req.user.tenantId });
    if (year) {
      records = records.filter(r => r.period_start && new Date(r.period_start).getFullYear() === parseInt(year, 10));
    }
    let scope1 = 0, scope2 = 0, scope3 = 0;
    for (const r of records) {
      const qty = Number(r.quantity_kg_co2e) || 0;
      if (r.scope === 1 || r.scope === '1') scope1 += qty;
      else if (r.scope === 2 || r.scope === '2') scope2 += qty;
      else if (r.scope === 3 || r.scope === '3') scope3 += qty;
    }
    res.json({ scope1, scope2, scope3, total: scope1 + scope2 + scope3, year: year || null });
  } catch (err) {
    logger.error('ESG: emissions summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to get emissions summary' });
  }
});

router.get('/emissions', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const records = await adapter.findMany('emissions_records', { tenant_id: req.user.tenantId });
    res.json({ records, total: records.length });
  } catch (err) {
    logger.error('ESG: list emissions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list emissions records' });
  }
});

router.post('/emissions', async (req, res) => {
  try {
    const { scope, category, source, quantity_kg_co2e, period_start, period_end, verification_status } = req.body;
    if (!scope || quantity_kg_co2e === undefined) {
      return res.status(400).json({ error: 'scope and quantity_kg_co2e are required' });
    }
    const adapter = await getAdapter();
    const record = {
      id: randomUUID(), tenant_id: req.user.tenantId, scope, category: category || null,
      source: source || null, quantity_kg_co2e, period_start: period_start || null,
      period_end: period_end || null, verification_status: verification_status || 'pending',
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('emissions_records', record);
    res.status(201).json({ record });
  } catch (err) {
    logger.error('ESG: create emission error', { error: err.message });
    res.status(500).json({ error: 'Failed to create emissions record' });
  }
});

router.get('/targets', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const targets = await adapter.findMany('esg_targets', { tenant_id: req.user.tenantId });
    res.json({ targets, total: targets.length });
  } catch (err) {
    logger.error('ESG: list targets error', { error: err.message });
    res.status(500).json({ error: 'Failed to list ESG targets' });
  }
});

router.post('/targets', async (req, res) => {
  try {
    const { target_type, baseline_year, target_year, baseline_kg, target_kg, description } = req.body;
    if (!target_type) return res.status(400).json({ error: 'target_type is required' });
    const adapter = await getAdapter();
    const target = {
      id: randomUUID(), tenant_id: req.user.tenantId, target_type,
      baseline_year: baseline_year || null, target_year: target_year || null,
      baseline_kg: baseline_kg || 0, target_kg: target_kg || 0,
      description: description || null,
    };
    await adapter.insertOne('esg_targets', target);
    res.status(201).json({ target });
  } catch (err) {
    logger.error('ESG: create target error', { error: err.message });
    res.status(500).json({ error: 'Failed to create ESG target' });
  }
});

router.get('/targets/:id/progress', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const target = await adapter.findOne('esg_targets', { id: req.params.id, tenant_id: tenantId });
    if (!target) return res.status(404).json({ error: 'ESG target not found' });

    const currentYear = new Date().getFullYear();
    const records = await adapter.findMany('emissions_records', { tenant_id: tenantId });
    const yearRecords = records.filter(r => r.period_start && new Date(r.period_start).getFullYear() === currentYear);
    const current_kg = yearRecords.reduce((sum, r) => sum + (Number(r.quantity_kg_co2e) || 0), 0);
    const baseline_kg = Number(target.baseline_kg) || 0;
    const target_kg = Number(target.target_kg) || 0;
    const denominator = baseline_kg - target_kg;
    const percent_achieved = denominator !== 0 ? ((baseline_kg - current_kg) / denominator) * 100 : 0;

    res.json({
      current_kg, target_kg, baseline_kg,
      percent_achieved: +percent_achieved.toFixed(2),
      on_track: current_kg <= target_kg,
    });
  } catch (err) {
    logger.error('ESG: target progress error', { error: err.message });
    res.status(500).json({ error: 'Failed to get target progress' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const reports = await adapter.findMany('esg_reports', { tenant_id: req.user.tenantId });
    res.json({ reports, total: reports.length });
  } catch (err) {
    logger.error('ESG: list reports error', { error: err.message });
    res.status(500).json({ error: 'Failed to list ESG reports' });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const { framework, period_start, period_end, status, sections } = req.body;
    if (!framework) return res.status(400).json({ error: 'framework is required' });
    const adapter = await getAdapter();
    const report = {
      id: randomUUID(), tenant_id: req.user.tenantId, framework,
      period_start: period_start || null, period_end: period_end || null,
      status: status || 'draft', sections: sections || {},
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('esg_reports', report);
    res.status(201).json({ report });
  } catch (err) {
    logger.error('ESG: create report error', { error: err.message });
    res.status(500).json({ error: 'Failed to create ESG report' });
  }
});

export default router;
