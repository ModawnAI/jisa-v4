import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

/**
 * Authentication Setup
 * Runs before all tests to create authenticated session state
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for login form to be visible
  await expect(page.locator('form')).toBeVisible();

  // Fill in credentials (prefilled but let's be explicit)
  await page.fill('input[type="email"]', 'asdf@asdf.com');
  await page.fill('input[type="password"]', 'asdfasdfasdf');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for successful redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 30000 });

  // Verify dashboard loaded
  await expect(page.locator('h1')).toContainText('대시보드');

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
