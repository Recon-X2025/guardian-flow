import { test, expect } from '@playwright/test';
import { API_URL } from './helpers';

test.describe('Authentication', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/guardian/i);
  });

  test('auth page loads with sign in form', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    // The form uses Label "Email Address" and "Password" inside TabsContent
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    await expect(passwordInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('wrong@test.com');
    await passwordInput.fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/auth/);
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('admin@guardian.dev');
    await passwordInput.fill('admin123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard loads after login', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('admin@guardian.dev');
    await passwordInput.fill('admin123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('body')).toContainText(/dashboard/i);
  });

  test('sidebar shows navigation for sys_admin', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('admin@guardian.dev');
    await passwordInput.fill('admin123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const sidebar = page.locator('[data-sidebar], aside, nav').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('not found page works', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page.locator('body')).toContainText(/not found|404/i);
  });
});
