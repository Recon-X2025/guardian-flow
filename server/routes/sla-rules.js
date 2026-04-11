/**
 * SLA Rules Routes
 * GET/POST  /api/sla-rules/templates
 * PUT/DELETE /api/sla-rules/templates/:id
 * POST      /api/sla-rules/templates/:id/apply/:workOrderId
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/templates', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const templates = await adapter.findMany('sla_templates', { tenant_id: req.user.tenantId });
    res.json({ templates, total: templates.length });
  } catch (err) {
    logger.error('SLA: list templates error', { error: err.message });
    res.status(500).json({ error: 'Failed to list SLA templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, response_sla_hours, resolution_sla_hours, applies_to, escalation_tiers } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const template = {
      id: randomUUID(), tenant_id: req.user.tenantId, name,
      response_sla_hours: response_sla_hours || 4,
      resolution_sla_hours: resolution_sla_hours || 24,
      applies_to: applies_to || null,
      escalation_tiers: escalation_tiers || [],
      created_at: new Date(),
    };
    await adapter.insertOne('sla_templates', template);
    res.status(201).json({ template });
  } catch (err) {
    logger.error('SLA: create template error', { error: err.message });
    res.status(500).json({ error: 'Failed to create SLA template' });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const template = await adapter.findOne('sla_templates', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!template) return res.status(404).json({ error: 'SLA template not found' });
    const allowed = ['name', 'response_sla_hours', 'resolution_sla_hours', 'applies_to', 'escalation_tiers'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('sla_templates', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ template: { ...template, ...updates } });
  } catch (err) {
    logger.error('SLA: update template error', { error: err.message });
    res.status(500).json({ error: 'Failed to update SLA template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const template = await adapter.findOne('sla_templates', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!template) return res.status(404).json({ error: 'SLA template not found' });
    await adapter.deleteOne('sla_templates', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('SLA: delete template error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete SLA template' });
  }
});

router.post('/templates/:id/apply/:workOrderId', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const template = await adapter.findOne('sla_templates', { id: req.params.id, tenant_id: tenantId });
    if (!template) return res.status(404).json({ error: 'SLA template not found' });
    const workOrder = await adapter.findOne('work_orders', { id: req.params.workOrderId, tenant_id: tenantId });
    if (!workOrder) return res.status(404).json({ error: 'Work order not found' });

    const base = new Date(workOrder.created_at || new Date());
    const response_deadline = new Date(base.getTime() + (template.response_sla_hours || 4) * 60 * 60 * 1000);
    const resolution_deadline = new Date(base.getTime() + (template.resolution_sla_hours || 24) * 60 * 60 * 1000);

    await adapter.updateOne('work_orders', { id: req.params.workOrderId, tenant_id: tenantId }, {
      response_deadline, resolution_deadline, sla_template_id: template.id,
    });

    res.json({ applied: true, response_deadline, resolution_deadline });
  } catch (err) {
    logger.error('SLA: apply template error', { error: err.message });
    res.status(500).json({ error: 'Failed to apply SLA template' });
  }
});

export default router;
