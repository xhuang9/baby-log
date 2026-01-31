/**
 * Baby Selection E2E Tests
 *
 * Tests the baby selection flow for users with multiple babies.
 * Users land here when they have access to multiple babies
 * but haven't set a default.
 *
 * STATUS: Commented out - requires authenticated user fixtures
 * TODO: Enable when auth E2E fixtures are implemented
 */

// import { expect, test } from '@playwright/test';

// test.describe('Baby Selection', () => {
//   test.describe('Selection page', () => {
//     test('should display baby selection page for multi-baby users', async ({ page }) => {
//       // TODO: Requires authenticated user with multiple babies, no default
//       await page.goto('/account/select-baby');

//       await expect(page.getByRole('heading', { name: /select.*baby|choose.*baby/i })).toBeVisible();
//     });

//     test('should display all accessible babies', async ({ page }) => {
//       // TODO: Requires authenticated user with multiple babies
//       await page.goto('/account/select-baby');

//       // Should show baby cards/options
//       const babyOptions = page.locator('[data-testid="baby-option"]');

//       await expect(babyOptions).toHaveCount(2); // Assuming 2 test babies
//     });

//     test('should select baby and redirect to overview', async ({ page }) => {
//       // TODO: Requires authenticated user with multiple babies
//       await page.goto('/account/select-baby');

//       // Click on first baby option
//       await page.locator('[data-testid="baby-option"]').first().click();

//       // Should redirect to overview
//       await page.waitForURL(/\/overview/);

//       expect(page.url()).toContain('/overview');
//     });
//   });

//   test.describe('Baby switcher in app', () => {
//     test('should show current baby in header', async ({ page }) => {
//       // TODO: Requires authenticated user with active baby
//       await page.goto('/overview');

//       // Should display active baby name somewhere in the UI
//       const babySwitcher = page.locator('[data-testid="baby-switcher"]');

//       await expect(babySwitcher).toBeVisible();
//     });

//     test('should allow switching babies', async ({ page }) => {
//       // TODO: Requires authenticated user with multiple babies
//       await page.goto('/overview');

//       // Open baby switcher
//       await page.locator('[data-testid="baby-switcher"]').click();

//       // Select different baby
//       await page.locator('[data-testid="baby-option"]').last().click();

//       // Should update the UI with new baby
//       await page.waitForLoadState('domcontentloaded');
//     });
//   });

//   test.describe('Edge cases', () => {
//     test('should redirect to onboarding if no babies', async ({ page }) => {
//       // TODO: Requires authenticated user with no babies
//       await page.goto('/account/select-baby');

//       // Should redirect to onboarding
//       await page.waitForURL(/\/account\/onboarding|\/account\/bootstrap/);
//     });

//     test('should auto-select if only one baby', async ({ page }) => {
//       // TODO: Requires authenticated user with exactly one baby
//       await page.goto('/account/select-baby');

//       // Should auto-redirect to overview (single baby auto-selected)
//       await page.waitForURL(/\/overview/);
//     });
//   });
// });
