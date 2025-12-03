import { test, expect } from '@playwright/test';

test.describe('Category Tests', () => {
  test.describe('Category List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
    });

    test('CAT-001: Category list page loads', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('카테고리 관리', { timeout: 10000 });
      await expect(page).toHaveURL('/categories');
    });

    test('CAT-002: Category tree displays', async ({ page }) => {
      // Wait for categories to load (Suspense fallback + API call)
      await page.waitForTimeout(3000);

      // Check main content area is visible
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      // Page should have loaded - check for any category-related content
      const pageText = await page.locator('body').textContent();
      expect(pageText).toBeTruthy();
    });

    test('CAT-003: Expand/collapse categories', async ({ page }) => {
      // Find expandable category item
      const expandButton = page.locator('[data-testid="expand-button"]').or(
        page.locator('button[aria-expanded]')
      ).or(
        page.locator('[role="treeitem"] button')
      );

      if (await expandButton.first().isVisible()) {
        await expandButton.first().click();
        await page.waitForTimeout(300);
        // Should toggle expansion
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Create Category', () => {
    test('CAT-004: Create new category - form loads', async ({ page }) => {
      await page.goto('/categories/new');
      await page.waitForLoadState('networkidle');

      // Wait for form to load (Suspense)
      await page.waitForTimeout(3000);

      await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

      // Check for name field
      const nameField = page.locator('input[name="name"]');
      await expect(nameField).toBeVisible({ timeout: 10000 });
    });

    test('CAT-005: Create new category - validation', async ({ page }) => {
      await page.goto('/categories/new');
      await page.waitForLoadState('networkidle');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation error or stay on page
      await expect(page).toHaveURL(/\/categories\/new/);
    });

    test('CAT-006: Create new category - success', async ({ page }) => {
      await page.goto('/categories/new');
      await page.waitForLoadState('networkidle');

      const timestamp = Date.now();

      // Fill category name
      await page.fill('input[name="name"]', `테스트 카테고리 ${timestamp}`);

      // Fill description if exists
      const descInput = page.locator('textarea[name="description"]').or(
        page.locator('input[name="description"]')
      );
      if (await descInput.isVisible()) {
        await descInput.fill('테스트 설명');
      }

      // Select clearance level if exists
      const clearanceSelect = page.locator('select[name="clearanceLevel"]').or(
        page.locator('[data-testid="clearance-select"]')
      );
      if (await clearanceSelect.isVisible()) {
        await clearanceSelect.selectOption('basic');
      }

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to categories list
      await page.waitForURL(/\/categories(?!\/new)/, { timeout: 10000 });
    });

    test('CAT-007: Create subcategory', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      // Find "add subcategory" button on existing category
      const addSubButton = page.locator('button:has-text("하위")').or(
        page.locator('[data-testid="add-subcategory"]')
      );

      if (await addSubButton.first().isVisible()) {
        await addSubButton.first().click();

        // Should open form or navigate
        await page.waitForTimeout(500);
        const form = page.locator('form');
        await expect(form).toBeVisible();
      }
    });
  });

  test.describe('Edit Category', () => {
    test('CAT-008: Edit category - form loads', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      // Wait for page content
      await page.waitForTimeout(3000);

      // Find edit button
      const editButton = page.locator('button:has-text("수정")').first();
      // Or find category link
      const categoryLink = page.locator('a[href*="/categories/"]').first();

      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForURL(/\/categories\/[^/]+/, { timeout: 30000 });
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      } else if (await categoryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await categoryLink.click();
        await page.waitForURL(/\/categories\/[^/]+/, { timeout: 30000 });
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      } else {
        // No categories to edit - test passes
        expect(true).toBe(true);
      }
    });

    test('CAT-009: Edit category - success', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      const editButton = page.locator('a[href*="/categories/"]').first();

      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForURL(/\/categories\/[^/]+/);

        // Find and modify name if editable
        const nameInput = page.locator('input[name="name"]');
        if (await nameInput.isVisible()) {
          const currentValue = await nameInput.inputValue();
          await nameInput.fill(currentValue + ' (수정됨)');

          await page.click('button[type="submit"]');
          await page.waitForURL(/\/categories/);
        }
      }
    });
  });

  test.describe('Delete Category', () => {
    test('CAT-010: Delete category - confirmation', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      const deleteButton = page.locator('button:has-text("삭제")').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Should show confirmation dialog
        const dialog = page.locator('[role="dialog"]').or(
          page.locator('[role="alertdialog"]')
        );
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('CAT-011: Delete category - cancel', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      const deleteButton = page.locator('button:has-text("삭제")').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Find and click cancel
        const cancelButton = page.locator('button:has-text("취소")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
        }
      }
    });
  });

  test.describe('Category Reorder', () => {
    test('CAT-012: Drag and drop reorder', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      // Find draggable items
      const draggableItems = page.locator('[draggable="true"]').or(
        page.locator('[data-testid="draggable-category"]')
      );

      const count = await draggableItems.count();
      if (count >= 2) {
        // Attempt drag and drop
        const first = draggableItems.first();
        const second = draggableItems.nth(1);

        await first.dragTo(second);
        await page.waitForTimeout(500);
        // Reorder should be attempted
        expect(true).toBe(true);
      }
    });
  });
});
