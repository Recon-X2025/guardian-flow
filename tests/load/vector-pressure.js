/**
 * @file tests/load/vector-pressure.js
 * @description
 * D3 — "Vector Pressure": k6 load test for the Semantic Resolution engine.
 *
 * Prerequisites:
 *   1. Seed the database: node server/scripts/seed-vector-pressure.js
 *   2. Start the server:  node server/server.js
 *   3. Install k6:        brew install k6  OR  snap install k6
 *
 * Run:
 *   k6 run tests/load/vector-pressure.js
 *   k6 run -e API_URL=http://your-server:3001 tests/load/vector-pressure.js
 *
 * Success criteria (D3 directive):
 *   • p(95) latency for top-3 semantic resolution suggestions < 250 ms
 *   • Error rate < 1%
 *
 * If thresholds fail, enable HNSW indexing on the PostgreSQL adapter:
 *   CREATE INDEX ON tickets USING hnsw (embedding vector_cosine_ops)
 *     WITH (m = 16, ef_construction = 64);
 *   SET hnsw.ef_search = 64;
 */

import http   from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────

const errorRate          = new Rate('errors');
const semanticLatency    = new Trend('semantic_latency_ms', true);
const suggestionsReturned = new Counter('suggestions_returned_total');

// ── Test configuration ────────────────────────────────────────────────────────

const API = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm-up
    { duration: '60s', target: 50 },   // ramp to 50 concurrent VUs
    { duration: '120s', target: 50 },  // hold at 50 VUs for 2 minutes
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    // D3 success criterion: p95 of semantic resolution queries < 250 ms
    'semantic_latency_ms':     ['p(95)<250'],
    // Overall HTTP error rate must stay below 1%
    'http_req_failed':         ['rate<0.01'],
    'errors':                  ['rate<0.01'],
  },
};

// ── Semantic query corpus ─────────────────────────────────────────────────────

// Varied queries representative of the 5 seeded domains.
// Rotating through these ensures the load test exercises the full index,
// not just a single cached result.
const QUERY_CORPUS = [
  // hardware
  'printer not printing after firmware upgrade',
  'laptop battery dies quickly',
  'monitor display flickering',
  'docking station keeps disconnecting',
  'server overheating CPU fan noise',
  // software
  'CRM application keeps crashing',
  'cannot connect to email server',
  'VPN disconnects automatically',
  'browser policies blocking extensions',
  'ERP error when submitting invoices',
  // network
  'wireless drops every 20 minutes',
  'internet slow at remote office',
  'VoIP audio breaking up',
  'cannot access shared network drive',
  'DNS not resolving',
  // security
  'unusual login from unknown location',
  'ransomware detected on file server',
  'SSL certificate expired warning',
  'phishing email received',
  'user account locked out',
  // billing
  'wrong tax on invoice',
  'credit card payment declined',
  'charged twice on renewal',
  'cannot download invoice PDF',
  'upgrade billing calculation wrong',
];

// ── Authentication ────────────────────────────────────────────────────────────

function getToken() {
  const res = http.post(
    `${API}/api/auth/signin`,
    JSON.stringify({ email: 'admin@guardian.dev', password: 'admin123' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  errorRate.add(res.status !== 200);
  if (res.status !== 200) return null;
  return JSON.parse(res.body)?.session?.access_token ?? null;
}

// ── VU lifecycle ──────────────────────────────────────────────────────────────

export default function () {
  const token = getToken();
  if (!token) return;

  const headers = {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Round-robin through query corpus
  const query = QUERY_CORPUS[Math.floor(Math.random() * QUERY_CORPUS.length)];

  group('Semantic Resolution — top-3 suggestions', () => {
    const start = Date.now();

    const res = http.post(
      `${API}/api/knowledge-base/semantic-suggest`,
      JSON.stringify({ query, limit: 3 }),
      { headers, timeout: '5s' },
    );

    const elapsed = Date.now() - start;
    semanticLatency.add(elapsed);

    const ok = check(res, {
      'status is 200':              (r) => r.status === 200,
      'returns suggestions array':  (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.suggestions ?? body.results ?? body.data);
        } catch { return false; }
      },
      'latency < 250ms':            () => elapsed < 250,
    });

    errorRate.add(!ok);

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const suggestions = body.suggestions ?? body.results ?? body.data ?? [];
        suggestionsReturned.add(suggestions.length);
      } catch { /* non-JSON response already counted as error */ }
    }
  });

  sleep(0.5);
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const p95 = data.metrics['semantic_latency_ms']?.values?.['p(95)'] ?? 'N/A';
  const errRate = (data.metrics['errors']?.values?.rate ?? 0) * 100;
  const passed  = p95 !== 'N/A' && p95 < 250 && errRate < 1;

  console.log('\n═══════════════════════════════════════════════════');
  console.log(' D3 Vector Pressure — Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(` Semantic latency p(95) : ${typeof p95 === 'number' ? p95.toFixed(1) + 'ms' : p95}`);
  console.log(` Error rate             : ${errRate.toFixed(2)}%`);
  console.log(` Threshold (< 250ms)    : ${passed ? '✅ PASS' : '❌ FAIL — enable HNSW indexing'}`);
  if (!passed && p95 !== 'N/A' && p95 >= 250) {
    console.log('');
    console.log(' Remediation (PostgreSQL + pgvector):');
    console.log('   CREATE INDEX ON tickets USING hnsw (embedding vector_cosine_ops)');
    console.log('     WITH (m = 16, ef_construction = 64);');
    console.log('   SET hnsw.ef_search = 64;');
  }
  console.log('═══════════════════════════════════════════════════\n');

  return {
    stdout: JSON.stringify(data, null, 2),
  };
}
