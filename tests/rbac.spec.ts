import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';

// Test account credentials (from seed test data)
const TEST_ACCOUNTS = {
  sys_admin: { email: 'admin@techcorp.com', password: 'TestAdmin123!' },
  ops_manager: { email: 'ops@techcorp.com', password: 'TestOps123!' },
  finance_manager: { email: 'finance@techcorp.com', password: 'TestFinance123!' },
  fraud_investigator: { email: 'fraud@techcorp.com', password: 'TestFraud123!' },
  technician: { email: 'tech1@servicepro.com', password: 'TestTech123!' },
  dispatcher: { email: 'dispatch@techcorp.com', password: 'TestDispatch123!' },
  customer: { email: 'customer@example.com', password: 'TestCustomer123!' },
  guest: { email: 'guest@example.com', password: 'TestGuest123!' },
};

async function login(page: any, role: keyof typeof TEST_ACCOUNTS) {
  const account = TEST_ACCOUNTS[role];
  await page.goto(`${BASE_URL}/auth`);
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
}

test.describe('RBAC - Role-Based Access Control', () => {
  
  test('sys_admin can see all modules', async ({ page }) => {
    await login(page, 'sys_admin');
    
    // Admin should see all modules
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Work Orders')).toBeVisible();
    await expect(page.locator('text=Finance')).toBeVisible();
    await expect(page.locator('text=Fraud Investigation')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('ops_manager can see operations modules only', async ({ page }) => {
    await login(page, 'ops_manager');
    
    // Should see ops modules
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Work Orders')).toBeVisible();
    await expect(page.locator('text=Dispatch')).toBeVisible();
    
    // Should NOT see finance/fraud modules
    await expect(page.locator('text=Finance')).not.toBeVisible();
    await expect(page.locator('text=Fraud Investigation')).not.toBeVisible();
  });

  test('finance_manager can see finance modules only', async ({ page }) => {
    await login(page, 'finance_manager');
    
    // Should see finance modules
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Finance')).toBeVisible();
    await expect(page.locator('text=Penalties')).toBeVisible();
    
    // Should NOT see ops modules
    await expect(page.locator('text=Dispatch')).not.toBeVisible();
    await expect(page.locator('text=Fraud Investigation')).not.toBeVisible();
  });

  test('technician can only see technician PWA modules', async ({ page }) => {
    await login(page, 'technician');
    
    // Should see technician modules
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Tickets')).toBeVisible();
    
    // Should NOT see admin/finance modules
    await expect(page.locator('text=Finance')).not.toBeVisible();
    await expect(page.locator('text=Settings')).not.toBeVisible();
    await expect(page.locator('text=Fraud Investigation')).not.toBeVisible();
  });

  test('guest cannot see any restricted modules', async ({ page }) => {
    await login(page, 'guest');
    
    // Should only see dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Should NOT see any restricted modules
    await expect(page.locator('text=Work Orders')).not.toBeVisible();
    await expect(page.locator('text=Finance')).not.toBeVisible();
    await expect(page.locator('text=Settings')).not.toBeVisible();
  });

  test('unauthorized user cannot access protected routes directly', async ({ page }) => {
    await login(page, 'guest');
    
    // Try to access finance page directly
    await page.goto(`${BASE_URL}/finance`);
    
    // Should see Access Denied
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('ops_manager can request override', async ({ page, request }) => {
    await login(page, 'ops_manager');
    
    const response = await request.post(`${BASE_URL}/api/override-request`, {
      data: {
        actionType: 'release_wo',
        entityType: 'work_order',
        entityId: 'test-wo-123',
        reason: 'Customer escalation',
        expiresInMinutes: 60
      },
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth.token'))}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('technician cannot approve overrides', async ({ page, request }) => {
    await login(page, 'technician');

    const response = await request.post(`${BASE_URL}/api/override-approve`, {
      data: {
        requestId: 'test-request-123',
        mfaTokenId: 'test-mfa-123',
        mfaToken: '123456'
      },
      headers: {
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth.token'))}`
      }
    });
    
    // Should return 403 Forbidden
    expect(response.status()).toBe(403);
  });
});

test.describe('RBAC - API Authorization', () => {
  
  test('ops_manager can check inventory', async ({ request, page }) => {
    await login(page, 'ops_manager');
    const token = await page.evaluate(() => localStorage.getItem('auth.token'));
    
    const response = await request.post(`${BASE_URL}/functions/v1/check-inventory`, {
      data: {
        parts: [{ sku: 'PART-001', quantity: 1 }],
        hubId: 'hub-123'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('customer cannot check inventory', async ({ request, page }) => {
    await login(page, 'customer');
    const token = await page.evaluate(() => localStorage.getItem('auth.token'));
    
    const response = await request.post(`${BASE_URL}/functions/v1/check-inventory`, {
      data: {
        parts: [{ sku: 'PART-001', quantity: 1 }],
        hubId: 'hub-123'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 403 Forbidden
    expect(response.status()).toBe(403);
  });

  test('fraud_investigator can access fraud alerts', async ({ page }) => {
    await login(page, 'fraud_investigator');
    
    await page.goto(`${BASE_URL}/fraud-investigation`);
    await expect(page.locator('text=Fraud Alerts')).toBeVisible();
  });

  test('technician cannot access fraud alerts', async ({ page }) => {
    await login(page, 'technician');
    
    await page.goto(`${BASE_URL}/fraud-investigation`);
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });
});
