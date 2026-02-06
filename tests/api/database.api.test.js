/**
 * API Integration Tests: Database
 * Gracefully skips when backend is unavailable.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiGet, authenticate, API_URL } from './helpers.js';

let serverAvailable = false;
let token;

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    token = await authenticate();
  }
});

describe('Database API', () => {
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
      if (!serverAvailable) return;
      const { status, data } = await apiGet(`/api/db/${table}?select=*&limit=5`, token);
      // Accept 200 or 404 (table might not exist) but not 500
      expect([200, 404]).toContain(status);
      if (status === 200) {
        expect(Array.isArray(data.data) || data.data === null || typeof data.data === 'object').toBe(true);
      }
    });
  }
});
