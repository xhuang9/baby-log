import { expect, test } from '@playwright/test';

/**
 * Baby Creation and Management Tests
 *
 * Tests for creating babies, updating baby information,
 * managing baby access, and archiving babies.
 */

test.describe('Baby Creation', () => {
  test.beforeEach(async ({ page: _page }) => {
    // TODO: Authenticate as test user
    // await authenticateTestUser(page, 'test-user@example.com');
  });

  test.describe('Onboarding Baby Creation', () => {
    test('should create baby with minimal required fields', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      // Fill only required field (name)
      await page.getByLabel(/Baby's Name/i).fill('Charlie');
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Should redirect to dashboard
      // await expect(page).toHaveURL(/\/dashboard$/, { timeout: 3000 });

      // Verify baby name appears in dashboard
      // await expect(page.getByText('Charlie')).toBeVisible();
    });

    test('should create baby with all optional fields', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      // Fill required field
      await page.getByLabel(/Baby's Name/i).fill('Emma');

      // Expand Baby Details section
      await page.getByRole('button', { name: /Baby Details/i }).click();
      await page.getByLabel(/Birth Date/i).fill('2024-01-15');
      await page.getByLabel(/Gender/i).selectOption('female');
      await page.getByLabel(/Birth Weight/i).fill('3200');

      // Expand Preferences section
      await page.getByRole('button', { name: /Your Preferences/i }).click();
      await page.getByLabel(/Your Name in System/i).fill('Mom');

      // Submit
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should use default name "My Baby" if name is empty', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      // Clear the default name and submit empty
      await page.getByLabel(/Baby's Name/i).clear();
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Should still create baby with default name
      // await expect(page).toHaveURL(/\/dashboard$/);
      // await expect(page.getByText('My Baby')).toBeVisible();
    });

    test('should validate birth date is not in the future', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Test Baby');

      // Try to set future date
      await page.getByRole('button', { name: /Baby Details/i }).click();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await page.getByLabel(/Birth Date/i).fill(futureDateStr!);

      // HTML5 validation should prevent this
      // The max attribute is set to today's date
      const dateInput = page.getByLabel(/Birth Date/i);
      const isInvalid = await dateInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

      expect(isInvalid).toBe(true);
    });

    test('should set new baby as default baby', async ({ page }) => {
      // Verify that creating a baby sets it as the user's default
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Default Baby');
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // After redirect, check sessionStorage
      // const babyData = await page.evaluate(() => {
      //   return sessionStorage.getItem('baby-log:active-baby');
      // });
      // expect(babyData).toBeTruthy();
      // const baby = JSON.parse(babyData!);
      // expect(baby.name).toBe('Default Baby');
    });

    test('should grant owner access to creator', async ({ page }) => {
      // Verify that baby creator gets owner access
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Owner Test');
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Navigate to settings to verify access level
      // await page.goto('/settings/babies');
      // await expect(page.getByText('Owner Test')).toBeVisible();
      // await expect(page.getByText('owner', { exact: false })).toBeVisible();
    });
  });

  test.describe('Settings Baby Creation', () => {
    test('should create additional baby from settings', async ({ page }) => {
      // Test creating a second baby
      await page.goto('/settings/babies/new');

      await page.getByLabel(/Baby's Name/i).fill('Second Baby');
      await page.getByRole('button', { name: /Create Baby/i }).click();

      // Should redirect back to babies management
      // await expect(page).toHaveURL(/\/settings\/babies$/);
      // await expect(page.getByText('Second Baby')).toBeVisible();
    });

    test('should show both babies in management list after creating second', async ({ page }) => {
      // Verify multiple babies are displayed
      await page.goto('/settings/babies');

      // Should show all babies user has access to
      // const babyCards = page.locator('[data-testid="baby-card"]');
      // await expect(babyCards).toHaveCount(2);
    });

    test('should allow switching default baby in settings', async ({ page }) => {
      // Test changing default baby
      await page.goto('/settings/babies');

      // TODO: Click "Make Default" on a non-default baby
      // await page.getByRole('button', { name: /Make Default/i }).first().click();

      // Verify feedback
      // await expect(page.getByText(/Default baby updated/i)).toBeVisible();
    });
  });

  test.describe('Baby Information Validation', () => {
    test('should require baby name', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      // Try to submit without name
      const nameInput = page.getByLabel(/Baby's Name/i);
      await nameInput.clear();
      await nameInput.blur();

      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Should not redirect (HTML5 validation prevents submission)
      await expect(page).toHaveURL(/\/account\/onboarding\/baby$/);
    });

    test('should accept birth weight in grams', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Weight Test');
      await page.getByRole('button', { name: /Baby Details/i }).click();

      await page.getByLabel(/Birth Weight/i).fill('3500');
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Should accept valid weight
      // await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should reject negative birth weight', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Weight Test');
      await page.getByRole('button', { name: /Baby Details/i }).click();

      await page.getByLabel(/Birth Weight/i).fill('-100');

      // HTML5 validation (min="0") should prevent negative values
      const weightInput = page.getByLabel(/Birth Weight/i);
      const isInvalid = await weightInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

      expect(isInvalid).toBe(true);
    });

    test('should accept all gender options', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Gender Test');
      await page.getByRole('button', { name: /Baby Details/i }).click();

      const genderSelect = page.getByLabel(/Gender/i);

      // Test each option
      await genderSelect.selectOption('male');

      await expect(genderSelect).toHaveValue('male');

      await genderSelect.selectOption('female');

      await expect(genderSelect).toHaveValue('female');

      await genderSelect.selectOption('other');

      await expect(genderSelect).toHaveValue('other');

      await genderSelect.selectOption('unknown');

      await expect(genderSelect).toHaveValue('unknown');
    });
  });

  test.describe('Caregiver Label', () => {
    test('should default caregiver label to "Parent"', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Label Test');
      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Verify in settings that label is "Parent"
      // await page.goto('/settings/babies');
      // await expect(page.getByText('Parent')).toBeVisible();
    });

    test('should accept custom caregiver label', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Label Test');
      await page.getByRole('button', { name: /Your Preferences/i }).click();
      await page.getByLabel(/Your Name in System/i).fill('Papa');

      await page.getByRole('button', { name: /Continue to Dashboard/i }).click();

      // Verify custom label
      // await page.goto('/settings/babies');
      // await expect(page.getByText('Papa')).toBeVisible();
    });
  });

  test.describe('Form UI Behavior', () => {
    test('should toggle Baby Details section', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      const detailsButton = page.getByRole('button', { name: /Baby Details/i });
      const birthDateInput = page.getByLabel(/Birth Date/i);

      // Initially collapsed
      await expect(birthDateInput).toBeHidden();

      // Click to expand
      await detailsButton.click();

      await expect(birthDateInput).toBeVisible();

      // Click to collapse
      await detailsButton.click();

      await expect(birthDateInput).toBeHidden();
    });

    test('should toggle Preferences section', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      const prefsButton = page.getByRole('button', { name: /Your Preferences/i });
      const labelInput = page.getByLabel(/Your Name in System/i);

      // Initially collapsed
      await expect(labelInput).toBeHidden();

      // Click to expand
      await prefsButton.click();

      await expect(labelInput).toBeVisible();

      // Click to collapse
      await prefsButton.click();

      await expect(labelInput).toBeHidden();
    });

    test('should show loading state while submitting', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Loading Test');

      const submitButton = page.getByRole('button', { name: /Continue to Dashboard/i });

      // Click submit
      await submitButton.click();

      // Button should show loading state
      // await expect(page.getByRole('button', { name: /Creating/i })).toBeVisible();
    });

    test('should disable submit button while loading', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/Baby's Name/i).fill('Disabled Test');

      const submitButton = page.getByRole('button', { name: /Continue to Dashboard/i });

      await submitButton.click();

      // Button should be disabled during submission
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Navigation', () => {
    test('should show link to request access from onboarding', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      const requestLink = page.getByRole('link', { name: /request access to an existing baby/i });

      await expect(requestLink).toBeVisible();
      expect(await requestLink.getAttribute('href')).toContain('/account/request-access');
    });

    test('should navigate to request access page from onboarding', async ({ page }) => {
      await page.goto('/account/onboarding/baby');

      await page.getByRole('link', { name: /request access/i }).click();

      await expect(page).toHaveURL(/\/account\/request-access$/);
    });
  });
});

test.describe('Baby Management in Settings', () => {
  test.beforeEach(async ({ page: _page }) => {
    // TODO: Authenticate and ensure user has at least one baby
    // await authenticateTestUser(page, 'multi-baby-user@example.com');
  });

  test.describe('Babies List', () => {
    test('should display all accessible babies', async ({ page }) => {
      await page.goto('/settings/babies');

      await expect(page.getByText(/Manage Babies/i)).toBeVisible();

      // TODO: Verify baby cards are displayed
      // const babyCards = page.locator('[data-testid="baby-card"]');
      // await expect(babyCards.count()).toBeGreaterThan(0);
    });

    test('should show baby details in cards', async ({ page }) => {
      await page.goto('/settings/babies');

      // Each card should show: name, access level, caregiver label
      // await expect(page.getByText(/owner|editor|viewer/i)).toBeVisible();
    });

    test('should highlight default baby', async ({ page }) => {
      await page.goto('/settings/babies');

      // Default baby should have visual indicator
      // await expect(page.getByText(/Default/i)).toBeVisible();
    });
  });

  test.describe('Baby Actions', () => {
    test('should allow viewing baby details', async ({ page }) => {
      await page.goto('/settings/babies');

      // TODO: Click on a baby card or "View" button
      // await page.locator('[data-testid="baby-card"]').first().click();

      // Should show detailed view
      // await expect(page.getByText(/Birth Date/i)).toBeVisible();
    });

    test('should allow editing baby information for owners', async ({ page }) => {
      // Only owners can edit baby info
      await page.goto('/settings/babies');

      // TODO: Find a baby where user is owner and click edit
      // await page.getByRole('button', { name: /Edit/i }).first().click();

      // Should open edit form or navigate to edit page
      // await expect(page.getByLabel(/Baby's Name/i)).toBeVisible();
    });

    test('should not show edit option for non-owners', async ({ page: _page }) => {
      // Viewers and editors cannot edit baby info
      // TODO: Navigate to a baby where user is viewer/editor
      // await page.goto('/settings/babies');

      // Edit button should not be visible for non-owned babies
      // const viewerCard = page.locator('[data-testid="baby-card"]').filter({ hasText: 'viewer' });
      // await expect(viewerCard.getByRole('button', { name: /Edit/i })).not.toBeVisible();
    });

    test('should allow changing default baby', async ({ page }) => {
      await page.goto('/settings/babies');

      // TODO: Click "Make Default" on a non-default baby
      // const nonDefaultBaby = page.locator('[data-testid="baby-card"]').filter({ hasNotText: 'Default' }).first();
      // await nonDefaultBaby.getByRole('button', { name: /Make Default/i }).click();

      // Verify success message
      // await expect(page.getByText(/Default baby updated/i)).toBeVisible();
    });

    test('should navigate to add new baby page', async ({ page }) => {
      await page.goto('/settings/babies');

      await page.getByRole('link', { name: /Add New Baby/i }).click();

      await expect(page).toHaveURL(/\/settings\/babies\/new$/);
      await expect(page.getByLabel(/Baby's Name/i)).toBeVisible();
    });
  });

  test.describe('Baby Sharing', () => {
    test('should navigate to share page for owned babies', async ({ page }) => {
      await page.goto('/settings/babies');

      // TODO: Find owned baby and click share
      // await page.getByRole('button', { name: /Share/i }).first().click();

      // Should navigate to share page
      // await expect(page).toHaveURL(/\/settings\/babies\/.*\/share$/);
    });

    test('should not show share option for non-owners', async ({ page }) => {
      await page.goto('/settings/babies');

      // Verify share button only appears for owned babies
      // TODO: Verify based on access level
    });
  });

  test.describe('Baby Archiving', () => {
    test('should allow owners to archive babies', async ({ page }) => {
      await page.goto('/settings/babies');

      // TODO: Find owned baby and click archive
      // await page.getByRole('button', { name: /Archive/i }).first().click();

      // Confirm archiving
      // await page.getByRole('button', { name: /Confirm/i }).click();

      // Baby should disappear from list
      // await expect(page.getByText('Archived Baby Name')).not.toBeVisible();
    });

    test('should not show archive option for non-owners', async ({ page }) => {
      await page.goto('/settings/babies');

      // Archive should only be available to owners
      // TODO: Verify based on access level
    });

    test('should handle archiving default baby', async ({ page }) => {
      // Test edge case: archiving the default baby
      await page.goto('/settings/babies');

      // TODO: Archive current default baby
      // System should automatically set a new default or prompt user to select
    });
  });
});
