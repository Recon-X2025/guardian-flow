import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('Platform Administration', () => {
  // F-ADMIN-001: Multi-Tenant Management
  test.describe('F-ADMIN-001: Multi-Tenant', () => {
    test('loads admin console', async ({ page }) => {
      await navigateAuthenticated(page, '/admin');
      await expectPageLoaded(page, /admin/i);
    });
  });

  // F-ADMIN-002: RBAC
  test.describe('F-ADMIN-002: RBAC', () => {
    test('settings page loads for role management', async ({ page }) => {
      await navigateAuthenticated(page, '/settings');
      await expectPageLoaded(page, /settings/i);
    });

    test('access denied page works', async ({ page }) => {
      await navigateAuthenticated(page, '/access-denied');
      await expectPageLoaded(page, /access|denied/i);
    });
  });

  // F-ADMIN-003: System Health Monitoring
  test.describe('F-ADMIN-003: System Health', () => {
    test('loads system health page', async ({ page }) => {
      await navigateAuthenticated(page, '/system-health');
      await expectPageLoaded(page, /system|health/i);
    });

    test('loads observability page', async ({ page }) => {
      await navigateAuthenticated(page, '/observability');
      await expectPageLoaded(page, /observ/i);
    });
  });

  // Documents, Templates, Contracts
  test.describe('Document Management', () => {
    test('loads documents page', async ({ page }) => {
      await navigateAuthenticated(page, '/documents');
      await expectPageLoaded(page, /document/i);
    });

    test('loads templates page', async ({ page }) => {
      await navigateAuthenticated(page, '/templates');
      await expectPageLoaded(page, /template/i);
    });

    test('loads contracts page', async ({ page }) => {
      await navigateAuthenticated(page, '/contracts');
      await expectPageLoaded(page, /contract/i);
    });
  });

  // Help & Training
  test.describe('Help & Training', () => {
    test('loads help page', async ({ page }) => {
      await navigateAuthenticated(page, '/help');
      await expectPageLoaded(page, /help|training/i);
    });

    test('loads training platform', async ({ page }) => {
      await navigateAuthenticated(page, '/training');
      await expectPageLoaded(page, /training/i);
    });
  });
});
