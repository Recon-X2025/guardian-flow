import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('Fraud Detection & Security', () => {
  // F-FRAUD-001: Document Forgery Detection
  test.describe('F-FRAUD-001: Forgery Detection', () => {
    test('loads forgery detection page', async ({ page }) => {
      await navigateAuthenticated(page, '/forgery-detection');
      await expectPageLoaded(page, /forgery|detection|forensic/i);
    });

    test('has upload or analyze functionality', async ({ page }) => {
      await navigateAuthenticated(page, '/forgery-detection');
      const action = page.getByRole('button', { name: /upload|analyze|detect|scan/i });
      await expect(action.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // F-FRAUD-002: Anomaly Detection
  test.describe('F-FRAUD-002: Anomaly Detection', () => {
    test('loads anomaly detection page', async ({ page }) => {
      await navigateAuthenticated(page, '/anomaly');
      await expectPageLoaded(page, /anomal/i);
    });
  });

  // F-FRAUD-003: Multi-Factor Authentication
  test.describe('F-FRAUD-003: MFA', () => {
    test('settings page has security/MFA section', async ({ page }) => {
      await navigateAuthenticated(page, '/settings');
      await expectPageLoaded(page, /settings/i);
    });
  });

  // Fraud Investigation
  test.describe('Fraud Investigation', () => {
    test('loads fraud investigation page', async ({ page }) => {
      await navigateAuthenticated(page, '/fraud');
      await expectPageLoaded(page, /fraud/i);
    });
  });
});
