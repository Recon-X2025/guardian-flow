/**
 * @file tests/unit/flowspace.test.ts
 * @description
 * Unit tests for the FlowSpace service and route contract.
 *
 * All database calls are stubbed — no real connection required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── DB adapter stub ─────────────────────────────────────────────────────────

function makeAdapterStub(overrides: Record<string, unknown> = {}) {
  return {
    findMany:       vi.fn().mockResolvedValue([]),
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
    ...overrides,
  };
}

// ── 1. writeDecisionRecord ─────────────────────────────────────────────────

describe('writeDecisionRecord()', () => {
  let adapterStub: ReturnType<typeof makeAdapterStub>;
  let writeDecisionRecord: typeof import('../../server/services/flowspace.js').writeDecisionRecord;

  beforeEach(async () => {
    adapterStub = makeAdapterStub();
    vi.resetModules();
    vi.doMock('../../server/db/factory.js', () => ({
      getAdapter: vi.fn().mockResolvedValue(adapterStub),
    }));
    vi.doMock('../../server/utils/logger.js', () => ({
      default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    }));
    const mod = await import('../../server/services/flowspace.js');
    writeDecisionRecord = mod.writeDecisionRecord;
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('inserts a record and returns an id + created_at', async () => {
    const result = await writeDecisionRecord({
      tenantId:  'tenant-1',
      domain:    'fsm',
      actorType: 'human',
      actorId:   'user-abc',
      action:    'dispatch_assigned',
    });

    expect(result.id).toBeTruthy();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(adapterStub.insertOne).toHaveBeenCalledOnce();

    const inserted = adapterStub.insertOne.mock.calls[0][1] as Record<string, unknown>;
    expect(inserted.tenant_id).toBe('tenant-1');
    expect(inserted.domain).toBe('fsm');
    expect(inserted.actor_type).toBe('human');
    expect(inserted.actor_id).toBe('user-abc');
    expect(inserted.action).toBe('dispatch_assigned');
  });

  it('stores optional fields when provided', async () => {
    await writeDecisionRecord({
      tenantId:       'tenant-2',
      domain:         'ai',
      actorType:      'ai',
      actorId:        'gpt-4o',
      action:         'rag_query_answered',
      rationale:      'Query about maintenance schedules',
      confidenceScore: 0.87,
      modelVersion:   'gpt-4o-2024-08',
      entityType:     'work_order',
      entityId:       'wo-999',
      lineageParentId: 'parent-uuid',
    });

    const inserted = adapterStub.insertOne.mock.calls[0][1] as Record<string, unknown>;
    expect(inserted.confidence_score).toBe(0.87);
    expect(inserted.model_version).toBe('gpt-4o-2024-08');
    expect(inserted.entity_type).toBe('work_order');
    expect(inserted.entity_id).toBe('wo-999');
    expect(inserted.lineage_parent_id).toBe('parent-uuid');
    expect(inserted.rationale).toBe('Query about maintenance schedules');
  });

  it('throws when tenantId is missing', async () => {
    await expect(
      writeDecisionRecord({
        tenantId: '',
        domain: 'fsm',
        actorType: 'human',
        actorId: 'user-1',
        action: 'test',
      }),
    ).rejects.toThrow('tenantId is required');
  });

  it('throws when domain is missing', async () => {
    await expect(
      writeDecisionRecord({
        tenantId: 'tenant-1',
        domain: '',
        actorType: 'human',
        actorId: 'user-1',
        action: 'test',
      }),
    ).rejects.toThrow('domain is required');
  });

  it('throws when actorType is missing', async () => {
    await expect(
      writeDecisionRecord({
        tenantId: 'tenant-1',
        domain: 'fsm',
        actorType: '' as 'human',
        actorId: 'user-1',
        action: 'test',
      }),
    ).rejects.toThrow('actorType is required');
  });

  it('throws when actorId is missing', async () => {
    await expect(
      writeDecisionRecord({
        tenantId: 'tenant-1',
        domain: 'fsm',
        actorType: 'human',
        actorId: '',
        action: 'test',
      }),
    ).rejects.toThrow('actorId is required');
  });

  it('throws when action is missing', async () => {
    await expect(
      writeDecisionRecord({
        tenantId: 'tenant-1',
        domain: 'fsm',
        actorType: 'human',
        actorId: 'user-1',
        action: '',
      }),
    ).rejects.toThrow('action is required');
  });

  it('generates a unique id each call', async () => {
    const r1 = await writeDecisionRecord({ tenantId: 't1', domain: 'fsm', actorType: 'human', actorId: 'u1', action: 'a1' });
    const r2 = await writeDecisionRecord({ tenantId: 't1', domain: 'fsm', actorType: 'human', actorId: 'u1', action: 'a2' });
    expect(r1.id).not.toBe(r2.id);
  });

  it('null-fills optional fields when not provided', async () => {
    await writeDecisionRecord({ tenantId: 't1', domain: 'fsm', actorType: 'human', actorId: 'u1', action: 'a1' });
    const inserted = adapterStub.insertOne.mock.calls[0][1] as Record<string, unknown>;
    expect(inserted.rationale).toBeNull();
    expect(inserted.confidence_score).toBeNull();
    expect(inserted.model_version).toBeNull();
    expect(inserted.lineage_parent_id).toBeNull();
    expect(inserted.entity_type).toBeNull();
    expect(inserted.entity_id).toBeNull();
    expect(inserted.outcome).toBeNull();
  });
});

// ── 2. listDecisionRecords ────────────────────────────────────────────────

describe('listDecisionRecords()', () => {
  let adapterStub: ReturnType<typeof makeAdapterStub>;
  let listDecisionRecords: typeof import('../../server/services/flowspace.js').listDecisionRecords;

  const mockRecords = [
    { id: 'r1', tenant_id: 'tenant-1', domain: 'fsm', created_at: new Date() },
    { id: 'r2', tenant_id: 'tenant-1', domain: 'ai',  created_at: new Date() },
  ];

  beforeEach(async () => {
    adapterStub = makeAdapterStub({
      findMany:       vi.fn().mockResolvedValue(mockRecords),
      countDocuments: vi.fn().mockResolvedValue(2),
    });
    vi.resetModules();
    vi.doMock('../../server/db/factory.js', () => ({
      getAdapter: vi.fn().mockResolvedValue(adapterStub),
    }));
    vi.doMock('../../server/utils/logger.js', () => ({
      default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    }));
    const mod = await import('../../server/services/flowspace.js');
    listDecisionRecords = mod.listDecisionRecords;
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns records and total for a tenant', async () => {
    const result = await listDecisionRecords('tenant-1');
    expect(result.records).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('passes tenant_id filter to adapter', async () => {
    await listDecisionRecords('tenant-1');
    const query = adapterStub.findMany.mock.calls[0][1] as Record<string, unknown>;
    expect(query.tenant_id).toBe('tenant-1');
  });

  it('applies domain filter when provided', async () => {
    await listDecisionRecords('tenant-1', { domain: 'fsm' });
    const query = adapterStub.findMany.mock.calls[0][1] as Record<string, unknown>;
    expect(query.domain).toBe('fsm');
  });

  it('caps limit at 200', async () => {
    await listDecisionRecords('tenant-1', {}, 500);
    const opts = adapterStub.findMany.mock.calls[0][2] as Record<string, unknown>;
    expect(opts.limit).toBe(200);
  });

  it('throws when tenantId is missing', async () => {
    await expect(listDecisionRecords('')).rejects.toThrow('tenantId is required');
  });
});

// ── 3. getDecisionRecord ──────────────────────────────────────────────────

describe('getDecisionRecord()', () => {
  let adapterStub: ReturnType<typeof makeAdapterStub>;
  let getDecisionRecord: typeof import('../../server/services/flowspace.js').getDecisionRecord;

  beforeEach(async () => {
    adapterStub = makeAdapterStub({
      findOne: vi.fn().mockResolvedValue({ id: 'rec-1', tenant_id: 'tenant-1' }),
    });
    vi.resetModules();
    vi.doMock('../../server/db/factory.js', () => ({
      getAdapter: vi.fn().mockResolvedValue(adapterStub),
    }));
    vi.doMock('../../server/utils/logger.js', () => ({
      default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    }));
    const mod = await import('../../server/services/flowspace.js');
    getDecisionRecord = mod.getDecisionRecord;
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns the record when found', async () => {
    const rec = await getDecisionRecord('tenant-1', 'rec-1');
    expect(rec).not.toBeNull();
    expect(rec!.id).toBe('rec-1');
  });

  it('queries with both id and tenant_id', async () => {
    await getDecisionRecord('tenant-1', 'rec-1');
    const query = adapterStub.findOne.mock.calls[0][1] as Record<string, unknown>;
    expect(query.id).toBe('rec-1');
    expect(query.tenant_id).toBe('tenant-1');
  });

  it('returns null when id is empty', async () => {
    const result = await getDecisionRecord('tenant-1', '');
    expect(result).toBeNull();
  });

  it('returns null when tenantId is empty', async () => {
    const result = await getDecisionRecord('', 'rec-1');
    expect(result).toBeNull();
  });
});

// ── 4. getDecisionLineage ─────────────────────────────────────────────────

describe('getDecisionLineage()', () => {
  let adapterStub: ReturnType<typeof makeAdapterStub>;
  let getDecisionLineage: typeof import('../../server/services/flowspace.js').getDecisionLineage;

  const records: Record<string, unknown> = {
    'r3': { id: 'r3', tenant_id: 't1', lineage_parent_id: 'r2' },
    'r2': { id: 'r2', tenant_id: 't1', lineage_parent_id: 'r1' },
    'r1': { id: 'r1', tenant_id: 't1', lineage_parent_id: null },
  };

  beforeEach(async () => {
    adapterStub = makeAdapterStub({
      findOne: vi.fn().mockImplementation((_col: string, query: Record<string, unknown>) => {
        const rec = records[query.id as string];
        return Promise.resolve(rec ? { ...rec } : null);
      }),
    });
    vi.resetModules();
    vi.doMock('../../server/db/factory.js', () => ({
      getAdapter: vi.fn().mockResolvedValue(adapterStub),
    }));
    vi.doMock('../../server/utils/logger.js', () => ({
      default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    }));
    const mod = await import('../../server/services/flowspace.js');
    getDecisionLineage = mod.getDecisionLineage;
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('walks the lineage chain from child to root', async () => {
    const chain = await getDecisionLineage('t1', 'r3');
    expect(chain.map((r: Record<string, unknown>) => r.id)).toEqual(['r3', 'r2', 'r1']);
  });

  it('returns a single record for a root node', async () => {
    const chain = await getDecisionLineage('t1', 'r1');
    expect(chain).toHaveLength(1);
    expect((chain[0] as Record<string, unknown>).id).toBe('r1');
  });

  it('returns empty array for missing id', async () => {
    const chain = await getDecisionLineage('t1', '');
    expect(chain).toHaveLength(0);
  });

  it('returns empty array for missing tenantId', async () => {
    const chain = await getDecisionLineage('', 'r3');
    expect(chain).toHaveLength(0);
  });

  it('stops after 10 hops to prevent infinite loops', async () => {
    // Create a cycle: a → b → a
    const cyclic: Record<string, unknown> = {
      'ca': { id: 'ca', tenant_id: 't1', lineage_parent_id: 'cb' },
      'cb': { id: 'cb', tenant_id: 't1', lineage_parent_id: 'ca' },
    };
    adapterStub.findOne.mockImplementation((_col: string, q: Record<string, unknown>) => {
      return Promise.resolve(cyclic[q.id as string] ?? null);
    });

    const chain = await getDecisionLineage('t1', 'ca');
    expect(chain.length).toBeLessThanOrEqual(10);
  });
});
