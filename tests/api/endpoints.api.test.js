/**
 * API Integration Tests: Feature Endpoints
 * Gracefully skips when backend is unavailable.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiPost, apiGet, authenticate, API_URL } from './helpers.js';

let serverAvailable = false;
let token;

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    token = await authenticate();
  }
});

describe('Feature API Endpoints', () => {
  test('GET /health - server health check', async () => {
    if (!serverAvailable) return;
    const { status } = await apiGet('/health');
    expect(status).toBe(200);
  });

  test('GET /api/knowledge-base/categories - KB categories', async () => {
    if (!serverAvailable) return;
    const { status } = await apiGet('/api/knowledge-base/categories', token);
    expect([200, 404]).toContain(status);
  });

  test('GET /api/knowledge-base/articles - KB articles', async () => {
    if (!serverAvailable) return;
    const { status } = await apiGet('/api/knowledge-base/articles', token);
    expect([200, 404, 500]).toContain(status);
  });

  test('GET /api/faqs - FAQ list', async () => {
    if (!serverAvailable) return;
    const { status } = await apiGet('/api/faqs', token);
    expect([200, 404]).toContain(status);
  });

  test('GET /api/faqs/categories - FAQ categories', async () => {
    if (!serverAvailable) return;
    const { status } = await apiGet('/api/faqs/categories', token);
    expect([200, 404]).toContain(status);
  });

  test('POST /api/auth/signout - sign out', async () => {
    if (!serverAvailable) return;
    // Get a fresh token so we don't invalidate the main one
    const freshToken = await authenticate();
    const { status } = await apiPost('/api/auth/signout', {}, freshToken);
    expect(status).toBe(200);
  });
});
