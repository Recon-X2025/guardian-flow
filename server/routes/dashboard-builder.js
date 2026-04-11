/**
 * Dashboard Builder Routes
 * GET/POST   /api/dashboards
 * PUT/DELETE /api/dashboards/:id
 * GET/POST   /api/dashboards/:id/widgets
 * DELETE     /api/dashboards/:id/widgets/:widgetId
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const dashboards = await adapter.findMany('custom_dashboards', { tenant_id: req.user.tenantId });
    res.json({ dashboards, total: dashboards.length });
  } catch (err) {
    logger.error('Dashboards: list error', { error: err.message });
    res.status(500).json({ error: 'Failed to list dashboards' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, is_public, layout } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const now = new Date();
    const dashboard = {
      id: randomUUID(), tenant_id: req.user.tenantId, name,
      description: description || null, is_public: is_public || false,
      layout: layout || {}, created_by: req.user.userId, created_at: now, updated_at: now,
    };
    await adapter.insertOne('custom_dashboards', dashboard);
    res.status(201).json({ dashboard });
  } catch (err) {
    logger.error('Dashboards: create error', { error: err.message });
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const dashboard = await adapter.findOne('custom_dashboards', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    const allowed = ['name', 'description', 'is_public', 'layout'];
    const updates = { updated_at: new Date() };
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('custom_dashboards', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ dashboard: { ...dashboard, ...updates } });
  } catch (err) {
    logger.error('Dashboards: update error', { error: err.message });
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const dashboard = await adapter.findOne('custom_dashboards', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    await adapter.deleteOne('custom_dashboards', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('Dashboards: delete error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

router.get('/:id/widgets', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const widgets = await adapter.findMany('dashboard_widgets', { dashboard_id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ widgets, total: widgets.length });
  } catch (err) {
    logger.error('Dashboards: list widgets error', { error: err.message });
    res.status(500).json({ error: 'Failed to list widgets' });
  }
});

router.post('/:id/widgets', async (req, res) => {
  try {
    const { widget_type, config, position } = req.body;
    if (!widget_type) return res.status(400).json({ error: 'widget_type is required' });
    const adapter = await getAdapter();
    const dashboard = await adapter.findOne('custom_dashboards', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    const widget = {
      id: randomUUID(), dashboard_id: req.params.id, tenant_id: req.user.tenantId,
      widget_type, config: config || {}, position: position || { x: 0, y: 0, w: 4, h: 3 },
      created_at: new Date(),
    };
    await adapter.insertOne('dashboard_widgets', widget);
    res.status(201).json({ widget });
  } catch (err) {
    logger.error('Dashboards: create widget error', { error: err.message });
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

router.delete('/:id/widgets/:widgetId', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const widget = await adapter.findOne('dashboard_widgets', { id: req.params.widgetId, tenant_id: req.user.tenantId });
    if (!widget) return res.status(404).json({ error: 'Widget not found' });
    await adapter.deleteOne('dashboard_widgets', { id: req.params.widgetId, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('Dashboards: delete widget error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

export default router;
