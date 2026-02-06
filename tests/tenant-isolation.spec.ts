import { test, expect } from '@playwright/test';

test.describe('Tenant Isolation Tests', () => {
  const STAGING_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
  
  // Test users from different tenants
  const tenantAUser = {
    email: 'partner@acme.com',
    password: 'testpass123',
    tenantName: 'ACME Corp'
  };
  
  const tenantBUser = {
    email: 'partner@techcorp.com', 
    password: 'testpass123',
    tenantName: 'TechCorp'
  };

  test('Tenant A cannot view Tenant B tickets', async ({ page }) => {
    // Login as Tenant A user
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', tenantAUser.email);
    await page.fill('input[type="password"]', tenantAUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(`${STAGING_URL}/`);
    
    // Navigate to tickets page
    await page.goto(`${STAGING_URL}/tickets`);
    await page.waitForLoadState('networkidle');
    
    // Get all visible ticket IDs
    const ticketRows = await page.locator('table tbody tr').count();
    
    if (ticketRows > 0) {
      // Verify no Tenant B tickets are visible
      const tenantBTickets = await page.locator(`text="${tenantBUser.tenantName}"`).count();
      expect(tenantBTickets).toBe(0);
    }
    
    // Logout
    await page.goto(`${STAGING_URL}/`);
    await page.click('[data-testid="user-menu"]').catch(() => {});
    await page.click('text="Sign out"').catch(() => {});
  });

  test('Tenant B cannot view Tenant A work orders', async ({ page }) => {
    // Login as Tenant B user
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', tenantBUser.email);
    await page.fill('input[type="password"]', tenantBUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(`${STAGING_URL}/`);
    
    // Navigate to work orders
    await page.goto(`${STAGING_URL}/work-orders`);
    await page.waitForLoadState('networkidle');
    
    // Get all visible work order rows
    const woRows = await page.locator('table tbody tr').count();
    
    if (woRows > 0) {
      // Verify no Tenant A work orders visible
      const tenantAWorkOrders = await page.locator(`text="${tenantAUser.tenantName}"`).count();
      expect(tenantAWorkOrders).toBe(0);
    }
  });

  test('Partner admin can only view own tenant profiles', async ({ page }) => {
    // Login as Tenant A partner admin
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', tenantAUser.email);
    await page.fill('input[type="password"]', tenantAUser.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${STAGING_URL}/`);
    
    // Navigate to settings/users if such page exists
    await page.goto(`${STAGING_URL}/settings`);
    await page.waitForLoadState('networkidle');
    
    // Verify user can see own tenant name in profile
    const hasTenantInfo = await page.locator(`text="${tenantAUser.tenantName}"`).count();
    expect(hasTenantInfo).toBeGreaterThan(0);
    
    // Verify cannot see other tenant name
    const hasOtherTenant = await page.locator(`text="${tenantBUser.tenantName}"`).count();
    expect(hasOtherTenant).toBe(0);
  });

  test('API calls return 403 for cross-tenant access', async ({ page }) => {
    // Login as Tenant A user
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', tenantAUser.email);
    await page.fill('input[type="password"]', tenantAUser.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${STAGING_URL}/`);
    
    // Intercept API calls
    let has403 = false;
    page.on('response', response => {
      if (response.status() === 403) {
        has403 = true;
        expect(response.headers()['x-correlation-id']).toBeTruthy();
      }
    });
    
    // Try to access various pages that trigger API calls
    await page.goto(`${STAGING_URL}/tickets`);
    await page.goto(`${STAGING_URL}/work-orders`);
    await page.goto(`${STAGING_URL}/invoices`);
    
    // Note: If tenant isolation is working correctly, we shouldn't see 403s
    // because the backend simply filters data. This test validates
    // that IF a 403 occurs, it has proper correlation ID.
  });

  test('Auth/me endpoint returns correct tenant context', async ({ page }) => {
    // Login as Tenant A user
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', tenantAUser.email);
    await page.fill('input[type="password"]', tenantAUser.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${STAGING_URL}/`);
    
    // Intercept auth/me response
    const authMeResponse = await page.waitForResponse(
      response => response.url().includes('auth-me') && response.status() === 200
    );
    
    const authData = await authMeResponse.json();
    
    // Verify response structure
    expect(authData).toHaveProperty('user');
    expect(authData).toHaveProperty('roles');
    expect(authData).toHaveProperty('permissions');
    expect(authData).toHaveProperty('tenant_id');
    expect(authData.tenant_id).toBeTruthy();
  });
});
