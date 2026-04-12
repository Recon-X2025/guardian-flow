/**
 * @file server/routes/flowspace.js
 * @description FlowSpace Decision Context Ledger API.
 *
 * Routes
 * ------
 * POST   /api/flowspace/record          — write a decision record (any auth'd user)
 * GET    /api/flowspace/records         — list records for authenticated tenant
 * GET    /api/flowspace/records/:id     — get a single record
 * GET    /api/flowspace/records/:id/lineage — get causal lineage chain
 *
 * Security
 * --------
 * - All routes require authentication.
 * - tenantId is sourced from the authenticated user's profile (not from request body).
 * - Records are append-only; no update/delete endpoints are exposed.
 * - Tenants are strictly isolated: all queries include tenant_id filter.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { getAdapter } from '../db/factory.js';
import {
  writeDecisionRecord,
  listDecisionRecords,
  getDecisionRecord,
  getDecisionLineage,
} from '../services/flowspace.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Per-authenticated-user rate limiter: 120 req/min across all FlowSpace endpoints
const flowspaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many FlowSpace requests, please slow down' },
});

router.use(flowspaceLimiter);

/**
 * Resolve the caller's tenant_id from their profile.
 * Falls back to the user's own ID when no tenant_id is set
 * (single-org deployments where every user is their own tenant).
 */
async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── POST /api/flowspace/record ───────────────────────────────────────────────

router.post('/record', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);

    const {
      domain,
      actorType,
      actorId,
      action,
      rationale,
      context,
      constraints,
      alternatives,
      confidenceScore,
      modelVersion,
      lineageParentId,
      entityType,
      entityId,
      outcome,
    } = req.body;

    // Required field validation
    if (!domain || !actorType || !actorId || !action) {
      return res.status(400).json({
        error: 'domain, actorType, actorId, and action are required',
      });
    }

    const VALID_ACTOR_TYPES = ['human', 'ai', 'system'];
    if (!VALID_ACTOR_TYPES.includes(actorType)) {
      return res.status(400).json({
        error: `actorType must be one of: ${VALID_ACTOR_TYPES.join(', ')}`,
      });
    }

    if (confidenceScore !== undefined) {
      const score = Number(confidenceScore);
      if (Number.isNaN(score) || score < 0 || score > 1) {
        return res.status(400).json({ error: 'confidenceScore must be a number between 0 and 1' });
      }
    }

    const result = await writeDecisionRecord({
      tenantId,
      domain,
      actorType,
      actorId,
      action,
      rationale,
      context,
      constraints,
      alternatives,
      confidenceScore: confidenceScore !== undefined ? Number(confidenceScore) : undefined,
      modelVersion,
      lineageParentId,
      entityType,
      entityId,
      outcome,
    });

    res.status(201).json({ id: result.id, created_at: result.created_at });
  } catch (error) {
    logger.error('FlowSpace: write error', { error: error.message });
    res.status(500).json({ error: 'Failed to write decision record' });
  }
});

// ── GET /api/flowspace/records ───────────────────────────────────────────────

router.get('/records', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);

    const {
      domain,
      actor_type: actorType,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      since,
      until,
      limit: rawLimit = '50',
      skip: rawSkip = '0',
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 200);
    const skip  = Math.max(parseInt(rawSkip, 10) || 0, 0);

    const { records, total } = await listDecisionRecords(
      tenantId,
      { domain, actorType, actorId, action, entityType, entityId, since, until },
      limit,
      skip,
    );

    res.json({ records, total, limit, skip });
  } catch (error) {
    logger.error('FlowSpace: list error', { error: error.message });
    res.status(500).json({ error: 'Failed to list decision records' });
  }
});

// ── GET /api/flowspace/records/:id ───────────────────────────────────────────

router.get('/records/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const record = await getDecisionRecord(tenantId, req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Decision record not found' });
    }

    res.json({ record });
  } catch (error) {
    logger.error('FlowSpace: get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get decision record' });
  }
});

// ── GET /api/flowspace/records/:id/lineage ───────────────────────────────────

router.get('/records/:id/lineage', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const chain = await getDecisionLineage(tenantId, req.params.id);

    res.json({ lineage: chain, length: chain.length });
  } catch (error) {
    logger.error('FlowSpace: lineage error', { error: error.message });
    res.status(500).json({ error: 'Failed to get decision lineage' });
  }
});

// ── GET /api/flowspace/export ────────────────────────────────────────────────

router.get('/export', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const { from, to, format } = req.query;
    const { listDecisionRecords: listRecords } = await import('../services/flowspace.js');
    const filters = {};
    if (from) filters.since = from;
    if (to)   filters.until = to;
    const { records } = await listRecords(tenantId, filters, 1000, 0);

    if (format === 'csv') {
      if (records.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        return res.send('id,domain,actor_type,actor_id,action,created_at\n');
      }
      const headers = Object.keys(records[0]).join(',');
      const rows = records.map(r => Object.values(r).map(v => JSON.stringify(v ?? '')).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="flowspace-export.csv"');
      return res.send([headers, ...rows].join('\n'));
    }

    res.json({ records, total: records.length });
  } catch (error) {
    logger.error('FlowSpace: export error', { error: error.message });
    res.status(500).json({ error: 'Failed to export decision records' });
  }
});

// ── POST /api/flowspace/attest ───────────────────────────────────────────────

router.post('/attest', authenticateToken, async (req, res) => {
  try {
    const { record_ids } = req.body;
    if (!Array.isArray(record_ids) || record_ids.length === 0) {
      return res.status(400).json({ error: 'record_ids array is required' });
    }
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();
    const { createHash } = await import('crypto');

    const records = await Promise.all(
      record_ids.map(id => adapter.findOne('decision_records', { id, tenant_id: tenantId })),
    );
    const found = records.filter(Boolean);
    const hash = createHash('sha256')
      .update(record_ids.join(',') + JSON.stringify(found))
      .digest('hex');

    res.json({ hash, record_count: record_ids.length, attested_at: new Date() });
  } catch (error) {
    logger.error('FlowSpace: attest error', { error: error.message });
    res.status(500).json({ error: 'Failed to attest records' });
  }
});

// ── POST /api/flowspace/records/:id/explain ──────────────────────────────────
// AI Act Article 13 / GDPR Article 22 — meaningful explanation of automated decisions

router.post('/records/:id/explain', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    const record = await adapter.findOne('decision_records', { id: req.params.id, tenant_id: tenantId });
    if (!record) return res.status(404).json({ error: 'Decision record not found' });

    // Resolve lineage chain for context
    let lineage = [];
    try {
      lineage = await getDecisionLineage(record.id, tenantId);
    } catch (_) { /* not critical */ }

    // Build AI Act Article 13 compliant explanation
    const explanation = buildArticle13Explanation(record, lineage);

    // Store the explanation for audit purposes
    const explanationRecord = {
      id: (await import('crypto')).then ? undefined : undefined,
      record_id: record.id,
      tenant_id: tenantId,
      requested_by: req.user.id,
      requested_at: new Date(),
      explanation,
    };

    const { randomUUID } = await import('crypto');
    explanationRecord.id = randomUUID();

    try {
      await adapter.insertOne('decision_explanations', explanationRecord);
    } catch (_) { /* table may not exist yet */ }

    logger.info('FlowSpace: explanation generated', { recordId: record.id, tenantId });
    res.json({ explanation, record: { id: record.id, action: record.action, domain: record.domain, actor_type: record.actor_type } });
  } catch (error) {
    logger.error('FlowSpace: explain error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

/**
 * Build a structured AI Act Article 13 / Article 22 explanation for a decision record.
 * Covers: purpose, logic, significance, rights, human oversight flag.
 */
function buildArticle13Explanation(record, lineage) {
  const isAi = record.actor_type === 'ai';
  const isHighRisk = record.metadata?.risk_level === 'high' ||
    ['approve', 'reject', 'deny', 'block', 'flag', 'escalate'].some(k => (record.action ?? '').toLowerCase().includes(k));

  const purposeMap = {
    fraud: 'Detect anomalous patterns that may indicate fraudulent activity and protect financial integrity.',
    sla: 'Monitor service level agreements and trigger remediation when response time thresholds are breached.',
    maintenance: 'Optimise equipment maintenance schedules to reduce downtime and prevent unexpected failures.',
    crm: 'Prioritise customer engagement and pipeline progression based on activity signals.',
    iot: 'Process sensor telemetry to detect out-of-range conditions and trigger safety alerts.',
    compliance: 'Ensure regulatory obligations are met and evidence is collected for audit purposes.',
    dex: 'Coordinate execution of complex, multi-step operational workflows between systems and human actors.',
  };

  const domainPurpose = purposeMap[record.domain?.toLowerCase()] ?? `Support operational decisions within the ${record.domain} domain.`;

  const logicSummary = isAi
    ? `An automated AI system (${record.actor_id ?? 'AI agent'}) evaluated available data and applied decision logic to arrive at the outcome: "${record.action}". ` +
      `${record.metadata?.model ? `Model used: ${record.metadata.model}.` : ''} ` +
      `${record.metadata?.confidence !== undefined ? `Confidence score: ${Math.round(record.metadata.confidence * 100)}%.` : ''}`
    : `A human operator (${record.actor_id ?? 'user'}) manually performed the action "${record.action}" ` +
      `within the ${record.domain} domain${record.metadata?.reason ? `: "${record.metadata.reason}"` : '.'} `;

  const lineageSummary = lineage.length > 1
    ? `This decision is part of a causal chain of ${lineage.length} linked decisions, beginning with "${lineage[lineage.length - 1]?.action ?? 'an initial event'}" and progressing through sequential steps to reach this outcome.`
    : 'This is a standalone decision with no prior causal dependencies recorded.';

  const significance = isHighRisk
    ? 'This decision may have significant effects on individuals, processes, or outcomes. It is subject to enhanced audit logging and human oversight requirements.'
    : 'This decision has limited direct impact on individuals but is logged for traceability and audit purposes.';

  return {
    framework: 'AI Act Article 13 / GDPR Article 22',
    generated_at: new Date().toISOString(),
    record_id: record.id,
    decision_summary: {
      domain: record.domain,
      action: record.action,
      actor_type: record.actor_type,
      actor_id: record.actor_id,
      timestamp: record.created_at,
    },
    purpose: domainPurpose,
    logic_used: logicSummary,
    lineage_context: lineageSummary,
    significance_and_impact: significance,
    data_sources_used: record.metadata?.data_sources ?? ['Operational system records within the ' + record.domain + ' domain'],
    human_oversight: {
      applicable: isAi && isHighRisk,
      statement: isAi && isHighRisk
        ? 'As an automated decision with potentially significant impact, a human operator has the right to request review, override this decision, or escalate to a supervisor. Contact your system administrator to initiate a review.'
        : isAi
        ? 'This automated decision is monitored by the system operations team. You may request clarification or correction via the standard support channel.'
        : 'This decision was made by a human operator and is subject to standard management review processes.',
    },
    data_subject_rights: [
      'Right to access: You may request a copy of the data used in this decision.',
      'Right to rectification: If factual inaccuracies affected this decision, you may request correction.',
      'Right to object: For AI-assisted decisions with significant impact, you may request human review.',
      'Right to explanation: This document fulfils the transparency obligation under applicable regulation.',
    ],
    appeal_mechanism: 'Submit a review request through the Governance & Audit module, referencing decision ID: ' + record.id,
    confidence_score: record.metadata?.confidence ?? null,
    audit_trail_url: `/flowspace?record=${record.id}`,
  };
}

export default router;
