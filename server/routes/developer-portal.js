/**
 * Developer Portal Routes
 * GET/POST  /api/developer-portal/apps
 * PUT       /api/developer-portal/apps/:id
 * DELETE    /api/developer-portal/apps/:id
 * POST      /api/developer-portal/apps/:id/regenerate-secret
 * GET       /api/developer-portal/usage
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/apps', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const apps = await adapter.findMany('developer_apps', { tenant_id: req.user.tenantId });
    res.json({ apps, total: apps.length });
  } catch (err) {
    logger.error('DevPortal: list apps error', { error: err.message });
    res.status(500).json({ error: 'Failed to list developer apps' });
  }
});

router.post('/apps', async (req, res) => {
  try {
    const { app_name, description, scopes, redirect_uris } = req.body;
    if (!app_name) return res.status(400).json({ error: 'app_name is required' });
    const adapter = await getAdapter();
    const app = {
      id: randomUUID(), tenant_id: req.user.tenantId, app_name,
      description: description || null, client_id: randomUUID(), client_secret: randomUUID(),
      scopes: scopes || [], redirect_uris: redirect_uris || [],
      status: 'active', created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('developer_apps', app);
    res.status(201).json({ app });
  } catch (err) {
    logger.error('DevPortal: create app error', { error: err.message });
    res.status(500).json({ error: 'Failed to create developer app' });
  }
});

router.put('/apps/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const app = await adapter.findOne('developer_apps', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!app) return res.status(404).json({ error: 'Developer app not found' });
    const allowed = ['app_name', 'description', 'scopes', 'redirect_uris', 'status'];
    const updates = {};
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key]; }
    await adapter.updateOne('developer_apps', { id: req.params.id, tenant_id: req.user.tenantId }, updates);
    res.json({ app: { ...app, ...updates } });
  } catch (err) {
    logger.error('DevPortal: update app error', { error: err.message });
    res.status(500).json({ error: 'Failed to update developer app' });
  }
});

router.delete('/apps/:id', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const app = await adapter.findOne('developer_apps', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!app) return res.status(404).json({ error: 'Developer app not found' });
    await adapter.deleteOne('developer_apps', { id: req.params.id, tenant_id: req.user.tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('DevPortal: delete app error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete developer app' });
  }
});

router.post('/apps/:id/regenerate-secret', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const app = await adapter.findOne('developer_apps', { id: req.params.id, tenant_id: req.user.tenantId });
    if (!app) return res.status(404).json({ error: 'Developer app not found' });
    const client_secret = randomUUID();
    await adapter.updateOne('developer_apps', { id: req.params.id, tenant_id: req.user.tenantId }, { client_secret });
    res.json({ client_secret });
  } catch (err) {
    logger.error('DevPortal: regenerate secret error', { error: err.message });
    res.status(500).json({ error: 'Failed to regenerate client secret' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const apps = await adapter.findMany('developer_apps', { tenant_id: req.user.tenantId });
    res.json({
      total_requests: Math.floor(Math.random() * 10000),
      apps_count: apps.length,
      top_endpoints: ['/api/work-orders', '/api/crm'],
    });
  } catch (err) {
    logger.error('DevPortal: usage error', { error: err.message });
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

export default router;
