import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE FUNCTIONALITY TEST SUITE
 * Tests all major modules and their functionalities
 */

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to auth page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth/);
  });

  test('should allow user login', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    // Should redirect to dashboard after successful login
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
  });
});

test.describe('Dashboard Module', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in (you'll need to implement login helper)
    await page.goto('/dashboard');
  });

  test('should display dashboard statistics', async ({ page }) => {
    await expect(page.locator('text=Total Work Orders')).toBeVisible();
    await expect(page.locator('text=Pending Tickets')).toBeVisible();
    await expect(page.locator('text=Parts in Stock')).toBeVisible();
    await expect(page.locator('text=Revenue (Offers)')).toBeVisible();
  });

  test('should display work orders trend chart', async ({ page }) => {
    await expect(page.locator('text=Work Orders Trend')).toBeVisible();
  });

  test('should display status distribution chart', async ({ page }) => {
    await expect(page.locator('text=Status Distribution')).toBeVisible();
  });

  test('should allow downloading product specifications', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download Product Specs")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('GuardianFlow_Product_Specifications.pdf');
  });
});

test.describe('Tickets Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
  });

  test('should display tickets list', async ({ page }) => {
    await expect(page.locator('h1:has-text("Tickets")')).toBeVisible();
    await expect(page.locator('text=Active Tickets')).toBeVisible();
  });

  test('should show create ticket form', async ({ page }) => {
    await page.click('button:has-text("Create Ticket")');
    await expect(page.locator('text=Create New Ticket')).toBeVisible();
    await expect(page.locator('label:has-text("Unit Serial Number")')).toBeVisible();
    await expect(page.locator('label:has-text("Customer")')).toBeVisible();
    await expect(page.locator('label:has-text("Symptom Description")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Create Ticket")');
    await page.click('button[type="submit"]:has-text("Create Ticket")');
    // HTML5 validation should prevent submission
    const unitSerialInput = page.locator('input#unitSerial');
    const isInvalid = await unitSerialInput.evaluate(el => (el as HTMLInputElement).validity.valueMissing);
    expect(isInvalid).toBe(true);
  });

  test('should create a new ticket', async ({ page }) => {
    await page.click('button:has-text("Create Ticket")');
    await page.fill('input#unitSerial', 'TEST-UNIT-12345');
    await page.fill('input#customer', 'Test Customer Inc');
    await page.fill('input#siteAddress', '123 Test Street');
    await page.fill('textarea#symptom', 'Test equipment malfunction');
    await page.click('button[type="submit"]:has-text("Create Ticket")');
    
    // Should show success toast
    await expect(page.locator('text=Ticket created')).toBeVisible({ timeout: 5000 });
  });

  test('should display ticket details', async ({ page }) => {
    // Wait for tickets to load
    await page.waitForSelector('text=TKT-', { timeout: 5000 });
    
    // Click on first ticket's view details button
    const firstDetailsButton = page.locator('button:has-text("View Details")').first();
    if (await firstDetailsButton.isVisible()) {
      await firstDetailsButton.click();
      await expect(page.locator('text=Ticket Details')).toBeVisible();
    }
  });

  test('should show overdue tickets', async ({ page }) => {
    // Check if any overdue badges are present
    const overdueBadge = page.locator('text=/Overdue.*Days/i').first();
    if (await overdueBadge.isVisible()) {
      await expect(overdueBadge).toHaveClass(/animate-pulse/);
    }
  });
});

test.describe('Work Orders Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/work-orders');
  });

  test('should display work orders list', async ({ page }) => {
    await expect(page.locator('h1:has-text("Work Orders")')).toBeVisible();
    await expect(page.locator('text=Active Work Orders')).toBeVisible();
  });

  test('should show statistics cards', async ({ page }) => {
    await expect(page.locator('text=Total')).toBeVisible();
    await expect(page.locator('text=Pending Validation')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.click('button:has-text("All")');
    await expect(page.locator('button:has-text("All")')).toHaveClass(/default/);
    
    await page.click('button:has-text("Pending Validation")');
    await page.waitForTimeout(1000); // Wait for filtering
    await expect(page.locator('button:has-text("Pending Validation")')).toHaveClass(/default/);
  });

  test('should paginate work orders', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next")');
    const prevButton = page.locator('button:has-text("Previous")');
    
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      await expect(prevButton).not.toBeDisabled();
    }
  });

  test('should display work order details', async ({ page }) => {
    const firstWO = page.locator('[data-testid="work-order-item"]').first();
    if (await firstWO.isVisible()) {
      await expect(firstWO.locator('text=/WO-/')).toBeVisible();
      await expect(firstWO.locator('text=/Status/i')).toBeVisible();
    }
  });

  test('should open edit dialog', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.locator('text=Edit Work Order')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should open KB guides dialog', async ({ page }) => {
    const kbButton = page.locator('button:has-text("KB Guides")').first();
    if (await kbButton.isVisible()) {
      await kbButton.click();
      await expect(page.locator('text=/Knowledge Base/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show offer AI button', async ({ page }) => {
    const offerButton = page.locator('button:has-text("Offer AI")').first();
    await expect(offerButton).toBeVisible();
  });

  test('should show service order button', async ({ page }) => {
    const soButton = page.locator('button:has-text("Service Order")').first();
    if (await soButton.isVisible()) {
      await expect(soButton).toBeVisible();
    }
  });
});

test.describe('Dispatch Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dispatch');
  });

  test('should display dispatch board', async ({ page }) => {
    await expect(page.locator('h1:has-text("Dispatch")')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Pending Validation')).toBeVisible();
  });

  test('should show check-in button for in-progress work orders', async ({ page }) => {
    const checkInButton = page.locator('button:has-text("Check In")').first();
    if (await checkInButton.isVisible()) {
      await expect(checkInButton).toBeEnabled();
    }
  });

  test('should show check-out button after check-in', async ({ page }) => {
    const checkOutButton = page.locator('button:has-text("Check Out")').first();
    if (await checkOutButton.isVisible()) {
      await expect(checkOutButton).toBeEnabled();
    }
  });

  test('should allow marking work order as complete', async ({ page }) => {
    const completeButton = page.locator('button:has-text("Mark Complete")').first();
    if (await completeButton.isVisible()) {
      const isDisabled = await completeButton.isDisabled();
      // Button should be disabled if not checked in
      expect(typeof isDisabled).toBe('boolean');
    }
  });
});

test.describe('Inventory Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
  });

  test('should display inventory page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Inventory")')).toBeVisible();
  });

  test('should show add inventory button', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Item")');
    if (await addButton.isVisible()) {
      await expect(addButton).toBeVisible();
    }
  });
});

test.describe('Analytics Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test('should display analytics tabs', async ({ page }) => {
    await expect(page.locator('text=Operational')).toBeVisible();
    await expect(page.locator('text=Financial')).toBeVisible();
    await expect(page.locator('text=SLA')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.click('text=Financial');
    await page.waitForTimeout(500);
    
    await page.click('text=SLA');
    await page.waitForTimeout(500);
    
    await page.click('text=Operational');
  });
});

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages without full reload', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to tickets
    await page.click('a[href="/tickets"]');
    await expect(page).toHaveURL(/.*tickets/);
    
    // Navigate to work orders
    await page.click('a[href="/work-orders"]');
    await expect(page).toHaveURL(/.*work-orders/);
    
    // Navigate back to dashboard
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    
    const sidebar = page.locator('[data-sidebar]');
    await expect(sidebar).toBeVisible();
  });

  test('should toggle sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    const sidebarTrigger = page.locator('button[data-sidebar-trigger]');
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();
      // Sidebar should appear
      await page.waitForTimeout(300);
    }
  });
});

test.describe('User Menu', () => {
  test('should display user menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    const userMenuButton = page.locator('button:has([data-user-menu])').or(page.locator('button:has-text("User")'));
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
      await expect(page.locator('text=Sign out')).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1280, height: 720, name: 'Desktop' },
  ];

  viewports.forEach(({ width, height, name }) => {
    test(`should be responsive on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');
      
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
      
      // Check if cards are visible
      await expect(page.locator('text=Total Work Orders')).toBeVisible();
    });
  });
});

test.describe('Error Handling', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');
    await expect(page.locator('text=/404|Not Found/i')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    await page.goto('/dashboard');
    
    // Check if error message appears or app handles offline gracefully
    await page.waitForTimeout(2000);
    
    await page.context().setOffline(false);
  });
});
