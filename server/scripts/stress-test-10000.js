/**
 * @file server/scripts/stress-test-10000.js
 * @description
 * D5 — "The 10k Siege": Full-stack k6 stress test with real JWT auth and DB writes.
 *
 * Prerequisites:
 *   1. A running server:       node server/server.js
 *   2. k6 installed:           brew install k6  OR  snap install k6
 *   3. A seeded test user:     node server/scripts/seed-database.js
 *   4. Adequate infrastructure: 10k concurrent VUs requires k6 Cloud or a
 *      distributed injector fleet — do NOT run against localhost from a single machine.
 *
 * Run (local scale test — 10% of full load, useful for CI):
 *   k6 run server/scripts/stress-test-10000.js -e MAX_VUS=1000
 *
 * Run (full 10k siege, requires k6 Cloud or distributed injectors):
 *   k6 cloud server/scripts/stress-test-10000.js
 *
 * Success criteria (D5 directive):
 *   • Exit code 0 (all thresholds pass).
 *   • Max CPU utilisation < 85% (monitored externally via Prometheus/top).
 *   • Memory leak delta < 2% over 1-hour sustained burst (profile with clinic.js).
 *   • p(95) HTTP response time < 2000 ms.
 *   • Error rate < 1%.
 */

import http   from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Custom metrics ────────────────────────────────────────────────────────────

const errorRate       = new Rate('errors');
const authDuration    = new Trend('auth_duration_ms', true);
const writeDuration   = new Trend('write_duration_ms', true);
const readDuration    = new Trend('read_duration_ms', true);
const totalRequests   = new Counter('total_requests');

// ── Configuration ────────────────────────────────────────────────────────────

const API     = __ENV.API_URL  || 'http://localhost:3001';
const MAX_VUS = parseInt(__ENV.MAX_VUS || '10000', 10);

export const options = {
  stages: [
    // Ramp-up: 0 → 1k VUs over 2 minutes
    { duration: '2m',  target: Math.round(MAX_VUS * 0.1) },
    // Ramp-up: 1k → 5k VUs over 5 minutes
    { duration: '5m',  target: Math.round(MAX_VUS * 0.5) },
    // Hold: 5k VUs for 5 minutes
    { duration: '5m',  target: Math.round(MAX_VUS * 0.5) },
    // Ramp-up: 5k → 10k VUs over 5 minutes
    { duration: '5m',  target: MAX_VUS },
    // Sustained burst: 10k VUs for 30 minutes (memory leak check window)
    { duration: '30m', target: MAX_VUS },
    // Ramp-down: 10k → 0 over 3 minutes
    { duration: '3m',  target: 0 },
  ],
  thresholds: {
    // D5 success criteria
    'http_req_duration':   ['p(95)<2000'],   // p95 under 2 s
    'http_req_failed':     ['rate<0.01'],     // < 1% errors
    'errors':              ['rate<0.01'],
    // Write path must also be responsive
    'write_duration_ms':   ['p(95)<3000'],
  },
};

// ── Shared state ──────────────────────────────────────────────────────────────

// VU-local work order tracker to enable read-your-writes assertions
let createdWorkOrderId = null;

// ── Helper: authenticate ──────────────────────────────────────────────────────

function authenticate() {
  const start = Date.now();
  const res = http.post(
    `${API}/api/auth/signin`,
    JSON.stringify({ email: 'admin@guardian.dev', password: 'admin123' }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '10s' },
  );
  authDuration.add(Date.now() - start);
  totalRequests.add(1);

  if (res.status !== 200) {
    errorRate.add(1);
    return null;
  }
  errorRate.add(0);
  return JSON.parse(res.body)?.session?.access_token ?? null;
}

// ── VU lifecycle ──────────────────────────────────────────────────────────────

export default function () {
  const token = authenticate();
  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ── 1. Health check ──────────────────────────────────────────────────────

  group('Health Check', () => {
    const res = http.get(`${API}/health`, { timeout: '5s' });
    totalRequests.add(1);
    check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  // ── 2. DB Write — create a work order ────────────────────────────────────

  group('DB Write — Create Work Order', () => {
    const start = Date.now();
    const res = http.post(
      `${API}/api/db/work_orders`,
      JSON.stringify({
        title:       `Siege WO ${uuidv4()}`,
        description: 'Auto-generated work order from 10k siege test.',
        priority:    'medium',
        status:      'open',
        category:    'stress_test',
      }),
      { headers, timeout: '10s' },
    );
    writeDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
      'write WO status 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    errorRate.add(!ok);

    if (ok && res.status === 201) {
      try {
        createdWorkOrderId = JSON.parse(res.body)?.id ?? null;
      } catch { /* non-critical */ }
    }
  });

  // ── 3. DB Read — verify the write (read-your-writes) ─────────────────────

  if (createdWorkOrderId) {
    group('DB Read — Verify Created Work Order', () => {
      const start = Date.now();
      const res   = http.get(`${API}/api/db/work_orders/${createdWorkOrderId}`, { headers, timeout: '5s' });
      readDuration.add(Date.now() - start);
      totalRequests.add(1);

      check(res, { 'read WO 200': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    });
  }

  // ── 4. DB Read — list tickets ─────────────────────────────────────────────

  group('DB Read — Tickets', () => {
    const start = Date.now();
    const res = http.get(`${API}/api/db/tickets?select=*&limit=10`, { headers, timeout: '5s' });
    readDuration.add(Date.now() - start);
    totalRequests.add(1);

    check(res, { 'tickets 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  // ── 5. DB Write — create a ticket ────────────────────────────────────────

  group('DB Write — Create Ticket', () => {
    const start = Date.now();
    const res = http.post(
      `${API}/api/db/tickets`,
      JSON.stringify({
        title:       `Siege Ticket ${uuidv4()}`,
        description: 'Auto-generated ticket from 10k siege test.',
        priority:    'low',
        status:      'open',
        category:    'stress_test',
      }),
      { headers, timeout: '10s' },
    );
    writeDuration.add(Date.now() - start);
    totalRequests.add(1);

    check(res, { 'write ticket 2xx': (r) => r.status >= 200 && r.status < 300 });
    errorRate.add(!(res.status >= 200 && res.status < 300));
  });

  // ── 6. Auth — validate current user ──────────────────────────────────────

  group('Auth — Current User', () => {
    const start = Date.now();
    const res = http.get(`${API}/api/auth/user`, { headers, timeout: '5s' });
    readDuration.add(Date.now() - start);
    totalRequests.add(1);

    check(res, { 'user 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const metrics = data.metrics;

  const p95       = metrics['http_req_duration']?.values?.['p(95)'] ?? 'N/A';
  const errRate   = (metrics['errors']?.values?.rate ?? 0) * 100;
  const writeP95  = metrics['write_duration_ms']?.values?.['p(95)'] ?? 'N/A';
  const totalReqs = metrics['total_requests']?.values?.count ?? 0;
  const passed    = errRate < 1 && (p95 === 'N/A' || p95 < 2000);

  console.log('\n══════════════════════════════════════════════════════');
  console.log(' D5 — 10k Siege — Final Report');
  console.log('══════════════════════════════════════════════════════');
  console.log(` Max VUs configured     : ${MAX_VUS.toLocaleString()}`);
  console.log(` Total requests sent    : ${totalReqs.toLocaleString()}`);
  console.log(` HTTP p(95) latency     : ${typeof p95 === 'number' ? p95.toFixed(0) + 'ms' : p95}`);
  console.log(` Write p(95) latency    : ${typeof writeP95 === 'number' ? writeP95.toFixed(0) + 'ms' : writeP95}`);
  console.log(` Error rate             : ${errRate.toFixed(2)}%`);
  console.log(` Verdict                : ${passed ? '✅ PASS — exit code 0' : '❌ FAIL — thresholds exceeded'}`);
  console.log('──────────────────────────────────────────────────────');
  console.log(' To check CPU/memory (run alongside the test):');
  console.log('   watch -n 1 "ps aux | grep node | awk \'{print $3, $4}\'"');
  console.log('   npx clinic flame -- node server/server.js');
  console.log('══════════════════════════════════════════════════════\n');

  return { stdout: JSON.stringify(data, null, 2) };
}
