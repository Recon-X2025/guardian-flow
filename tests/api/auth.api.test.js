const API = 'http://localhost:3001';

describe('Auth API', () => {
  let token;

  test('POST /api/auth/signin - valid credentials', async () => {
    const res = await fetch(`${API}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@guardian.dev', password: 'admin123' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session).toBeDefined();
    expect(data.session.access_token).toBeDefined();
    expect(data.user.email).toBe('admin@guardian.dev');
    token = data.session.access_token;
  });

  test('POST /api/auth/signin - invalid credentials', async () => {
    const res = await fetch(`${API}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@test.com', password: 'wrong' }),
    });
    expect(res.status).not.toBe(200);
  });

  test('GET /api/auth/user - with token', async () => {
    const res = await fetch(`${API}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
  });

  test('GET /api/auth/user - without token returns 401', async () => {
    const res = await fetch(`${API}/api/auth/user`);
    expect(res.status).toBe(401);
  });
});
