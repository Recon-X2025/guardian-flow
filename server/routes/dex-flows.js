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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const flows = await adapter.findMany('dex_flow_templates', { tenant_id: tenantId }, { limit: 50 });
    res.json({ flows });
  } catch (err) {
    logger.error('DEX flows list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { name, description, steps } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const adapter = await getAdapter();
    const flow = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      description: description || '',
      steps: steps || [],
      status: 'draft',
      created_at: new Date().toISOString(),
    };
    await adapter.insertOne('dex_flow_templates', flow);
    res.status(201).json({ flow });
  } catch (err) {
    logger.error('DEX flow create error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const flow = await adapter.findOne('dex_flow_templates', { id: req.params.id, tenant_id: tenantId });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json({ flow });
  } catch (err) {
    logger.error('DEX flow get error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const flow = await adapter.findOne('dex_flow_templates', { id: req.params.id, tenant_id: tenantId });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('dex_flow_templates', { id: req.params.id }, updates);
    res.json({ flow: { ...flow, ...updates } });
  } catch (err) {
    logger.error('DEX flow update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const flow = await adapter.findOne('dex_flow_templates', { id: req.params.id, tenant_id: tenantId });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    await adapter.deleteOne('dex_flow_templates', { id: req.params.id });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('DEX flow delete error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const flow = await adapter.findOne('dex_flow_templates', { id: req.params.id, tenant_id: tenantId });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    await adapter.updateOne('dex_flow_templates', { id: req.params.id }, { status: 'published', published_at: new Date().toISOString() });
    res.json({ published: true });
  } catch (err) {
    logger.error('DEX flow publish error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/instantiate', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const flow = await adapter.findOne('dex_flow_templates', { id: req.params.id, tenant_id: tenantId });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    const execution = {
      id: randomUUID(),
      tenant_id: tenantId,
      template_id: flow.id,
      template_name: flow.name,
      steps: flow.steps,
      current_step: 0,
      status: 'running',
      created_at: new Date().toISOString(),
    };
    res.status(201).json({ execution });
  } catch (err) {
    logger.error('DEX flow instantiate error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
