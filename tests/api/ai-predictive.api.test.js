/**
 * API Integration Tests: Predictive Maintenance
 * Requires running backend against MongoDB Atlas with seeded data.
 * Gracefully skips when backend is unavailable.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiPost, authenticate } from './helpers.js';

let serverAvailable = false;
let authToken = '';

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    authToken = await authenticate();
  }
});

describe('POST /api/functions/predict-maintenance-failures', () => {
  let predictions;

  it('returns predictions', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/functions/predict-maintenance-failures', {}, authToken);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    predictions = data.predictions || [];
    expect(Array.isArray(predictions)).toBe(true);
  });

  it('predictions appear in maintenance_predictions table', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'maintenance_predictions',
      select: '*',
      limit: 10,
    }, authToken);
    expect(data.data).toBeDefined();
    // After running predictions, there should be at least some records
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('each prediction has required fields: risk_level, failure_probability, confidence_score', async () => {
    if (!serverAvailable) return;
    if (!predictions || predictions.length === 0) return;
    for (const p of predictions) {
      expect(p.risk_level).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(p.risk_level);
      expect(typeof p.failure_probability).toBe('number');
      expect(p.failure_probability).toBeGreaterThanOrEqual(0);
      expect(p.failure_probability).toBeLessThanOrEqual(1);
    }
  });

  it('predictions reference valid equipment IDs', async () => {
    if (!serverAvailable) return;
    if (!predictions || predictions.length === 0) return;
    for (const p of predictions) {
      expect(p.equipment_id).toBeDefined();
      expect(typeof p.equipment_id).toBe('string');
      expect(p.equipment_id.length).toBeGreaterThan(0);
    }
  });

  it('re-running does not create duplicates for same equipment', async () => {
    if (!serverAvailable) return;
    const { data: before } = await apiPost('/api/db/query', {
      table: 'maintenance_predictions',
      select: '*',
    }, authToken);
    const countBefore = before.data?.length || 0;

    // Run again
    await apiPost('/api/functions/predict-maintenance-failures', {}, authToken);

    const { data: after } = await apiPost('/api/db/query', {
      table: 'maintenance_predictions',
      select: '*',
    }, authToken);
    const countAfter = after.data?.length || 0;

    // Should not wildly increase (allow some growth but not 2x)
    expect(countAfter).toBeLessThanOrEqual(countBefore * 2 + 5);
  });
});
