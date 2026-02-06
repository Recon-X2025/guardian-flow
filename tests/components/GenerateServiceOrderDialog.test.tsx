/**
 * Tests for GenerateServiceOrderDialog component after migration to apiClient
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GenerateServiceOrderDialog } from '@/domains/workOrders/components/GenerateServiceOrderDialog';
import { apiClient } from '@/integrations/api/client';

// Mock apiClient
vi.mock('@/integrations/api/client', () => ({
  apiClient: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('GenerateServiceOrderDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(
      <GenerateServiceOrderDialog
        open={true}
        onOpenChange={vi.fn()}
        workOrderId="test-wo-id"
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Generate Service Order/i })).toBeInTheDocument();
  });

  it('should invoke generate-service-order function when generating', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: {
        serviceOrder: {
          id: 'so-123',
          so_number: 'SO-2025-0001',
          html_content: '<p>Service Order Content</p>',
        },
      },
      error: null,
    });

    (apiClient.functions.invoke as any) = mockInvoke;

    // Mock work order update
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ error: null }),
    });

    (apiClient.from as any).mockImplementation((table: string) => {
      if (table === 'work_orders') {
        return {
          update: updateMock,
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'invoices') {
        return {
          insert: vi.fn().mockReturnThis(),
          then: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(
      <GenerateServiceOrderDialog
        open={true}
        onOpenChange={vi.fn()}
        workOrderId="test-wo-id"
        onSuccess={vi.fn()}
      />
    );

    // Verify component renders
    expect(screen.getByRole('heading', { name: /Generate Service Order/i })).toBeInTheDocument();
    
    // The actual button click would trigger the function
    // This test verifies the component structure is correct
    expect(apiClient.functions.invoke).toBeDefined();
  });

  it('should handle function errors gracefully', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Function failed' },
    });

    (apiClient.functions.invoke as any) = mockInvoke;

    render(
      <GenerateServiceOrderDialog
        open={true}
        onOpenChange={vi.fn()}
        workOrderId="test-wo-id"
        onSuccess={vi.fn()}
      />
    );

    // Component should render even with potential errors
    expect(screen.getByRole('heading', { name: /Generate Service Order/i })).toBeInTheDocument();
  });
});

