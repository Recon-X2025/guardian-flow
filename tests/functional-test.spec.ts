import { test, expect, Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface TestAccount {
  name: string;
  username: string;
  password: string;
  role: string;
}

interface RouteTest {
  path: string;
  status: 'ok' | 'error';
  details: string;
  screenshot?: string;
}

interface AccountResult {
  name: string;
  login: 'success' | 'fail';
  routes: RouteTest[];
  crudTest: 'success' | 'fail' | 'skipped';
  consoleErrors: string[];
}

interface TestReport {
  timestamp: string;
  baseUrl: string;
  accounts: AccountResult[];
}

const ROUTES_TO_TEST = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/work-orders', name: 'Work Orders' },
  { path: '/tickets', name: 'Tickets' },
  { path: '/inventory', name: 'Inventory' },
  { path: '/invoicing', name: 'Invoicing' },
  { path: '/payments', name: 'Payments' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/observability', name: 'Observability' },
];

// Setup results directory
const resultsDir = join(process.cwd(), 'results');
const screenshotsDir = join(resultsDir, 'screenshots');

if (!existsSync(resultsDir)) {
  mkdirSync(resultsDir, { recursive: true });
}
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('Guardian Flow - Functional Tests', () => {
  let accounts: TestAccount[] = [];
  let report: TestReport;

  test.beforeAll(() => {
    // Load test accounts
    try {
      const accountsData = readFileSync(join(process.cwd(), 'accounts.json'), 'utf-8');
      accounts = JSON.parse(accountsData);
    } catch (error) {
      console.error('❌ Failed to load accounts.json:', error);
      accounts = [];
    }

    report = {
      timestamp: new Date().toISOString(),
      baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
      accounts: [],
    };

    console.log(`\n🚀 Starting functional tests for ${accounts.length} accounts...\n`);
  });

  test.afterAll(() => {
    // Generate report
    const reportPath = join(resultsDir, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    const passed = report.accounts.filter(a => a.login === 'success').length;
    const failed = report.accounts.filter(a => a.login === 'fail').length;
    const partialIssues = report.accounts.reduce((sum, a) => 
      sum + a.routes.filter(r => r.status === 'error').length, 0
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ ${passed} accounts passed | ❌ ${failed} accounts failed | 🧩 ${partialIssues} routes had partial issues`);
    console.log(`\n📄 Full report: ${reportPath}`);
    console.log('='.repeat(60) + '\n');
  });

  for (const account of accounts || []) {
    test(`Test account: ${account.name} (${account.role})`, async ({ page }) => {
      const accountResult: AccountResult = {
        name: account.name,
        login: 'fail',
        routes: [],
        crudTest: 'skipped',
        consoleErrors: [],
      };

      // Collect console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          accountResult.consoleErrors.push(msg.text());
        }
      });

      console.log(`\n🔐 Testing ${account.name} (${account.role})...`);

      // Test login
      try {
        await page.goto('/auth', { waitUntil: 'networkidle' });
        
        // Fill login form
        await page.fill('input[type="email"]', account.username);
        await page.fill('input[type="password"]', account.password);
        await page.click('button[type="submit"]');

        // Wait for navigation away from auth page
        await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 10000 });
        
        accountResult.login = 'success';
        console.log(`  ✅ Login successful`);

        // Test routes
        for (const route of ROUTES_TO_TEST) {
          const routeResult = await testRoute(page, route.path, route.name, account.name);
          accountResult.routes.push(routeResult);
        }

        // Test CRUD flow (only for accounts with access to work orders)
        if (accountResult.routes.find(r => r.path === '/work-orders')?.status === 'ok') {
          accountResult.crudTest = await testCrudFlow(page, account.name);
        }

      } catch (error) {
        accountResult.login = 'fail';
        const screenshotPath = join(screenshotsDir, `${account.name}-login-fail.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  ❌ Login failed: ${error}`);
        console.log(`  📸 Screenshot: ${screenshotPath}`);
      }

      report.accounts.push(accountResult);
    });
  }
});

async function testRoute(
  page: Page, 
  path: string, 
  name: string, 
  accountName: string
): Promise<RouteTest> {
  const result: RouteTest = {
    path,
    status: 'ok',
    details: '',
  };

  try {
    console.log(`  🔍 Testing ${name} (${path})...`);
    
    const response = await page.goto(path, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });

    if (response && response.status() >= 400) {
      throw new Error(`HTTP ${response.status()}`);
    }

    // Wait for main content to load
    await page.waitForSelector('main, [role="main"], .container', { timeout: 5000 });

    // Check for error messages
    const hasError = await page.locator('text=/error|failed|something went wrong/i').count() > 0;
    
    if (hasError) {
      throw new Error('Page contains error message');
    }

    result.status = 'ok';
    result.details = `Loaded successfully`;
    console.log(`    ✅ ${name} loaded successfully`);

  } catch (error) {
    result.status = 'error';
    result.details = error instanceof Error ? error.message : String(error);
    result.screenshot = join('screenshots', `${accountName}-${path.replace(/\//g, '-')}-error.png`);
    
    await page.screenshot({ 
      path: join(resultsDir, result.screenshot), 
      fullPage: true 
    });
    
    console.log(`    ❌ ${name} failed: ${result.details}`);
  }

  return result;
}

async function testCrudFlow(page: Page, accountName: string): Promise<'success' | 'fail'> {
  try {
    console.log(`  🧪 Testing CRUD flow...`);

    // Navigate to tickets page
    await page.goto('/tickets', { waitUntil: 'networkidle' });

    // Look for create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
    
    if (await createButton.count() === 0) {
      console.log(`    ⚠️  No create button found, skipping CRUD test`);
      return 'fail';
    }

    await createButton.click();
    await page.waitForTimeout(1000);

    // Try to fill a form if visible
    const dialogVisible = await page.locator('[role="dialog"], .dialog').count() > 0;
    
    if (dialogVisible) {
      // Fill any visible text inputs
      const inputs = page.locator('input[type="text"], input:not([type])').first();
      if (await inputs.count() > 0) {
        await inputs.fill('Test Entry');
      }

      // Click save/submit button
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        console.log(`    ✅ CRUD flow completed`);
        return 'success';
      }
    }

    console.log(`    ⚠️  CRUD flow partially completed`);
    return 'fail';

  } catch (error) {
    console.log(`    ❌ CRUD flow failed: ${error}`);
    return 'fail';
  }
}
