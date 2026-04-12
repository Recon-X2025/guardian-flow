/**
 * BREAKING POINT LOAD TEST
 *
 * Escalates load across ALL API route groups to find system limits.
 * Designed to run with k6 (`k6 run tests/load/breaking-point.js`).
 *
 * Phases:
 *  1. Warm-up       — 10 VUs for 30 s  (baseline)
 *  2. Ramp-up       — 10→100 VUs over 1 min
 *  3. Sustained     — 100 VUs for 2 min  (expected happy-path load)
 *  4. Push          — 100→300 VUs over 1 min
 *  5. Stress hold   — 300 VUs for 3 min  (near-breaking)
 *  6. Spike         — instant 300→600 VUs for 30 s (traffic spike)
 *  7. Recovery      — 600→0 VUs over 30 s
 *
 * Total runtime: ~9 min
 *
 * Thresholds (fail the test if breached):
 *  - p(95) request duration < 2 000 ms
 *  - p(99) request duration < 5 000 ms
 *  - error rate < 5 %
 *  - auth error rate < 2 %
 *
 * Run:
 *   k6 run --env API_URL=http://localhost:3001 tests/load/breaking-point.js
 *
 * Optional env vars:
 *   ADMIN_EMAIL     (default: admin@guardian.dev)
 *   ADMIN_PASSWORD  (default: admin123)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/* ── custom metrics ────────────────────────────────────────────── */
const errorRate = new Rate('gf_errors');
const authErrorRate = new Rate('gf_auth_errors');
const dbQueryDuration = new Trend('gf_db_query_ms', true);
const authDuration = new Trend('gf_auth_ms', true);
const aiDuration = new Trend('gf_ai_ms', true);
const crashCount = new Counter('gf_5xx_responses');

/* ── config ─────────────────────────────────────────────────────── */
const BASE = __ENV.API_URL || 'http://localhost:3001';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@guardian.dev';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123';

export const options = {
  scenarios: {
    breaking_point: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // 1. warm-up
        { duration: '1m', target: 100 },   // 2. ramp-up
        { duration: '2m', target: 100 },   // 3. sustained
        { duration: '1m', target: 300 },   // 4. push
        { duration: '3m', target: 300 },   // 5. stress hold
        { duration: '30s', target: 600 },  // 6. spike
        { duration: '30s', target: 0 },    // 7. recovery
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    gf_errors: ['rate<0.05'],
    gf_auth_errors: ['rate<0.02'],
  },
};

/* ── helpers ─────────────────────────────────────────────────────── */
function json(body) {
  return JSON.stringify(body);
}

const headers = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

function record(res, metricFn, label) {
  const ok = res.status >= 200 && res.status < 400;
  errorRate.add(!ok);
  if (res.status >= 500) {
    crashCount.add(1);
    console.warn(`[5xx] ${label}: ${res.status}`);
  }
  if (metricFn) metricFn.add(res.timings.duration);
  return ok;
}

/* ── auth (token cached per VU iteration) ────────────────────────── */
function getToken() {
  const start = Date.now();
  const res = http.post(
    `${BASE}/api/auth/signin`,
    json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '10s' },
  );
  authDuration.add(Date.now() - start);

  const ok = check(res, {
    'auth: 200': (r) => r.status === 200,
    'auth: has token': (r) => {
      try { return !!r.json('session.access_token'); }
      catch { return false; }
    },
  });
  authErrorRate.add(!ok);

  if (!ok) return null;
  try { return res.json('session.access_token'); }
  catch { return null; }
}

/* ── main VU script ─────────────────────────────────────────────── */
export default function () {
  const token = getToken();
  if (!token) {
    sleep(1);
    return;
  }
  const h = headers(token);

  /* ── 1. INFRASTRUCTURE ──────────────────────────────────────── */
  group('infrastructure', () => {
    const r = http.get(`${BASE}/health`, { timeout: '5s' });
    check(r, { 'health: 200': (res) => res.status === 200 });
    errorRate.add(r.status !== 200);
  });

  /* ── 2. AUTH ────────────────────────────────────────────────── */
  group('auth', () => {
    const r = http.get(`${BASE}/api/auth/user`, { headers: h, timeout: '5s' });
    check(r, { 'auth/user: 200': (res) => res.status === 200 });
    record(r, authDuration, 'auth/user');
  });

  /* ── 3. DATABASE — multiple tables ──────────────────────────── */
  group('database', () => {
    const tables = ['work_orders', 'tickets', 'invoices', 'customers', 'equipment', 'inventory_items'];
    for (const t of tables) {
      const r = http.get(`${BASE}/api/db/${t}?select=*&limit=10`, { headers: h, timeout: '5s' });
      check(r, { [`db/${t}: <500`]: (res) => res.status < 500 });
      record(r, dbQueryDuration, `db/${t}`);
    }
    // Raw query
    const qr = http.post(
      `${BASE}/api/db/query`,
      json({ collection: 'work_orders', filter: {}, limit: 5 }),
      { headers: h, timeout: '5s' },
    );
    check(qr, { 'db/query: <500': (res) => res.status < 500 });
    record(qr, dbQueryDuration, 'db/query');
  });

  /* ── 4. KNOWLEDGE BASE ──────────────────────────────────────── */
  group('knowledge-base', () => {
    for (const ep of ['/api/knowledge-base/categories', '/api/knowledge-base/articles', '/api/faqs']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 5. ML PREDICTIONS ──────────────────────────────────────── */
  group('ml', () => {
    const endpoints = [
      ['/api/ml/models', 'GET'],
      ['/api/ml/predict/failure', 'POST', { equipmentId: 'eq-load', features: {} }],
      ['/api/ml/predict/forecast', 'POST', { horizon: 7, features: {} }],
      ['/api/ml/detect/anomalies', 'POST', { data: [1, 2, 3, 50, 2, 3] }],
    ];
    for (const [ep, method, body] of endpoints) {
      const r = method === 'GET'
        ? http.get(`${BASE}${ep}`, { headers: h, timeout: '8s' })
        : http.post(`${BASE}${ep}`, json(body), { headers: h, timeout: '8s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, aiDuration, ep);
    }
  });

  /* ── 6. ASSETS ──────────────────────────────────────────────── */
  group('assets', () => {
    for (const ep of ['/api/assets', '/api/assets/health/summary']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 7. LEDGER ──────────────────────────────────────────────── */
  group('ledger', () => {
    for (const ep of ['/api/ledger/accounts', '/api/ledger/trial-balance', '/api/ledger/entries', '/api/ledger/periods']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 8. SKILLS ──────────────────────────────────────────────── */
  group('skills', () => {
    for (const ep of ['/api/skills', '/api/skills/certifications', '/api/skills/match']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 9. SCHEDULE ────────────────────────────────────────────── */
  group('schedule', () => {
    const r = http.get(`${BASE}/api/schedule/assignments`, { headers: h, timeout: '5s' });
    check(r, { 'schedule: <500': (res) => res.status < 500 });
    record(r, null, 'schedule/assignments');
  });

  /* ── 10. PAYMENTS ───────────────────────────────────────────── */
  group('payments', () => {
    const r = http.get(`${BASE}/api/payments/gateways`, { headers: h, timeout: '5s' });
    check(r, { 'payments/gateways: <500': (res) => res.status < 500 });
    record(r, null, 'payments/gateways');
  });

  /* ── 11. CURRENCY ───────────────────────────────────────────── */
  group('currency', () => {
    for (const ep of [
      '/api/currency/rates',
      '/api/currency/convert?from=USD&to=EUR&amount=100',
    ]) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 12. FLOWSPACE ──────────────────────────────────────────── */
  group('flowspace', () => {
    const r = http.get(`${BASE}/api/flowspace/records`, { headers: h, timeout: '5s' });
    check(r, { 'flowspace: <500': (res) => res.status < 500 });
    record(r, null, 'flowspace/records');
  });

  /* ── 13. DEX ────────────────────────────────────────────────── */
  group('dex', () => {
    for (const ep of ['/api/dex/contexts', '/api/dex-marketplace/listings']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 14. ORG ────────────────────────────────────────────────── */
  group('org', () => {
    const r = http.get(`${BASE}/api/org`, { headers: h, timeout: '5s' });
    check(r, { 'org: <500': (res) => res.status < 500 });
    record(r, null, 'org');
  });

  /* ── 15. SLA ────────────────────────────────────────────────── */
  group('sla', () => {
    for (const ep of ['/api/sla/dashboard', '/api/sla-engine/policies']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 16. IoT ────────────────────────────────────────────────── */
  group('iot', () => {
    for (const ep of ['/api/iot/devices', '/api/iot/readings']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
    // Also ingest a reading
    const ir = http.post(
      `${BASE}/api/iot/ingest`,
      json({ deviceId: `load-device-${__VU}`, readings: [{ metric: 'temp', value: 72, ts: Date.now() }] }),
      { headers: h, timeout: '5s' },
    );
    check(ir, { 'iot/ingest: <500': (r) => r.status < 500 });
    record(ir, null, 'iot/ingest');
  });

  /* ── 17. AUDIT ──────────────────────────────────────────────── */
  group('audit', () => {
    for (const ep of ['/api/audit/controls', '/api/audit/risk-register', '/api/audit/report']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 18. ESG ────────────────────────────────────────────────── */
  group('esg', () => {
    for (const ep of ['/api/esg/reports', '/api/esg/benchmarks']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 19. OBSERVABILITY ──────────────────────────────────────── */
  group('observability', () => {
    for (const ep of ['/api/observability/traces', '/api/observability/slo-status', '/api/observability/service-map']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 20. PLATFORM / LAUNCH ──────────────────────────────────── */
  group('platform', () => {
    for (const ep of [
      '/api/platform/config', '/api/platform/rate-limits', '/api/platform/quotas',
      '/api/launch/checklist', '/api/launch/score',
    ]) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 21. REPORTING ──────────────────────────────────────────── */
  group('reporting', () => {
    for (const ep of ['/api/reporting/reports', '/api/reporting/datasources']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 22. CBM ────────────────────────────────────────────────── */
  group('cbm', () => {
    for (const ep of ['/api/cbm/rules', '/api/cbm/history']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 23. FIELD APP ──────────────────────────────────────────── */
  group('field-app', () => {
    for (const ep of ['/api/field-app/sync', '/api/field-app/config']) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 24. WHITE LABEL / NEURO / FEDERATED ────────────────────── */
  group('advanced', () => {
    const endpoints = [
      '/api/white-label/config',
      '/api/neuro/models',
      '/api/federated/rounds',
      '/api/ai-ethics/bias-reports',
      '/api/data-residency/policies',
    ];
    for (const ep of endpoints) {
      const r = http.get(`${BASE}${ep}`, { headers: h, timeout: '5s' });
      check(r, { [`${ep}: <500`]: (res) => res.status < 500 });
      record(r, null, ep);
    }
  });

  /* ── 25. SECURITY PROBES (should return 4xx, never 500) ─────── */
  group('security-probes', () => {
    // Unauthenticated access to protected route
    const unauth = http.get(`${BASE}/api/ledger/accounts`, { timeout: '3s' });
    check(unauth, { 'unauth: 401': (r) => r.status === 401 });

    // Bad JWT
    const fakeH = { ...headers('bad.jwt.token') };
    const fake = http.get(`${BASE}/api/auth/user`, { headers: fakeH, timeout: '3s' });
    check(fake, { 'fake-jwt: 401': (r) => r.status === 401 });

    // Malformed auth body
    const mal = http.post(
      `${BASE}/api/auth/signin`,
      json({}),
      { headers: { 'Content-Type': 'application/json' }, timeout: '3s' },
    );
    check(mal, { 'empty-signin: 4xx': (r) => r.status >= 400 && r.status < 500 });
    errorRate.add(mal.status >= 500);
  });

  sleep(0.3);
}

/* ── summary ────────────────────────────────────────────────────── */
export function handleSummary(data) {
  const metrics = data.metrics;
  const p95 = metrics.http_req_duration?.values?.['p(95)'] ?? 'N/A';
  const p99 = metrics.http_req_duration?.values?.['p(99)'] ?? 'N/A';
  const errorPct = ((metrics.gf_errors?.values?.rate ?? 0) * 100).toFixed(2);
  const rps = metrics.http_reqs?.values?.rate?.toFixed(1) ?? 'N/A';
  const crashes = metrics.gf_5xx_responses?.values?.count ?? 0;
  const maxVUs = metrics.vus_max?.values?.max ?? 'N/A';

  const lines = [
    '═══════════════════════════════════════════════════════',
    '  GUARDIAN-FLOW BREAKING POINT LOAD TEST — SUMMARY',
    '═══════════════════════════════════════════════════════',
    `  Peak VUs     : ${maxVUs}`,
    `  Req/sec      : ${rps}`,
    `  p(95) latency: ${p95} ms`,
    `  p(99) latency: ${p99} ms`,
    `  Error rate   : ${errorPct}%`,
    `  5xx responses: ${crashes}`,
    '═══════════════════════════════════════════════════════',
  ];

  console.log(lines.join('\n'));

  return {
    'tests/load/breaking-point-results.json': JSON.stringify(data, null, 2),
    stdout: lines.join('\n') + '\n',
  };
}
