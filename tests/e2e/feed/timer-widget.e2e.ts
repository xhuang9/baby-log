/**
 * Timer Widget E2E Tests
 *
 * Tests the timer widget functionality in the feed logging flow.
 * The timer widget is used to track feed duration.
 */

import { expect, test } from '@playwright/test';

test.describe('Timer Widget', () => {
  test.describe('Timer display and controls', () => {
    test.skip('should display initial timer state', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Switch to timer mode if not already
      const timerButton = page.getByRole('button', { name: /timer/i });
      if (await timerButton.isVisible()) {
        await timerButton.click();
      }

      // Should display timer at 00:00:00
      await expect(page.getByText('00', { exact: false })).toBeVisible();

      // Should show play button
      const playButton = page.locator('button:has-text("▶"), button[aria-label*="play"]').first();

      await expect(playButton).toBeVisible();

      // Should show timer controls
      await expect(page.getByText('Reset')).toBeVisible();
      await expect(page.getByText('+10s')).toBeVisible();
      await expect(page.getByText('-10s')).toBeVisible();
    });

    test.skip('should start timer when play button is clicked', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Find and click play button
      const playButton = page.locator('button:has-text("▶"), button[aria-label*="play"]').first();
      await playButton.click();

      // Wait a moment for timer to start
      await page.waitForTimeout(1500);

      // Timer should now show non-zero seconds
      // Note: Exact timing may vary, so we just check it's running
      const timerDisplay = page.locator('text=/00:00:0[1-9]|00:00:1[0-9]/');

      await expect(timerDisplay).toBeVisible({ timeout: 3000 });
    });

    test.skip('should pause timer when pause button is clicked', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Start timer
      const playButton = page.locator('button:has-text("▶"), button[aria-label*="play"]').first();
      await playButton.click();

      // Wait for timer to run
      await page.waitForTimeout(2000);

      // Click pause button
      const pauseButton = page.locator('button:has-text("⏸"), button[aria-label*="pause"]').first();
      await pauseButton.click();

      // Get current time display
      const timeText = page.locator('[class*="text-5xl"]').first();

      // Wait a moment and verify time hasn't changed
      await page.waitForTimeout(1000);
      const newTimeText = await page.locator('[class*="text-5xl"]').first().textContent();

      await expect(timeText).toHaveText(newTimeText);
    });

    test.skip('should resume timer after pause', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Start timer
      const playButton = page.locator('button:has-text("▶"), button[aria-label*="play"]').first();
      await playButton.click();

      await page.waitForTimeout(1000);

      // Pause
      const pauseButton = page.locator('button:has-text("⏸"), button[aria-label*="pause"]').first();
      await pauseButton.click();

      // Resume
      await playButton.click();

      // Wait and verify timer is running again
      await page.waitForTimeout(1500);

      // Should show time greater than initial pause time
      const timerDisplay = page.locator('text=/00:00:0[2-9]|00:00:[1-9][0-9]/');

      await expect(timerDisplay).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Timer adjustment controls', () => {
    test.skip('should add 10 seconds when +10s button is clicked', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Click +10s button
      await page.getByText('+10s').click();

      // Should show 00:00:10
      await expect(page.getByText('10')).toBeVisible();
    });

    test.skip('should subtract 10 seconds when -10s button is clicked', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Add 30 seconds first
      await page.getByText('+10s').click();
      await page.getByText('+10s').click();
      await page.getByText('+10s').click();

      // Should show 00:00:30
      await expect(page.getByText('30')).toBeVisible();

      // Subtract 10 seconds
      await page.getByText('-10s').click();

      // Should show 00:00:20
      await expect(page.getByText('20')).toBeVisible();
    });

    test.skip('should not go below zero when subtracting', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Try to subtract from zero
      await page.getByText('-10s').click();

      // Should still show 00:00:00
      const zeroDisplay = page.locator('text=/^00$/');

      await expect(zeroDisplay).toHaveCount(3); // hours, minutes, seconds
    });

    test.skip('should support hold action for rapid adjustment', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Hold +10s button
      const addButton = page.getByText('+10s');
      await addButton.hover();
      await page.mouse.down();

      // Wait for hold action to trigger (1.5s delay + intervals)
      await page.waitForTimeout(2000);

      await page.mouse.up();

      // Should have added multiple increments
      // After 2s: initial + delay(1.5s) + ~5 intervals = 60-80s
      const timerDisplay = page.locator('text=/00:0[1-9]:[0-9]{2}|00:01:[0-9]{2}/');

      await expect(timerDisplay).toBeVisible();
    });
  });

  test.describe('Timer reset', () => {
    test.skip('should reset timer with confirmation when time > 0', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Add some time
      await page.getByText('+10s').click();
      await page.getByText('+10s').click();

      // Setup dialog handler
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('reset');

        await dialog.accept();
      });

      // Click reset
      await page.getByText('Reset').click();

      // Should return to 00:00:00
      const zeroDisplay = page.locator('text=/^00$/');

      await expect(zeroDisplay).toHaveCount(3);
    });

    test.skip('should not reset if user cancels confirmation', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Add some time
      await page.getByText('+10s').click();

      // Setup dialog handler to cancel
      page.on('dialog', async (dialog) => {
        await dialog.dismiss();
      });

      // Click reset
      await page.getByText('Reset').click();

      // Should still show 10 seconds
      await expect(page.getByText('10')).toBeVisible();
    });

    test.skip('should reset without confirmation when time = 0', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Track if dialog appears
      let dialogShown = false;
      page.on('dialog', () => {
        dialogShown = true;
      });

      // Click reset at 00:00:00
      await page.getByText('Reset').click();

      // Wait a moment
      await page.waitForTimeout(500);

      // Dialog should not have appeared
      expect(dialogShown).toBe(false);
    });
  });

  test.describe('Timer persistence', () => {
    test.skip('should persist timer state across modal close/open', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Start timer
      const playButton = page.locator('button:has-text("▶"), button[aria-label*="play"]').first();
      await playButton.click();

      await page.waitForTimeout(2000);

      // Close modal
      await page.keyboard.press('Escape');

      // Reopen modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Timer should still show running time
      const timerDisplay = page.locator('text=/00:00:0[2-9]|00:00:[1-9][0-9]/');

      await expect(timerDisplay).toBeVisible();
    });

    test.skip('should persist timer state across page navigation', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Start timer and add time
      await page.getByText('+10s').click();
      await page.getByText('+10s').click();
      await page.getByText('+10s').click();

      // Close modal
      await page.keyboard.press('Escape');

      // Navigate to settings
      await page.goto('/settings');

      // Navigate back to overview
      await page.goto('/overview');

      // Reopen modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Timer should still show 30 seconds
      await expect(page.getByText('30')).toBeVisible();
    });
  });

  test.describe('Timer formatting', () => {
    test.skip('should format time correctly for hours:minutes:seconds', async ({ page }) => {
      // TODO: Requires authenticated user with baby
      await page.goto('/overview');

      // Open add feed modal
      await page.getByRole('button', { name: /add.*feed|log.*feed/i }).click();

      // Test different time formats
      // 90 seconds = 00:01:30
      for (let i = 0; i < 9; i++) {
        await page.getByText('+10s').click();
      }

      await expect(page.getByText('01')).toBeVisible(); // minutes
      await expect(page.getByText('30')).toBeVisible(); // seconds
    });

    test.skip('should handle hour display correctly', async ({ page: _page }) => {
      // TODO: Requires authenticated user with baby and ability to set large time
      // This would need to be tested with mock data or timer store manipulation
      // 3665 seconds = 01:01:05
    });
  });
});
