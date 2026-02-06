import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockOffer } from '../__mocks__/apiClient';

const { mockFrom, mockInvoke, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/integrations/api/client', () => ({
  apiClient: {
    from: mockFrom,
    functions: { invoke: mockInvoke },
  },
}));

vi.mock('@/domains/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import OfferAI from '@/domains/shared/pages/OfferAI';

// Shared builder factory
function createBuilder(data: unknown[] | null = [], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'single'];
  for (const m of chain) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = vi.fn((cb?: (v: unknown) => unknown) => {
    const result = { data, error };
    return cb ? Promise.resolve(cb(result)) : Promise.resolve(result);
  });
  builder.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  builder.delete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  return builder;
}

function setupMocks(opts: {
  offers?: unknown[];
  workOrders?: unknown[];
} = {}) {
  const offers = opts.offers ?? [];
  const workOrders = opts.workOrders ?? [];

  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'sapos_offers') return createBuilder(offers);
    if (table === 'work_orders') return createBuilder(workOrders);
    return createBuilder([]);
  });
}

describe('OfferAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: null, error: null });
  });

  it('renders offer list with status badges', async () => {
    setupMocks({
      offers: [
        mockOffer({ id: 'o1', status: 'generated', title: 'Extended Warranty' }),
        mockOffer({ id: 'o2', status: 'accepted', title: 'Maintenance Bundle' }),
        mockOffer({ id: 'o3', status: 'declined', title: 'Parts Discount' }),
      ],
    });

    render(<OfferAI />);
    expect(await screen.findByText('Extended Warranty')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Bundle')).toBeInTheDocument();
    expect(screen.getByText('Parts Discount')).toBeInTheDocument();

    // Status badges
    expect(screen.getByText('generated')).toBeInTheDocument();
    expect(screen.getByText('accepted')).toBeInTheDocument();
    expect(screen.getByText('declined')).toBeInTheDocument();
  });

  it('work order selector populates from API', async () => {
    setupMocks({
      offers: [],
      workOrders: [
        { id: 'wo-1', wo_number: 'WO-1001', status: 'in_progress' },
        { id: 'wo-2', wo_number: 'WO-1002', status: 'pending_validation' },
      ],
    });

    render(<OfferAI />);
    // Wait for loading to finish (component shows loader during loading)
    await screen.findByText('Select Work Order...');

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(3); // placeholder + 2 WOs
  });

  it('"Generate Offers" button calls functions.invoke', async () => {
    setupMocks({
      offers: [],
      workOrders: [{ id: 'wo-1', wo_number: 'WO-1001', status: 'in_progress' }],
    });
    mockInvoke.mockResolvedValue({ data: { offers: [] }, error: null });

    render(<OfferAI />);
    await screen.findByText('Select Work Order...');

    // Select a work order
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'wo-1' } });

    // Click generate
    const btn = screen.getByRole('button', { name: /Generate Offers/i });
    fireEvent.click(btn);

    expect(mockInvoke).toHaveBeenCalledWith('generate-offers', expect.objectContaining({
      body: expect.objectContaining({ workOrderId: 'wo-1' }),
    }));
  });

  it('Accept/Decline buttons appear only for generated status without warranty conflicts', async () => {
    setupMocks({
      offers: [
        mockOffer({ id: 'o1', title: 'Offer A', status: 'generated', warranty_conflicts: false }),
        mockOffer({ id: 'o2', title: 'Offer B', status: 'generated', warranty_conflicts: true }),
        mockOffer({ id: 'o3', title: 'Offer C', status: 'accepted' }),
      ],
    });

    render(<OfferAI />);
    await screen.findByText('Offer A');

    // Only the first offer (generated, no warranty conflict) should have Accept/Decline
    const acceptButtons = screen.getAllByRole('button', { name: /^Accept$/i });
    expect(acceptButtons).toHaveLength(1);

    const declineButtons = screen.getAllByRole('button', { name: /^Decline$/i });
    expect(declineButtons).toHaveLength(1);
  });

  it('warranty conflict badge shows for flagged offers', async () => {
    setupMocks({
      offers: [
        mockOffer({ id: 'o1', warranty_conflicts: true }),
      ],
    });

    render(<OfferAI />);
    expect(await screen.findByText('Warranty Conflict')).toBeInTheDocument();
  });

  it('conversion rate calculates correctly', async () => {
    setupMocks({
      offers: [
        mockOffer({ id: 'o1', title: 'Offer 1', status: 'accepted' }),
        mockOffer({ id: 'o2', title: 'Offer 2', status: 'generated' }),
        mockOffer({ id: 'o3', title: 'Offer 3', status: 'declined' }),
        mockOffer({ id: 'o4', title: 'Offer 4', status: 'accepted' }),
      ],
    });

    render(<OfferAI />);
    await screen.findByText('Offer 1');

    // 2 accepted / 4 total = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('provenance metadata (model_version, confidence_score) displays', async () => {
    setupMocks({
      offers: [
        mockOffer({ id: 'o1', model_version: 'gpt-4o-v1', confidence_score: 0.85 }),
      ],
    });

    render(<OfferAI />);
    expect(await screen.findByText(/Model: gpt-4o-v1/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence: 85%/)).toBeInTheDocument();
  });

  it('empty state shows message when no offers', async () => {
    setupMocks({ offers: [] });

    render(<OfferAI />);
    expect(
      await screen.findByText(/No offers yet/i)
    ).toBeInTheDocument();
  });
});
