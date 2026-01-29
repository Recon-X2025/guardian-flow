import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('Core Operations', () => {
  // F-OP-001: Work Order Management
  test.describe('F-OP-001: Work Order Management', () => {
    test('loads work orders page', async ({ page }) => {
      await navigateAuthenticated(page, '/work-orders');
      await expectPageLoaded(page, /work order/i);
    });

    test('displays work order list with columns', async ({ page }) => {
      await navigateAuthenticated(page, '/work-orders');
      await expect(page.locator('table, [role="table"], [class*="card"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('has create work order button', async ({ page }) => {
      await navigateAuthenticated(page, '/work-orders');
      const createBtn = page.getByRole('button', { name: /create|new|add/i });
      await expect(createBtn.first()).toBeVisible({ timeout: 10000 });
    });

    test('opens create work order dialog', async ({ page }) => {
      await navigateAuthenticated(page, '/work-orders');
      const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
      await createBtn.click();
      // Dialog or sheet or modal should appear
      await expect(page.locator('[role="dialog"], dialog, [class*="Dialog"], [class*="Sheet"], [data-state="open"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // F-OP-002: Technician Dispatch & Routing
  test.describe('F-OP-002: Dispatch & Routing', () => {
    test('loads dispatch page', async ({ page }) => {
      await navigateAuthenticated(page, '/dispatch');
      await expectPageLoaded(page, /dispatch/i);
    });

    test('loads route optimization page', async ({ page }) => {
      await navigateAuthenticated(page, '/route-optimization');
      await expectPageLoaded(page, /route/i);
    });

    test('loads technicians page', async ({ page }) => {
      await navigateAuthenticated(page, '/technicians');
      await expectPageLoaded(page, /technician/i);
    });
  });

  // F-OP-003: Customer Management
  test.describe('F-OP-003: Customer Management', () => {
    test('loads customers page', async ({ page }) => {
      await navigateAuthenticated(page, '/customers');
      await expectPageLoaded(page, /customer/i);
    });

    test('loads customer portal page', async ({ page }) => {
      await navigateAuthenticated(page, '/customer-portal');
      await expectPageLoaded(page);
    });

    test('loads partner portal page', async ({ page }) => {
      await navigateAuthenticated(page, '/partner-portal');
      await expectPageLoaded(page);
    });
  });

  // F-OP-004: Equipment Registry
  test.describe('F-OP-004: Equipment Registry', () => {
    test('loads equipment page', async ({ page }) => {
      await navigateAuthenticated(page, '/equipment');
      await expectPageLoaded(page, /equipment/i);
    });

    test('loads predictive maintenance page', async ({ page }) => {
      await navigateAuthenticated(page, '/predictive-maintenance');
      await expectPageLoaded(page, /maintenance|predict/i);
    });
  });

  // F-OP-005: Inventory Management
  test.describe('F-OP-005: Inventory Management', () => {
    test('loads inventory page', async ({ page }) => {
      await navigateAuthenticated(page, '/inventory');
      await expectPageLoaded(page, /inventory/i);
    });

    test('loads procurement page', async ({ page }) => {
      await navigateAuthenticated(page, '/procurement');
      await expectPageLoaded(page, /procurement/i);
    });

    test('has add inventory item button', async ({ page }) => {
      await navigateAuthenticated(page, '/inventory');
      const addBtn = page.getByRole('button', { name: /add|new|create/i });
      await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // F-OP-006: Scheduler & Calendar
  test.describe('F-OP-006: Scheduler & Calendar', () => {
    test('loads scheduler page', async ({ page }) => {
      await navigateAuthenticated(page, '/scheduler');
      await expectPageLoaded(page, /schedul/i);
    });

    test('loads schedule optimizer page', async ({ page }) => {
      await navigateAuthenticated(page, '/schedule-optimizer');
      await expectPageLoaded(page, /schedul|optim/i);
    });

    test('loads maintenance calendar page', async ({ page }) => {
      await navigateAuthenticated(page, '/maintenance-calendar');
      await expectPageLoaded(page, /calendar|maintenance/i);
    });
  });

  // Service Orders & Tickets
  test.describe('Service Orders & Tickets', () => {
    test('loads tickets page', async ({ page }) => {
      await navigateAuthenticated(page, '/tickets');
      await expectPageLoaded(page, /ticket/i);
    });

    test('loads service orders page', async ({ page }) => {
      await navigateAuthenticated(page, '/service-orders');
      await expectPageLoaded(page, /service order/i);
    });

    test('loads pending validation page', async ({ page }) => {
      await navigateAuthenticated(page, '/pending-validation');
      await expectPageLoaded(page, /pending|validation/i);
    });
  });
});
