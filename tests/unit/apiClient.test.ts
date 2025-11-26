/**
 * Unit tests for apiClient
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../../src/integrations/api/client';

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('from() method', () => {
    it('should create a query builder', () => {
      const query = apiClient.from('users');
      expect(query).toBeDefined();
      expect(typeof query.select).toBe('function');
    });

    it('should support select()', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: '1', name: 'Test' }], error: null }),
      });
      global.fetch = mockFetch;

      const result = await apiClient.from('users').select('*');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should support eq() filter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: '1' }], error: null }),
      });
      global.fetch = mockFetch;

      const result = await apiClient.from('users').select('*').eq('id', '1');
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('functions.invoke()', () => {
    it('should invoke edge functions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { success: true }, error: null }),
      });
      global.fetch = mockFetch;

      const result = await apiClient.functions.invoke('test-function', { body: { test: true } });
      expect(result.data).toBeDefined();
      expect(result.data.success).toBe(true);
    });

    it('should handle function errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Function failed' } }),
      });
      global.fetch = mockFetch;

      const result = await apiClient.functions.invoke('test-function');
      expect(result.error).toBeDefined();
    });
  });

  describe('auth methods', () => {
    it('should support signIn', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          data: { user: { id: '1' }, session: { access_token: 'token' } },
          error: null 
        }),
      });
      global.fetch = mockFetch;

      const result = await apiClient.auth.signIn('test@example.com', 'password');
      expect(result.data).toBeDefined();
      expect(result.data.user).toBeDefined();
    });
  });
});

