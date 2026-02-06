/**
 * Tests for Analytics Tab components after migration to apiClient
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OperationalTab } from '@/domains/analytics/components/analytics/OperationalTab';
import { SLATab } from '@/domains/analytics/components/analytics/SLATab';
import { InventoryTab } from '@/domains/analytics/components/analytics/InventoryTab';
import { FinancialTab } from '@/domains/analytics/components/analytics/FinancialTab';
import { apiClient } from '@/integrations/api/client';

// Mock apiClient
vi.mock('@/integrations/api/client', () => ({
  apiClient: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock useAuth (required by useCurrency in FinancialTab)
vi.mock('@/domains/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Analytics Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OperationalTab', () => {
    it('should render and fetch trend data', async () => {
      const thenMock = vi.fn().mockResolvedValue({
        data: [
          { created_at: '2025-01-01T00:00:00Z' },
          { created_at: '2025-01-02T00:00:00Z' },
        ],
        error: null,
      });

      (apiClient.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: thenMock,
      }));

      render(<OperationalTab />);

      await waitFor(() => {
        expect(apiClient.from).toHaveBeenCalledWith('work_orders');
      });
    });
  });

  describe('SLATab', () => {
    it('should render and fetch SLA metrics', async () => {
      const thenMock = vi.fn().mockResolvedValue({
        data: [
          { status: 'completed', completed_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' },
        ],
        error: null,
      });

      (apiClient.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        then: thenMock,
      }));

      render(<SLATab />);

      await waitFor(() => {
        expect(apiClient.from).toHaveBeenCalledWith('work_orders');
      });
    });
  });

  describe('InventoryTab', () => {
    it('should render and fetch inventory items', async () => {
      const thenMock = vi.fn().mockResolvedValue({
        data: [
          { id: '1', sku: 'SKU-001', description: 'Test Item', consumable: false, lead_time_days: 5 },
        ],
        error: null,
      });

      (apiClient.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: thenMock,
      }));

      render(<InventoryTab />);

      await waitFor(() => {
        expect(apiClient.from).toHaveBeenCalledWith('inventory_items');
      });
    });
  });

  describe('FinancialTab', () => {
    it('should render and fetch financial data', async () => {
      const thenMock = vi.fn().mockResolvedValue({
        data: [
          { id: '1', invoice_number: 'INV-001', total_amount: 1000, status: 'paid', created_at: '2025-01-01T00:00:00Z' },
        ],
        error: null,
      });

      (apiClient.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: thenMock,
      }));

      render(<FinancialTab />);

      await waitFor(() => {
        expect(apiClient.from).toHaveBeenCalledWith('invoices');
      });
    });
  });
});

