/**
 * API Integration Tests: Auth
 * Gracefully skips when backend is unavailable.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiPost, apiGet, authenticate, API_URL } from './helpers.js';

let serverAvailable = false;
let token;

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
});

describe('Auth API', () => {
  test('POST /api/auth/signin - valid credentials', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/auth/signin', {
      email: 'admin@guardian.dev',
      password: 'admin123',
    });
    expect(status).toBe(200);
    expect(data.session).toBeDefined();
    expect(data.session.access_token).toBeDefined();
    expect(data.user.email).toBe('admin@guardian.dev');
    token = data.session.access_token;
  });

  test('POST /api/auth/signin - invalid credentials', async () => {
    if (!serverAvailable) return;
    const { status } = await apiPost('/api/auth/signin', {
      email: 'wrong@test.com',
      password: 'wrong',
    });
    expect(status).not.toBe(200);
  });

  test('GET /api/auth/user - with token', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiGet('/api/auth/user', token);
    expect(status).toBe(200);
    expect(data.user).toBeDefined();
  });

  test('GET /api/auth/user - without token returns 401', async () => {
    if (!serverAvailable) return;
    const { status } = await apiGet('/api/auth/user');
    expect(status).toBe(401);
  });
});
