/**
 * Base Page Object
 *
 * Provides common functionality for all page objects.
 */

import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page's URL
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForURL(/.*/, { waitUntil: 'networkidle' });
  }

  /**
   * Check if a toast/notification is visible with specific text
   */
  async hasToast(text: string | RegExp): Promise<boolean> {
    const toast = this.page.getByRole('alert').filter({ hasText: text });
    return toast.isVisible();
  }

  /**
   * Wait for a toast to appear
   */
  async waitForToast(text: string | RegExp): Promise<Locator> {
    const toast = this.page.getByRole('alert').filter({ hasText: text });
    await toast.waitFor({ state: 'visible' });
    return toast;
  }

  /**
   * Get the current URL path
   */
  async getPath(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Check if the offline banner is visible
   */
  async isOfflineBannerVisible(): Promise<boolean> {
    const banner = this.page.locator('[data-offline="true"]');
    return banner.isVisible();
  }
}
