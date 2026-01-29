import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '..', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('admin@guardian.dev');
  await passwordInput.fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.context().storageState({ path: authFile });
});
