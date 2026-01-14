---
last_verified_at: 2026-01-14T00:00:00Z
source_paths:
  - tests/pages/BasePage.ts
  - tests/pages/BootstrapPage.ts
  - tests/pages/SettingsPage.ts
  - tests/pages/index.ts
---

# E2E Page Object Models

## Purpose
Page Object Model (POM) pattern for Playwright E2E tests, providing reusable page abstractions with locators and common interactions.

## Key Deviations from Standard
- Abstract `BasePage` class with common utilities
- Dedicated page classes for each major UI area
- Locators defined as class properties (not methods)
- Custom helpers for toast notifications and offline states

## Architecture

### File Structure
```
tests/pages/
├── index.ts         # Re-exports all page objects
├── BasePage.ts      # Abstract base class
├── BootstrapPage.ts # Bootstrap/routing page
└── SettingsPage.ts  # Settings and baby management
```

### Inheritance Hierarchy
```
BasePage (abstract)
├── BootstrapPage
├── SettingsPage
├── NewBabyPage
└── EditBabyPage
```

## BasePage (Abstract)

### File: `tests/pages/BasePage.ts`

All page objects extend this base class.

### Common Properties
```typescript
abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  abstract goto(): Promise<void>; // Must implement in subclasses
}
```

### Common Methods

#### `waitForLoad()`
Waits for page to be fully loaded with network idle.

```typescript
await settingsPage.waitForLoad();
```

#### `waitForNavigation()`
Waits for any navigation to complete.

```typescript
await bootstrapPage.waitForNavigation();
```

#### `hasToast(text)` / `waitForToast(text)`
Check for or wait for toast notifications.

```typescript
// Check if toast is visible
const hasSuccess = await page.hasToast('Baby created');

// Wait for toast to appear
const toast = await page.waitForToast(/success/i);
await expect(toast).toBeVisible();
```

#### `getPath()`
Get current URL pathname.

```typescript
const path = await page.getPath();
expect(path).toBe('/settings/babies');
```

#### `isOfflineBannerVisible()`
Check if offline mode banner is shown.

```typescript
if (await page.isOfflineBannerVisible()) {
  // Handle offline state
}
```

## BootstrapPage

### File: `tests/pages/BootstrapPage.ts`

Handles the `/account/bootstrap` flow that routes users based on account state.

### Locators
```typescript
readonly loadingSpinner: Locator;
readonly errorMessage: Locator;
readonly retryButton: Locator;
```

### Methods

#### `goto()`
Navigate to bootstrap page.

```typescript
const bootstrap = new BootstrapPage(page);
await bootstrap.goto(); // -> /account/bootstrap
```

#### `waitForRedirect(timeout?)`
Wait for bootstrap to determine route and redirect.

**Returns:** Final path after redirect

```typescript
const finalPath = await bootstrap.waitForRedirect(10000);
expect(finalPath).toBe('/overview');
```

#### `isLoading()`
Check if showing loading spinner.

```typescript
const loading = await bootstrap.isLoading();
```

#### `hasError()` / `getErrorText()`
Check for error state and retrieve error message.

```typescript
if (await bootstrap.hasError()) {
  const message = await bootstrap.getErrorText();
  console.log('Error:', message);
}
```

#### `retry()`
Click retry button (when error occurs).

```typescript
await bootstrap.retry();
```

### Usage Example
```typescript
import { test, expect, TEST_USERS } from '@/tests/fixtures';
import { BootstrapPage } from '@/tests/pages';

test('new user bootstrap', async ({ page, authenticateAs }) => {
  await authenticateAs(page, TEST_USERS.newUser);

  const bootstrap = new BootstrapPage(page);
  await bootstrap.goto();

  // Wait for routing decision
  const path = await bootstrap.waitForRedirect();

  // New user should go to onboarding
  expect(path).toContain('/onboarding');
});
```

## SettingsPage

### File: `tests/pages/SettingsPage.ts`

Main settings page and babies management.

### Locators
```typescript
readonly heading: Locator;
readonly babiesSection: Locator;
readonly addBabyButton: Locator;
```

### Methods

#### `goto()` / `gotoBabies()`
Navigate to settings pages.

```typescript
const settings = new SettingsPage(page);
await settings.goto();         // -> /settings
await settings.gotoBabies();   // -> /settings/babies
```

#### `clickAddBaby()`
Click add baby button and wait for navigation to new baby form.

```typescript
await settings.clickAddBaby();
// Now on /settings/babies/new
```

#### `getBabyCards()`
Get all baby card elements.

```typescript
const cards = await settings.getBabyCards();
expect(cards.length).toBe(2);
```

#### `clickBaby(name)`
Click on a specific baby by name.

```typescript
await settings.clickBaby('Test Baby');
// Now on /settings/babies/:id
```

## NewBabyPage

### File: `tests/pages/SettingsPage.ts`

Form for creating a new baby.

### Locators
```typescript
readonly nameInput: Locator;
readonly birthDateInput: Locator;
readonly genderSelect: Locator;
readonly submitButton: Locator;
readonly cancelButton: Locator;
```

### Methods

#### `fillForm(data)`
Fill the baby creation form.

```typescript
const newBaby = new NewBabyPage(page);
await newBaby.goto();

await newBaby.fillForm({
  name: 'Test Baby',
  birthDate: '2024-01-15',
  gender: 'female',
});
```

#### `submit()` / `cancel()`
Submit or cancel the form.

```typescript
await newBaby.submit();
// Or
await newBaby.cancel();
```

#### `hasValidationError(field)`
Check if a field has validation error.

```typescript
await newBaby.submit();

const hasError = await newBaby.hasValidationError('name');
expect(hasError).toBe(true);
```

## EditBabyPage

### File: `tests/pages/SettingsPage.ts`

Form for editing existing baby.

### Locators
```typescript
readonly nameInput: Locator;
readonly birthDateInput: Locator;
readonly genderSelect: Locator;
readonly saveButton: Locator;
readonly deleteButton: Locator;
readonly archiveButton: Locator;
```

### Methods

#### `goto(babyId?)`
Navigate to edit page for specific baby.

```typescript
const editBaby = new EditBabyPage(page);
await editBaby.goto(123); // -> /settings/babies/123
```

#### `updateName(name)`
Change baby name.

```typescript
await editBaby.updateName('New Name');
```

#### `save()`
Save changes.

```typescript
await editBaby.save();
```

#### `archive()`
Archive the baby (with confirmation).

```typescript
await editBaby.archive();
// Automatically handles confirmation dialog
```

## Patterns

### Complete Flow Test

```typescript
import { test, expect, TEST_USERS } from '@/tests/fixtures';
import { SettingsPage, NewBabyPage } from '@/tests/pages';

test('create baby flow', async ({ page, authenticateAs }) => {
  await authenticateAs(page, TEST_USERS.singleBabyUser);

  // Navigate to settings
  const settings = new SettingsPage(page);
  await settings.goto();

  // Click add baby
  await settings.clickAddBaby();

  // Fill form
  const newBaby = new NewBabyPage(page);
  await newBaby.fillForm({
    name: 'Test Baby',
    birthDate: '2024-01-15',
  });

  // Submit
  await newBaby.submit();

  // Verify
  await expect(page).toHaveURL(/\/settings\/babies/);
  await settings.waitForToast('Baby created');
});
```

### Reusing Page Objects

```typescript
// Create helper functions
async function createBaby(page: Page, name: string) {
  const settings = new SettingsPage(page);
  await settings.gotoBabies();
  await settings.clickAddBaby();

  const newBaby = new NewBabyPage(page);
  await newBaby.fillForm({ name });
  await newBaby.submit();
}

// Use in tests
test('multiple babies', async ({ page, authenticateAs }) => {
  await authenticateAs(page, TEST_USERS.multiBabyUser);

  await createBaby(page, 'First Baby');
  await createBaby(page, 'Second Baby');

  const settings = new SettingsPage(page);
  const cards = await settings.getBabyCards();
  expect(cards.length).toBe(2);
});
```

### Extending Page Objects

Add new page objects following the same pattern:

```typescript
// tests/pages/OverviewPage.ts
import { BasePage } from './BasePage';
import type { Locator, Page } from '@playwright/test';

export class OverviewPage extends BasePage {
  readonly activityFeed: Locator;
  readonly logFeedButton: Locator;

  constructor(page: Page) {
    super(page);
    this.activityFeed = page.locator('[data-testid="activity-feed"]');
    this.logFeedButton = page.getByRole('button', { name: /log.*feed/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/overview');
  }

  async logFeed(): Promise<void> {
    await this.logFeedButton.click();
  }
}
```

## Gotchas

- **Abstract goto()**: Subclasses must implement `goto()` method
- **Locator timing**: Locators are lazy, access them only in test methods (not constructor)
- **Page reference**: Always access page via `this.page`, not direct reference
- **Export pattern**: Export page objects from `tests/pages/index.ts` for clean imports
- **Toast timing**: Toast notifications may appear briefly, use `waitForToast()` not `hasToast()` in tests

## Related
- `.readme/chunks/testing.e2e-fixtures-auth.md` - Authentication fixtures
- `.readme/chunks/testing.playwright-e2e.md` - E2E testing overview
- `.readme/chunks/testing.e2e-test-organization.md` - Test file structure
