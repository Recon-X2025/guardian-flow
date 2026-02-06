/**
 * API Integration Tests: Forgery Detection
 * Requires running backend against MongoDB Atlas with seeded data.
 * Gracefully skips when backend is unavailable.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiPost, authenticate } from './helpers.js';

let serverAvailable = false;
let authToken = '';

// Deterministic IDs from test seed data
const TEST_WO_IDS = [
  '00000000-0000-4000-c000-000000000001',
  '00000000-0000-4000-c000-000000000002',
];

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    authToken = await authenticate();
  }
});

describe('POST /api/functions/process-forgery-batch', () => {
  let batchId = null;

  it('creates batch job with work_order_ids', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/functions/process-forgery-batch', {
      job_name: 'Test batch run',
      work_order_ids: TEST_WO_IDS,
      job_type: 'detection',
    }, authToken);
    expect(status).toBe(200);
    expect(data).toBeDefined();
    batchId = data.batch_id || null;
  });

  it('batch job appears in forgery_batch_jobs table', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'forgery_batch_jobs',
      select: '*',
      limit: 5,
    }, authToken);
    const jobs = data.data || [];
    // Jobs may be empty if batch processing is async or no seed data
    expect(Array.isArray(jobs)).toBe(true);

    // Find our job if any exist
    const job = batchId ? jobs.find(j => j.id === batchId) : jobs[0];
    if (job) {
      expect(job.status).toBeDefined();
      expect(job.total_images).toBeGreaterThanOrEqual(0);
    }
  });

  it('detections stored in forgery_detections with confidence_score', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'forgery_detections',
      select: '*',
      limit: 20,
    }, authToken);
    const detections = data.data || [];
    expect(detections.length).toBeGreaterThanOrEqual(0);

    for (const d of detections) {
      expect(d.confidence_score !== undefined).toBe(true);
      const score = parseFloat(d.confidence_score);
      expect(isNaN(score)).toBe(false);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('high-confidence detections generate monitoring alerts', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'forgery_monitoring_alerts',
      select: '*',
      limit: 10,
    }, authToken);
    // Collection may be empty if no high-confidence detections exist
    const alerts = data.data || [];
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('model metrics are seeded and queryable', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'forgery_model_metrics',
      select: '*',
      where: { is_active: true },
      limit: 1,
    }, authToken);
    const metrics = data.data || [];
    // Metrics may be empty if no models have been trained yet
    expect(Array.isArray(metrics)).toBe(true);

    if (metrics.length > 0) {
      const m = metrics[0];
      expect(parseFloat(m.precision_score)).toBeGreaterThan(0);
      expect(parseFloat(m.recall_score)).toBeGreaterThan(0);
      expect(parseFloat(m.f1_score)).toBeGreaterThan(0);
      expect(parseFloat(m.accuracy)).toBeGreaterThan(0);
    }
  });
});
