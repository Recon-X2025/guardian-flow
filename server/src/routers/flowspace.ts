import { z } from "zod";
import { randomUUID, createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "../trpc.js";
import { decisionRecords as decisionRecordsTable } from "../db/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

// Reusable helper to build AI Act Article 13 explanation
function buildArticle13Explanation(record: any, lineage: any[]) {
  const isAi = record.actor_type === 'ai' || record.actorType === 'ai';
  const isHighRisk = record.metadata?.risk_level === 'high' ||
    ['approve', 'reject', 'deny', 'block', 'flag', 'escalate'].some(k => (record.action ?? '').toLowerCase().includes(k));

  const purposeMap: Record<string, string> = {
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
    ? `An automated AI system (${record.actor_id ?? record.actorId ?? 'AI agent'}) evaluated available data and applied decision logic to arrive at the outcome: "${record.action}". ` +
      `${record.metadata?.model ? `Model used: ${record.metadata.model}.` : ''} ` +
      `${record.metadata?.confidence !== undefined ? `Confidence score: ${Math.round(record.metadata.confidence * 100)}%.` : ''}`
    : `A human operator (${record.actor_id ?? record.actorId ?? 'user'}) manually performed the action "${record.action}" ` +
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
      actor_type: record.actor_type ?? record.actorType,
      actor_id: record.actor_id ?? record.actorId,
      timestamp: record.created_at ?? record.createdAt,
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
    confidence_score: record.metadata?.confidence ?? record.confidenceScore ?? null,
    audit_trail_url: `/flowspace?record=${record.id}`,
  };
}

export const flowspaceRouter = router({
  writeRecord: tenantProcedure
    .input(
      z.object({
        domain: z.string().min(1),
        actorType: z.enum(["human", "ai", "system"]),
        actorId: z.string().min(1),
        action: z.string().min(1),
        rationale: z.string().optional(),
        context: z.any().optional(),
        constraints: z.any().optional(),
        alternatives: z.any().optional(),
        confidenceScore: z.number().min(0).max(1).optional(),
        modelVersion: z.string().optional(),
        lineageParentId: z.string().uuid().optional(),
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional(),
        priorState: z.any().optional(),
        newState: z.any().optional(),
        outcome: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = randomUUID();
      const createdAt = new Date();

      const [newRecord] = await ctx.db
        .insert(decisionRecordsTable)
        .values({
          id,
          tenantId: ctx.tenantId,
          domain: input.domain,
          actorType: input.actorType,
          actorId: input.actorId,
          action: input.action,
          rationale: input.rationale || null,
          context: input.context || null,
          constraints: input.constraints || null,
          alternatives: input.alternatives || null,
          confidenceScore: input.confidenceScore ? String(input.confidenceScore) : null,
          modelVersion: input.modelVersion || null,
          parentDecisionId: input.lineageParentId || null,
          entityType: input.entityType || null,
          entityId: input.entityId || null,
          priorState: input.priorState || null,
          newState: input.newState || null,
          outcome: input.outcome || null,
          createdAt,
        })
        .returning();

      return {
        id: newRecord.id,
        created_at: newRecord.createdAt,
      };
    }),

  listRecords: tenantProcedure
    .input(
      z.object({
        domain: z.string().optional(),
        actor_type: z.enum(["human", "ai", "system"]).optional(),
        actor_id: z.string().optional(),
        action: z.string().optional(),
        entity_type: z.string().optional(),
        entity_id: z.string().uuid().optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        limit: z.number().default(50),
        skip: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      let conditions = eq(decisionRecordsTable.tenantId, ctx.tenantId);

      if (input.domain) {
        conditions = and(conditions, eq(decisionRecordsTable.domain, input.domain))!;
      }
      if (input.actor_type) {
        conditions = and(conditions, eq(decisionRecordsTable.actorType, input.actor_type))!;
      }
      if (input.actor_id) {
        conditions = and(conditions, eq(decisionRecordsTable.actorId, input.actor_id))!;
      }
      if (input.action) {
        conditions = and(conditions, eq(decisionRecordsTable.action, input.action))!;
      }
      if (input.entity_type) {
        conditions = and(conditions, eq(decisionRecordsTable.entityType, input.entity_type))!;
      }
      if (input.entity_id) {
        conditions = and(conditions, eq(decisionRecordsTable.entityId, input.entity_id))!;
      }
      if (input.since) {
        conditions = and(conditions, gte(decisionRecordsTable.createdAt, new Date(input.since)))!;
      }
      if (input.until) {
        conditions = and(conditions, lte(decisionRecordsTable.createdAt, new Date(input.until)))!;
      }

      const records = await ctx.db
        .select()
        .from(decisionRecordsTable)
        .where(conditions)
        .orderBy(desc(decisionRecordsTable.createdAt))
        .limit(Math.min(input.limit, 200))
        .offset(input.skip);

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(decisionRecordsTable)
        .where(conditions);

      return {
        records: records.map(r => ({
          id: r.id,
          tenant_id: r.tenantId,
          domain: r.domain,
          actor_type: r.actorType,
          actor_id: r.actorId,
          action: r.action,
          rationale: r.rationale,
          context: r.context,
          constraints: r.constraints,
          alternatives: r.alternatives,
          confidence_score: r.confidenceScore ? Number(r.confidenceScore) : null,
          model_version: r.modelVersion,
          lineage_parent_id: r.parentDecisionId,
          entity_type: r.entityType,
          entity_id: r.entityId,
          prior_state: r.priorState,
          new_state: r.newState,
          outcome: r.outcome,
          created_at: r.createdAt.toISOString(),
        })),
        total: Number(countResult?.count || 0),
        limit: input.limit,
        skip: input.skip,
      };
    }),

  getRecord: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [record] = await ctx.db
        .select()
        .from(decisionRecordsTable)
        .where(
          and(
            eq(decisionRecordsTable.id, input.id),
            eq(decisionRecordsTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Decision record not found",
        });
      }

      return {
        record: {
          id: record.id,
          tenant_id: record.tenantId,
          domain: record.domain,
          actor_type: record.actorType,
          actor_id: record.actorId,
          action: record.action,
          rationale: record.rationale,
          context: record.context,
          constraints: record.constraints,
          alternatives: record.alternatives,
          confidence_score: record.confidenceScore ? Number(record.confidenceScore) : null,
          model_version: record.modelVersion,
          lineage_parent_id: record.parentDecisionId,
          entity_type: record.entityType,
          entity_id: record.entityId,
          prior_state: record.priorState,
          new_state: record.newState,
          outcome: record.outcome,
          created_at: record.createdAt.toISOString(),
        }
      };
    }),

  getLineage: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Execute recursive CTE on Postgres to walk the causal parent links
      const result = await ctx.db.execute(sql`
        WITH RECURSIVE lineage_chain AS (
          -- Anchor
          SELECT * FROM decision_records 
          WHERE id = ${input.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid
          
          UNION ALL
          
          -- Recursive member
          SELECT dr.* FROM decision_records dr
          INNER JOIN lineage_chain lc ON dr.id = lc.parent_decision_id
          WHERE dr.tenant_id = ${ctx.tenantId}::uuid
        )
        SELECT * FROM lineage_chain LIMIT 10
      `);

      const lineage = (result.rows || []).map((r: any) => ({
        id: r.id,
        tenant_id: r.tenant_id,
        domain: r.domain,
        actor_type: r.actor_type,
        actor_id: r.actor_id,
        action: r.action,
        rationale: r.rationale,
        context: r.context,
        constraints: r.constraints,
        alternatives: r.alternatives,
        confidence_score: r.confidence_score ? Number(r.confidence_score) : null,
        model_version: r.model_version,
        lineage_parent_id: r.parent_decision_id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        prior_state: r.prior_state,
        new_state: r.new_state,
        outcome: r.outcome,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : new Date(r.created_at).toISOString(),
      }));

      return {
        lineage,
        length: lineage.length,
      };
    }),

  attest: tenantProcedure
    .input(z.object({ record_ids: z.array(z.string().uuid()) }))
    .mutation(async ({ input, ctx }) => {
      const records = await Promise.all(
        input.record_ids.map(async (id) => {
          const [rec] = await ctx.db
            .select()
            .from(decisionRecordsTable)
            .where(
              and(
                eq(decisionRecordsTable.id, id),
                eq(decisionRecordsTable.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          return rec;
        })
      );

      const found = records.filter(Boolean);
      const hash = createHash("sha256")
        .update(input.record_ids.join(",") + JSON.stringify(found))
        .digest("hex");

      return {
        hash,
        record_count: input.record_ids.length,
        attested_at: new Date().toISOString(),
      };
    }),

  explain: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [record] = await ctx.db
        .select()
        .from(decisionRecordsTable)
        .where(
          and(
            eq(decisionRecordsTable.id, input.id),
            eq(decisionRecordsTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Decision record not found",
        });
      }

      // Fetch parent lineage context
      let lineage: any[] = [];
      try {
        const lineageRes = await ctx.db.execute(sql`
          WITH RECURSIVE lineage_chain AS (
            SELECT * FROM decision_records 
            WHERE id = ${record.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid
            UNION ALL
            SELECT dr.* FROM decision_records dr
            INNER JOIN lineage_chain lc ON dr.id = lc.parent_decision_id
            WHERE dr.tenant_id = ${ctx.tenantId}::uuid
          )
          SELECT * FROM lineage_chain LIMIT 10
        `);
        lineage = lineageRes.rows || [];
      } catch (_) {}

      const explanation = buildArticle13Explanation(record, lineage);

      return {
        explanation,
        record: {
          id: record.id,
          action: record.action,
          domain: record.domain,
          actor_type: record.actorType,
        },
      };
    }),
});
