/**
 * @file server/services/flowspace.js
 * @description FlowSpace — Persistent Decision Context Layer.
 *
 * Every significant platform action (dispatch, fraud flag, invoice approval,
 * forecast override, RAG response) writes a structured DecisionRecord here.
 * Records are append-only and tenant-scoped.
 *
 * Key invariants enforced at service level:
 *   - tenantId is always set (caller must provide)
 *   - id and timestamp are generated server-side (not trusted from client)
 *   - Records are immutable: no update or delete paths are exposed
 */

import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const COLLECTION = 'decision_records';

/**
 * Write a decision record to the FlowSpace ledger.
 *
 * @param {object} record
 * @param {string} record.tenantId          - Required. Tenant that owns this record.
 * @param {string} record.domain            - e.g. 'fsm', 'finance', 'ai', 'compliance'
 * @param {string} record.actorType         - 'human' | 'ai' | 'system'
 * @param {string} record.actorId           - User ID, model name, or system identifier
 * @param {string} record.action            - Short action label, e.g. 'dispatch_assigned'
 * @param {string} [record.rationale]       - Free-text explanation of the decision
 * @param {object} [record.context]         - Arbitrary structured context snapshot
 * @param {object} [record.constraints]     - Constraints that were active at decision time
 * @param {object} [record.alternatives]    - Other options that were considered
 * @param {number} [record.confidenceScore] - 0–1 confidence for AI decisions
 * @param {string} [record.modelVersion]    - AI model version string
 * @param {string} [record.lineageParentId] - ID of the upstream decision that caused this one
 * @param {string} [record.entityType]      - Entity this decision is about, e.g. 'work_order'
 * @param {string} [record.entityId]        - Entity's ID
 * @param {object} [record.outcome]         - Recorded after the fact (not set on creation)
 * @returns {Promise<{id: string, created_at: Date}>}
 */
export async function writeDecisionRecord(record) {
  const {
    tenantId,
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
  } = record;

  if (!tenantId) throw new Error('FlowSpace: tenantId is required');
  if (!domain)   throw new Error('FlowSpace: domain is required');
  if (!actorType) throw new Error('FlowSpace: actorType is required');
  if (!actorId)  throw new Error('FlowSpace: actorId is required');
  if (!action)   throw new Error('FlowSpace: action is required');

  const id = randomUUID();
  const created_at = new Date();

  const doc = {
    id,
    tenant_id: tenantId,
    domain,
    actor_type: actorType,
    actor_id: actorId,
    action,
    rationale: rationale ?? null,
    context: context ?? null,
    constraints: constraints ?? null,
    alternatives: alternatives ?? null,
    confidence_score: confidenceScore ?? null,
    model_version: modelVersion ?? null,
    lineage_parent_id: lineageParentId ?? null,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    outcome: outcome ?? null,
    created_at,
  };

  const adapter = await getAdapter();
  await adapter.insertOne(COLLECTION, doc);

  logger.info('FlowSpace: decision record written', {
    id,
    domain,
    actorType,
    action,
    tenantId,
    entityType,
    entityId,
  });

  return { id, created_at };
}

/**
 * List decision records for a tenant with optional filters.
 *
 * @param {string}  tenantId
 * @param {object}  [filters]
 * @param {string}  [filters.domain]
 * @param {string}  [filters.actorType]
 * @param {string}  [filters.actorId]
 * @param {string}  [filters.action]
 * @param {string}  [filters.entityType]
 * @param {string}  [filters.entityId]
 * @param {string}  [filters.since]       - ISO date string
 * @param {string}  [filters.until]       - ISO date string
 * @param {number}  [limit=50]
 * @param {number}  [skip=0]
 * @returns {Promise<{records: object[], total: number}>}
 */
export async function listDecisionRecords(tenantId, filters = {}, limit = 50, skip = 0) {
  if (!tenantId) throw new Error('FlowSpace: tenantId is required');

  const query = { tenant_id: tenantId };

  if (filters.domain)     query.domain      = filters.domain;
  if (filters.actorType)  query.actor_type  = filters.actorType;
  if (filters.actorId)    query.actor_id    = filters.actorId;
  if (filters.action)     query.action      = filters.action;
  if (filters.entityType) query.entity_type = filters.entityType;
  if (filters.entityId)   query.entity_id   = filters.entityId;

  if (filters.since || filters.until) {
    query.created_at = {};
    if (filters.since) query.created_at.$gte = new Date(filters.since);
    if (filters.until) query.created_at.$lte = new Date(filters.until);
  }

  const adapter = await getAdapter();
  const [records, total] = await Promise.all([
    adapter.findMany(COLLECTION, query, {
      sort: { created_at: -1 },
      limit: Math.min(limit, 200),
      skip,
    }),
    adapter.countDocuments(COLLECTION, query),
  ]);

  return { records, total };
}

/**
 * Get a single decision record by ID, scoped to tenant.
 *
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getDecisionRecord(tenantId, id) {
  if (!tenantId || !id) return null;
  const adapter = await getAdapter();
  return adapter.findOne(COLLECTION, { id, tenant_id: tenantId });
}

/**
 * Get the full decision lineage chain starting from a given record.
 * Walks lineage_parent_id links up to 10 hops.
 *
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<object[]>} Ordered from current → root
 */
export async function getDecisionLineage(tenantId, id) {
  if (!tenantId || !id) return [];

  const adapter = await getAdapter();
  const chain = [];
  let currentId = id;
  const visited = new Set();

  for (let hop = 0; hop < 10; hop++) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const record = await adapter.findOne(COLLECTION, { id: currentId, tenant_id: tenantId });
    if (!record) break;

    chain.push(record);
    if (!record.lineage_parent_id) break;
    currentId = record.lineage_parent_id;
  }

  return chain;
}
