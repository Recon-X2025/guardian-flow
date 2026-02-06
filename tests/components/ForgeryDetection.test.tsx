import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  mockForgeryDetection,
  mockBatchJob,
  mockModelMetrics,
  mockMonitoringAlert,
} from '../__mocks__/apiClient';

const { mockFrom, mockInvoke, mockToast, mockNavigate } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
  mockToast: vi.fn(),
  mockNavigate: vi.fn(),
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

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

import ForgeryDetection from '@/domains/fraud/pages/ForgeryDetection';

function createBuilder(data: unknown[] | unknown | null = [], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = ['select', 'eq', 'neq', 'order', 'limit', 'single'];
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
  return builder;
}

function setupMocks(opts: {
  detections?: unknown[];
  batchJobs?: unknown[];
  modelMetrics?: unknown | null;
  alerts?: unknown[];
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'forgery_detections') return createBuilder(opts.detections ?? []);
    if (table === 'forgery_batch_jobs') return createBuilder(opts.batchJobs ?? []);
    if (table === 'forgery_model_metrics') return createBuilder(opts.modelMetrics ?? null);
    if (table === 'forgery_monitoring_alerts') return createBuilder(opts.alerts ?? []);
    if (table === 'work_orders') return createBuilder([{ id: 'wo-1' }]);
    return createBuilder([]);
  });
}

describe('ForgeryDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: { processed: 5, batch_id: 'b-1' },
      error: null,
    });
  });

  it('renders batch jobs table with progress', async () => {
    setupMocks({
      batchJobs: [
        mockBatchJob({ id: 'b1', processed_images: 8, total_images: 10 }),
      ],
    });

    render(<ForgeryDetection />);
    // Wait for loading to complete
    await screen.findByText('Image Forgery Detection');
    expect(screen.getByText('Batch Jobs')).toBeInTheDocument();
  });

  it('detection list shows confidence scores (parseFloat safety)', async () => {
    setupMocks({
      detections: [
        mockForgeryDetection({ id: 'd1', confidence_score: '0.87' }),
        mockForgeryDetection({ id: 'd2', confidence_score: '0.45' }),
      ],
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    expect(screen.getByText('87.0%')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  it('model metrics display precision, recall, F1', async () => {
    setupMocks({
      modelMetrics: mockModelMetrics({
        precision_score: '0.92',
        recall_score: '0.88',
        f1_score: '0.90',
        accuracy: '0.91',
      }),
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    expect(screen.getByText('Precision')).toBeInTheDocument();
    expect(screen.getByText('92.0%')).toBeInTheDocument();
    expect(screen.getByText('Recall')).toBeInTheDocument();
    expect(screen.getByText('88.0%')).toBeInTheDocument();
    expect(screen.getByText('F1 Score')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
  });

  it('"Start Batch Detection" button calls process-forgery-batch endpoint', async () => {
    setupMocks({
      detections: [],
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    const btn = screen.getByRole('button', { name: /Start Batch Detection/i });
    fireEvent.click(btn);

    // The button click triggers an async flow: query work_orders then invoke
    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'process-forgery-batch',
        expect.objectContaining({
          body: expect.objectContaining({
            job_type: 'detection',
          }),
        })
      );
    });
  });

  it('review status badges render correctly', async () => {
    setupMocks({
      detections: [
        mockForgeryDetection({ id: 'd1', review_status: 'flagged' }),
        mockForgeryDetection({ id: 'd2', review_status: 'confirmed', forgery_detected: true }),
      ],
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    expect(screen.getByText('flagged')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('monitoring alerts section displays', async () => {
    setupMocks({
      alerts: [
        mockMonitoringAlert({
          id: 'mon1',
          alert_type: 'high_forgery_rate',
          severity: 'warning',
          details: { recommendation: 'Review recent batch results' },
        }),
      ],
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    expect(screen.getByText(/HIGH FORGERY RATE/i)).toBeInTheDocument();
    expect(screen.getByText(/Review recent batch results/i)).toBeInTheDocument();
  });

  it('handles null/undefined confidence_score without NaN', async () => {
    setupMocks({
      detections: [
        mockForgeryDetection({ id: 'd1', confidence_score: null }),
        mockForgeryDetection({ id: 'd2', confidence_score: undefined }),
      ],
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    // Should show 0.0% instead of NaN%
    const percentages = screen.getAllByText('0.0%');
    expect(percentages.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
  });

  it('renders key metric cards', async () => {
    setupMocks({
      detections: [
        mockForgeryDetection({ id: 'd1', forgery_detected: true, review_status: 'pending' }),
        mockForgeryDetection({ id: 'd2', forgery_detected: false }),
      ],
    });

    render(<ForgeryDetection />);
    await screen.findByText('Image Forgery Detection');

    expect(screen.getByText('Total Detections')).toBeInTheDocument();
    expect(screen.getByText('Forgeries Detected')).toBeInTheDocument();
    expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });
});
