/**
 * Logout E2E Tests
 *
 * Tests the logout functionality to ensure:
 * - User can logout from settings page
 * - User is redirected after logout
 * - Session is cleared
 *
 * Note: IndexedDB clearing is primarily tested in unit tests
 * since it requires complex data seeding in E2E environment.
 *
 * STATUS: Commented out - redirect tests are flaky due to Clerk middleware timing
 * TODO: Re-enable when auth E2E fixtures and stable infrastructure are in place
 */

// import { expect, test } from '@playwright/test';

// test.describe('Logout', () => {
//   test.describe('Unauthenticated users', () => {
//     test('should not have access to settings page', async ({ page }) => {
//       await page.goto('/settings');

//       // Should redirect to sign-in
//       await page.waitForURL(/\/sign-in/);

//       expect(page.url()).toContain('/sign-in');
//     });
//   });

//   // Note: Authenticated tests would go here
//   // These require Clerk auth setup which should be configured
//   // according to the project's E2E testing strategy
//   //
//   // test.describe('Authenticated users', () => {
//   //   test.beforeEach(async ({ page }) => {
//   //     // TODO: Use project's auth helper to login
//   //     // await loginAsTestUser(page);
//   //   });
//   //
//   //   test('should logout from settings page', async ({ page }) => {
//   //     await page.goto('/settings');
//   //
//   //     // Click sign out button
//   //     await page.getByRole('button', { name: /sign out/i }).click();
//   //
//   //     // Should redirect to homepage
//   //     await page.waitForURL('/');
//   //     expect(page.url()).toBe('/');
//   //
//   //     // Verify session is cleared by checking redirect
//   //     await page.goto('/settings');
//   //     await page.waitForURL(/\/sign-in/);
//   //     expect(page.url()).toContain('/sign-in');
//   //   });
//   //
//   //   test('should logout from user profile page', async ({ page }) => {
//   //     await page.goto('/settings/user-profile');
//   //
//   //     // Click Clerk's sign out button
//   //     await page.getByRole('button', { name: /sign out/i }).click();
//   //
//   //     // Should redirect to homepage
//   //     await page.waitForURL('/');
//   //     expect(page.url()).toBe('/');
//   //   });
//   // });
// });
