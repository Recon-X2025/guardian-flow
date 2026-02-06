/**
 * Shared helpers for API integration tests.
 *
 * All API tests require a running backend server.
 * These helpers provide graceful degradation when the server is unavailable.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

/** Whether the backend server is reachable */
let _serverAvailable = null;

/**
 * Check if the backend server is reachable (cached after first call).
 */
export async function isServerAvailable() {
  if (_serverAvailable !== null) return _serverAvailable;
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    _serverAvailable = res.ok || res.status === 503;
  } catch {
    _serverAvailable = false;
  }
  return _serverAvailable;
}

/**
 * POST helper with optional auth token.
 */
export async function apiPost(path, body = {}, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

/**
 * PATCH helper with optional auth token.
 */
export async function apiPatch(path, body = {}, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

/**
 * GET helper with optional auth token.
 */
export async function apiGet(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return { status: res.status, data: await res.json() };
}

/**
 * Authenticate and return a token. Returns null if server unavailable or auth fails.
 */
export async function authenticate(email = 'admin@guardian.dev', password = 'admin123') {
  try {
    const { data } = await apiPost('/api/auth/signin', { email, password });
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export { API_URL };
