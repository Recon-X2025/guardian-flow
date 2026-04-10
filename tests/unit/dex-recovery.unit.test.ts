/**
 * @file tests/unit/dex-recovery.unit.test.ts
 * @description
 * D2 — "State Machine Chaos": DEX Recovery Worker Unit Tests.
 *
 * All DB and FlowSpace calls are stubbed — no real connection required.
 * Tests verify that the recovery worker:
 *   - Skips terminal-stage contexts.
 *   - Transitions stuck contexts to 'failed'.
 *   - Appends a recovery trace event with actor_type 'system'.
 *   - Calls writeDecisionRecord with the correct FlowSpace payload.
 *   - Returns correct recovered / errors counts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TERMINAL_STAGES, STALE_THRESHOLD_MS } from '../../server/workers/dex-recovery.js';

// ── Adapter + FlowSpace stubs ─────────────────────────────────────────────────

function makeAdapterStub(staleContexts: object[] = []) {
  return {
    findMany:       vi.fn().mockResolvedValue(staleContexts),
    findOne:        vi.fn().mockResolvedValue(null),
    insertOne:      vi.fn().mockResolvedValue({ id: 'mock-id' }),
    insertMany:     vi.fn().mockResolvedValue([]),
    updateOne:      vi.fn().mockResolvedValue(null),
    deleteMany:     vi.fn().mockResolvedValue(0),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate:      vi.fn().mockResolvedValue([]),
    transaction:    vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    isConnected:    vi.fn().mockReturnValue(true),
    ping:           vi.fn().mockResolvedValue(undefined),
    ensureIndex:    vi.fn().mockResolvedValue(undefined),
    close:          vi.fn().mockResolvedValue(undefined),
  };
}

// Stale context helper — updated_at well before the threshold
function makeStaleContext(overrides: Record<string, unknown> = {}) {
  const updatedAt = new Date(Date.now() - STALE_THRESHOLD_MS - 60_000); // 1 minute past threshold
  return {
    id:              'ctx-stale-001',
    tenant_id:       'tenant-abc',
    flow_id:         'flow-google-to-salesforce',
    entity_type:     'integration',
    entity_id:       'ent-001',
    current_stage:   'in_progress',
    execution_trace: [],
    updated_at:      updatedAt,
    ...overrides,
  };
}

// ── Module setup ─────────────────────────────────────────────────────────────

let runRecovery: typeof import('../../server/workers/dex-recovery.js').runRecovery;
let writeDecisionRecordMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();

  writeDecisionRecordMock = vi.fn().mockResolvedValue({ id: 'flowspace-rec-001', created_at: new Date() });

  vi.doMock('../../server/services/flowspace.js', () => ({
    writeDecisionRecord: writeDecisionRecordMock,
  }));
  vi.doMock('../../server/db/factory.js', () => ({
    getAdapter: vi.fn().mockResolvedValue(makeAdapterStub([])),
  }));
  vi.doMock('../../server/utils/logger.js', () => ({
    default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  }));

  const mod = await import('../../server/workers/dex-recovery.js');
  runRecovery = mod.runRecovery;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('D2 — DEX Recovery Worker: TERMINAL_STAGES constant', () => {
  it('contains all expected terminal stages', () => {
    expect(TERMINAL_STAGES.has('completed')).toBe(true);
    expect(TERMINAL_STAGES.has('closed')).toBe(true);
    expect(TERMINAL_STAGES.has('failed')).toBe(true);
    expect(TERMINAL_STAGES.has('cancelled')).toBe(true);
  });

  it('does not contain non-terminal stages', () => {
    expect(TERMINAL_STAGES.has('created')).toBe(false);
    expect(TERMINAL_STAGES.has('in_progress')).toBe(false);
    expect(TERMINAL_STAGES.has('assigned')).toBe(false);
    expect(TERMINAL_STAGES.has('pending_review')).toBe(false);
  });
});

describe('D2 — DEX Recovery Worker: runRecovery with no stale contexts', () => {
  it('returns { recovered: 0, errors: 0 } when nothing is stale', async () => {
    const adapter = makeAdapterStub([]);
    const result = await runRecovery(adapter);
    expect(result).toEqual({ recovered: 0, errors: 0 });
    expect(adapter.updateOne).not.toHaveBeenCalled();
  });
});

describe('D2 — DEX Recovery Worker: skips terminal-stage contexts', () => {
  for (const stage of ['completed', 'closed', 'failed', 'cancelled']) {
    it(`does not recover contexts already in '${stage}'`, async () => {
      const ctx = makeStaleContext({ current_stage: stage });
      const adapter = makeAdapterStub([ctx]);
      const result = await runRecovery(adapter);
      expect(result.recovered).toBe(0);
      expect(adapter.updateOne).not.toHaveBeenCalled();
    });
  }
});

describe('D2 — DEX Recovery Worker: transitions stuck context to failed', () => {
  it('calls adapter.updateOne with current_stage = "failed"', async () => {
    const ctx = makeStaleContext({ current_stage: 'in_progress' });
    const adapter = makeAdapterStub([ctx]);
    const result = await runRecovery(adapter);

    expect(result.recovered).toBe(1);
    expect(result.errors).toBe(0);

    expect(adapter.updateOne).toHaveBeenCalledOnce();
    const [, , patch] = adapter.updateOne.mock.calls[0];
    expect(patch.$set.current_stage).toBe('failed');
  });

  it('appends a recovery trace event with actor_type "system"', async () => {
    const ctx = makeStaleContext({ current_stage: 'assigned' });
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    const [, , patch] = adapter.updateOne.mock.calls[0];
    const trace: Array<{ actor_type: string; from_stage: string; to_stage: string }> = patch.$set.execution_trace;
    const recoveryEvent = trace[trace.length - 1];

    expect(recoveryEvent.actor_type).toBe('system');
    expect(recoveryEvent.from_stage).toBe('assigned');
    expect(recoveryEvent.to_stage).toBe('failed');
  });

  it('preserves existing execution_trace entries', async () => {
    const existingTrace = [{ event: 'created', timestamp: new Date() }];
    const ctx = makeStaleContext({ current_stage: 'in_progress', execution_trace: existingTrace });
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    const [, , patch] = adapter.updateOne.mock.calls[0];
    expect(patch.$set.execution_trace.length).toBe(2);
    expect(patch.$set.execution_trace[0]).toEqual(existingTrace[0]);
  });
});

describe('D2 — DEX Recovery Worker: FlowSpace logging', () => {
  it('calls writeDecisionRecord for each recovered context', async () => {
    const ctx = makeStaleContext();
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    expect(writeDecisionRecordMock).toHaveBeenCalledOnce();
  });

  it('FlowSpace record has actorType "system" and action "context_recovered_from_interruption"', async () => {
    const ctx = makeStaleContext();
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    const [record] = writeDecisionRecordMock.mock.calls[0];
    expect(record.actorType).toBe('system');
    expect(record.actorId).toBe('dex-recovery-worker');
    expect(record.action).toBe('context_recovered_from_interruption');
    expect(record.domain).toBe('dex');
  });

  it('FlowSpace record tenantId matches context tenant_id', async () => {
    const ctx = makeStaleContext({ tenant_id: 'tenant-xyz' });
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    const [record] = writeDecisionRecordMock.mock.calls[0];
    expect(record.tenantId).toBe('tenant-xyz');
  });

  it('FlowSpace record.context includes frozenAtStage', async () => {
    const ctx = makeStaleContext({ current_stage: 'pending_review' });
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    const [record] = writeDecisionRecordMock.mock.calls[0];
    expect(record.context.frozenAtStage).toBe('pending_review');
  });

  it('FlowSpace record includes a non-empty rationale', async () => {
    const ctx = makeStaleContext();
    const adapter = makeAdapterStub([ctx]);
    await runRecovery(adapter);

    const [record] = writeDecisionRecordMock.mock.calls[0];
    expect(typeof record.rationale).toBe('string');
    expect(record.rationale.length).toBeGreaterThan(20);
  });
});

describe('D2 — DEX Recovery Worker: handles multiple stale contexts', () => {
  it('recovers all eligible contexts and returns correct count', async () => {
    const contexts = [
      makeStaleContext({ id: 'ctx-001', current_stage: 'created' }),
      makeStaleContext({ id: 'ctx-002', current_stage: 'assigned' }),
      makeStaleContext({ id: 'ctx-003', current_stage: 'in_progress' }),
      makeStaleContext({ id: 'ctx-004', current_stage: 'failed' }),     // terminal — skip
      makeStaleContext({ id: 'ctx-005', current_stage: 'completed' }),  // terminal — skip
    ];
    const adapter = makeAdapterStub(contexts);
    const result = await runRecovery(adapter);

    expect(result.recovered).toBe(3);
    expect(result.errors).toBe(0);
    expect(adapter.updateOne).toHaveBeenCalledTimes(3);
    expect(writeDecisionRecordMock).toHaveBeenCalledTimes(3);
  });
});

describe('D2 — DEX Recovery Worker: error handling', () => {
  it('counts errors when updateOne throws', async () => {
    const ctx = makeStaleContext();
    const adapter = makeAdapterStub([ctx]);
    adapter.updateOne = vi.fn().mockRejectedValue(new Error('DB write failure'));

    const result = await runRecovery(adapter);
    expect(result.errors).toBe(1);
    expect(result.recovered).toBe(0);
  });

  it('returns { recovered: 0, errors: 1 } when findMany throws', async () => {
    const adapter = makeAdapterStub();
    adapter.findMany = vi.fn().mockRejectedValue(new Error('DB read failure'));

    const result = await runRecovery(adapter);
    expect(result).toEqual({ recovered: 0, errors: 1 });
  });
});
