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
import { getAdapter } from '../db/factory.js';
import {
  writeDecisionRecord,
  listDecisionRecords,
  getDecisionRecord,
  getDecisionLineage,
} from '../services/flowspace.js';
import logger from '../utils/logger.js';

const router = express.Router();

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

export default router;
