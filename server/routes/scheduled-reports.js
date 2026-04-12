/**
 * Scheduled Reports Routes
 * GET/POST   /api/scheduled-reports
 * PUT/DELETE /api/scheduled-reports/:id
 * POST       /api/scheduled-reports/:id/run-now
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const reports = await adapter.findMany('scheduled_reports', { tenant_id: req.user.tenantId });
    res.json({ reports, total: reports.length });
  } catch (err) {
    logger.error('ScheduledReports: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list scheduled reports' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, report_type, schedule_cron, recipients, format, enabled } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const report = {
      id: randomUUID(), tenant_id: req.user.tenantId, name,
      report_type: report_type || null, schedule_cron: schedule_cron || null,
      recipients: recipients || [], format: format || 'pdf', last_run: null, next_run: null,
      enabled: enabled !== false, created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('scheduled_reports', report);
    res.status(201).json({ report });
  } catch (err) {
    logger.error('ScheduledReports: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create scheduled report' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const report = await adapter.findOne('scheduled_reports', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!report) return res.status(404).json({ error: 'Scheduled report not found' });
    const allowed = ['name', 'report_type', 'schedule_cron', 'recipients', 'format', 'enabled', 'next_run'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('scheduled_reports', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ report: { ...report, ...updates } });
  } catch (err) {
    logger.error('ScheduledReports: update error', { error: err.message });
    res.status(500).json({ error: 'Failed to update scheduled report' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const report = await adapter.findOne('scheduled_reports', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!report) return res.status(404).json({ error: 'Scheduled report not found' });
    await adapter.deleteOne('scheduled_reports', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('ScheduledReports: delete error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete scheduled report' });
  }
});

// Map report_type values to the collection that holds that data
const REPORT_TYPE_COLLECTION = {
  work_orders: 'work_orders',
  invoices: 'invoices',
  tickets: 'tickets',
  assets: 'assets',
  crm_leads: 'crm_leads',
  crm_deals: 'crm_deals',
  esg: 'esg_reports',
  sla: 'sla_configs',
};

router.post('/:id/run-now', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const report = await adapter.findOne('scheduled_reports', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!report) return res.status(404).json({ error: 'Scheduled report not found' });
    const ran_at = new Date();
    await adapter.updateOne('scheduled_reports', { id: req.params.id, tenant_id: req.user.tenantId }, { last_run: ran_at });

    // Query the relevant collection to get a real row count
    const collection = REPORT_TYPE_COLLECTION[report.report_type] || report.report_type;
    let row_count = null;
    if (collection) {
      try {
        row_count = await adapter.countDocuments(collection, { tenant_id: req.user.tenantId });
      } catch {
        // Collection may not exist yet — leave row_count null
      }
    }

    res.json({ executed: true, report_id: req.params.id, ran_at, row_count, format: report.format });
  } catch (err) {
    logger.error('ScheduledReports: run-now error', { error: err.message });
    res.status(500).json({ error: 'Failed to run scheduled report' });
  }
});

export default router;
