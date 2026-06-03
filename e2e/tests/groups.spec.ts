import { test, expect } from '@playwright/test';

test.describe('Groups', () => {
  test.beforeEach(async ({ page }) => {
    // Skip if not authenticated — mark as skipped in CI without test user
    test.skip(!!process.env.CI, 'Requires live backend');
  });

  test('groups page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/groups');
    await expect(page).toHaveURL(/login/);
  });
});
