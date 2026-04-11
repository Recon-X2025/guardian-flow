/**
 * Industry Template Manager
 * CRUD for workflow templates, versions, and execution.
 *
 * Routes:
 *   GET    /api/industry-templates                        — list templates
 *   POST   /api/industry-templates                        — create template
 *   GET    /api/industry-templates/:id                    — get template
 *   PUT    /api/industry-templates/:id                    — update template
 *   DELETE /api/industry-templates/:id                    — delete template
 *   POST   /api/industry-templates/:id/versions           — publish a new version
 *   GET    /api/industry-templates/:id/versions           — list versions
 *   POST   /api/industry-templates/:id/execute            — execute / instantiate template
 *   GET    /api/industry-templates/executions             — list executions
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

const TEMPLATES_COL = 'workflow_templates';
const VERSIONS_COL = 'workflow_template_versions';
const EXECUTIONS_COL = 'workflow_executions';

const INDUSTRIES = ['manufacturing', 'telecom', 'energy', 'retail', 'logistics', 'facility_management', 'it_services', 'construction', 'healthcare', 'generic'];

// ── GET /api/industry-templates ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { industry, status } = req.query;
    const filter = { tenant_id: tenantId };
    if (industry) filter.industry = industry;
    if (status) filter.status = status;
    const templates = await db.find(TEMPLATES_COL, filter, { sort: { created_at: -1 } });
    res.json({ templates });
  } catch (err) {
    logger.error('industry-template: list', { error: err.message });
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// ── GET /api/industry-templates/executions ────────────────────────────────────
router.get('/executions', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const executions = await db.find(EXECUTIONS_COL, { tenant_id: tenantId }, { sort: { started_at: -1 }, limit: 50 });
    res.json({ executions });
  } catch (err) {
    logger.error('industry-template: list executions', { error: err.message });
    res.status(500).json({ error: 'Failed to list executions' });
  }
});

// ── POST /api/industry-templates ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { name, industry, description, steps, trigger_type } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (industry && !INDUSTRIES.includes(industry)) {
      return res.status(400).json({ error: `industry must be one of: ${INDUSTRIES.join(', ')}` });
    }
    const template = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      industry: industry || 'generic',
      description: description || '',
      steps: steps || [],
      trigger_type: trigger_type || 'manual',
      status: 'draft',
      current_version: '1.0.0',
      created_by: req.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.insert(TEMPLATES_COL, template);

    // Auto-create v1
    const version = {
      id: randomUUID(),
      template_id: template.id,
      version: '1.0.0',
      steps: template.steps,
      published_by: req.user?.id,
      published_at: new Date().toISOString(),
    };
    await db.insert(VERSIONS_COL, version);

    res.status(201).json({ template });
  } catch (err) {
    logger.error('industry-template: create', { error: err.message });
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ── GET /api/industry-templates/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Template not found' });
    res.json({ template: items[0] });
  } catch (err) {
    logger.error('industry-template: get', { error: err.message });
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// ── PUT /api/industry-templates/:id ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const allowed = ['name', 'industry', 'description', 'steps', 'trigger_type', 'status'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    await db.update(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId }, { $set: updates });
    const items = await db.find(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId });
    res.json({ template: items[0] });
  } catch (err) {
    logger.error('industry-template: update', { error: err.message });
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ── DELETE /api/industry-templates/:id ───────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    await db.delete(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('industry-template: delete', { error: err.message });
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ── POST /api/industry-templates/:id/versions ─────────────────────────────────
router.post('/:id/versions', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Template not found' });
    const template = items[0];

    const { steps, version_note } = req.body;
    const prev = template.current_version || '1.0.0';
    const parts = prev.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    const newVersion = parts.join('.');

    const version = {
      id: randomUUID(),
      template_id: template.id,
      version: newVersion,
      steps: steps || template.steps,
      version_note: version_note || '',
      published_by: req.user?.id,
      published_at: new Date().toISOString(),
    };
    await db.insert(VERSIONS_COL, version);
    await db.update(TEMPLATES_COL, { id: template.id }, { $set: { current_version: newVersion, steps: version.steps, updated_at: new Date().toISOString() } });

    res.status(201).json({ version });
  } catch (err) {
    logger.error('industry-template: publish version', { error: err.message });
    res.status(500).json({ error: 'Failed to publish version' });
  }
});

// ── GET /api/industry-templates/:id/versions ─────────────────────────────────
router.get('/:id/versions', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const templates = await db.find(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId });
    if (!templates.length) return res.status(404).json({ error: 'Template not found' });
    const versions = await db.find(VERSIONS_COL, { template_id: req.params.id }, { sort: { published_at: -1 } });
    res.json({ versions });
  } catch (err) {
    logger.error('industry-template: list versions', { error: err.message });
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

// ── POST /api/industry-templates/:id/execute ─────────────────────────────────
router.post('/:id/execute', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(TEMPLATES_COL, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Template not found' });
    const template = items[0];
    const { context_data } = req.body;

    const execution = {
      id: randomUUID(),
      tenant_id: tenantId,
      template_id: template.id,
      template_name: template.name,
      version: template.current_version,
      context_data: context_data || {},
      status: 'running',
      step_results: [],
      started_by: req.user?.id,
      started_at: new Date().toISOString(),
    };

    // Execute steps sequentially (synchronous stub — real impl would be async/queued)
    for (const step of (template.steps || [])) {
      execution.step_results.push({
        step_name: step.name || step.id || 'step',
        step_type: step.type || 'task',
        status: 'completed',
        executed_at: new Date().toISOString(),
      });
    }

    execution.status = 'completed';
    execution.completed_at = new Date().toISOString();
    await db.insert(EXECUTIONS_COL, execution);

    res.status(201).json({ execution });
  } catch (err) {
    logger.error('industry-template: execute', { error: err.message });
    res.status(500).json({ error: 'Failed to execute template' });
  }
});

export default router;
