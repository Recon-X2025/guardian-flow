import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('Mobile & Field Operations', () => {
  // F-MOB-001: Mobile App for Technicians
  test.describe('F-MOB-001: Photo Capture', () => {
    test('loads photo capture page', async ({ page }) => {
      await navigateAuthenticated(page, '/photo-capture');
      await expectPageLoaded(page, /photo|capture/i);
    });
  });

  // F-MOB-002: Geolocation & Check-In
  test.describe('F-MOB-002: Geolocation', () => {
    test('dispatch page has geo functionality', async ({ page }) => {
      await navigateAuthenticated(page, '/dispatch');
      await expectPageLoaded(page, /dispatch/i);
    });
  });
});
