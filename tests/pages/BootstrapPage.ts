/**
 * Bootstrap Page Object
 *
 * Handles the /account/bootstrap flow which determines
 * where users land after authentication.
 */

import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BootstrapPage extends BasePage {
  // Locators
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.loadingSpinner = page.getByRole('status', { name: /loading|syncing/i });
    this.errorMessage = page.getByRole('alert');
    this.retryButton = page.getByRole('button', { name: /retry|try again/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/account/bootstrap');
  }

  /**
   * Wait for bootstrap to complete and redirect
   */
  async waitForRedirect(timeout = 10000): Promise<string> {
    await this.page.waitForURL((url) => {
      const path = url.pathname;
      return !path.includes('/account/bootstrap');
    }, { timeout });
    return this.getPath();
  }

  /**
   * Check if currently showing loading state
   */
  async isLoading(): Promise<boolean> {
    return this.loadingSpinner.isVisible();
  }

  /**
   * Check if showing error state
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get the error message text
   */
  async getErrorText(): Promise<string | null> {
    if (await this.hasError()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Click retry button
   */
  async retry(): Promise<void> {
    await this.retryButton.click();
  }
}
