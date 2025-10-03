# RBAC Test Suite

## Overview
Comprehensive automated tests for Role-Based Access Control (RBAC) and tenant isolation.

## Test Suites

### 1. RBAC Tests (`rbac.spec.ts`)
- ✅ Role-based UI visibility (sidebar modules)
- ✅ Route-level access control
- ✅ API endpoint authorization
- ✅ Override request flows
- ✅ MFA enforcement for sensitive actions
- ✅ Audit logging

### 2. Tenant Isolation Tests (`tenant-isolation.spec.ts`)
- ✅ Cross-tenant ticket access prevention
- ✅ Cross-tenant work order isolation
- ✅ Partner admin profile scoping
- ✅ API 403 error responses with correlation IDs
- ✅ Auth/me endpoint tenant context validation

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

### Specific test suite
```bash
npx playwright test tests/rbac.spec.ts
npx playwright test tests/tenant-isolation.spec.ts
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

| Role | Email | Tenant | Description |
|------|-------|--------|-------------|
| sys_admin | admin@techcorp.com | N/A | Full system access |
| ops_manager | ops@techcorp.com | TechCorp | Operations management |
| finance_manager | finance@techcorp.com | TechCorp | Finance operations |
| fraud_investigator | fraud@techcorp.com | TechCorp | Fraud analysis |
| partner_admin | partner@acme.com | ACME Corp | Partner admin (Tenant A) |
| partner_admin | partner@techcorp.com | TechCorp | Partner admin (Tenant B) |
| technician | tech1@servicepro.com | ServicePro | Field technician |
| dispatcher | dispatch@techcorp.com | TechCorp | Dispatch operations |
| customer | customer@example.com | N/A | Customer portal |
| guest | guest@example.com | N/A | Limited read-only |

Default password for all: `testpass123`

## CI Integration
Tests run automatically on every PR and block merges if failing.

## Test Coverage Goals
- [x] RBAC module visibility
- [x] Tenant isolation
- [ ] Precheck orchestration end-to-end
- [ ] Photo validation enforcement (4-photo minimum, roles)
- [ ] Service order generation with templates
- [ ] SaPOS offer workflow (warranty check → offer → invoice)
- [ ] Penalty application on settlement
- [ ] MFA override flow (request → verify → approve)
- [ ] Fraud investigation feedback loop

## Debugging Failed Tests
1. Run with `--debug` flag: `npx playwright test --debug`
2. Check screenshots in `test-results/` folder
3. View trace files: `npx playwright show-trace trace.zip`
4. Check correlation IDs in 403 error responses for API debugging
