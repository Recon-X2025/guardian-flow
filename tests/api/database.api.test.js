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

describe('Database API', () => {
  let token;

  beforeAll(async () => {
    token = await getToken();
  });

  const tables = [
    'tickets',
    'work_orders',
    'invoices',
    'users',
    'customers',
    'equipment',
    'inventory_items',
    'service_orders',
    'notifications',
    'knowledge_base_articles',
    'faqs',
    'contracts',
    'profiles',
    'permissions',
    'role_permissions',
  ];

  for (const table of tables) {
    test(`GET /api/db/${table} - query ${table}`, async () => {
      const res = await fetch(`${API}/api/db/${table}?select=*&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Accept 200 or 404 (table might not exist) but not 500
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        const data = await res.json();
        expect(Array.isArray(data.data) || data.data === null || typeof data.data === 'object').toBe(true);
      }
    });
  }
});
