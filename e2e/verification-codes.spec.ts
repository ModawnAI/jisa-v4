import { test, expect } from '@playwright/test';

test.describe('Verification Codes', () => {
  test('should navigate to verification codes page', async ({ page }) => {
    // Navigate to verification codes page (auth state is already loaded from setup)
    await page.goto('/verification-codes');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check the page title
    await expect(page.locator('h1')).toContainText('인증 코드 관리');

    // Check the page subtitle
    await expect(page.locator('text=직원 카카오톡 인증 코드를 생성하고 관리합니다.')).toBeVisible();

    // Check that the table headers exist
    await expect(page.locator('th:has-text("코드")')).toBeVisible();
    await expect(page.locator('th:has-text("직원")')).toBeVisible();
    await expect(page.locator('th:has-text("상태")')).toBeVisible();

    // Check that the create button exists
    await expect(page.locator('button:has-text("코드 생성")')).toBeVisible();

    // Check empty state or data table
    const emptyState = page.locator('text=인증 코드가 없습니다.');
    const hasData = await page.locator('tbody tr').count() > 0;

    if (!hasData) {
      await expect(emptyState).toBeVisible();
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/verification-codes-page.png' });
  });

  test('should open create code dialog', async ({ page }) => {
    await page.goto('/verification-codes');
    await page.waitForLoadState('networkidle');

    // Click the create button
    await page.click('button:has-text("코드 생성")');

    // Wait for dialog to appear
    await page.waitForTimeout(500);

    // Check dialog is open
    await expect(page.locator('text=인증 코드 생성')).toBeVisible();
    await expect(page.locator('text=직원 선택')).toBeVisible();

    // Take a screenshot
    await page.screenshot({ path: 'test-results/create-code-dialog.png' });
  });
});
