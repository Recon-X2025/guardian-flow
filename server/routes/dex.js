/**
 * @file server/routes/dex.js
 * @description DEX — Distributed Execution & Experience Layer.
 *
 * Maintains an ExecutionContext across the full business transaction lifecycle
 * (WO creation → assignment → completion → invoicing). Each context carries
 * the accumulated state, active actors, execution trace, and governance hooks.
 *
 * Routes
 * ------
 * POST   /api/dex/contexts                   — create a new execution context
 * GET    /api/dex/contexts                   — list active contexts for tenant
 * GET    /api/dex/contexts/:id               — get a single context
 * POST   /api/dex/contexts/:id/transition    — advance stage + append trace event
 * POST   /api/dex/contexts/:id/signal        — emit a signal into a context
 * POST   /api/dex/contexts/:id/checkpoint    — create/resolve a human-in-the-loop checkpoint
 *
 * Stage machine (canonical stages):
 *   created → assigned → in_progress → pending_review → completed → closed
 * Any stage can transition to: failed, cancelled
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const COLLECTION = 'execution_contexts';

const VALID_STAGES = [
  'created', 'assigned', 'in_progress', 'pending_review',
  'completed', 'closed', 'failed', 'cancelled',
];

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

// ── POST /api/dex/contexts ────────────────────────────────────────────────────

router.post('/contexts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const {
      flowId,
      entityType,
      entityId,
      initialStage = 'created',
      accumulatedContext,
      metadata,
    } = req.body;

    if (!flowId || !entityType || !entityId) {
      return res.status(400).json({ error: 'flowId, entityType, and entityId are required' });
    }

    if (!VALID_STAGES.includes(initialStage)) {
      return res.status(400).json({
        error: `initialStage must be one of: ${VALID_STAGES.join(', ')}`,
      });
    }

    const id = randomUUID();
    const now = new Date();

    const context = {
      id,
      tenant_id: tenantId,
      flow_id: flowId,
      entity_type: entityType,
      entity_id: entityId,
      current_stage: initialStage,
      accumulated_context: accumulatedContext ?? {},
      active_actors: [],
      execution_trace: [
        {
          stage: initialStage,
          actor_id: req.user.id,
          actor_type: 'human',
          timestamp: now,
          note: 'Context created',
        },
      ],
      governance_hooks: [],
      checkpoints: [],
      metadata: metadata ?? {},
      created_at: now,
      updated_at: now,
    };

    const adapter = await getAdapter();
    await adapter.insertOne(COLLECTION, context);

    logger.info('DEX: execution context created', { id, flowId, entityType, entityId, tenantId });
    res.status(201).json({ context });
  } catch (error) {
    logger.error('DEX: create context error', { error: error.message });
    res.status(500).json({ error: 'Failed to create execution context' });
  }
});

// ── GET /api/dex/contexts ─────────────────────────────────────────────────────

router.get('/contexts', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const {
      flow_id: flowId,
      entity_type: entityType,
      entity_id: entityId,
      current_stage: stage,
      limit: rawLimit = '50',
      skip: rawSkip = '0',
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 200);
    const skip  = Math.max(parseInt(rawSkip, 10) || 0, 0);

    const query = { tenant_id: tenantId };
    if (flowId)     query.flow_id      = flowId;
    if (entityType) query.entity_type  = entityType;
    if (entityId)   query.entity_id    = entityId;
    if (stage)      query.current_stage = stage;

    const adapter = await getAdapter();
    const [contexts, total] = await Promise.all([
      adapter.findMany(COLLECTION, query, { sort: { updated_at: -1 }, limit, skip }),
      adapter.countDocuments(COLLECTION, query),
    ]);

    res.json({ contexts, total, limit, skip });
  } catch (error) {
    logger.error('DEX: list contexts error', { error: error.message });
    res.status(500).json({ error: 'Failed to list execution contexts' });
  }
});

// ── GET /api/dex/contexts/:id ─────────────────────────────────────────────────

router.get('/contexts/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const context = await adapter.findOne(COLLECTION, {
      id: req.params.id,
      tenant_id: tenantId,
    });

    if (!context) {
      return res.status(404).json({ error: 'Execution context not found' });
    }

    res.json({ context });
  } catch (error) {
    logger.error('DEX: get context error', { error: error.message });
    res.status(500).json({ error: 'Failed to get execution context' });
  }
});

// ── POST /api/dex/contexts/:id/transition ─────────────────────────────────────

router.post('/contexts/:id/transition', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();

    const context = await adapter.findOne(COLLECTION, {
      id: req.params.id,
      tenant_id: tenantId,
    });

    if (!context) {
      return res.status(404).json({ error: 'Execution context not found' });
    }

    const { toStage, note, contextPatch, actorType = 'human' } = req.body;

    if (!toStage) {
      return res.status(400).json({ error: 'toStage is required' });
    }

    if (!VALID_STAGES.includes(toStage)) {
      return res.status(400).json({
        error: `toStage must be one of: ${VALID_STAGES.join(', ')}`,
      });
    }

    const terminal = ['closed', 'failed', 'cancelled'];
    if (terminal.includes(context.current_stage)) {
      return res.status(409).json({
        error: `Cannot transition from terminal stage '${context.current_stage}'`,
      });
    }

    const now = new Date();
    const traceEvent = {
      from_stage: context.current_stage,
      to_stage: toStage,
      actor_id: req.user.id,
      actor_type: actorType,
      timestamp: now,
      note: note ?? null,
    };

    const updatedTrace = [...(context.execution_trace ?? []), traceEvent];
    const updatedContext = {
      ...(contextPatch ?? {}),
    };

    await adapter.updateOne(
      COLLECTION,
      { id: req.params.id, tenant_id: tenantId },
      {
        $set: {
          current_stage: toStage,
          execution_trace: updatedTrace,
          accumulated_context: { ...(context.accumulated_context ?? {}), ...updatedContext },
          updated_at: now,
        },
      },
    );

    logger.info('DEX: stage transition', {
      id: req.params.id,
      from: context.current_stage,
      to: toStage,
      actor: req.user.id,
    });

    res.json({
      id: req.params.id,
      previous_stage: context.current_stage,
      current_stage: toStage,
      trace_event: traceEvent,
    });
  } catch (error) {
    logger.error('DEX: transition error', { error: error.message });
    res.status(500).json({ error: 'Failed to transition execution context' });
  }
});

// ── POST /api/dex/contexts/:id/signal ─────────────────────────────────────────

router.post('/contexts/:id/signal', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();

    const context = await adapter.findOne(COLLECTION, {
      id: req.params.id,
      tenant_id: tenantId,
    });

    if (!context) {
      return res.status(404).json({ error: 'Execution context not found' });
    }

    const { signalType, payload } = req.body;
    if (!signalType) {
      return res.status(400).json({ error: 'signalType is required' });
    }

    const now = new Date();
    const signal = {
      id: randomUUID(),
      signal_type: signalType,
      payload: payload ?? null,
      emitted_by: req.user.id,
      emitted_at: now,
    };

    const updatedTrace = [
      ...(context.execution_trace ?? []),
      { signal, actor_id: req.user.id, actor_type: 'system', timestamp: now, note: `Signal: ${signalType}` },
    ];

    await adapter.updateOne(
      COLLECTION,
      { id: req.params.id, tenant_id: tenantId },
      { $set: { execution_trace: updatedTrace, updated_at: now } },
    );

    logger.info('DEX: signal emitted', { contextId: req.params.id, signalType });
    res.status(201).json({ signal });
  } catch (error) {
    logger.error('DEX: signal error', { error: error.message });
    res.status(500).json({ error: 'Failed to emit signal' });
  }
});

// ── POST /api/dex/contexts/:id/checkpoint ────────────────────────────────────

router.post('/contexts/:id/checkpoint', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();

    const context = await adapter.findOne(COLLECTION, {
      id: req.params.id,
      tenant_id: tenantId,
    });

    if (!context) {
      return res.status(404).json({ error: 'Execution context not found' });
    }

    const { action, description, checkpointId, resolution, notes } = req.body;

    if (action === 'create') {
      // Create a new human-in-the-loop checkpoint
      if (!description) {
        return res.status(400).json({ error: 'description is required to create a checkpoint' });
      }

      const checkpoint = {
        id: randomUUID(),
        description,
        status: 'pending',
        created_by: req.user.id,
        created_at: new Date(),
        resolved_by: null,
        resolved_at: null,
        resolution: null,
        notes: null,
      };

      const updatedCheckpoints = [...(context.checkpoints ?? []), checkpoint];
      await adapter.updateOne(
        COLLECTION,
        { id: req.params.id, tenant_id: tenantId },
        { $set: { checkpoints: updatedCheckpoints, current_stage: 'pending_review', updated_at: new Date() } },
      );

      logger.info('DEX: checkpoint created', { contextId: req.params.id, checkpointId: checkpoint.id });
      return res.status(201).json({ checkpoint });
    }

    if (action === 'resolve') {
      if (!checkpointId || !resolution) {
        return res.status(400).json({ error: 'checkpointId and resolution are required to resolve a checkpoint' });
      }

      const VALID_RESOLUTIONS = ['approved', 'rejected', 'escalated'];
      if (!VALID_RESOLUTIONS.includes(resolution)) {
        return res.status(400).json({ error: `resolution must be one of: ${VALID_RESOLUTIONS.join(', ')}` });
      }

      const updatedCheckpoints = (context.checkpoints ?? []).map(cp =>
        cp.id === checkpointId
          ? { ...cp, status: 'resolved', resolved_by: req.user.id, resolved_at: new Date(), resolution, notes: notes ?? null }
          : cp,
      );

      await adapter.updateOne(
        COLLECTION,
        { id: req.params.id, tenant_id: tenantId },
        { $set: { checkpoints: updatedCheckpoints, updated_at: new Date() } },
      );

      logger.info('DEX: checkpoint resolved', { contextId: req.params.id, checkpointId, resolution });
      return res.json({ checkpointId, resolution });
    }

    return res.status(400).json({ error: "action must be 'create' or 'resolve'" });
  } catch (error) {
    logger.error('DEX: checkpoint error', { error: error.message });
    res.status(500).json({ error: 'Failed to manage checkpoint' });
  }
});

export default router;
