import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health ok': (r) => r.status === 200 });
  });

  group('Auth Flow', () => {
    const start = Date.now();
    const email = `loadtest-${__VU}-${__ITER}@test.com`;

    const signup = http.post(
      `${BASE_URL}/api/auth/signup`,
      JSON.stringify({ email, password: 'LoadTest1234', fullName: `User ${__VU}` }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const ok = check(signup, {
      'signup 200': (r) => r.status === 200,
      'has token': (r) => {
        try { return r.json('session.access_token') !== undefined; }
        catch { return false; }
      },
    });

    errorRate.add(!ok);
    authDuration.add(Date.now() - start);

    if (ok) {
      let token;
      try { token = signup.json('session.access_token'); } catch { return; }

      const profile = http.get(`${BASE_URL}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      check(profile, { 'profile ok': (r) => r.status === 200 });
    }
  });

  group('API Endpoints', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'api ok': (r) => r.status === 200 });
  });

  sleep(1);
}
