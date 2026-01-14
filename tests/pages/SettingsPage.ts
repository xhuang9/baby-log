/**
 * Settings Page Object
 *
 * Handles the /settings page and its sub-pages
 * including baby management.
 */

import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  // Main settings locators
  readonly heading: Locator;
  readonly babiesSection: Locator;
  readonly addBabyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /settings/i });
    this.babiesSection = page.locator('[data-testid="babies-section"]');
    this.addBabyButton = page.getByRole('link', { name: /add baby|new baby/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
  }

  /**
   * Navigate to babies management section
   */
  async gotoBabies(): Promise<void> {
    await this.page.goto('/settings/babies');
  }

  /**
   * Click add baby button
   */
  async clickAddBaby(): Promise<void> {
    await this.addBabyButton.click();
    await this.page.waitForURL(/\/settings\/babies\/new/);
  }

  /**
   * Get list of baby cards
   */
  async getBabyCards(): Promise<Locator[]> {
    const cards = this.page.locator('[data-testid="baby-card"]');
    return cards.all();
  }

  /**
   * Click on a specific baby by name
   */
  async clickBaby(name: string): Promise<void> {
    await this.page.getByRole('link', { name }).click();
  }
}

/**
 * New Baby Form Page Object
 */
export class NewBabyPage extends BasePage {
  readonly nameInput: Locator;
  readonly birthDateInput: Locator;
  readonly genderSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel(/name/i);
    this.birthDateInput = page.getByLabel(/birth date/i);
    this.genderSelect = page.getByLabel(/gender/i);
    this.submitButton = page.getByRole('button', { name: /create|save|add/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/babies/new');
  }

  /**
   * Fill the baby form
   */
  async fillForm(data: {
    name: string;
    birthDate?: string;
    gender?: 'male' | 'female';
  }): Promise<void> {
    await this.nameInput.fill(data.name);

    if (data.birthDate) {
      await this.birthDateInput.fill(data.birthDate);
    }

    if (data.gender) {
      await this.genderSelect.selectOption(data.gender);
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Cancel and go back
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Check if form has validation error
   */
  async hasValidationError(field: string): Promise<boolean> {
    const error = this.page.locator(`[data-error="${field}"]`);
    return error.isVisible();
  }
}

/**
 * Edit Baby Page Object
 */
export class EditBabyPage extends BasePage {
  readonly nameInput: Locator;
  readonly birthDateInput: Locator;
  readonly genderSelect: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly archiveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel(/name/i);
    this.birthDateInput = page.getByLabel(/birth date/i);
    this.genderSelect = page.getByLabel(/gender/i);
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.archiveButton = page.getByRole('button', { name: /archive/i });
  }

  async goto(babyId?: number): Promise<void> {
    if (babyId) {
      await this.page.goto(`/settings/babies/${babyId}`);
    }
  }

  /**
   * Update baby name
   */
  async updateName(name: string): Promise<void> {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  /**
   * Save changes
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Archive the baby
   */
  async archive(): Promise<void> {
    await this.archiveButton.click();
    // Confirm dialog
    await this.page.getByRole('button', { name: /confirm|yes/i }).click();
  }
}
