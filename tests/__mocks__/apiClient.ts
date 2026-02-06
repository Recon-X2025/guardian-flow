/**
 * Shared mock factory for apiClient used in component tests.
 * Provides chainable query builder and functions.invoke() mock.
 */
import { vi } from 'vitest';

// ---- Mock data factories ----

export function mockPrediction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pred-1',
    prediction_type: 'failure',
    risk_level: 'high',
    failure_probability: 0.87,
    confidence_score: 0.92,
    predicted_failure_date: '2026-03-15',
    recommended_action: 'Replace compressor',
    status: 'pending',
    equipment: {
      serial_number: 'SN-001',
      model: 'CoolMax 3000',
      manufacturer: 'HVAC Corp',
    },
    ...overrides,
  };
}

export function mockForecastOutput(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fc-1',
    target_date: '2026-03-01',
    value: 120,
    lower_bound: 100,
    upper_bound: 140,
    forecast_type: 'volume',
    explanation: 'Seasonal demand increase expected.',
    confidence_upper: 140,
    confidence_lower: 100,
    ...overrides,
  };
}

export function mockOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    title: 'Extended Warranty Plan',
    description: 'Premium coverage for 2 years',
    status: 'generated',
    offer_type: 'warranty',
    price: 299,
    warranty_conflicts: false,
    model_version: 'gpt-4o-v1',
    confidence_score: 0.85,
    work_orders: { wo_number: 'WO-1001' },
    ...overrides,
  };
}

export function mockFraudAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert-1',
    anomaly_type: 'duplicate_invoice',
    severity: 'high',
    investigation_status: 'open',
    description: 'Duplicate invoice detected for WO-1001',
    resource_type: 'invoice',
    resource_id: 'INV-001',
    detection_model: 'z_score_anomaly_v1',
    confidence_score: 0.91,
    investigator_id: null,
    resolution_notes: null,
    resolved_at: null,
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

export function mockForgeryDetection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'det-1',
    work_order_id: 'wo-1',
    forgery_detected: true,
    forgery_type: 'metadata_manipulation',
    confidence_score: '0.87',
    model_type: 'statistical',
    model_version: 'v1.0.0',
    review_status: 'flagged',
    processed_at: '2026-01-20T08:00:00Z',
    created_at: '2026-01-20T08:00:00Z',
    file_name: 'photo_1.jpg',
    work_orders: { wo_number: 'WO-2001' },
    ...overrides,
  };
}

export function mockBatchJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    job_name: 'Batch detection 1/20/2026',
    job_type: 'detection',
    status: 'completed',
    total_images: 10,
    processed_images: 10,
    detections_found: 3,
    avg_confidence: 0.82,
    processing_time_seconds: 12.5,
    created_at: '2026-01-20T07:00:00Z',
    ...overrides,
  };
}

export function mockModelMetrics(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mm-1',
    model_type: 'statistical',
    model_version: 'v1.0.0',
    precision_score: '0.92',
    recall_score: '0.88',
    f1_score: '0.90',
    accuracy: '0.91',
    drift_detected: false,
    drift_score: null,
    is_active: true,
    deployed_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockMonitoringAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mon-1',
    alert_type: 'high_forgery_rate',
    severity: 'warning',
    status: 'open',
    details: { recommendation: 'Review recent batch results' },
    created_at: '2026-01-20T09:00:00Z',
    ...overrides,
  };
}

// ---- Chainable query builder mock ----

type QueryResult = { data: unknown[] | unknown | null; error: unknown | null; count?: number };

export function createQueryBuilderMock(resolveValue: QueryResult = { data: [], error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in',
    'order', 'limit', 'range', 'single',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Make the builder thenable so `await apiClient.from(...).select(...)` resolves
  builder.then = vi.fn((cb?: (v: QueryResult) => unknown) => {
    return cb ? Promise.resolve(cb(resolveValue)) : Promise.resolve(resolveValue);
  });

  return builder;
}

// ---- Full apiClient mock ----

export interface MockApiClient {
  from: ReturnType<typeof vi.fn>;
  functions: { invoke: ReturnType<typeof vi.fn> };
  auth: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
}

export function createMockApiClient(defaults?: {
  fromData?: QueryResult;
  invokeData?: { data: unknown; error: unknown | null };
}): MockApiClient {
  const fromData = defaults?.fromData ?? { data: [], error: null };
  const invokeData = defaults?.invokeData ?? { data: null, error: null };

  const queryBuilder = createQueryBuilderMock(fromData);

  return {
    from: vi.fn().mockReturnValue({
      ...queryBuilder,
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue(invokeData),
    },
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  };
}
