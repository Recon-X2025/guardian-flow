import { db } from "../db/client.js";
import { dexContexts as dexContextsTable, decisionRecords as decisionRecordsTable } from "../db/schema.js";
import { eq, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function sendSlaAlertEmail(woId: string, tenantId: string): Promise<void> {
  console.log(`[Temporal Activity] SLA Breach Alert: Work Order ${woId} for Tenant ${tenantId} has exceeded the SLA threshold!`);
}

export async function processTelemetry(
  tenantId: string,
  reading: { device_id: string; metric: string; value: number; unit?: string; timestamp?: string }
): Promise<void> {
  console.log(`[Temporal Activity] Process Telemetry: Tenant ${tenantId}, Device ${reading.device_id}, Metric ${reading.metric}, Value ${reading.value}`);
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const TERMINAL_STAGES = ['completed', 'closed', 'failed', 'cancelled'];

export async function runDexRecoverySweep(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  // Find contexts updated before cutoff
  const staleContexts = await db
    .select()
    .from(dexContextsTable)
    .where(lt(dexContextsTable.updatedAt, cutoff));

  const eligible = staleContexts.filter(
    (ctx) => ctx.state && !TERMINAL_STAGES.includes(ctx.state)
  );

  for (const ctx of eligible) {
    try {
      const now = new Date();
      const recoveryTraceEvent = {
        from_stage: ctx.state,
        to_stage: 'failed',
        actor_id: 'dex-recovery-worker',
        actor_type: 'system',
        timestamp: now.toISOString(),
        note: `Automatic recovery: context was stuck in stage '${ctx.state}' with no update since ${ctx.updatedAt.toISOString()}.`,
      };

      const updatedTrace = [...(ctx.executionTrace as any[] || []), recoveryTraceEvent];

      // Update state to failed
      await db
        .update(dexContextsTable)
        .set({
          state: 'failed',
          executionTrace: updatedTrace,
          updatedAt: now,
        })
        .where(eq(dexContextsTable.id, ctx.id));

      // Insert FlowSpace decision record
      const decisionId = randomUUID();
      await db
        .insert(decisionRecordsTable)
        .values({
          id: decisionId,
          tenantId: ctx.tenantId,
          domain: 'dex',
          actorType: 'system',
          actorId: 'dex-recovery-worker',
          action: 'context_recovered_from_interruption',
          rationale: `ExecutionContext ${ctx.id} was stuck in stage '${ctx.state}' for more than 5 minutes. The DEX recovery worker automatically transitioned it to 'failed' to prevent orphaned state.`,
          context: {
            contextId: ctx.id,
            flowId: ctx.flowId,
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            frozenAtStage: ctx.state,
            idleSinceMs: now.getTime() - ctx.updatedAt.getTime(),
            staleCutoff: cutoff.toISOString(),
            recoveredAt: now.toISOString(),
          },
          entityType: ctx.entityType || 'execution_context',
          entityId: ctx.id,
          createdAt: now,
        });

      console.log(`[Temporal Activity] Recovered stuck DEX ExecutionContext ${ctx.id}`);
    } catch (err: any) {
      console.error(`[Temporal Activity] Failed to recover stuck DEX context ${ctx.id}: ${err.message}`);
    }
  }
}
