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
    const reports = await adapter.findMany('report_definitions', { tenant_id: tenantId }, { limit: 50 });
    res.json({ reports });
  } catch (err) {
    logger.error('Reporting reports list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reports', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, datasource, query_config, schedule, output_format } = req.body;
    if (!name || !datasource) return res.status(400).json({ error: 'name and datasource are required' });
    const adapter = await getAdapter();
    const report = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      datasource,
      query_config: query_config || {},
      schedule: schedule || null,
      output_format: output_format || 'json',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('report_definitions', report);
    res.status(201).json({ report });
  } catch (err) {
    logger.error('Reporting report create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reports/:id/run', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const report = await adapter.findOne('report_definitions', { id: req.params.id, tenant_id: tenantId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const run = {
      id: randomUUID(),
      tenant_id: tenantId,
      report_id: report.id,
      status: 'completed',
      row_count: 0,
      output_format: report.output_format,
      ran_at: new Date().toISOString(),
    };
    await adapter.insertOne('report_runs', run);
    res.json({ run, data: [] });
  } catch (err) {
    logger.error('Reporting run error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/:id/runs', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const runs = await adapter.findMany('report_runs', { tenant_id: tenantId, report_id: req.params.id }, { limit: 50 });
    res.json({ runs });
  } catch (err) {
    logger.error('Reporting runs list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/datasources', authenticateToken, async (req, res) => {
  try {
    const datasources = [
      { id: 'work_orders', name: 'Work Orders', description: 'Work order records' },
      { id: 'assets', name: 'Assets', description: 'Asset register' },
      { id: 'invoices', name: 'Invoices', description: 'Invoice data' },
      { id: 'customers', name: 'Customers', description: 'Customer records' },
      { id: 'iot_readings', name: 'IoT Readings', description: 'IoT telemetry' },
    ];
    res.json({ datasources });
  } catch (err) {
    logger.error('Reporting datasources error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
