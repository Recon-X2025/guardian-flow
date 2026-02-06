/**
 * Integration tests for authentication flow
 *
 * Requires a running backend server on port 3001 with MongoDB connected.
 * Run: cd server && node server.js
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function apiPost(path: string, body: Record<string, unknown> = {}, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** Check server is reachable before running the suite */
let serverAvailable = false;
beforeAll(async () => {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = res.ok || res.status === 503; // even degraded health means server is up
  } catch {
    serverAvailable = false;
  }
});

describe('Authentication Integration', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  let accessToken = '';

  describe('Sign Up Flow', () => {
    it('should create a new user account', async () => {
      if (!serverAvailable) return; // server not running — skip gracefully
      const { status, data } = await apiPost('/api/auth/signup', {
        email: testEmail,
        password: testPassword,
        name: 'Test User',
      });
      // 200/201 = created, 409 = email already exists (from prior test run)
      expect([200, 201, 409]).toContain(status);
      if (status === 200 || status === 201) {
        expect(data.session || data.user).toBeDefined();
      }
    });

    it('should reject duplicate email', async () => {
      if (!serverAvailable) return;
      const { status } = await apiPost('/api/auth/signup', {
        email: testEmail,
        password: testPassword,
        name: 'Duplicate User',
      });
      expect([400, 409, 422]).toContain(status);
    });
  });

  describe('Sign In Flow', () => {
    it('should sign in with valid credentials', async () => {
      if (!serverAvailable) return;
      // Use the seeded admin account (guaranteed to exist)
      const { status, data } = await apiPost('/api/auth/signin', {
        email: 'admin@guardian.dev',
        password: 'admin123',
      });
      expect(status).toBe(200);
      expect(data.session).toBeDefined();
      expect(data.session.access_token).toBeTruthy();
      accessToken = data.session.access_token;
    });

    it('should reject invalid credentials', async () => {
      if (!serverAvailable) return;
      const { status } = await apiPost('/api/auth/signin', {
        email: 'admin@guardian.dev',
        password: 'wrong-password',
      });
      expect([401, 403]).toContain(status);
    });
  });

  describe('Session Management', () => {
    it('should get current user with valid token', async () => {
      if (!serverAvailable || !accessToken) return;
      const { status, data } = await apiGet('/api/auth/me', accessToken);
      expect(status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('admin@guardian.dev');
    });

    it('should reject invalid token', async () => {
      if (!serverAvailable) return;
      const { status } = await apiGet('/api/auth/me', 'invalid-token-value');
      expect([401, 403]).toContain(status);
    });
  });
});
