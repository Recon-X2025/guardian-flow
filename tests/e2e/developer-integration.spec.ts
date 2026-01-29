import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('Developer & Integration', () => {
  // F-DEV-001: REST API Gateway
  test.describe('F-DEV-001: API Gateway', () => {
    test('loads developer console', async ({ page }) => {
      await navigateAuthenticated(page, '/developer-console');
      await expectPageLoaded(page, /developer|console/i);
    });

    test('loads developer portal', async ({ page }) => {
      await navigateAuthenticated(page, '/developer-portal');
      await expectPageLoaded(page, /developer|portal/i);
    });
  });

  // F-DEV-002: Webhooks
  test.describe('F-DEV-002: Webhooks', () => {
    test('loads webhooks page', async ({ page }) => {
      await navigateAuthenticated(page, '/webhooks');
      await expectPageLoaded(page, /webhook/i);
    });
  });

  // F-DEV-003: Developer Console
  test.describe('F-DEV-003: Developer Console', () => {
    test('developer console has API management', async ({ page }) => {
      await navigateAuthenticated(page, '/developer-console');
      await expectPageLoaded(page);
    });
  });

  // F-DEV-004: Marketplace
  test.describe('F-DEV-004: Marketplace', () => {
    test('loads marketplace page', async ({ page }) => {
      await navigateAuthenticated(page, '/marketplace');
      await expectPageLoaded(page, /marketplace/i);
    });

    test('loads marketplace management', async ({ page }) => {
      await navigateAuthenticated(page, '/marketplace-management');
      await expectPageLoaded(page, /marketplace/i);
    });
  });

  // Analytics Platform & Integrations
  test.describe('Analytics Platform', () => {
    test('loads analytics platform', async ({ page }) => {
      await navigateAuthenticated(page, '/analytics-platform');
      await expect(page).not.toHaveURL(/\/auth/);
    });

    test('loads analytics integrations', async ({ page }) => {
      await navigateAuthenticated(page, '/analytics-integrations');
      await expectPageLoaded(page, /integration/i);
    });

    test('loads platform metrics', async ({ page }) => {
      await navigateAuthenticated(page, '/platform-metrics');
      await expectPageLoaded(page, /metric/i);
    });

    test('loads custom reports', async ({ page }) => {
      await navigateAuthenticated(page, '/custom-reports');
      await expectPageLoaded(page, /report/i);
    });

    test('loads AB test manager', async ({ page }) => {
      await navigateAuthenticated(page, '/ab-tests');
      await expectPageLoaded(page, /test|experiment/i);
    });
  });

  // Industry & Workflows
  test.describe('Industry Workflows', () => {
    test('loads industry workflows', async ({ page }) => {
      await navigateAuthenticated(page, '/industry-workflows');
      await expectPageLoaded(page, /workflow|industry/i);
    });
  });
});
