import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const queryDuration = new Trend('query_duration');

const API = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // ramp up to 10 users
    { duration: '20s', target: 10 },   // hold at 10
    { duration: '10s', target: 50 },   // ramp up to 50
    { duration: '20s', target: 50 },   // hold at 50
    { duration: '10s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    errors: ['rate<0.1'],               // error rate under 10%
  },
};

function getToken() {
  const res = http.post(`${API}/api/auth/signin`, JSON.stringify({
    email: 'admin@guardian.dev',
    password: 'admin123',
  }), { headers: { 'Content-Type': 'application/json' } });

  authDuration.add(res.timings.duration);

  if (res.status !== 200) {
    errorRate.add(1);
    return null;
  }

  errorRate.add(0);
  const body = JSON.parse(res.body);
  return body.session?.access_token;
}

export default function () {
  const token = getToken();
  if (!token) return;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  group('Health Check', () => {
    const res = http.get(`${API}/health`);
    check(res, { 'health OK': (r) => r.status === 200 });
  });

  group('Auth - Get User', () => {
    const res = http.get(`${API}/api/auth/user`, { headers });
    check(res, { 'user OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('DB - Query Work Orders', () => {
    const res = http.get(`${API}/api/db/work_orders?select=*&limit=10`, { headers });
    check(res, { 'work_orders OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('DB - Query Tickets', () => {
    const res = http.get(`${API}/api/db/tickets?select=*&limit=10`, { headers });
    check(res, { 'tickets OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('DB - Query Invoices', () => {
    const res = http.get(`${API}/api/db/invoices?select=*&limit=10`, { headers });
    check(res, { 'invoices OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('DB - Query Customers', () => {
    const res = http.get(`${API}/api/db/customers?select=*&limit=10`, { headers });
    check(res, { 'customers OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('DB - Query Equipment', () => {
    const res = http.get(`${API}/api/db/equipment?select=*&limit=10`, { headers });
    check(res, { 'equipment OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('DB - Query Notifications', () => {
    const res = http.get(`${API}/api/db/notifications?select=*&limit=10`, { headers });
    check(res, { 'notifications OK': (r) => r.status === 200 });
    queryDuration.add(res.timings.duration);
  });

  group('Knowledge Base', () => {
    const res = http.get(`${API}/api/knowledge-base/categories`, { headers });
    check(res, { 'kb categories OK': (r) => r.status === 200 });
  });

  group('FAQs', () => {
    const res = http.get(`${API}/api/faqs`, { headers });
    check(res, { 'faqs OK': (r) => r.status === 200 });
  });

  sleep(1);
}
