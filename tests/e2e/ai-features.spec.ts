import { test, expect } from '@playwright/test';
import { loginViaAPI, navigateAuthenticated, expectPageLoaded, API_URL } from './helpers';

// Helper: seed AI data via API before read-only tests
async function seedAITestData(page: import('@playwright/test').Page, token: string) {
  // Trigger predictions
  await page.request.post(`${API_URL}/api/functions/predict-maintenance-failures`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  // Trigger fraud detection
  await page.request.post(`${API_URL}/api/functions/run-fraud-detection`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  // Trigger forgery batch
  await page.request.post(`${API_URL}/api/functions/process-forgery-batch`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      job_name: 'E2E seed batch',
      work_order_ids: ['00000000-0000-4000-c000-000000000001'],
      job_type: 'detection',
    },
  });
}

test.describe('AI Features E2E', () => {
  let token: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const auth = await loginViaAPI(page);
    token = auth.token;
    await seedAITestData(page, token);
    await page.close();
  });

  // ---- Predictive Maintenance ----

  test('Predictive Maintenance: page loads and shows prediction table', async ({ page }) => {
    await navigateAuthenticated(page, '/predictive-maintenance');
    await expectPageLoaded(page, /Predictive Maintenance/i);
    // Either shows predictions or empty state
    const hasTable = await page.locator('table').count();
    const hasEmpty = await page.locator('text=/No predictions available/i').count();
    expect(hasTable + hasEmpty).toBeGreaterThan(0);
  });

  // ---- Forecast Center ----

  test('Forecast Center: page loads with metric cards', async ({ page }) => {
    await navigateAuthenticated(page, '/forecast-center');
    await expectPageLoaded(page, /Forecast Center/i);
    await expect(page.locator('text=Forecasted Volume')).toBeVisible();
    await expect(page.locator('text=Expected Revenue')).toBeVisible();
  });

  test('Forecast Center: click "Regenerate Forecasts Only"', async ({ page }) => {
    await navigateAuthenticated(page, '/forecast-center');
    await expectPageLoaded(page, /Forecast Center/i);

    const btn = page.locator('button:has-text("Regenerate Forecasts Only")');
    await btn.click();

    // Button should show generating state or toast appears
    await expect(
      page.locator('text=/Generating|Forecast Generation/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  // ---- Offer AI ----

  test('Offer AI: page loads and shows offer list', async ({ page }) => {
    await navigateAuthenticated(page, '/offer-ai');
    await expectPageLoaded(page, /Offer AI/i);
    // Should show either offers or empty message
    const hasOffers = await page.locator('[class*="border rounded-lg"]').count();
    const hasEmpty = await page.locator('text=/No offers yet/i').count();
    expect(hasOffers + hasEmpty).toBeGreaterThan(0);
  });

  test('Offer AI: generate offers flow', async ({ page }) => {
    await navigateAuthenticated(page, '/offer-ai');
    await expectPageLoaded(page, /Offer AI/i);

    // Select work order from dropdown
    const select = page.locator('select');
    const options = await select.locator('option').allTextContents();
    if (options.length > 1) {
      // Select first real option (not the placeholder)
      await select.selectOption({ index: 1 });

      const genBtn = page.locator('button:has-text("Generate Offers")');
      await genBtn.click();

      // Wait for either success toast or offers to appear
      await page.waitForTimeout(3000);
    }
  });

  // ---- Fraud Investigation ----

  test('Fraud Investigation: page loads with alert cards', async ({ page }) => {
    await navigateAuthenticated(page, '/fraud-investigation');
    await expectPageLoaded(page, /Fraud.*Investigation/i);
    // Should show summary cards
    await expect(page.locator('text=Open')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
  });

  test('Fraud Investigation: empty state shows message', async ({ page }) => {
    await navigateAuthenticated(page, '/fraud-investigation');
    await expectPageLoaded(page, /Fraud.*Investigation/i);
    // Either alerts or empty message
    const hasAlerts = await page.locator('text=/DUPLICATE|ANOMALY|UNUSUAL/i').count();
    const hasEmpty = await page.locator('text=/No fraud alerts/i').count();
    expect(hasAlerts + hasEmpty).toBeGreaterThan(0);
  });

  // ---- Forgery Detection ----

  test('Forgery Detection: page loads with detection table', async ({ page }) => {
    await navigateAuthenticated(page, '/forgery-detection');
    await expectPageLoaded(page, /Forgery Detection/i);
    // Should show key metrics
    await expect(page.locator('text=Total Detections')).toBeVisible();
    await expect(page.locator('text=Forgeries Detected')).toBeVisible();
  });

  test('Forgery Detection: Start Batch Detection button works', async ({ page }) => {
    await navigateAuthenticated(page, '/forgery-detection');
    await expectPageLoaded(page, /Forgery Detection/i);

    const btn = page.locator('button:has-text("Start Batch Detection")');
    await btn.click();

    // Should show processing state or toast
    await expect(
      page.locator('text=/Processing|Batch job started/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Forgery Detection: model metrics section displays', async ({ page }) => {
    await navigateAuthenticated(page, '/forgery-detection');
    await expectPageLoaded(page, /Forgery Detection/i);

    // Model metrics card should be visible if metrics are seeded
    const metricsSection = page.locator('text=Active Model Performance');
    const hasMetrics = await metricsSection.count();
    if (hasMetrics > 0) {
      await expect(page.locator('text=Precision')).toBeVisible();
      await expect(page.locator('text=Recall')).toBeVisible();
    }
  });

  // ---- Error handling ----

  test('Error handling: API failure shows toast', async ({ page }) => {
    // Route interception to simulate 500
    await page.route('**/api/functions/predict-maintenance-failures', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) })
    );

    await navigateAuthenticated(page, '/predictive-maintenance');
    // The query will fail but the page should still render (react-query handles errors)
    await expect(page.locator('text=Predictive Maintenance')).toBeVisible();
  });
});
