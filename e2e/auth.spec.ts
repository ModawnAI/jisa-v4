import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.describe('Login Flow', () => {
    // Use fresh context for auth tests (no stored session)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('AUTH-001: Login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Verify login form is visible
      await expect(page.locator('form')).toBeVisible();
      await expect(page.getByLabel('이메일')).toBeVisible();
      await expect(page.getByLabel('비밀번호')).toBeVisible();

      // Fill credentials
      await page.fill('input[type="email"]', 'asdf@asdf.com');
      await page.fill('input[type="password"]', 'asdfasdfasdf');

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 30000 });
      await expect(page.locator('h1')).toContainText('대시보드');
    });

    test('AUTH-002: Login with invalid email', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]', 'invalid@email.com');
      await page.fill('input[type="password"]', 'asdfasdfasdf');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('AUTH-003: Login with invalid password', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]', 'asdf@asdf.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('AUTH-004: Login with empty fields shows validation', async ({ page }) => {
      await page.goto('/login');

      // Clear prefilled values
      await page.fill('input[type="email"]', '');
      await page.fill('input[type="password"]', '');
      await page.click('button[type="submit"]');

      // Should show validation errors - look for error messages
      const errorMessage = page.locator('text=유효한 이메일').or(
        page.locator('text=비밀번호는 6자')
      ).or(
        page.locator('.text-destructive')
      );
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });

    test('AUTH-005: Redirect to dashboard after login', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]', 'asdf@asdf.com');
      await page.fill('input[type="password"]', 'asdfasdfasdf');
      await page.click('button[type="submit"]');

      // Verify redirect
      await page.waitForURL('/dashboard');
      expect(page.url()).toContain('/dashboard');
    });

    test('AUTH-006: Redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/employees');

      // Should redirect to login
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Authenticated Session', () => {
    test('AUTH-007: Logout functionality', async ({ page }) => {
      await page.goto('/dashboard');

      // Find and click logout button (usually in header or sidebar)
      const logoutButton = page.locator('button:has-text("로그아웃")').or(
        page.locator('[data-testid="logout-button"]')
      );

      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Should redirect to login
        await page.waitForURL(/\/login/);
      } else {
        // Try user menu
        const userMenu = page.locator('[data-testid="user-menu"]').or(
          page.locator('button:has([data-testid="avatar"])')
        );
        if (await userMenu.isVisible()) {
          await userMenu.click();
          await page.click('text=로그아웃');
          await page.waitForURL(/\/login/);
        }
      }
    });

    test('AUTH-008: Session persistence', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');
      await expect(page.locator('h1')).toContainText('대시보드');

      // Refresh page
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await expect(page.locator('h1')).toContainText('대시보드');
      expect(page.url()).toContain('/dashboard');
    });
  });
});
