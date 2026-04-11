/**
 * Compliance Policy Enforcer
 * Manages compliance policies (HIPAA, SOC2, ISO 27001, GDPR) and audit trails.
 *
 * Routes:
 *   GET    /api/compliance-policy                    — list policies
 *   POST   /api/compliance-policy                    — create policy
 *   GET    /api/compliance-policy/:id                — get policy
 *   PUT    /api/compliance-policy/:id                — update policy
 *   DELETE /api/compliance-policy/:id                — delete policy
 *   POST   /api/compliance-policy/:id/validate       — validate a resource against policy
 *   GET    /api/compliance-policy/audit-trail        — list audit trail entries
 *   GET    /api/compliance-policy/summary            — compliance posture summary
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

const POLICY_COL = 'compliance_policies';
const AUDIT_COL = 'compliance_audit_trails';

const POLICY_FRAMEWORKS = ['HIPAA', 'SOC2', 'ISO_27001', 'GDPR', 'PCI_DSS', 'NIST', 'CUSTOM'];

// ── GET /api/compliance-policy ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { framework, status } = req.query;
    const filter = { tenant_id: tenantId };
    if (framework) filter.framework = framework;
    if (status) filter.status = status;
    const policies = await db.find(POLICY_COL, filter, { sort: { created_at: -1 } });
    res.json({ policies });
  } catch (err) {
    logger.error('compliance-policy: list', { error: err.message });
    res.status(500).json({ error: 'Failed to list policies' });
  }
});

// ── POST /api/compliance-policy ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { name, framework, description, rules, severity } = req.body;
    if (!name || !framework) return res.status(400).json({ error: 'name and framework are required' });
    if (!POLICY_FRAMEWORKS.includes(framework)) {
      return res.status(400).json({ error: `framework must be one of: ${POLICY_FRAMEWORKS.join(', ')}` });
    }
    const policy = {
      id: randomUUID(),
      tenant_id: tenantId,
      name,
      framework,
      description: description || '',
      rules: rules || [],
      severity: severity || 'medium',
      status: 'active',
      created_by: req.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.insert(POLICY_COL, policy);
    res.status(201).json({ policy });
  } catch (err) {
    logger.error('compliance-policy: create', { error: err.message });
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// ── GET /api/compliance-policy/summary ───────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const policies = await db.find(POLICY_COL, { tenant_id: tenantId });
    const audits = await db.find(AUDIT_COL, { tenant_id: tenantId }, { sort: { created_at: -1 }, limit: 500 });

    const byFramework = {};
    for (const p of policies) {
      byFramework[p.framework] = (byFramework[p.framework] || 0) + 1;
    }
    const violations = audits.filter(a => a.result === 'violation').length;
    const passed = audits.filter(a => a.result === 'passed').length;

    res.json({
      total_policies: policies.length,
      active_policies: policies.filter(p => p.status === 'active').length,
      by_framework: byFramework,
      recent_violations: violations,
      recent_passed: passed,
      compliance_score: audits.length > 0 ? Math.round((passed / audits.length) * 100) : null,
    });
  } catch (err) {
    logger.error('compliance-policy: summary', { error: err.message });
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// ── GET /api/compliance-policy/audit-trail ────────────────────────────────────
router.get('/audit-trail', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const { policy_id, result } = req.query;
    const filter = { tenant_id: tenantId };
    if (policy_id) filter.policy_id = policy_id;
    if (result) filter.result = result;
    const entries = await db.find(AUDIT_COL, filter, { sort: { created_at: -1 }, limit: 100 });
    res.json({ entries });
  } catch (err) {
    logger.error('compliance-policy: audit-trail', { error: err.message });
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

// ── GET /api/compliance-policy/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(POLICY_COL, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Policy not found' });
    res.json({ policy: items[0] });
  } catch (err) {
    logger.error('compliance-policy: get', { error: err.message });
    res.status(500).json({ error: 'Failed to get policy' });
  }
});

// ── PUT /api/compliance-policy/:id ───────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const allowed = ['name', 'description', 'rules', 'severity', 'status'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    await db.update(POLICY_COL, { id: req.params.id, tenant_id: tenantId }, { $set: updates });
    const items = await db.find(POLICY_COL, { id: req.params.id, tenant_id: tenantId });
    res.json({ policy: items[0] });
  } catch (err) {
    logger.error('compliance-policy: update', { error: err.message });
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// ── DELETE /api/compliance-policy/:id ────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    await db.delete(POLICY_COL, { id: req.params.id, tenant_id: tenantId });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('compliance-policy: delete', { error: err.message });
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

// ── POST /api/compliance-policy/:id/validate ─────────────────────────────────
router.post('/:id/validate', async (req, res) => {
  try {
    const db = await getAdapter();
    const tenantId = req.user?.tenant_id;
    const items = await db.find(POLICY_COL, { id: req.params.id, tenant_id: tenantId });
    if (!items.length) return res.status(404).json({ error: 'Policy not found' });
    const policy = items[0];
    const { resource_type, resource_id, resource_data } = req.body;
    if (!resource_type) return res.status(400).json({ error: 'resource_type is required' });

    // Evaluate rules against resource_data
    const violations = [];
    for (const rule of (policy.rules || [])) {
      const { field, operator, value } = rule;
      if (!field || !operator) continue;
      const actual = resource_data?.[field];
      let violated = false;
      switch (operator) {
        case 'required':    violated = actual === undefined || actual === null || actual === ''; break;
        case 'not_empty':   violated = !actual || (Array.isArray(actual) && actual.length === 0); break;
        case 'min_length':  violated = typeof actual === 'string' && actual.length < Number(value); break;
        case 'max_length':  violated = typeof actual === 'string' && actual.length > Number(value); break;
        case 'regex':       violated = typeof actual === 'string' && !new RegExp(value).test(actual); break;
        case 'allowed_values': violated = value && !value.includes(actual); break;
        default: break;
      }
      if (violated) violations.push({ rule: rule.name || field, field, expected: `${operator} ${value ?? ''}`.trim(), actual });
    }

    const result = violations.length === 0 ? 'passed' : 'violation';
    const auditEntry = {
      id: randomUUID(),
      tenant_id: tenantId,
      policy_id: policy.id,
      policy_name: policy.name,
      framework: policy.framework,
      resource_type,
      resource_id: resource_id || null,
      result,
      violations,
      evaluated_by: req.user?.id,
      created_at: new Date().toISOString(),
    };
    await db.insert(AUDIT_COL, auditEntry);

    res.json({ result, violations, audit_id: auditEntry.id });
  } catch (err) {
    logger.error('compliance-policy: validate', { error: err.message });
    res.status(500).json({ error: 'Failed to validate policy' });
  }
});

export default router;
