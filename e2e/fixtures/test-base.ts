import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixture with common utilities
 */
export const test = base.extend<Record<string, never>>({
  // Add custom fixtures as needed
});

export { expect };

/**
 * Test data constants
 */
export const TEST_DATA = {
  credentials: {
    email: 'asdf@asdf.com',
    password: 'asdfasdfasdf',
  },
  employee: {
    name: '테스트 직원',
    email: 'test.employee@example.com',
    department: '개발팀',
    position: '개발자',
    phone: '010-1234-5678',
  },
  category: {
    name: '테스트 카테고리',
    description: '테스트용 문서 카테고리',
  },
  template: {
    name: '테스트 템플릿',
    description: '테스트용 Excel 템플릿',
  },
};

/**
 * Common selectors used across tests
 */
export const SELECTORS = {
  sidebar: '[data-testid="sidebar"]',
  header: 'header',
  mainContent: 'main',
  loadingSpinner: '[data-testid="loading"]',
  toast: '[data-sonner-toast]',
  dialog: '[role="dialog"]',
  table: 'table',
  form: 'form',
  submitButton: 'button[type="submit"]',
};

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: import('@playwright/test').Page, text?: string) {
  const toast = page.locator(SELECTORS.toast);
  await expect(toast).toBeVisible({ timeout: 10000 });
  if (text) {
    await expect(toast).toContainText(text);
  }
}

/**
 * Close any open dialogs
 */
export async function closeDialog(page: import('@playwright/test').Page) {
  const closeButton = page.locator('[role="dialog"] button[aria-label="Close"]');
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}
