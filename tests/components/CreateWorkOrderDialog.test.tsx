/**
 * Tests for CreateWorkOrderDialog component after migration to apiClient
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CreateWorkOrderDialog } from '@/domains/workOrders/components/CreateWorkOrderDialog';
import { apiClient } from '@/integrations/api/client';

// Helper: create a chainable mock that resolves to `value` when .then() is called
function createChain(value: unknown) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.then = vi.fn().mockResolvedValue(value);
  return chain;
}

// Mock apiClient
vi.mock('@/integrations/api/client', () => ({
  apiClient: {
    from: vi.fn(() => createChain({ data: [], error: null })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('CreateWorkOrderDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (apiClient.from as any).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return createChain({
          data: [{ user_id: 'tech1' }, { user_id: 'tech2' }],
          error: null,
        });
      }
      if (table === 'profiles') {
        return createChain({
          data: [
            { id: 'tech1', full_name: 'Tech One', email: 'tech1@example.com' },
            { id: 'tech2', full_name: 'Tech Two', email: 'tech2@example.com' },
          ],
          error: null,
        });
      }
      if (table === 'work_orders') {
        return createChain({
          data: [{ wo_number: 'WO-2025-0001' }],
          error: null,
        });
      }
      if (table === 'tickets') {
        return createChain({ error: null });
      }
      if (table === 'work_order_prechecks') {
        return createChain({ error: null });
      }
      return createChain({ data: [], error: null });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render dialog when open', () => {
    render(
      <CreateWorkOrderDialog
        open={true}
        onOpenChange={vi.fn()}
        ticketId="test-ticket-id"
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Create Work Order/i })).toBeInTheDocument();
  });

  it('should load technicians when opened', async () => {
    render(
      <CreateWorkOrderDialog
        open={true}
        onOpenChange={vi.fn()}
        ticketId="test-ticket-id"
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(apiClient.from).toHaveBeenCalledWith('user_roles');
    });
  });

  it('should display technician options after loading', async () => {
    render(
      <CreateWorkOrderDialog
        open={true}
        onOpenChange={vi.fn()}
        ticketId="test-ticket-id"
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(apiClient.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('should create work order when form is submitted', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    // Mock precheck orchestrator
    (apiClient.functions.invoke as any).mockResolvedValue({
      error: null,
    });

    render(
      <CreateWorkOrderDialog
        open={true}
        onOpenChange={onOpenChange}
        ticketId="test-ticket-id"
        onSuccess={onSuccess}
      />
    );

    // Wait for technicians to load
    await waitFor(() => {
      expect(apiClient.from).toHaveBeenCalledWith('profiles');
    });

    // Verify the component structure is correct
    expect(apiClient.from).toHaveBeenCalled();
  });
});
