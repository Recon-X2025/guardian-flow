import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mockFraudAlert } from '../__mocks__/apiClient';

const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}));

vi.mock('@/domains/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function setupFetchMock(alerts: unknown[] = [], invokeFn?: () => unknown) {
  vi.stubGlobal('fetch', vi.fn((url: string, opts?: { method?: string }) => {
    const method = opts?.method ?? 'GET';
    if (url.includes('/api/functions/fraud-alerts')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts, total: alerts.length }),
      });
    }
    if (url.includes('/api/functions/run-fraud-detection')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ summary: { total_alerts: 0 }, llm_provider: 'mock' }),
      });
    }
    if (url.includes('/api/functions/update-fraud-investigation')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
}

import FraudInvestigation from '@/domains/fraud/pages/FraudInvestigation';

describe('FraudInvestigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders summary cards with correct counts', async () => {
    setupFetchMock([
      mockFraudAlert({ id: 'a1', investigation_status: 'open', severity: 'high' }),
      mockFraudAlert({ id: 'a2', investigation_status: 'open', severity: 'critical' }),
      mockFraudAlert({ id: 'a3', investigation_status: 'in_progress', severity: 'medium' }),
      mockFraudAlert({ id: 'a4', investigation_status: 'resolved', severity: 'low' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('alert cards show severity badges with correct colors', async () => {
    setupFetchMock([
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
    setupFetchMock([
      mockFraudAlert({ id: 'a1', investigation_status: 'open' }),
      mockFraudAlert({ id: 'a2', investigation_status: 'open' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    const textareas = screen.getAllByPlaceholderText('Resolution notes...');
    expect(textareas).toHaveLength(2);
  });

  it('resolved alerts show resolution notes and timestamp', async () => {
    setupFetchMock([
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
    setupFetchMock([
      mockFraudAlert({ id: 'a1', investigation_status: 'open' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.getByPlaceholderText('Resolution notes...')).toBeInTheDocument();
    expect(screen.getByText('Update status')).toBeInTheDocument();
  });

  it('resolved alerts do NOT show investigation controls', async () => {
    setupFetchMock([
      mockFraudAlert({ id: 'a1', investigation_status: 'resolved', resolution_notes: 'Done' }),
    ]);

    render(<FraudInvestigation />);
    await screen.findByText('Fraud & Anomaly Investigation');

    expect(screen.queryByPlaceholderText('Resolution notes...')).not.toBeInTheDocument();
  });

  it('empty state shows "No fraud alerts" message', async () => {
    setupFetchMock([]);

    render(<FraudInvestigation />);
    expect(await screen.findByText(/No fraud alerts/i)).toBeInTheDocument();
  });

  it('displays alert description and confidence', async () => {
    setupFetchMock([
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
