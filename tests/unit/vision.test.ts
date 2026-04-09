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

describe('vision service', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(() => {
    adapter = makeAdapter();
    (getAdapter as ReturnType<typeof vi.fn>).mockResolvedValue(adapter);
    vi.resetModules();
  });

  it('analyseImage returns defects array with correct structure', async () => {
    const { analyseImage } = await import('../../server/services/ai/vision.js');
    const result = await analyseImage('tenant1', Buffer.from('fake-image'), 'image/jpeg');
    expect(result).toHaveProperty('defects');
    expect(Array.isArray(result.defects)).toBe(true);
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('analysisId');
    expect(typeof result.overallScore).toBe('number');
    for (const defect of result.defects) {
      expect(defect).toHaveProperty('label');
      expect(defect).toHaveProperty('confidence');
      expect(defect).toHaveProperty('boundingBox');
      expect(defect.boundingBox).toHaveProperty('x');
      expect(defect.boundingBox).toHaveProperty('y');
      expect(defect.boundingBox).toHaveProperty('w');
      expect(defect.boundingBox).toHaveProperty('h');
    }
  });

  it('analyseImage stores result in vision_analyses collection', async () => {
    const { analyseImage } = await import('../../server/services/ai/vision.js');
    await analyseImage('tenant1', Buffer.from('data'), 'image/png');
    expect(adapter.insertOne).toHaveBeenCalledWith('vision_analyses', expect.objectContaining({
      tenant_id: 'tenant1',
      mime_type: 'image/png',
    }));
  });

  it('listAnalyses returns array from adapter', async () => {
    const mockDocs = [{ id: 'a1', tenant_id: 'tenant1', defects: [] }];
    adapter.findMany.mockResolvedValue(mockDocs);
    const { listAnalyses } = await import('../../server/services/ai/vision.js');
    const result = await listAnalyses('tenant1', undefined);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockDocs);
    expect(adapter.findMany).toHaveBeenCalledWith('vision_analyses', { tenant_id: 'tenant1' }, expect.any(Object));
  });
});
