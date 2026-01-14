/**
 * Create Baby E2E Tests
 *
 * Tests the baby creation flow for new users.
 * This is part of the onboarding flow when a user
 * has no babies yet.
 */

import { expect, test } from '@playwright/test';

test.describe('Create Baby', () => {
  test.describe('Onboarding flow', () => {
    test.skip('should display create baby form for new users', async ({ page }) => {
      // TODO: Requires authenticated user with no babies
      await page.goto('/account/onboarding/baby');

      await expect(page.getByRole('heading', { name: /add.*baby/i })).toBeVisible();
      await expect(page.getByLabel(/name/i)).toBeVisible();
    });

    test.skip('should require baby name', async ({ page }) => {
      // TODO: Requires authenticated user
      await page.goto('/account/onboarding/baby');

      // Try to submit without name
      await page.getByRole('button', { name: /create|save|continue/i }).click();

      // Should show validation error
      await expect(page.getByText(/name.*required/i)).toBeVisible();
    });

    test.skip('should create baby and redirect to overview', async ({ page }) => {
      // TODO: Requires authenticated user with no babies
      await page.goto('/account/onboarding/baby');

      await page.getByLabel(/name/i).fill('Test Baby');
      await page.getByRole('button', { name: /create|save|continue/i }).click();

      // Should redirect to overview
      await page.waitForURL(/\/overview/);

      expect(page.url()).toContain('/overview');
    });
  });

  test.describe('Settings flow', () => {
    test.skip('should navigate to add baby from settings', async ({ page }) => {
      // TODO: Requires authenticated user
      await page.goto('/settings/babies');

      await page.getByRole('link', { name: /add.*baby|new.*baby/i }).click();

      await page.waitForURL(/\/settings\/babies\/new/);

      await expect(page.getByRole('heading', { name: /add.*baby/i })).toBeVisible();
    });

    test.skip('should create additional baby from settings', async ({ page }) => {
      // TODO: Requires authenticated user with existing baby
      await page.goto('/settings/babies/new');

      await page.getByLabel(/name/i).fill('Second Baby');
      await page.getByRole('button', { name: /create|save|add/i }).click();

      // Should redirect back to babies list or show success
      await page.waitForURL(/\/settings\/babies/);
    });
  });

  test.describe('Form validation', () => {
    test.skip('should validate baby name length', async ({ page }) => {
      // TODO: Requires authenticated user
      await page.goto('/settings/babies/new');

      // Name too short
      await page.getByLabel(/name/i).fill('A');
      await page.getByRole('button', { name: /create|save|add/i }).click();

      await expect(page.getByText(/name.*too short|at least/i)).toBeVisible();
    });

    test.skip('should accept optional birth date', async ({ page }) => {
      // TODO: Requires authenticated user
      await page.goto('/settings/babies/new');

      await page.getByLabel(/name/i).fill('Test Baby');
      // Leave birth date empty - should be optional
      await page.getByRole('button', { name: /create|save|add/i }).click();

      // Should succeed without birth date
      await page.waitForURL(/\/settings\/babies/);
    });
  });
});
