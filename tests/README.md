# RBAC Test Suite

## Overview
Comprehensive automated tests for Role-Based Access Control (RBAC) implementation.

## Test Coverage
- ✅ Role-based UI visibility (sidebar modules)
- ✅ Route-level access control
- ✅ API endpoint authorization
- ✅ Override request flows
- ✅ MFA enforcement for sensitive actions
- ✅ Tenant isolation
- ✅ Audit logging

## Prerequisites
```bash
npm install
npx playwright install
```

## Running Tests

### All tests
```bash
npm run test:e2e
```

### Specific test file
```bash
npx playwright test tests/rbac.spec.ts
```

### With UI mode (recommended for development)
```bash
npx playwright test --ui
```

### Generate test report
```bash
npx playwright show-report
```

## Test Accounts
All test accounts are seeded via the `seed-test-accounts` edge function:

| Role | Email | Description |
|------|-------|-------------|
| sys_admin | admin@techcorp.com | Full system access |
| ops_manager | ops@techcorp.com | Operations management |
| finance_manager | finance@techcorp.com | Finance operations |
| fraud_investigator | fraud@techcorp.com | Fraud analysis |
| technician | tech1@servicepro.com | Field technician |
| dispatcher | dispatch@techcorp.com | Dispatch operations |
| customer | customer@example.com | Customer portal |
| guest | guest@example.com | Limited read-only |

Default password for all: `TestPassword123!`

## CI Integration
Tests run automatically on every PR via GitHub Actions.

## Debugging Failed Tests
1. Run with `--debug` flag: `npx playwright test --debug`
2. Check screenshots in `test-results/` folder
3. View trace files: `npx playwright show-trace trace.zip`
