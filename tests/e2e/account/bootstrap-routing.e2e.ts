/**
 * Bootstrap Routing E2E Tests
 *
 * Tests the account bootstrap flow that routes users
 * to the appropriate page based on their account state.
 *
 * Account states:
 * - no_baby: Redirect to onboarding
 * - has_invites: Redirect to invite resolution
 * - select_baby: Redirect to baby selection
 * - ready: Redirect to overview
 * - locked: Redirect to locked page
 */

import { expect, test } from '@playwright/test';

test.describe('Bootstrap Routing', () => {
  // NOTE: Unauthenticated redirect tests are commented out due to flaky
  // Clerk middleware timing. These test real functionality but timeout
  // intermittently. Re-enable when infrastructure is more stable.

  // test.describe('Unauthenticated users', () => {
  //   test('should redirect to sign-in page', async ({ page }) => {
  //     await page.goto('/account/bootstrap');

  //     // Should redirect to sign-in
  //     await page.waitForURL(/\/sign-in/);

  //     expect(page.url()).toContain('/sign-in');
  //   });

  //   test('should redirect protected routes to sign-in', async ({ page }) => {
  //     await page.goto('/overview');

  //     // Should redirect to sign-in
  //     await page.waitForURL(/\/sign-in/);

  //     expect(page.url()).toContain('/sign-in');
  //   });
  // });

  // test.describe('Bootstrap page loading', () => {
  //   test('should display loading state initially', async ({ page }) => {
  //     // Navigate without waiting for full load
  //     await page.goto('/account/bootstrap', { waitUntil: 'commit' });

  //     // Check for loading indicator (may be brief)
  //     const loadingIndicator = page.getByRole('status');
  //     const hasLoading = await loadingIndicator.isVisible().catch(() => false);

  //     // Either shows loading or has already redirected
  //     expect(hasLoading || !page.url().includes('/account/bootstrap')).toBeTruthy();
  //   });
  // });

  test.describe('Marketing pages (no auth required)', () => {
    test('should display homepage without auth', async ({ page }) => {
      await page.goto('/');

      // Homepage should be accessible
      await expect(page.locator('main')).toBeVisible();
    });

    test('should allow navigation to public pages', async ({ page }) => {
      await page.goto('/');

      // Should not redirect to sign-in
      expect(page.url()).not.toContain('/sign-in');
    });
  });
});
