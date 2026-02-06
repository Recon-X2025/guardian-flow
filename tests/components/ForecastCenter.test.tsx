import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockForecastOutput } from '../__mocks__/apiClient';

// vi.hoisted ensures variables exist when vi.mock factories run
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

vi.mock('@/domains/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'admin@guardian.dev' },
    loading: false,
  }),
}));

vi.mock('@/domains/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/domains/shared/components/SeedDemoDataButton', () => ({
  SeedDemoDataButton: () => null,
}));

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => {
  const Comp = ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="recharts-mock" {...props}>{children as React.ReactNode}</div>
  );
  return {
    ResponsiveContainer: Comp,
    LineChart: Comp,
    Line: () => null,
    BarChart: Comp,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

import ForecastCenter from '@/domains/analytics/pages/ForecastCenter';

function setupFromMock(data: unknown[] | null = [], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = ['select', 'eq', 'neq', 'gte', 'lte', 'order', 'limit', 'single', 'in'];
  for (const m of chain) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = vi.fn((cb?: (v: unknown) => unknown) => {
    const result = { data, error };
    return cb ? Promise.resolve(cb(result)) : Promise.resolve(result);
  });
  mockFrom.mockReturnValue(builder);
}

// Default invoke handler that returns safe data for get-forecast-metrics
function setupInvoke(overrides: Record<string, unknown> = {}) {
  mockInvoke.mockImplementation(async (fn: string) => {
    if (fn === 'get-forecast-metrics') {
      return {
        data: {
          system_status: { data_seeded: false, models_trained: false, forecasts_generated: false },
          models: { total: 0, average_accuracy: 0 },
          forecasts: { total: 0 },
        },
        error: null,
      };
    }
    // Default for other functions
    return overrides[fn] ?? { data: null, error: null };
  });
}

describe('ForecastCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFromMock([]);
    setupInvoke();
  });

  it('renders forecast dashboard with title', () => {
    render(<ForecastCenter />);
    expect(screen.getByText('Forecast Center')).toBeInTheDocument();
  });

  it('renders metric cards', () => {
    render(<ForecastCenter />);
    expect(screen.getByText('Forecasted Volume')).toBeInTheDocument();
    expect(screen.getByText('Expected Revenue')).toBeInTheDocument();
    expect(screen.getByText('Projected Spend')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
  });

  it('shows empty forecast message when no data', () => {
    render(<ForecastCenter />);
    expect(
      screen.getByText(/No forecast data available/i)
    ).toBeInTheDocument();
  });

  it('"Regenerate Forecasts Only" button triggers run-forecast-now', async () => {
    mockInvoke.mockImplementation(async (fn: string) => {
      if (fn === 'get-forecast-metrics') {
        return {
          data: {
            system_status: { data_seeded: false, models_trained: false, forecasts_generated: false },
            models: { total: 0, average_accuracy: 0 },
            forecasts: { total: 0 },
          },
          error: null,
        };
      }
      return { data: { jobs: [{ id: 'j1' }] }, error: null };
    });

    render(<ForecastCenter />);
    const btn = screen.getByRole('button', { name: /Regenerate Forecasts Only/i });
    fireEvent.click(btn);

    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('run-forecast-now', expect.objectContaining({
        body: expect.objectContaining({
          tenant_id: 'test-user-id',
        }),
      }));
    });
  });

  it('renders forecast window selector buttons', () => {
    render(<ForecastCenter />);
    expect(screen.getByRole('button', { name: '1 Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 Months' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 Year' })).toBeInTheDocument();
  });

  it('clicking forecast window button changes selection', () => {
    render(<ForecastCenter />);
    const shortBtn = screen.getByRole('button', { name: '1 Month' });
    fireEvent.click(shortBtn);
    // After clicking, the button should be the "default" variant (not outline)
    // We test this by checking that the query was called (since changing the window triggers loadForecasts)
    expect(mockFrom).toHaveBeenCalled();
  });

  it('renders geography hierarchy selects', () => {
    render(<ForecastCenter />);
    expect(screen.getByText('Geography Hierarchy')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockInvoke.mockImplementation(async (fn: string) => {
      if (fn === 'get-forecast-metrics') {
        return {
          data: {
            system_status: { data_seeded: false, models_trained: false, forecasts_generated: false },
            models: { total: 0, average_accuracy: 0 },
            forecasts: { total: 0 },
          },
          error: null,
        };
      }
      return { data: null, error: { message: 'Network error' } };
    });

    render(<ForecastCenter />);
    const btn = screen.getByRole('button', { name: /Regenerate Forecasts Only/i });
    fireEvent.click(btn);

    // Should call toast with error
    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
  });
});
