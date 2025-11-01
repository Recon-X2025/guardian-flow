import { test, expect } from '@playwright/test';

// Basic smoke tests for Guardian Flow auth UIs (hero + essentials)
const routes = [
  { path: '/auth', heading: 'Guardian Flow', tagline: 'Enterprise Operations & Intelligence Platform' },
  { path: '/auth/fsm', heading: 'Field Service Management' },
  { path: '/auth/asset', heading: 'Asset Lifecycle Management' },
  { path: '/auth/analytics', heading: 'Enterprise Analytics Platform' },
  { path: '/auth/fraud', heading: 'Fraud Detection & Compliance' },
  { path: '/auth/marketplace', heading: 'Extension Marketplace' },
  { path: '/auth/customer', heading: 'Customer Portal' },
  { path: '/auth/training', heading: 'Video Training & Knowledge Base' },
];

for (const r of routes) {
  test(`Auth UI renders hero and sign-in essentials: ${r.path}`, async ({ page }) => {
    await page.goto(r.path);

    // Hero heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(r.heading);

    // Card title "Sign In"
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Sign In');

    // Description contains module name
    await expect(page.getByText('Access your')).toBeVisible();

    // Core form inputs
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Support links (best-effort)
    await expect(page.getByText(/Help|Documentation/i)).toBeVisible();
  });
}

// Platform suite tagline verification
test('Unified platform shows suite tagline', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByText('Enterprise Operations & Intelligence Platform')).toBeVisible();
});
