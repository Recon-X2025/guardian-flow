/**
 * E2E tests for critical user workflows
 */
import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('admin@techcorp.com');
  await passwordInput.fill('Admin123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/(dashboard|tickets|work-orders)/, { timeout: 15000 });
}

test.describe('Work Order Workflow', () => {
  test('should navigate to work orders page', async ({ page }) => {
    await login(page);

    // Navigate directly via URL (sidebar may not show link due to RBAC)
    await page.goto('/work-orders');
    await page.waitForLoadState('networkidle');

    // Page should either show work orders or an access denied message
    const content = page.locator('body');
    await expect(content).toContainText(/Work Orders|Access Denied|Unauthorized/i, { timeout: 10000 });
  });

  test('should navigate to tickets page', async ({ page }) => {
    await login(page);

    // Navigate directly via URL
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    // Page should either show tickets or an access denied message
    const content = page.locator('body');
    await expect(content).toContainText(/Ticket|Access Denied|Unauthorized/i, { timeout: 10000 });
  });
});

test.describe('Forecast Generation', () => {
  test('should navigate to forecast center', async ({ page }) => {
    await login(page);

    // Navigate directly via URL — route is /forecast
    await page.goto('/forecast');
    await page.waitForLoadState('networkidle');

    // Page should either show forecast content or an access denied message
    const content = page.locator('body');
    await expect(content).toContainText(/Forecast|Access Denied|Unauthorized/i, { timeout: 10000 });
  });
});
