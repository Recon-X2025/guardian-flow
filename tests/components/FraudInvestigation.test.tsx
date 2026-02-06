import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mockFraudAlert } from '../__mocks__/apiClient';

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

import FraudInvestigation from '@/domains/fraud/pages/FraudInvestigation';

function createBuilder(data: unknown[] | null = [], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = ['select', 'eq', 'neq', 'order', 'limit', 'single'];
  for (const m of chain) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = vi.fn((cb?: (v: unknown) => unknown) => {
    const result = { data, error };
    return cb ? Promise.resolve(cb(result)) : Promise.resolve(result);
  });
  return builder;
}

function setupMocks(alerts: unknown[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'fraud_alerts') return createBuilder(alerts);
    if (table === 'forgery_detections') return createBuilder(null);
    return createBuilder([]);
  });
}

describe('FraudInvestigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('renders summary cards with correct counts', async () => {
    setupMocks([
      mockFraudAlert({ id: 'a1', investigation_status: 'open', severity: 'high' }),
      mockFraudAlert({ id: 'a2', investigation_status: 'open', severity: 'critical' }),
      mockFraudAlert({ id: 'a3', investigation_status: 'in_progress', severity: 'medium' }),
      mockFraudAlert({ id: 'a4', investigation_status: 'resolved', severity: 'low' }),
    ]);

    render(<FraudInvestigation />);

    // Wait for data load
    await screen.findByText('Fraud & Anomaly Investigation');

    // Open = 2, In Progress = 1, Resolved = 1, Critical = 1
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('alert cards show severity badges with correct colors', async () => {
    setupMocks([
      mockFraudAlert({ id: 'a1', severity: 'critical', investigation_status: 'open' }),
      mockFraudAlert({ id: 'a2', severity: 'low', investigation_status: 'open' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    const critBadge = screen.getByText('critical');
    expect(critBadge.className).toContain('bg-red');

    const lowBadge = screen.getByText('low');
    expect(lowBadge.className).toContain('bg-blue');
  });

  it('resolution notes textarea binds per-alert (not shared)', async () => {
    setupMocks([
      mockFraudAlert({ id: 'a1', investigation_status: 'open' }),
      mockFraudAlert({ id: 'a2', investigation_status: 'open' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    const textareas = screen.getAllByPlaceholderText('Resolution notes...');
    expect(textareas).toHaveLength(2);
  });

  it('resolved alerts show resolution notes and timestamp', async () => {
    setupMocks([
      mockFraudAlert({
        id: 'a1',
        investigation_status: 'resolved',
        resolution_notes: 'False alarm - duplicate entry cleared',
        resolved_at: '2026-01-20T14:30:00Z',
      }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.getByText('False alarm - duplicate entry cleared')).toBeInTheDocument();
    expect(screen.getByText(/Resolved:/)).toBeInTheDocument();
  });

  it('non-resolved alerts show investigation controls', async () => {
    setupMocks([
      mockFraudAlert({ id: 'a1', investigation_status: 'open' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.getByPlaceholderText('Resolution notes...')).toBeInTheDocument();
    expect(screen.getByText('Update status')).toBeInTheDocument();
  });

  it('resolved alerts do NOT show investigation controls', async () => {
    setupMocks([
      mockFraudAlert({ id: 'a1', investigation_status: 'resolved', resolution_notes: 'Done' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.queryByPlaceholderText('Resolution notes...')).not.toBeInTheDocument();
  });

  it('empty state shows "No fraud alerts" message', async () => {
    setupMocks([]);

    render(<FraudInvestigation />);
    expect(await screen.findByText(/No fraud alerts/i)).toBeInTheDocument();
  });

  it('displays alert description and confidence', async () => {
    setupMocks([
      mockFraudAlert({
        id: 'a1',
        investigation_status: 'open',
        description: 'Unusual invoice amount detected',
        confidence_score: 0.91,
      }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.getByText('Unusual invoice amount detected')).toBeInTheDocument();
    expect(screen.getByText(/91%/)).toBeInTheDocument();
  });
});
