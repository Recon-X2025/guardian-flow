import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('Financial Management', () => {
  // F-FIN-001: Automated Penalty Calculation
  test.describe('F-FIN-001: Penalty Calculation', () => {
    test('loads penalties page', async ({ page }) => {
      await navigateAuthenticated(page, '/penalties');
      await expectPageLoaded(page, /penalt/i);
    });

    test('has add penalty rule button', async ({ page }) => {
      await navigateAuthenticated(page, '/penalties');
      const btn = page.getByRole('button', { name: /add|create|new|rule/i });
      await expect(btn.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // F-FIN-002: Invoicing & Billing
  test.describe('F-FIN-002: Invoicing & Billing', () => {
    test('loads invoicing page', async ({ page }) => {
      await navigateAuthenticated(page, '/invoicing');
      await expectPageLoaded(page, /invoice/i);
    });

    test('has create invoice button', async ({ page }) => {
      await navigateAuthenticated(page, '/invoicing');
      const btn = page.getByRole('button', { name: /create|new|add|generate/i });
      await expect(btn.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // F-FIN-003: Revenue Forecasting
  test.describe('F-FIN-003: Revenue Forecasting', () => {
    test('loads forecast center page', async ({ page }) => {
      await navigateAuthenticated(page, '/forecast');
      await expectPageLoaded(page, /forecast/i);
    });
  });

  // F-FIN-004: Dispute Management
  test.describe('F-FIN-004: Dispute Management', () => {
    test('loads disputes page', async ({ page }) => {
      await navigateAuthenticated(page, '/disputes');
      await expectPageLoaded(page, /dispute/i);
    });
  });

  // F-FIN-005: Payment Processing
  test.describe('F-FIN-005: Payment Processing', () => {
    test('loads payments page', async ({ page }) => {
      await navigateAuthenticated(page, '/payments');
      await expectPageLoaded(page, /payment/i);
    });
  });

  // Quotes & Finance Dashboard
  test.describe('Quotes & Finance Dashboard', () => {
    test('loads quotes page', async ({ page }) => {
      await navigateAuthenticated(page, '/quotes');
      await expectPageLoaded(page, /quote/i);
    });

    test('loads finance dashboard', async ({ page }) => {
      await navigateAuthenticated(page, '/finance');
      await expectPageLoaded(page, /finance/i);
    });

    test('loads warranty page', async ({ page }) => {
      await navigateAuthenticated(page, '/warranty');
      await expectPageLoaded(page, /warranty/i);
    });

    test('loads pricing calculator', async ({ page }) => {
      await navigateAuthenticated(page, '/pricing-calculator');
      await expectPageLoaded(page, /pricing|calculator/i);
    });
  });
});
