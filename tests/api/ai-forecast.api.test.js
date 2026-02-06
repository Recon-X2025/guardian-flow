/**
 * API Integration Tests: Forecast Center
 * Requires running backend against MongoDB Atlas with seeded data.
 * Gracefully skips when backend is unavailable.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiPost, authenticate } from './helpers.js';

let serverAvailable = false;
let authToken = '';
let tenantId = '';

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    const { data } = await apiPost('/api/auth/signin', {
      email: 'admin@guardian.dev',
      password: 'admin123',
    });
    authToken = data?.session?.access_token;
    tenantId = data?.user?.id;
  }
});

describe('POST /api/functions/run-forecast-now', () => {
  it('generates forecasts', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/functions/run-forecast-now', {
      tenant_id: tenantId,
      geography_levels: ['country'],
    }, authToken);
    expect(status).toBe(200);
    expect(data).toBeDefined();
    // The endpoint returns success or jobs array
    expect(data.error).toBeFalsy();
  });

  it('forecasts stored in forecast_outputs table', async () => {
    if (!serverAvailable) return;
    // Wait a moment for async processing
    await new Promise(r => setTimeout(r, 2000));

    const { data } = await apiPost('/api/db/query', {
      table: 'forecast_outputs',
      select: '*',
      limit: 10,
    }, authToken);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('POST /api/functions/get-forecast-metrics', () => {
  it('returns model metrics', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/functions/get-forecast-metrics', {
      tenant_id: tenantId,
    }, authToken);
    expect(status).toBe(200);
    expect(data).toBeDefined();
    // Should return system metrics or an object
    expect(typeof data).toBe('object');
  });
});

describe('Forecast value validation', () => {
  it('forecast values are numeric and within reasonable bounds', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'forecast_outputs',
      select: '*',
      limit: 20,
    }, authToken);
    const forecasts = data.data || [];
    for (const f of forecasts) {
      if (f.value !== undefined && f.value !== null) {
        const val = Number(f.value);
        expect(isNaN(val)).toBe(false);
        expect(val).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('confidence intervals bracket the forecast value', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'forecast_outputs',
      select: '*',
      limit: 20,
    }, authToken);
    const forecasts = data.data || [];
    for (const f of forecasts) {
      if (f.value && f.lower_bound && f.upper_bound) {
        const val = Number(f.value);
        const lower = Number(f.lower_bound);
        const upper = Number(f.upper_bound);
        expect(lower).toBeLessThanOrEqual(val);
        expect(upper).toBeGreaterThanOrEqual(val);
      }
    }
  });
});
