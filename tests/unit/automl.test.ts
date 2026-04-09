import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db/factory.js', () => ({ getAdapter: vi.fn() }));

import { getAdapter } from '../../server/db/factory.js';

const makeAdapter = () => ({
  findMany: vi.fn().mockResolvedValue([]),
  findOne: vi.fn().mockResolvedValue(null),
  insertOne: vi.fn().mockResolvedValue({}),
  insertMany: vi.fn().mockResolvedValue([]),
  updateOne: vi.fn().mockResolvedValue(null),
  deleteMany: vi.fn().mockResolvedValue(0),
  countDocuments: vi.fn().mockResolvedValue(0),
  aggregate: vi.fn().mockResolvedValue([]),
  transaction: vi.fn().mockResolvedValue(null),
  isConnected: vi.fn().mockReturnValue(true),
  ping: vi.fn().mockResolvedValue(undefined),
  ensureIndex: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
});

describe('automl service', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(() => {
    adapter = makeAdapter();
    (getAdapter as ReturnType<typeof vi.fn>).mockResolvedValue(adapter);
    vi.resetModules();
  });

  it('createExperiment stores and returns experiment doc', async () => {
    const { createExperiment } = await import('../../server/services/ai/automl.js');
    const result = await createExperiment('tenant1', {
      name: 'Test Exp',
      dataSource: 'sales_data',
      targetMetric: 'accuracy',
      algorithm: 'random_forest',
    });
    expect(adapter.insertOne).toHaveBeenCalledWith('automl_experiments', expect.objectContaining({
      tenant_id: 'tenant1',
      name: 'Test Exp',
      algorithm: 'random_forest',
    }));
    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test Exp');
  });

  it('listExperiments calls findMany with tenant filter', async () => {
    adapter.findMany.mockResolvedValue([{ id: 'exp1', name: 'Exp One', tenant_id: 'tenant1' }]);
    const { listExperiments } = await import('../../server/services/ai/automl.js');
    const result = await listExperiments('tenant1');
    expect(adapter.findMany).toHaveBeenCalledWith('automl_experiments', { tenant_id: 'tenant1' }, expect.any(Object));
    expect(result).toHaveLength(1);
  });

  it('createRun throws when experiment not found', async () => {
    adapter.findOne.mockResolvedValue(null);
    const { createRun } = await import('../../server/services/ai/automl.js');
    await expect(createRun('tenant1', 'missing-exp', {})).rejects.toThrow('Experiment not found');
  });

  it('createRun creates run with metrics when experiment exists', async () => {
    adapter.findOne.mockResolvedValue({ id: 'exp1', tenant_id: 'tenant1' });
    const { createRun } = await import('../../server/services/ai/automl.js');
    const run = await createRun('tenant1', 'exp1', { lr: 0.01 });
    expect(run).toHaveProperty('id');
    expect(run.metrics).toHaveProperty('accuracy');
    expect(run.metrics).toHaveProperty('loss');
    expect(run.status).toBe('completed');
  });

  it('deployModel throws when run not found', async () => {
    adapter.findOne.mockResolvedValue(null);
    const { deployModel } = await import('../../server/services/ai/automl.js');
    await expect(deployModel('tenant1', 'missing-run')).rejects.toThrow('Run not found');
  });

  it('deployModel marks run as deployed', async () => {
    adapter.findOne.mockResolvedValue({ id: 'run1', tenant_id: 'tenant1' });
    const { deployModel } = await import('../../server/services/ai/automl.js');
    const result = await deployModel('tenant1', 'run1');
    expect(result.deployed).toBe(true);
    expect(adapter.updateOne).toHaveBeenCalled();
  });
});
