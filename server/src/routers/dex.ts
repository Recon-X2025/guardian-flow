import { z } from "zod";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "../trpc.js";
import { dexContexts as dexContextsTable, dexSignals as dexSignalsTable } from "../db/schema.js";
import { eq, and, sql, desc, gte } from "drizzle-orm";

const VALID_STAGES = [
  'created', 'assigned', 'in_progress', 'pending_review',
  'completed', 'closed', 'failed', 'cancelled',
];

export const dexRouter = router({
  createContext: tenantProcedure
    .input(
      z.object({
        flowId: z.string().min(1),
        entityType: z.string().min(1),
        entityId: z.string().uuid(),
        initialStage: z.string().default("created"),
        accumulatedContext: z.any().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!VALID_STAGES.includes(input.initialStage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `initialStage must be one of: ${VALID_STAGES.join(', ')}`,
        });
      }

      const id = randomUUID();
      const now = new Date();

      const initialTrace = [
        {
          stage: input.initialStage,
          actor_id: ctx.user.id,
          actor_type: 'human',
          timestamp: now.toISOString(),
          note: 'Context created',
        },
      ];

      const [newContext] = await ctx.db
        .insert(dexContextsTable)
        .values({
          id,
          tenantId: ctx.tenantId,
          flowId: input.flowId,
          entityType: input.entityType,
          entityId: input.entityId,
          state: input.initialStage,
          payload: input.accumulatedContext || {},
          score: null,
          activeActors: [],
          executionTrace: initialTrace,
          governanceHooks: [],
          checkpoints: [],
          metadata: input.metadata || {},
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        context: {
          id: newContext.id,
          tenant_id: newContext.tenantId,
          flow_id: newContext.flowId,
          entity_type: newContext.entityType,
          entity_id: newContext.entityId,
          current_stage: newContext.state,
          accumulated_context: newContext.payload,
          active_actors: newContext.activeActors,
          execution_trace: newContext.executionTrace,
          governance_hooks: newContext.governanceHooks,
          checkpoints: newContext.checkpoints,
          metadata: newContext.metadata,
          created_at: newContext.createdAt.toISOString(),
          updated_at: newContext.updatedAt.toISOString(),
        }
      };
    }),

  listContexts: tenantProcedure
    .input(
      z.object({
        flow_id: z.string().optional(),
        entity_type: z.string().optional(),
        entity_id: z.string().uuid().optional(),
        current_stage: z.string().optional(),
        limit: z.number().default(50),
        skip: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      let conditions = eq(dexContextsTable.tenantId, ctx.tenantId);

      if (input.flow_id) {
        conditions = and(conditions, eq(dexContextsTable.flowId, input.flow_id))!;
      }
      if (input.entity_type) {
        conditions = and(conditions, eq(dexContextsTable.entityType, input.entity_type))!;
      }
      if (input.entity_id) {
        conditions = and(conditions, eq(dexContextsTable.entityId, input.entity_id))!;
      }
      if (input.current_stage) {
        conditions = and(conditions, eq(dexContextsTable.state, input.current_stage))!;
      }

      const contexts = await ctx.db
        .select()
        .from(dexContextsTable)
        .where(conditions)
        .orderBy(desc(dexContextsTable.updatedAt))
        .limit(Math.min(input.limit, 200))
        .offset(input.skip);

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(dexContextsTable)
        .where(conditions);

      return {
        contexts: contexts.map(c => ({
          id: c.id,
          tenant_id: c.tenantId,
          flow_id: c.flowId,
          entity_type: c.entityType,
          entity_id: c.entityId,
          current_stage: c.state,
          accumulated_context: c.payload,
          active_actors: c.activeActors,
          execution_trace: c.executionTrace,
          governance_hooks: c.governanceHooks,
          checkpoints: c.checkpoints,
          metadata: c.metadata,
          created_at: c.createdAt.toISOString(),
          updated_at: c.updatedAt.toISOString(),
        })),
        total: Number(countResult?.count || 0),
        limit: input.limit,
        skip: input.skip,
      };
    }),

  getContext: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [context] = await ctx.db
        .select()
        .from(dexContextsTable)
        .where(
          and(
            eq(dexContextsTable.id, input.id),
            eq(dexContextsTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution context not found",
        });
      }

      return {
        context: {
          id: context.id,
          tenant_id: context.tenantId,
          flow_id: context.flowId,
          entity_type: context.entityType,
          entity_id: context.entityId,
          current_stage: context.state,
          accumulated_context: context.payload,
          active_actors: context.activeActors,
          execution_trace: context.executionTrace,
          governance_hooks: context.governanceHooks,
          checkpoints: context.checkpoints,
          metadata: context.metadata,
          created_at: context.createdAt.toISOString(),
          updated_at: context.updatedAt.toISOString(),
        }
      };
    }),

  transitionStage: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        toStage: z.string(),
        note: z.string().optional(),
        contextPatch: z.any().optional(),
        actorType: z.string().default("human"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [context] = await ctx.db
        .select()
        .from(dexContextsTable)
        .where(
          and(
            eq(dexContextsTable.id, input.id),
            eq(dexContextsTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution context not found",
        });
      }

      if (!VALID_STAGES.includes(input.toStage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `toStage must be one of: ${VALID_STAGES.join(', ')}`,
        });
      }

      const terminal = ['closed', 'failed', 'cancelled'];
      if (terminal.includes(context.state)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot transition from terminal stage '${context.state}'`,
        });
      }

      const now = new Date();
      const traceEvent = {
        from_stage: context.state,
        to_stage: input.toStage,
        actor_id: ctx.user.id,
        actor_type: input.actorType,
        timestamp: now.toISOString(),
        note: input.note || null,
      };

      const updatedTrace = [...(context.executionTrace as any[] || []), traceEvent];
      const mergedContext = {
        ...(context.payload as Record<string, any> || {}),
        ...(input.contextPatch || {}),
      };

      await ctx.db
        .update(dexContextsTable)
        .set({
          state: input.toStage,
          executionTrace: updatedTrace,
          payload: mergedContext,
          updatedAt: now,
        })
        .where(
          and(
            eq(dexContextsTable.id, input.id),
            eq(dexContextsTable.tenantId, ctx.tenantId)
          )
        );

      return {
        id: input.id,
        previous_stage: context.state,
        current_stage: input.toStage,
        trace_event: traceEvent,
      };
    }),

  emitSignal: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signalType: z.string().min(1),
        payload: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [context] = await ctx.db
        .select()
        .from(dexContextsTable)
        .where(
          and(
            eq(dexContextsTable.id, input.id),
            eq(dexContextsTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution context not found",
        });
      }

      const now = new Date();
      const signalId = randomUUID();
      const signal = {
        id: signalId,
        signal_type: input.signalType,
        payload: input.payload || null,
        emitted_by: ctx.user.id,
        emitted_at: now.toISOString(),
      };

      const updatedTrace = [
        ...(context.executionTrace as any[] || []),
        { signal, actor_id: ctx.user.id, actor_type: 'system', timestamp: now.toISOString(), note: `Signal: ${input.signalType}` },
      ];

      await ctx.db
        .update(dexContextsTable)
        .set({
          executionTrace: updatedTrace,
          updatedAt: now,
        })
        .where(
          and(
            eq(dexContextsTable.id, input.id),
            eq(dexContextsTable.tenantId, ctx.tenantId)
          )
        );

      // Write to Time-Series hypertable
      await ctx.db
        .insert(dexSignalsTable)
        .values({
          id: signalId,
          contextId: input.id,
          metric: input.signalType,
          value: String(input.payload?.value || 0),
          observedAt: now,
        });

      return { signal };
    }),

  manageCheckpoint: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        action: z.enum(['create', 'resolve']),
        description: z.string().optional(),
        checkpointId: z.string().uuid().optional(),
        resolution: z.enum(['approved', 'rejected', 'escalated']).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [context] = await ctx.db
        .select()
        .from(dexContextsTable)
        .where(
          and(
            eq(dexContextsTable.id, input.id),
            eq(dexContextsTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution context not found",
        });
      }

      const now = new Date();

      if (input.action === 'create') {
        if (!input.description) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: 'description is required to create a checkpoint',
          });
        }

        const checkpoint = {
          id: randomUUID(),
          description: input.description,
          status: 'pending',
          created_by: ctx.user.id,
          created_at: now.toISOString(),
          resolved_by: null,
          resolved_at: null,
          resolution: null,
          notes: null,
        };

        const updatedCheckpoints = [...(context.checkpoints as any[] || []), checkpoint];

        await ctx.db
          .update(dexContextsTable)
          .set({
            checkpoints: updatedCheckpoints,
            state: 'pending_review',
            updatedAt: now,
          })
          .where(
            and(
              eq(dexContextsTable.id, input.id),
              eq(dexContextsTable.tenantId, ctx.tenantId)
            )
          );

        return { checkpoint };
      } else {
        if (!input.checkpointId || !input.resolution) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: 'checkpointId and resolution are required to resolve a checkpoint',
          });
        }

        const updatedCheckpoints = (context.checkpoints as any[] || []).map(cp =>
          cp.id === input.checkpointId
            ? { ...cp, status: 'resolved', resolved_by: ctx.user.id, resolved_at: now.toISOString(), resolution: input.resolution, notes: input.notes || null }
            : cp
        );

        await ctx.db
          .update(dexContextsTable)
          .set({
            checkpoints: updatedCheckpoints,
            updatedAt: now,
          })
          .where(
            and(
              eq(dexContextsTable.id, input.id),
              eq(dexContextsTable.tenantId, ctx.tenantId)
            )
          );

        return { checkpointId: input.checkpointId, resolution: input.resolution };
      }
    }),

  getObservability: tenantProcedure
    .query(async ({ ctx }) => {
      const contexts = await ctx.db
        .select()
        .from(dexContextsTable)
        .where(eq(dexContextsTable.tenantId, ctx.tenantId));

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const active_contexts = contexts.filter(c => !['completed', 'closed', 'failed', 'cancelled'].includes(c.state)).length;
      const completed_today = contexts.filter(c => c.state === 'completed' && new Date(c.updatedAt) >= todayStart).length;
      const failed_today = contexts.filter(c => c.state === 'failed' && new Date(c.updatedAt) >= todayStart).length;

      const withDuration = contexts.filter(c => c.createdAt && c.updatedAt);
      const avg_duration_ms = withDuration.length > 0
        ? withDuration.reduce((sum, c) => sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()), 0) / withDuration.length
        : 0;

      const contexts_by_stage: Record<string, number> = {};
      for (const c of contexts) {
        contexts_by_stage[c.state] = (contexts_by_stage[c.state] || 0) + 1;
      }

      return {
        active_contexts,
        completed_today,
        failed_today,
        avg_duration_ms: Math.floor(avg_duration_ms),
        contexts_by_stage,
      };
    }),
});
