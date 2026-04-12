/**
 * @file server/routes/compliance-policy.js
 * @description Compliance Policy Enforcer
 *
 * Real-time evaluation of compliance policies (HIPAA, SOC 2, ISO 27001, custom)
 * against platform actions and data access patterns.  Every evaluation is
 * recorded in the FlowSpace decision ledger for audit purposes.
 *
 * Routes
 * ------
 * POST   /api/compliance/policies            — create a compliance policy
 * GET    /api/compliance/policies            — list policies for tenant
 * PATCH  /api/compliance/policies/:id        — update a policy
 * DELETE /api/compliance/policies/:id        — deactivate a policy
 * POST   /api/compliance/evaluate            — evaluate an action against policies
 * GET    /api/compliance/audit-trail         — list compliance audit records
 *
 * Policy structure
 * ----------------
 * {
 *   framework: 'hipaa' | 'soc2' | 'iso27001' | 'custom',
 *   rule_type: 'data_access' | 'role_boundary' | 'retention' | 'encryption' | 'custom',
 *   condition: { field, operator, value },  // evaluated against action context
 *   action_on_violation: 'block' | 'warn' | 'log',
 *   severity: 'critical' | 'high' | 'medium' | 'low',
 * }
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeDecisionRecord } from '../services/flowspace.js';
import logger from '../utils/logger.js';

const router = express.Router();

const POLICIES_COLLECTION  = 'compliance_policies';
const AUDIT_COLLECTION     = 'compliance_audit_trails';

const VALID_FRAMEWORKS  = ['hipaa', 'soc2', 'iso27001', 'gdpr', 'custom'];
const VALID_RULE_TYPES  = ['data_access', 'role_boundary', 'retention', 'encryption', 'custom'];
const VALID_SEVERITIES  = ['critical', 'high', 'medium', 'low'];
const VALID_ACTIONS     = ['block', 'warn', 'log'];
const VALID_OPERATORS   = ['eq', 'neq', 'in', 'not_in', 'contains', 'gte', 'lte'];

// ── Condition evaluator ────────────────────────────────────────────────────────

/**
 * Evaluate a single policy condition against the supplied context object.
 * Returns true if the condition is satisfied (i.e. a violation has occurred).
 */
function evaluateCondition(condition, context) {
  if (!condition || !condition.field || !condition.operator) return false;

  const actual = context[condition.field];
  const expected = condition.value;

  switch (condition.operator) {
    case 'eq':       return actual === expected;
    case 'neq':      return actual !== expected;
    case 'in':       return Array.isArray(expected) && expected.includes(actual);
    case 'not_in':   return Array.isArray(expected) && !expected.includes(actual);
    case 'contains': return typeof actual === 'string' && actual.includes(String(expected));
    case 'gte':      return Number(actual) >= Number(expected);
    case 'lte':      return Number(actual) <= Number(expected);
    default:         return false;
  }
}

/**
 * Evaluate all active policies against an action context.
 * Returns { allowed, violations, warnings }.
 */
async function evaluatePolicies(tenantId, actionContext) {
  const adapter = await getAdapter();
  const policies = await adapter.findMany(POLICIES_COLLECTION, {
    tenant_id: tenantId,
    active: true,
  });

  const violations = [];
  const warnings   = [];

  for (const policy of (policies || [])) {
    const triggered = evaluateCondition(policy.condition, actionContext);
    if (!triggered) continue;

    const entry = {
      policyId:    policy.id,
      framework:   policy.framework,
      ruleType:    policy.rule_type,
      severity:    policy.severity,
      description: policy.description,
      action:      policy.action_on_violation,
    };

    if (policy.action_on_violation === 'block') {
      violations.push(entry);
    } else {
      warnings.push(entry);
    }
  }

  return {
    allowed:    violations.length === 0,
    violations,
    warnings,
  };
}

// ── POST /api/compliance/policies ────────────────────────────────────────────

router.post('/policies', authenticateToken, async (req, res) => {
  try {
    const { framework, rule_type, condition, action_on_violation, severity, description, name } = req.body;
    const tenantId = req.user.tenantId;

    if (!framework || !VALID_FRAMEWORKS.includes(framework)) {
      return res.status(400).json({ error: `framework must be one of: ${VALID_FRAMEWORKS.join(', ')}` });
    }
    if (!rule_type || !VALID_RULE_TYPES.includes(rule_type)) {
      return res.status(400).json({ error: `rule_type must be one of: ${VALID_RULE_TYPES.join(', ')}` });
    }
    if (!condition || !condition.field || !VALID_OPERATORS.includes(condition.operator)) {
      return res.status(400).json({ error: `condition.operator must be one of: ${VALID_OPERATORS.join(', ')}` });
    }
    if (!action_on_violation || !VALID_ACTIONS.includes(action_on_violation)) {
      return res.status(400).json({ error: `action_on_violation must be one of: ${VALID_ACTIONS.join(', ')}` });
    }
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
    }

    const adapter = await getAdapter();
    const policy = {
      id: randomUUID(),
      tenant_id: tenantId,
      name: name || `${framework.toUpperCase()} — ${rule_type}`,
      framework,
      rule_type,
      condition,
      action_on_violation,
      severity,
      description: description || '',
      active: true,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await adapter.insertOne(POLICIES_COLLECTION, policy);

    await writeDecisionRecord({
      tenantId,
      domain: 'compliance',
      actorType: 'human',
      actorId: req.user.id,
      action: 'policy_created',
      rationale: `Created ${framework} policy: ${policy.name}`,
      entityType: 'compliance_policy',
      entityId: policy.id,
    });

    res.status(201).json({ data: policy });
  } catch (err) {
    logger.error('[compliance-policy] create error', { err: err.message });
    res.status(500).json({ error: 'Failed to create compliance policy' });
  }
});

// ── GET /api/compliance/policies ─────────────────────────────────────────────

router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const { framework, active } = req.query;
    const adapter = await getAdapter();
    const filter = { tenant_id: req.user.tenantId };
    if (framework) filter.framework = framework;
    if (active !== undefined) filter.active = active !== 'false';

    const policies = await adapter.findMany(POLICIES_COLLECTION, filter, {
      sort: { created_at: -1 },
    });
    res.json({ data: policies || [] });
  } catch (err) {
    logger.error('[compliance-policy] list error', { err: err.message });
    res.status(500).json({ error: 'Failed to list compliance policies' });
  }
});

// ── PATCH /api/compliance/policies/:id ───────────────────────────────────────

router.patch('/policies/:id', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const policy = await adapter.findOne(POLICIES_COLLECTION, {
      id: req.params.id, tenant_id: req.user.tenantId,
    });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    const allowed = ['name', 'condition', 'action_on_violation', 'severity', 'description', 'active'];
    const updates = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await adapter.updateOne(POLICIES_COLLECTION, { id: req.params.id }, updates);
    res.json({ data: { ...policy, ...updates } });
  } catch (err) {
    logger.error('[compliance-policy] update error', { err: err.message });
    res.status(500).json({ error: 'Failed to update compliance policy' });
  }
});

// ── DELETE /api/compliance/policies/:id ──────────────────────────────────────

router.delete('/policies/:id', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const policy = await adapter.findOne(POLICIES_COLLECTION, {
      id: req.params.id, tenant_id: req.user.tenantId,
    });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    await adapter.updateOne(POLICIES_COLLECTION, { id: req.params.id }, {
      active: false, updated_at: new Date(),
    });
    res.json({ message: 'Policy deactivated' });
  } catch (err) {
    logger.error('[compliance-policy] delete error', { err: err.message });
    res.status(500).json({ error: 'Failed to deactivate policy' });
  }
});

// ── POST /api/compliance/evaluate ────────────────────────────────────────────

router.post('/evaluate', authenticateToken, async (req, res) => {
  try {
    const { action, context: actionContext } = req.body;
    const tenantId = req.user.tenantId;

    if (!action || !actionContext || typeof actionContext !== 'object') {
      return res.status(400).json({ error: 'action and context object are required' });
    }

    const result = await evaluatePolicies(tenantId, { action, ...actionContext });

    // Persist audit record
    const adapter = await getAdapter();
    const auditRecord = {
      id: randomUUID(),
      tenant_id: tenantId,
      actor_id: req.user.id,
      action,
      context: actionContext,
      allowed: result.allowed,
      violation_count: result.violations.length,
      warning_count: result.warnings.length,
      violations: result.violations,
      warnings: result.warnings,
      evaluated_at: new Date(),
    };
    await adapter.insertOne(AUDIT_COLLECTION, auditRecord);

    // Write to FlowSpace for compliance violations
    if (result.violations.length > 0) {
      await writeDecisionRecord({
        tenantId,
        domain: 'compliance',
        actorType: 'system',
        actorId: 'compliance-policy-enforcer',
        action: 'policy_violation_blocked',
        rationale: `Action "${action}" blocked by ${result.violations.length} policy violation(s)`,
        context: { action, violations: result.violations },
        entityType: 'compliance_audit',
        entityId: auditRecord.id,
      });
    }

    if (!result.allowed) {
      return res.status(403).json({
        allowed: false,
        message: 'Action blocked by compliance policy',
        violations: result.violations,
        warnings: result.warnings,
        auditId: auditRecord.id,
      });
    }

    res.json({
      allowed: true,
      violations: [],
      warnings: result.warnings,
      auditId: auditRecord.id,
    });
  } catch (err) {
    logger.error('[compliance-policy] evaluate error', { err: err.message });
    res.status(500).json({ error: 'Failed to evaluate compliance policies' });
  }
});

// ── GET /api/compliance/audit-trail ──────────────────────────────────────────

router.get('/audit-trail', authenticateToken, async (req, res) => {
  try {
    const { limit = '100', allowed } = req.query;
    const adapter = await getAdapter();
    const filter = { tenant_id: req.user.tenantId };
    if (allowed !== undefined) filter.allowed = allowed !== 'false';

    const records = await adapter.findMany(AUDIT_COLLECTION, filter, {
      sort: { evaluated_at: -1 },
      limit: Math.min(parseInt(limit, 10) || 100, 500),
    });
    res.json({ data: records || [] });
  } catch (err) {
    logger.error('[compliance-policy] audit-trail error', { err: err.message });
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

export default router;
