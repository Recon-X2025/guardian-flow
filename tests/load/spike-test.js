import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 2000 },
    { duration: '1m', target: 2000 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, { 'status ok': (r) => r.status === 200 });
  sleep(0.5);
}
