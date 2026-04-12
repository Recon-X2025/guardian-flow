import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockPrediction } from '../__mocks__/apiClient';

import PredictiveMaintenance from '@/domains/workOrders/pages/PredictiveMaintenance';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function setupFetchMock(predictions: unknown[]) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/api/functions/maintenance-predictions') || url.includes('/api/assets/at-risk')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ predictions, total: predictions.length }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
}

function setupFetchNeverResolve() {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
}

describe('PredictiveMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders loading state', () => {
    setupFetchNeverResolve();
    renderWithProviders(<PredictiveMaintenance />);
    expect(screen.getByText('Loading predictions...')).toBeInTheDocument();
  });

  it('renders empty state when no predictions available', async () => {
    setupFetchMock([]);
    renderWithProviders(<PredictiveMaintenance />);
    expect(await screen.findByText(/No predictions available/i)).toBeInTheDocument();
  });

  it('renders prediction table with mock data', async () => {
    const predictions = [
      mockPrediction({ id: 'p1', risk_level: 'high', failure_probability: 0.87 }),
      mockPrediction({ id: 'p2', risk_level: 'medium', failure_probability: 0.45 }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    expect(await screen.findByText('87.0%')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  it('renders risk level badges with correct CSS classes', async () => {
    const predictions = [
      mockPrediction({ id: 'p1', risk_level: 'high', failure_probability: 0.90 }),
      mockPrediction({ id: 'p2', risk_level: 'medium', failure_probability: 0.50 }),
      mockPrediction({ id: 'p3', risk_level: 'low', failure_probability: 0.10 }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    await screen.findByText('90.0%');

    const badges = screen.getAllByText(/^(high|medium|low)$/);
    expect(badges).toHaveLength(3);

    const highBadge = badges.find(b => b.textContent === 'high');
    expect(highBadge?.className).toContain('bg-destructive');

    const medBadge = badges.find(b => b.textContent === 'medium');
    expect(medBadge?.className).toContain('bg-warning');

    const lowBadge = badges.find(b => b.textContent === 'low');
    expect(lowBadge?.className).toContain('bg-success');
  });

  it('renders "Schedule Maintenance" button for each prediction', async () => {
    const predictions = [
      mockPrediction({ id: 'p1' }),
      mockPrediction({ id: 'p2' }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    const buttons = await screen.findAllByRole('button', {
      name: /Schedule Maintenance/i,
    });
    expect(buttons).toHaveLength(2);
  });

  it('displays equipment info (manufacturer, model, serial_number)', async () => {
    const predictions = [
      mockPrediction({
        id: 'p1',
        equipment: {
          manufacturer: 'Acme',
          model: 'Widget X',
          serial_number: 'SN-12345',
        },
      }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    expect(await screen.findByText(/Acme/)).toBeInTheDocument();
    expect(screen.getByText(/Widget X/)).toBeInTheDocument();
    expect(screen.getByText('SN-12345')).toBeInTheDocument();
  });

  it('displays summary cards with correct counts', async () => {
    const predictions = [
      mockPrediction({ id: 'p1', risk_level: 'high', failure_probability: 0.91 }),
      mockPrediction({ id: 'p2', risk_level: 'high', failure_probability: 0.82 }),
      mockPrediction({ id: 'p3', risk_level: 'medium', failure_probability: 0.55 }),
      mockPrediction({ id: 'p4', risk_level: 'low', failure_probability: 0.12 }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    await screen.findByText('91.0%');

    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('displays confidence score for each prediction', async () => {
    const predictions = [
      mockPrediction({ id: 'p1', confidence_score: 0.92 }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    expect(await screen.findByText(/92% confidence/)).toBeInTheDocument();
  });

  it('handles null confidence_score gracefully', async () => {
    const predictions = [
      mockPrediction({ id: 'p1', confidence_score: undefined }),
    ];
    setupFetchMock(predictions);
    renderWithProviders(<PredictiveMaintenance />);

    expect(await screen.findByText(/0% confidence/)).toBeInTheDocument();
  });
});
