# Testing Guide

**Version:** 7.0 | **Date:** April 2026

## Test Stack

| Type | Framework | Command |
|------|-----------|---------|
| Unit / Component | Vitest 1.6.1 | `node_modules/.bin/vitest run` or `npm test` |
| E2E | Playwright 1.58.0 | `npx playwright test` |
| API integration | Jest 30 + Supertest | `npm run test:api` |
| Load | k6 | `npm run test:load` (requires k6 installed) |

**Important:** Vitest config uses `@vitejs/plugin-react-swc` (not `@vitejs/plugin-react`). Do not swap these in `vitest.config.ts`.

---

## Running Tests

### Unit Tests (primary CI gate)

```bash
# Run all unit tests once
node_modules/.bin/vitest run

# Watch mode (development)
node_modules/.bin/vitest

# With coverage
node_modules/.bin/vitest run --coverage

# Single file
node_modules/.bin/vitest run tests/unit/db-adapter.test.ts
```

Current state: **155 tests, 21 files, 0 failures** (as of April 2026)

### E2E Tests

```bash
# Run all E2E tests (requires running dev server)
npx playwright test

# With UI
npx playwright test --ui

# Specific file
npx playwright test tests/e2e/ai-features.spec.ts
```

E2E tests require both the frontend (`npm run dev`) and backend (`cd server && npm run dev`) to be running.

### API Tests

```bash
npm run test:api
# Runs Jest against tests/api/ — uses Supertest against the live server
```

### Full Suite

```bash
npm run test:full   # runs test-full.sh script
npm run test:all    # e2e + api + load (load requires k6)
```

---

## Test Directory Structure

```
tests/
├── unit/                       # Vitest unit tests
│   ├── db-adapter.test.ts      # MongoDB + PostgreSQL adapter tests
│   ├── auth.test.ts
│   └── ...
├── components/                 # Component-level tests (Vitest)
├── e2e/                        # Playwright E2E tests
│   ├── ai-features.spec.ts
│   ├── tenant-isolation.spec.ts
│   └── ...
├── api/                        # API integration tests (Jest + Supertest)
│   └── ai-*.api.test.js
└── load/
    └── stress-test.js          # k6 load test
```

---

## Vitest Configuration

`vitest.config.ts` uses the React SWC plugin:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';   // NOTE: SWC, not @vitejs/plugin-react

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // ...
  },
});
```

---

## Testing AI Features

Because the AI layer defaults to mock mode, most tests run without an API key.

| Test Target | Mock mode | Live mode |
|-------------|-----------|-----------|
| `chatCompletion()` | Uses keyword-match mock | Requires `OPENAI_API_KEY` |
| `embedding()` | Returns `[]` (empty vector) | Requires `OPENAI_API_KEY` |
| `analyseImage()` | Always `Math.random()` defects | No live mode exists |
| `detectWorkOrderAnomalies()` | Real z-score (no key needed) | Same |
| `detectFinancialAnomalies()` | Real z-score (no key needed) | Same |

To run AI API tests against the real OpenAI API:
```bash
OPENAI_API_KEY=sk-... AI_PROVIDER=openai npm run test:ai-api
```

---

## Testing RBAC

### Manual Role Testing

1. **Operations Manager** — login → Dispatch page should show "View-Only Mode" alert, no action buttons
2. **Dispatcher** — Dispatch page: can check-in/out and release to field; Work Orders: "View SO" (disabled) not "Generate SO"
3. **Technician** — Dashboard shows only assigned WOs; Finance pages inaccessible
4. **Finance Manager** — Full invoice/payment access; Work Orders read-only

### Automated Tenant Isolation Tests

```bash
npx playwright test tests/e2e/tenant-isolation.spec.ts
```

Tests verify:
- Tenant A cannot view Tenant B tickets via API
- Tenant B cannot view Tenant A work orders
- 403 responses include `correlationId`

---

## Database Tests

The DB adapter tests cover both MongoDB and PostgreSQL paths:

```bash
# MongoDB adapter (default)
node_modules/.bin/vitest run tests/unit/db-adapter.test.ts

# PostgreSQL adapter
DB_ADAPTER=postgresql POSTGRES_URI=postgres://... node_modules/.bin/vitest run tests/unit/db-adapter.test.ts
```

---

## DB Migrations

Before running integration tests against a fresh database:

```bash
node server/scripts/phase0-migration.js
# Idempotent — safe to run multiple times
# Tracks applied migrations via schema_migrations collection
```

---

## Coverage Notes

### Well-covered
- DB adapter abstraction (MongoDB + PostgreSQL)
- Auth middleware (JWT validation, tenant scoping)
- Core route handlers (work orders, invoices, CRM)
- Anomaly detection (z-score calculations)
- FlowSpace write/read operations

### Not covered / gaps
- Vision service (mock only — no integration test possible without real CV model)
- ERP connector stubs (no real API credentials available)
- MQTT/IoT ingestion (stub — requires live broker)
- PWA/offline sync (not built)

---

## npm audit

```bash
npm audit
```

Current state: **17 pre-existing vulnerabilities** (1 critical, 7 high, 8 moderate, 1 low) — all in the devDependency chain, none in runtime production dependencies. Do not block CI on these; track upstream fixes.
