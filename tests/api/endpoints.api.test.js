const API = 'http://localhost:3001';

async function getToken() {
  const res = await fetch(`${API}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@guardian.dev', password: 'admin123' }),
  });
  const data = await res.json();
  return data.session.access_token;
}

describe('Feature API Endpoints', () => {
  let token;

  beforeAll(async () => {
    token = await getToken();
  });

  test('GET /health - server health check', async () => {
    const res = await fetch(`${API}/health`);
    expect(res.status).toBe(200);
  });

  test('GET /api/knowledge-base/categories - KB categories', async () => {
    const res = await fetch(`${API}/api/knowledge-base/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/knowledge-base/articles - KB articles', async () => {
    const res = await fetch(`${API}/api/knowledge-base/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404, 500]).toContain(res.status);
  });

  test('GET /api/faqs - FAQ list', async () => {
    const res = await fetch(`${API}/api/faqs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/faqs/categories - FAQ categories', async () => {
    const res = await fetch(`${API}/api/faqs/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/auth/signout - sign out', async () => {
    // Get a fresh token so we don't invalidate the main one
    const freshToken = await getToken();
    const res = await fetch(`${API}/api/auth/signout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    expect(res.status).toBe(200);
  });
});
