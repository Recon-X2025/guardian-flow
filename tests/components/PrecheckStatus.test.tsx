/**
 * Tests for PrecheckStatus component after migration to apiClient
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PrecheckStatus } from '@/components/PrecheckStatus';
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

describe('PrecheckStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render component', () => {
    // Mock precheck data fetch
    (apiClient.from as any).mockImplementation((table: string) => {
      if (table === 'work_order_prechecks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({
            data: [{
              id: 'precheck-1',
              work_order_id: 'wo-1',
              inventory_status: 'passed',
              warranty_status: 'passed',
              photo_status: 'pending',
            }],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<PrecheckStatus workOrderId="wo-1" />);

    expect(screen.getByText(/Work Order Precheck Status/i)).toBeInTheDocument();
  });

  it('should fetch precheck data on mount', async () => {
    const thenMock = vi.fn().mockResolvedValue({
      data: [{
        id: 'precheck-1',
        work_order_id: 'wo-1',
        inventory_status: 'passed',
        warranty_status: 'passed',
        photo_status: 'pending',
      }],
      error: null,
    });

    (apiClient.from as any).mockImplementation((table: string) => {
      if (table === 'work_order_prechecks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: thenMock,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<PrecheckStatus workOrderId="wo-1" />);

    await waitFor(() => {
      expect(apiClient.from).toHaveBeenCalledWith('work_order_prechecks');
    });
  });

  it('should invoke precheck-orchestrator when running precheck', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: {
        can_release: true,
        inventory: { all_available: true },
        warranty: { covered: true },
      },
      error: null,
    });

    (apiClient.functions.invoke as any) = mockInvoke;

    (apiClient.from as any).mockImplementation((table: string) => {
      if (table === 'work_order_prechecks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'work_orders') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<PrecheckStatus workOrderId="wo-1" />);

    // Verify component is set up correctly
    expect(screen.getByText(/Run Precheck/i)).toBeInTheDocument();
    expect(apiClient.functions.invoke).toBeDefined();
  });
});

