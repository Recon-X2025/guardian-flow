/**
 * @file server/workers/dex-recovery.js
 * @description
 * D2 — "State Machine Chaos": DEX Recovery Worker.
 *
 * This worker implements the server-side durable-execution guarantee that
 * Temporal.io would normally provide.  It runs as a periodic job (via
 * setInterval or an external cron) and:
 *
 *   1. Queries for DEX ExecutionContexts that are stuck in a non-terminal
 *      stage with no update activity for longer than STALE_THRESHOLD_MS.
 *   2. Transitions each stale context to 'failed' with a recovery trace event.
 *   3. Writes a FlowSpace decision record documenting the interruption and the
 *      recovery rationale — satisfying the logging requirement from D2.
 *
 * Usage (one-shot, e.g. from a health-check or cron):
 *   import { runRecovery } from './server/workers/dex-recovery.js';
 *   const result = await runRecovery();
 *
 * Usage (continuous, e.g. in server startup):
 *   import { startRecoveryWorker, stopRecoveryWorker } from './server/workers/dex-recovery.js';
 *   startRecoveryWorker();           // polls every POLL_INTERVAL_MS
 *   // … later on graceful shutdown …
 *   stopRecoveryWorker();
 */

import { getAdapter }         from '../db/factory.js';
import { writeDecisionRecord } from '../services/flowspace.js';
import logger                 from '../utils/logger.js';

// ── Configuration ────────────────────────────────────────────────────────────

/**
 * How long (ms) a non-terminal context must sit idle before being considered
 * "stuck" and eligible for recovery.  Default: 5 minutes.
 */
export const STALE_THRESHOLD_MS =
  parseInt(process.env.DEX_STALE_THRESHOLD_MS || '', 10) || 5 * 60 * 1_000;

/**
 * How often (ms) the worker polls for stale contexts.  Default: 30 seconds.
 */
export const POLL_INTERVAL_MS =
  parseInt(process.env.DEX_POLL_INTERVAL_MS || '', 10) || 30 * 1_000;

const COLLECTION = 'execution_contexts';

/** Stages that have already reached a terminal state — do not touch these. */
export const TERMINAL_STAGES = new Set(['completed', 'closed', 'failed', 'cancelled']);

// ── Core recovery logic ──────────────────────────────────────────────────────

/**
 * Find all ExecutionContexts that are stuck and transition them to 'failed'.
 *
 * @param {object} [adapterOverride]  Optional pre-resolved adapter (for testing).
 * @returns {{ recovered: number, errors: number }} Summary of the sweep.
 */
export async function runRecovery(adapterOverride) {
  const adapter = adapterOverride ?? await getAdapter();
  const cutoff  = new Date(Date.now() - STALE_THRESHOLD_MS);

  let staleContexts;
  try {
    staleContexts = await adapter.findMany(COLLECTION, {
      updated_at: { $lt: cutoff },
    });
  } catch (err) {
    logger.error('DEX recovery: failed to query stale contexts', { error: err.message });
    return { recovered: 0, errors: 1 };
  }

  // Filter to non-terminal contexts not yet processed by this pass
  const eligible = staleContexts.filter(
    ctx => ctx.current_stage && !TERMINAL_STAGES.has(ctx.current_stage),
  );

  let recovered = 0;
  let errors    = 0;

  for (const ctx of eligible) {
    try {
      await recoverContext(adapter, ctx, cutoff);
      recovered++;
    } catch (err) {
      logger.error('DEX recovery: failed to recover context', {
        contextId: ctx.id,
        error:     err.message,
      });
      errors++;
    }
  }

  if (eligible.length > 0) {
    logger.info('DEX recovery sweep complete', {
      eligible: eligible.length,
      recovered,
      errors,
    });
  }

  return { recovered, errors };
}

/**
 * Transition a single stale context to 'failed' and write a FlowSpace record.
 *
 * @param {object} adapter - DB adapter instance
 * @param {object} ctx     - The stale ExecutionContext document
 * @param {Date}   cutoff  - The staleness cutoff timestamp
 */
export async function recoverContext(adapter, ctx, cutoff) {
  const now = new Date();

  const recoveryTraceEvent = {
    from_stage: ctx.current_stage,
    to_stage:   'failed',
    actor_id:   'dex-recovery-worker',
    actor_type: 'system',
    timestamp:  now,
    note:       `Automatic recovery: context was stuck in stage '${ctx.current_stage}' ` +
                `with no update since ${ctx.updated_at?.toISOString?.() ?? 'unknown'}. ` +
                `Stale threshold: ${STALE_THRESHOLD_MS / 1000}s.`,
  };

  await adapter.updateOne(
    COLLECTION,
    { id: ctx.id },
    {
      $set: {
        current_stage:   'failed',
        execution_trace: [...(ctx.execution_trace ?? []), recoveryTraceEvent],
        updated_at:      now,
      },
    },
  );

  logger.info('DEX recovery: context transitioned to failed', {
    contextId:   ctx.id,
    tenantId:    ctx.tenant_id,
    fromStage:   ctx.current_stage,
    idleSinceMs: now - new Date(ctx.updated_at),
  });

  // Write FlowSpace record — satisfies D2 logging requirement
  await writeDecisionRecord({
    tenantId:  ctx.tenant_id || 'system',
    domain:    'dex',
    actorType: 'system',
    actorId:   'dex-recovery-worker',
    action:    'context_recovered_from_interruption',
    rationale:
      `ExecutionContext ${ctx.id} was stuck in stage '${ctx.current_stage}' ` +
      `for more than ${Math.round(STALE_THRESHOLD_MS / 1000)} seconds. ` +
      `The DEX recovery worker automatically transitioned it to 'failed' ` +
      `to prevent orphaned state. No data was lost — the full execution_trace ` +
      `is preserved on the context document.`,
    context: {
      contextId:     ctx.id,
      flowId:        ctx.flow_id,
      entityType:    ctx.entity_type,
      entityId:      ctx.entity_id,
      frozenAtStage: ctx.current_stage,
      idleSinceMs:   now - new Date(ctx.updated_at),
      staleCutoff:   cutoff.toISOString(),
      recoveredAt:   now.toISOString(),
    },
    entityType: ctx.entity_type || 'execution_context',
    entityId:   ctx.id,
  });
}

// ── Continuous polling ────────────────────────────────────────────────────────

let _intervalHandle = null;

/**
 * Start a continuous recovery worker that polls every POLL_INTERVAL_MS.
 * Safe to call multiple times — only one interval will be active.
 */
export function startRecoveryWorker() {
  if (_intervalHandle !== null) {
    logger.warn('DEX recovery worker is already running');
    return;
  }
  logger.info('DEX recovery worker started', {
    staleThresholdMs: STALE_THRESHOLD_MS,
    pollIntervalMs:   POLL_INTERVAL_MS,
  });
  _intervalHandle = setInterval(() => {
    runRecovery().catch(err => {
      logger.error('DEX recovery: unhandled error in poll', { error: err.message });
    });
  }, POLL_INTERVAL_MS);

  // Don't prevent the Node.js process from exiting cleanly
  if (_intervalHandle.unref) _intervalHandle.unref();
}

/**
 * Stop the recovery worker interval.
 */
export function stopRecoveryWorker() {
  if (_intervalHandle !== null) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    logger.info('DEX recovery worker stopped');
  }
}
