# Guardian Flow - Functional Testing Suite

## Overview
Automated functional testing assistant that validates login and key workflows across all test accounts.

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure Test Accounts
Edit `accounts.json` in the project root with your test credentials:
```json
[
  {
    "name": "admin",
    "username": "admin@test.local",
    "password": "Admin@123",
    "role": "Admin"
  }
]
```

### 3. Run Tests

**Local Development:**
```bash
# Run functional tests
npm run test:functional

# Run with UI (debugging)
npx playwright test tests/functional-test.spec.ts --ui

# Run headful (see browser)
npx playwright test tests/functional-test.spec.ts --headed
```

**CI/CD:**
```bash
PLAYWRIGHT_TEST_BASE_URL=https://your-app.com npx playwright test tests/functional-test.spec.ts
```

## What Gets Tested

### Per Account:
1. ✅ **Login Validation** - Can the account successfully authenticate?
2. 🔍 **Route Navigation** - Do key pages load without errors?
   - Dashboard
   - Work Orders
   - Tickets
   - Inventory
   - Invoicing
   - Payments
   - Analytics
   - Observability

3. 🧪 **CRUD Operations** - Can the user create new records?
4. 🐛 **Console Errors** - Are there JavaScript errors?

## Output

### Report Location
- **JSON Report:** `results/report.json`
- **Screenshots:** `results/screenshots/`

### Report Schema
```json
{
  "timestamp": "2025-10-06T12:00:00Z",
  "baseUrl": "http://localhost:5173",
  "accounts": [
    {
      "name": "admin",
      "login": "success",
      "routes": [
        {
          "path": "/dashboard",
          "status": "ok",
          "details": "Loaded successfully"
        }
      ],
      "crudTest": "success",
      "consoleErrors": []
    }
  ]
}
```

### Terminal Summary
```
✅ 3 accounts passed | ❌ 1 accounts failed | 🧩 2 routes had partial issues
```

## Debugging Failed Tests

### View Screenshots
```bash
open results/screenshots/
```

### Run Specific Account
```bash
npx playwright test tests/functional-test.spec.ts -g "admin"
```

### View Trace
```bash
npx playwright show-trace trace.zip
```

## Configuration

### Timeouts
Edit `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

### Routes to Test
Edit `tests/functional-test.spec.ts`:
```typescript
const ROUTES_TO_TEST = [
  { path: '/custom-route', name: 'Custom Route' },
];
```

## CI Integration

### GitHub Actions Example
```yaml
- name: Run Functional Tests
  run: |
    npx playwright install chromium
    npm run test:functional
  env:
    PLAYWRIGHT_TEST_BASE_URL: ${{ secrets.APP_URL }}

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: results/
```

## Troubleshooting

### Tests timing out?
- Increase timeout in playwright.config.ts
- Check network connectivity
- Verify app is running

### Login fails but works manually?
- Check if email confirmation is required
- Verify test accounts exist in database
- Check for CAPTCHA or 2FA

### Screenshots not capturing?
- Ensure `results/screenshots/` directory exists
- Check disk space
- Verify write permissions

## Advanced Features

### Retry Failed Tests
```bash
npx playwright test tests/functional-test.spec.ts --retries=2
```

### Parallel Execution
```bash
npx playwright test tests/functional-test.spec.ts --workers=4
```

### Generate HTML Report
```bash
npx playwright test tests/functional-test.spec.ts --reporter=html
npx playwright show-report
```

## Support
For issues, check:
1. `results/report.json` for detailed error messages
2. Screenshots in `results/screenshots/`
3. Console output during test run
