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

describe('xai service', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(() => {
    adapter = makeAdapter();
    (getAdapter as ReturnType<typeof vi.fn>).mockResolvedValue(adapter);
    vi.resetModules();
  });

  it('explainPrediction returns feature importances', async () => {
    const { explainPrediction } = await import('../../server/services/ai/xai.js');
    const result = await explainPrediction('tenant1', 'model1', { age: 35, income: 50000 });
    expect(result).toHaveProperty('featureImportances');
    expect(result).toHaveProperty('shapValues');
    expect(Array.isArray(result.featureImportances)).toBe(true);
    expect(result.featureImportances.length).toBe(2);
    expect(result.featureImportances[0]).toHaveProperty('feature');
    expect(result.featureImportances[0]).toHaveProperty('importance');
    expect(result.featureImportances[0]).toHaveProperty('direction');
  });

  it('explainPrediction stores explanation in db', async () => {
    const { explainPrediction } = await import('../../server/services/ai/xai.js');
    await explainPrediction('tenant1', 'model1', { score: 720 });
    expect(adapter.insertOne).toHaveBeenCalledWith('xai_explanations', expect.objectContaining({
      tenant_id: 'tenant1',
      model_id: 'model1',
    }));
  });

  it('generateCounterfactual returns alternatives', async () => {
    const { generateCounterfactual } = await import('../../server/services/ai/xai.js');
    const result = await generateCounterfactual('tenant1', 'model1', { age: 35, income: 50000, score: 600 }, 'approved');
    expect(result).toHaveProperty('alternatives');
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0]).toHaveProperty('feature');
    expect(result.alternatives[0]).toHaveProperty('original');
    expect(result.alternatives[0]).toHaveProperty('suggested');
    expect(result).toHaveProperty('confidence');
  });
});
