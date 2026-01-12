/* eslint-disable playwright/expect-expect -- Test scaffolds pending auth fixtures. */
import { expect, test } from '@playwright/test';

/**
 * Multi-Baby Selection Tests
 *
 * Tests for the baby selection page that appears when:
 * - User has multiple babies
 * - No default baby is set
 * - Need to choose which baby to track
 */

test.describe('Multi-Baby Selection Page', () => {
  test.beforeEach(async ({ page: _page }) => {
    // TODO: Authenticate as user with multiple babies and no default
    // await authenticateTestUser(page, 'multi-baby-user@example.com');
  });

  test.describe('Page Display', () => {
    test('should display baby selection page', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await expect(page.getByText(/Select Baby/i)).toBeVisible();
      await expect(page.getByText(/Choose which baby/i)).toBeVisible();
    });

    test('should show all accessible babies', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Should display cards/options for all babies user has access to
      // const babyOptions = page.locator('input[type="radio"]');
      // await expect(babyOptions.count()).toBeGreaterThan(1);
    });

    test('should display baby information', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Each baby option should show:
      // - Baby name
      // - Access level
      // - Caregiver label
      await expect(page.locator('text=/owner|editor|viewer/i')).toBeVisible();
    });

    test('should not show archived babies', async ({ page }) => {
      // Archived babies should be excluded
      await page.goto('/account/bootstrap');

      // TODO: Verify archived babies are not in the list
      // This requires test data with archived babies
    });

    test('should sort babies by lastAccessedAt', async ({ page }) => {
      // Most recently accessed babies should appear first
      await page.goto('/account/bootstrap');

      // TODO: Verify order matches lastAccessedAt descending
      // This requires inspecting the rendered order
    });
  });

  test.describe('Baby Selection', () => {
    test('should select baby with radio button', async ({ page }) => {
      await page.goto('/account/bootstrap');

      const firstRadio = page.locator('input[type="radio"]').first();
      await firstRadio.check();

      await expect(firstRadio).toBeChecked();
    });

    test('should allow selecting different babies', async ({ page }) => {
      await page.goto('/account/bootstrap');

      const radios = page.locator('input[type="radio"]');

      // Select first baby
      await radios.nth(0).check();

      await expect(radios.nth(0)).toBeChecked();

      // Select second baby
      await radios.nth(1).check();

      await expect(radios.nth(1)).toBeChecked();
      await expect(radios.nth(0)).not.toBeChecked();
    });

    test('should enable continue button when baby is selected', async ({ page }) => {
      await page.goto('/account/bootstrap');

      const continueButton = page.getByRole('button', { name: /Continue/i });

      // Initially disabled if no selection
      // await expect(continueButton).toBeDisabled();

      // Enable after selection
      await page.locator('input[type="radio"]').first().check();

      await expect(continueButton).toBeEnabled();
    });

    test('should highlight selected baby', async ({ page }) => {
      await page.goto('/account/bootstrap');

      const firstOption = page.locator('label').first();
      await firstOption.click();

      // Selected option should have visual indication
      // (border, background color, checkmark, etc.)
      // TODO: Verify styling changes on selection
    });
  });

  test.describe('Submitting Selection', () => {
    test('should set selected baby as default and redirect to dashboard', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();
      await page.getByRole('button', { name: /Continue/i }).click();

      // Should redirect to dashboard
      // await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should update defaultBabyId in database', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').nth(1).check();
      await page.getByRole('button', { name: /Continue/i }).click();

      // defaultBabyId should be updated in user record
      // TODO: Verify database state
    });

    test('should update lastAccessedAt timestamp', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();
      await page.getByRole('button', { name: /Continue/i }).click();

      // lastAccessedAt should be updated for selected baby
      // TODO: Verify database state
    });

    test('should sync selected baby to sessionStorage', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();
      await page.getByRole('button', { name: /Continue/i }).click();

      // Check sessionStorage after redirect
      // const babyData = await page.evaluate(() => {
      //   return sessionStorage.getItem('baby-log:active-baby');
      // });
      // expect(babyData).toBeTruthy();
    });

    test('should show loading state while submitting', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      // Button should show loading state
      // await expect(page.getByRole('button', { name: /Setting/i })).toBeVisible();
    });

    test('should disable submit button while loading', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      // Button should be disabled
      await expect(continueButton).toBeDisabled();
    });

    test('should disable radio buttons while submitting', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();
      await page.getByRole('button', { name: /Continue/i }).click();

      // Radio buttons should be disabled during submission
      const radios = page.locator('input[type="radio"]');

      await expect(radios.first()).toBeDisabled();
    });
  });

  test.describe('Auto-Selection Logic', () => {
    test('should pre-select most recently accessed baby', async ({ page }) => {
      // If user was just using a baby, it should be pre-selected
      await page.goto('/account/bootstrap');

      // Most recent baby (first in sorted list) should be checked
      // const firstRadio = page.locator('input[type="radio"]').first();
      // await expect(firstRadio).toBeChecked();
    });

    test('should not auto-submit, wait for user confirmation', async ({ page }) => {
      // Even if one is pre-selected, don't auto-submit
      await page.goto('/account/bootstrap');

      // Should remain on select-baby page
      await expect(page).toHaveURL(/\/account\/bootstrap$/);
      await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();
    });

    test('should remember selection if navigating away and back', async ({ page }) => {
      // If user selects a baby but doesn't submit, then navigates away
      // Selection should be remembered when they return (in same session)
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').nth(1).check();

      // Navigate away
      await page.goto('/settings');

      // Come back
      await page.goto('/account/bootstrap');

      // Selection might or might not be remembered
      // (depends on whether form state is persisted)
    });
  });

  test.describe('Access Level Display', () => {
    test('should show owner badge for owned babies', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Babies where user is owner should show owner badge
      // await expect(page.getByText('owner', { exact: false })).toBeVisible();
    });

    test('should show editor badge for editor access', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Should display access level for each baby
      // await expect(page.locator('text=/editor/i')).toBeVisible();
    });

    test('should show viewer badge for viewer access', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // await expect(page.locator('text=/viewer/i')).toBeVisible();
    });

    test('should show caregiver label if set', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Should display custom caregiver labels (Mom, Dad, etc.)
      // await expect(page.getByText(/Mom|Dad|Parent/i)).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle submission errors gracefully', async ({ page }) => {
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();

      // TODO: Mock server error
      // await page.getByRole('button', { name: /Continue/i }).click();

      // Should display error message
      // await expect(page.getByText(/Failed to set default baby/i)).toBeVisible();

      // Should re-enable form
      // await expect(page.getByRole('button', { name: /Continue/i })).toBeEnabled();
    });

    test('should handle baby no longer accessible', async ({ page }) => {
      // Edge case: baby was archived or access was revoked between page load and submission
      await page.goto('/account/bootstrap');

      await page.locator('input[type="radio"]').first().check();

      // TODO: Remove access in background, then submit
      // await page.getByRole('button', { name: /Continue/i }).click();

      // Should show appropriate error
      // await expect(page.getByText(/no longer have access/i)).toBeVisible();
    });

    test('should redirect to resolve if all babies become inaccessible', async ({ page: _page }) => {
      // If somehow user ends up with zero accessible babies
      // TODO: Set up scenario where babies are removed
      // await page.goto('/account/bootstrap');

      // Should redirect to account resolution
      // await expect(page).toHaveURL(/\/account\/bootstrap$/);
    });
  });

  test.describe('Navigation', () => {
    test('should show link to add new baby', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Should have option to create a new baby instead of selecting existing
      // await expect(page.getByRole('link', { name: /Add New Baby/i })).toBeVisible();
    });

    test('should navigate to baby creation from select page', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // await page.getByRole('link', { name: /Add New Baby/i }).click();

      // Should go to baby creation page
      // await expect(page).toHaveURL(/\/settings\/babies\/new$/);
    });

    test('should show link to settings', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Allow navigating to settings to manage babies
      // await expect(page.getByRole('link', { name: /Settings|Manage Babies/i })).toBeVisible();
    });

    test('should not allow direct navigation to dashboard without selection', async ({ page }) => {
      // If user tries to go to dashboard without defaultBaby set
      await page.goto('/dashboard');

      // Should redirect back to select-baby
      // await expect(page).toHaveURL(/\/account\/bootstrap$/);
    });
  });

  test.describe('First-Time Selection', () => {
    test('should prompt to select default when accepting first invite', async ({ page }) => {
      // Scenario: user accepts invite, gets redirected to select-baby
      // (This happens if they had no babies and now have one from invite + one they created)
      await page.goto('/account/bootstrap');

      // Should explain this is setting default
      // await expect(page.getByText(/will be your default/i)).toBeVisible();
    });

    test('should explain default baby concept', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Should have explanatory text about what default baby means
      // await expect(page.getByText(/You can change this later/i)).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/account/bootstrap');

      // Should be readable and usable on mobile
      await expect(page.getByText(/Select Baby/i)).toBeVisible();
      await expect(page.locator('input[type="radio"]').first()).toBeVisible();
    });

    test('should display properly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/account/bootstrap');

      await expect(page.getByText(/Select Baby/i)).toBeVisible();
    });

    test('should display properly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/account/bootstrap');

      await expect(page.getByText(/Select Baby/i)).toBeVisible();
    });
  });

  test.describe('Baby Cards Layout', () => {
    test('should display babies in a grid or list', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Babies should be organized visually
      // TODO: Verify layout structure
    });

    test('should show baby metadata', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Each card should show relevant info:
      // - Name
      // - Birth date (if set)
      // - Age
      // - Access level
      // - Caregiver label
      // TODO: Verify all metadata is displayed
    });

    test('should handle long baby names gracefully', async ({ page }) => {
      // Test text overflow/wrapping
      await page.goto('/account/bootstrap');

      // TODO: Verify long names don't break layout
    });

    test('should handle many babies (scrolling)', async ({ page }) => {
      // If user has many babies, page should be scrollable
      await page.goto('/account/bootstrap');

      // TODO: Test with user who has 10+ babies
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Should be able to navigate with Tab and select with Enter/Space
      await page.keyboard.press('Tab'); // Focus first radio
      await page.keyboard.press('Space'); // Select it

      const firstRadio = page.locator('input[type="radio"]').first();

      await expect(firstRadio).toBeChecked();

      await page.keyboard.press('Tab'); // Focus continue button
      await page.keyboard.press('Enter'); // Submit

      // Should proceed to dashboard
      // await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // Radio buttons should have accessible labels
      const radios = page.locator('input[type="radio"]');
      const firstRadio = radios.first();

      // Should be associated with label
      const ariaLabel = await firstRadio.getAttribute('aria-label');
      const labelFor = await page.locator(`label[for="${await firstRadio.getAttribute('id')}"]`).count();

      expect(ariaLabel || labelFor).toBeTruthy();
    });

    test('should announce selection to screen readers', async ({ page }) => {
      await page.goto('/account/bootstrap');

      // When selecting a baby, screen readers should be informed
      // This is tested through ARIA attributes and role assignments
      const firstRadio = page.locator('input[type="radio"]').first();

      await expect(firstRadio).toHaveAttribute('role', 'radio');
    });
  });

  test.describe('Integration with Account Resolution', () => {
    test('should be reached from account resolution for multi-baby users', async ({ page: _page }) => {
      // Test the flow: sign in → resolve → select-baby
      // TODO: Set up user with multiple babies and no default
      // await page.goto('/account/bootstrap');

      // Should redirect to select-baby
      // await expect(page).toHaveURL(/\/account\/bootstrap$/);
    });

    test('should skip this page if user has only one baby', async ({ page: _page }) => {
      // Single-baby users should go directly to dashboard
      // TODO: Sign in as single-baby user
      // await page.goto('/account/bootstrap');

      // Should go directly to dashboard
      // await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should skip this page if valid default is already set', async ({ page: _page }) => {
      // Users with valid defaultBabyId should go to dashboard
      // TODO: Sign in as user with valid default
      // await page.goto('/account/bootstrap');

      // await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should appear if default baby becomes invalid', async ({ page: _page }) => {
      // If default baby is archived or access is revoked
      // TODO: Set up scenario with invalid defaultBabyId
      // await page.goto('/account/bootstrap');

      // Should redirect to select-baby to choose new default
      // await expect(page).toHaveURL(/\/account\/bootstrap$/);
    });
  });

  test.describe('Switching Active Baby (From Dashboard)', () => {
    test('should allow switching babies from header dropdown', async ({ page }) => {
      // After selecting a baby and landing on dashboard
      // Should be able to switch to a different baby
      await page.goto('/dashboard');

      // TODO: Click baby switcher in header
      // await page.getByRole('button', { name: /Switch Baby|Select Baby/i }).click();

      // Should show dropdown or modal with other babies
      // await expect(page.getByText(/Your Babies/i)).toBeVisible();
    });

    test('should update sessionStorage when switching babies', async ({ page }) => {
      await page.goto('/dashboard');

      // TODO: Switch to different baby
      // await page.getByRole('button', { name: /Switch Baby/i }).click();
      // await page.getByText('Other Baby Name').click();

      // Check sessionStorage
      // const babyData = await page.evaluate(() => {
      //   return sessionStorage.getItem('baby-log:active-baby');
      // });
      // expect(JSON.parse(babyData!).name).toBe('Other Baby Name');
    });

    test('should not change defaultBabyId when quick-switching', async ({ page }) => {
      // Quick-switching should update session but not change default in DB
      // Default is only changed on select-baby page or in settings
      await page.goto('/dashboard');

      // TODO: Quick-switch and verify defaultBabyId unchanged
    });

    test('should reload page data after switching', async ({ page }) => {
      // Dashboard should show data for newly selected baby
      await page.goto('/dashboard');

      // TODO: Switch baby and verify data changes
    });
  });
});
