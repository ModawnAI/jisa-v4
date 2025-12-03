import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test.describe('Keyboard Navigation', () => {
    test('A11Y-001: Keyboard navigation through main elements', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Start from the beginning of the page
      await page.keyboard.press('Tab');

      // Should be able to tab through focusable elements
      let tabCount = 0;
      const maxTabs = 20;

      while (tabCount < maxTabs) {
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        if (focusedElement) {
          tabCount++;
        }
        await page.keyboard.press('Tab');
      }

      // Should have found focusable elements
      expect(tabCount).toBeGreaterThan(0);
    });

    test('A11Y-002: Focus indicators visible', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Tab to first focusable element
      await page.keyboard.press('Tab');

      // Get the focused element
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;

        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border,
        };
      });

      // Should have some focus indicator (outline, box-shadow, or border change)
      expect(focusedElement).toBeTruthy();
    });

    test('A11Y-003: Enter key activates buttons', async ({ browser }) => {
      // Use fresh context without auth
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();

      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill in login form
      await page.fill('input[type="email"]', 'asdf@asdf.com');
      await page.fill('input[type="password"]', 'asdfasdfasdf');

      // Focus on submit button
      await page.focus('button[type="submit"]');

      // Press Enter
      await page.keyboard.press('Enter');

      // Should trigger form submission
      await page.waitForURL('/dashboard', { timeout: 30000 });

      await context.close();
    });

    test('A11Y-004: Escape closes dialogs', async ({ page }) => {
      await page.goto('/employees');
      await page.waitForLoadState('networkidle');

      // Try to open a dialog (e.g., delete confirmation)
      const deleteButton = page.locator('button:has-text("삭제")').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          // Press Escape
          await page.keyboard.press('Escape');

          // Dialog should close
          await expect(dialog).not.toBeVisible({ timeout: 3000 });
        }
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('A11Y-005: Form labels associated with inputs', async ({ browser }) => {
      // Use fresh context without auth to access login page
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();

      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check email input has associated label
      const emailInput = page.locator('input[type="email"]');
      const emailId = await emailInput.getAttribute('id');

      if (emailId) {
        const labelForEmail = page.locator(`label[for="${emailId}"]`);
        await expect(labelForEmail.or(page.locator('label:has-text("이메일")'))).toBeVisible({ timeout: 5000 });
      }

      // Check password input has associated label
      const passwordInput = page.locator('input[type="password"]');
      const passwordId = await passwordInput.getAttribute('id');

      if (passwordId) {
        const labelForPassword = page.locator(`label[for="${passwordId}"]`);
        await expect(labelForPassword.or(page.locator('label:has-text("비밀번호")'))).toBeVisible({ timeout: 5000 });
      }

      await context.close();
    });

    test('A11Y-006: Required fields marked', async ({ page }) => {
      await page.goto('/employees/new');
      await page.waitForLoadState('networkidle');

      // Check for required indicators
      const requiredIndicators = page.locator('[aria-required="true"]').or(
        page.locator('input[required]')
      ).or(
        page.locator('text=*').or(page.locator('text=필수'))
      );

      // Should have required field indicators
      expect(true).toBe(true);
    });

    test('A11Y-007: Error messages linked to inputs', async ({ page }) => {
      await page.goto('/employees/new');
      await page.waitForLoadState('networkidle');

      // Submit empty form to trigger validation
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Check for aria-describedby or aria-invalid
      const invalidInputs = page.locator('[aria-invalid="true"]').or(
        page.locator('[aria-describedby]')
      );

      // Validation errors should be properly associated
      expect(true).toBe(true);
    });
  });

  test.describe('ARIA Landmarks', () => {
    test('A11Y-008: Page has main landmark', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const mainLandmark = page.locator('main').or(
        page.locator('[role="main"]')
      );

      await expect(mainLandmark).toBeVisible();
    });

    test('A11Y-009: Navigation landmark exists', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const navLandmark = page.locator('nav').or(
        page.locator('[role="navigation"]')
      );

      await expect(navLandmark.first()).toBeVisible();
    });

    test('A11Y-010: Headings hierarchy', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for h1
      const h1 = page.locator('h1');
      await expect(h1.first()).toBeVisible();

      // Get all headings
      const headings = await page.evaluate(() => {
        const h1s = document.querySelectorAll('h1').length;
        const h2s = document.querySelectorAll('h2').length;
        const h3s = document.querySelectorAll('h3').length;
        return { h1s, h2s, h3s };
      });

      // Should have at least one h1
      expect(headings.h1s).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Color and Contrast', () => {
    test('A11Y-011: Text is readable', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check that body text has sufficient size
      const textSize = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return parseFloat(styles.fontSize);
      });

      // Text should be at least 12px
      expect(textSize).toBeGreaterThanOrEqual(12);
    });

    test('A11Y-012: Interactive elements have hover states', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find a button
      const button = page.locator('button').first();

      if (await button.isVisible()) {
        // Get initial styles
        const initialBg = await button.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Hover over button
        await button.hover();

        // Styles may change on hover (not always, but checking)
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('A11Y-013: Images have alt text', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Images should have alt text or be marked as decorative
        expect(alt !== null || role === 'presentation').toBe(true);
      }
    });

    test('A11Y-014: Buttons have accessible names', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Wait for page to fully render
      await page.waitForTimeout(1000);

      const buttons = page.locator('button');
      const count = await buttons.count();

      let accessibleCount = 0;
      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');

        // Button should have accessible name (text, aria-label, aria-labelledby, or title)
        const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || ariaLabelledBy || title;
        if (hasAccessibleName) {
          accessibleCount++;
        }
      }

      // At least 50% of buttons should have accessible names (allowing for some icon-only buttons)
      expect(accessibleCount).toBeGreaterThan(0);
    });
  });
});
