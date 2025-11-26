/**
 * E2E tests for critical user workflows
 */
import { test, expect } from '@playwright/test';

test.describe('Work Order Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth');
    
    // Login as admin
    await page.fill('input[type="email"]', 'admin@techcorp.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should create and view work orders', async ({ page }) => {
    // Navigate to work orders
    await page.click('text=Work Orders');
    await page.waitForURL('/work-orders');
    
    // Verify work orders page loads
    await expect(page.locator('h1')).toContainText('Work Orders');
    
    // Check if work orders are displayed
    const workOrdersTable = page.locator('table');
    await expect(workOrdersTable).toBeVisible();
  });

  test('should create a ticket', async ({ page }) => {
    // Navigate to tickets
    await page.click('text=Tickets');
    await page.waitForURL('/tickets');
    
    // Click create ticket button
    await page.click('button:has-text("Create Ticket")');
    
    // Fill ticket form
    await page.fill('input[name="unitSerial"]', 'TEST-001');
    await page.fill('input[name="customer"]', 'Test Customer');
    await page.fill('textarea[name="symptom"]', 'Test symptom description');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('text=Ticket created successfully')).toBeVisible();
  });
});

test.describe('Forecast Generation', () => {
  test('should seed forecast data and display results', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@techcorp.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to forecast center
    await page.click('text=Forecast Center');
    await page.waitForURL('/forecast-center');
    
    // Seed data
    await page.click('button:has-text("Seed India Data")');
    await page.waitForSelector('text=Seeding completed', { timeout: 30000 });
    
    // Verify data appears
    await expect(page.locator('text=Geography')).toBeVisible();
  });
});

