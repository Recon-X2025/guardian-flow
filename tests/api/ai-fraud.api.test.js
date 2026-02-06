/**
 * API Integration Tests: Fraud Detection & Investigation
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

describe('POST /api/functions/run-fraud-detection', () => {
  let detectedAlerts = [];

  it('detects anomalies', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/functions/run-fraud-detection', {}, authToken);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    detectedAlerts = data.alerts || [];
    expect(Array.isArray(detectedAlerts)).toBe(true);
  });

  it('anomalies stored in fraud_alerts with proper schema', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'fraud_alerts',
      select: '*',
      limit: 20,
    }, authToken);
    const alerts = data.data || [];
    for (const a of alerts) {
      expect(a.anomaly_type || a.alert_type).toBeDefined();
      expect(a.investigation_status).toBeDefined();
      expect(['open', 'in_progress', 'resolved', 'escalated']).toContain(a.investigation_status);
    }
  });
});

describe('POST /api/functions/update-fraud-investigation', () => {
  let alertId = null;

  beforeAll(async () => {
    if (!serverAvailable) return;
    // Get an open alert
    const { data } = await apiPost('/api/db/query', {
      table: 'fraud_alerts',
      select: '*',
      where: { investigation_status: 'open' },
      limit: 1,
    }, authToken);
    alertId = data.data?.[0]?.id || null;
  });

  it('changes status to in_progress', async () => {
    if (!serverAvailable) return;
    if (!alertId) return;
    const { status, data } = await apiPost('/api/functions/update-fraud-investigation', {
      alert_id: alertId,
      investigation_status: 'in_progress',
    }, authToken);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.alert?.investigation_status).toBe('in_progress');
  });

  it('resolved status sets resolution_notes and resolved_at', async () => {
    if (!serverAvailable) return;
    if (!alertId) return;
    const { status, data } = await apiPost('/api/functions/update-fraud-investigation', {
      alert_id: alertId,
      investigation_status: 'resolved',
      resolution_notes: 'Confirmed false positive after manual review',
    }, authToken);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.alert?.resolution_notes).toBe('Confirmed false positive after manual review');
    expect(data.alert?.resolved_at).toBeTruthy();
  });

  it('escalated status works', async () => {
    if (!serverAvailable) return;
    // Get another open alert for escalation test
    const { data: queryData } = await apiPost('/api/db/query', {
      table: 'fraud_alerts',
      select: '*',
      where: { investigation_status: 'open' },
      limit: 1,
    }, authToken);
    const anotherAlertId = queryData.data?.[0]?.id;
    if (!anotherAlertId) return;

    const { status, data } = await apiPost('/api/functions/update-fraud-investigation', {
      alert_id: anotherAlertId,
      investigation_status: 'escalated',
    }, authToken);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.alert?.investigation_status).toBe('escalated');
  });
});
