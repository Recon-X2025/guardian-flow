/**
 * DEX (Distributed Execution & Experience Layer) TypeScript types.
 */

// ── Stage machine ─────────────────────────────────────────────────────────────

export type ExecutionStage =
  | 'created'
  | 'assigned'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'closed'
  | 'failed'
  | 'cancelled';

export const STAGE_ORDER: ExecutionStage[] = [
  'created', 'assigned', 'in_progress', 'pending_review', 'completed', 'closed',
];

export const TERMINAL_STAGES: ExecutionStage[] = ['closed', 'failed', 'cancelled'];

export const STAGE_LABELS: Record<ExecutionStage, string> = {
  created:        'Created',
  assigned:       'Assigned',
  in_progress:    'In Progress',
  pending_review: 'Pending Review',
  completed:      'Completed',
  closed:         'Closed',
  failed:         'Failed',
  cancelled:      'Cancelled',
};

export const STAGE_COLOURS: Record<ExecutionStage, string> = {
  created:        'bg-slate-100 text-slate-700',
  assigned:       'bg-blue-100 text-blue-700',
  in_progress:    'bg-amber-100 text-amber-700',
  pending_review: 'bg-orange-100 text-orange-700',
  completed:      'bg-green-100 text-green-700',
  closed:         'bg-emerald-100 text-emerald-700',
  failed:         'bg-red-100 text-red-700',
  cancelled:      'bg-gray-100 text-gray-600',
};

// ── Execution context ─────────────────────────────────────────────────────────

export interface TraceEvent {
  from_stage?: ExecutionStage;
  to_stage?: ExecutionStage;
  stage?: ExecutionStage;
  actor_id: string;
  actor_type: 'human' | 'ai' | 'system';
  timestamp: string;
  note: string | null;
  signal?: {
    id: string;
    signal_type: string;
    payload: Record<string, unknown> | null;
    emitted_by: string;
    emitted_at: string;
  };
}

export interface Checkpoint {
  id: string;
  description: string;
  status: 'pending' | 'resolved';
  created_by: string;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution: 'approved' | 'rejected' | 'escalated' | null;
  notes: string | null;
}

export interface ExecutionContext {
  id: string;
  tenant_id: string;
  flow_id: string;
  entity_type: string;
  entity_id: string;
  current_stage: ExecutionStage;
  accumulated_context: Record<string, unknown>;
  active_actors: string[];
  execution_trace: TraceEvent[];
  governance_hooks: unknown[];
  checkpoints: Checkpoint[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutionContextCreatePayload {
  flowId: string;
  entityType: string;
  entityId: string;
  initialStage?: ExecutionStage;
  accumulatedContext?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ExecutionContextListResponse {
  contexts: ExecutionContext[];
  total: number;
  limit: number;
  skip: number;
}

export interface TransitionPayload {
  toStage: ExecutionStage;
  note?: string;
  contextPatch?: Record<string, unknown>;
  actorType?: 'human' | 'ai' | 'system';
}

export interface SignalPayload {
  signalType: string;
  payload?: Record<string, unknown>;
}

export interface CheckpointCreatePayload {
  action: 'create';
  description: string;
}

export interface CheckpointResolvePayload {
  action: 'resolve';
  checkpointId: string;
  resolution: 'approved' | 'rejected' | 'escalated';
  notes?: string;
}
