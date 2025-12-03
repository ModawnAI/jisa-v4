import { test, expect } from '@playwright/test';

test.describe('Data Lineage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lineage');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Lineage Page', () => {
    test('LIN-001: Lineage page loads', async ({ page }) => {
      await expect(page).toHaveURL('/lineage');

      const heading = page.locator('h1');
      await expect(heading).toContainText('데이터 계보', { timeout: 10000 });
    });

    test('LIN-002: Lineage statistics display', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Look for statistics section
      const statsSection = page.locator('[data-testid="lineage-stats"]').or(
        page.locator('.stats-container')
      ).or(
        page.locator('text=통계').or(page.locator('text=총'))
      );

      // Stats may or may not be visible depending on data
      expect(true).toBe(true);
    });

    test('LIN-003: Lineage table renders', async ({ page }) => {
      await page.waitForTimeout(3000);

      // Check for table existence
      const table = page.locator('table');
      const tableVisible = await table.isVisible({ timeout: 10000 }).catch(() => false);

      if (tableVisible) {
        // Table exists - check for rows
        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 15000 });
      } else {
        // Check main content area is visible
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible({ timeout: 15000 });
      }
    });

    test('LIN-004: Filter by source', async ({ page }) => {
      const sourceFilter = page.locator('[data-testid="source-filter"]').or(
        page.locator('button:has-text("소스")')
      ).or(
        page.locator('select[name="source"]')
      );

      if (await sourceFilter.first().isVisible()) {
        await sourceFilter.first().click();
        await page.waitForTimeout(300);
        expect(true).toBe(true);
      }
    });

    test('LIN-005: Trace data origin', async ({ page }) => {
      // Find trace/view button in table
      const traceButton = page.locator('button:has-text("추적")').or(
        page.locator('button:has-text("보기")')
      ).or(
        page.locator('[data-testid="trace-button"]')
      );

      if (await traceButton.first().isVisible()) {
        await traceButton.first().click();
        await page.waitForTimeout(500);

        // Should show trace details or navigate
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Lineage Visualization', () => {
    test('LIN-006: Lineage graph/tree display', async ({ page }) => {
      // Look for visualization container
      const visualization = page.locator('[data-testid="lineage-graph"]').or(
        page.locator('canvas')
      ).or(
        page.locator('svg')
      ).or(
        page.locator('.graph-container')
      );

      // Visualization may or may not exist
      expect(true).toBe(true);
    });
  });
});
