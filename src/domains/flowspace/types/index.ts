/**
 * FlowSpace domain TypeScript types.
 * Mirrors the server-side decision_records and execution_contexts schemas.
 */

// ── Decision Records ──────────────────────────────────────────────────────────

export type ActorType = 'human' | 'ai' | 'system';

export type DecisionDomain =
  | 'fsm'
  | 'finance'
  | 'ai'
  | 'compliance'
  | 'inventory'
  | 'hr'
  | 'iot'
  | 'esg'
  | string;

export interface DecisionRecord {
  id: string;
  tenant_id: string;
  domain: DecisionDomain;
  actor_type: ActorType;
  actor_id: string;
  action: string;
  rationale: string | null;
  context: Record<string, unknown> | null;
  constraints: Record<string, unknown> | null;
  alternatives: Record<string, unknown> | null;
  confidence_score: number | null;
  model_version: string | null;
  lineage_parent_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  outcome: Record<string, unknown> | null;
  created_at: string;
}

export interface DecisionRecordCreatePayload {
  domain: DecisionDomain;
  actorType: ActorType;
  actorId: string;
  action: string;
  rationale?: string;
  context?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  alternatives?: Record<string, unknown>;
  confidenceScore?: number;
  modelVersion?: string;
  lineageParentId?: string;
  entityType?: string;
  entityId?: string;
  outcome?: Record<string, unknown>;
}

export interface DecisionRecordFilters {
  domain?: DecisionDomain;
  actor_type?: ActorType;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  since?: string;
  until?: string;
  limit?: number;
  skip?: number;
}

export interface DecisionRecordListResponse {
  records: DecisionRecord[];
  total: number;
  limit: number;
  skip: number;
}

export interface DecisionLineageResponse {
  lineage: DecisionRecord[];
  length: number;
}

// ── Domain display helpers ────────────────────────────────────────────────────

export const DOMAIN_LABELS: Record<string, string> = {
  fsm:        'Field Service',
  finance:    'Finance',
  ai:         'AI / Intelligence',
  compliance: 'Compliance',
  inventory:  'Inventory',
  hr:         'Human Resources',
  iot:        'IoT / Telemetry',
  esg:        'ESG / Sustainability',
};

export const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  human:  'Human',
  ai:     'AI Model',
  system: 'System',
};

export const ACTOR_TYPE_COLOURS: Record<ActorType, string> = {
  human:  'bg-blue-100 text-blue-800',
  ai:     'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-700',
};
