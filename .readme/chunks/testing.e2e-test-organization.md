---
last_verified_at: 2026-01-14T00:00:00Z
source_paths:
  - tests/e2e/
  - tests/fixtures/
  - tests/pages/
---

# E2E Test Organization

## Purpose
Documents the directory structure and organizational patterns for E2E tests after the test infrastructure overhaul.

## Key Changes from Previous Structure

### Deleted
- `tests/e2e-tests/baby-creation-scaffold.spec.ts` (2000+ lines, empty tests)
- `tests/e2e-tests/baby-selection-scaffold.spec.ts` (2000+ lines, empty tests)
- `tests/e2e-tests/bootstrap-routing-scaffold.spec.ts` (500+ lines, empty tests)
- `tests/e2e-tests/settings-scaffold.spec.ts` (1500+ lines, empty tests)
- Legacy demo tests: `counter.e2e.ts`, `portfolio.e2e.ts`, `about.e2e.ts`

**Problem:** Scaffolds had extensive ESLint disable comments hiding empty `test.skip()` blocks, making the codebase harder to maintain.

### Created
- `tests/fixtures/` - Authentication and seeding fixtures
- `tests/pages/` - Page object models
- `tests/e2e/` - Organized test files by feature area

## Directory Structure

```
tests/
├── fixtures/
│   ├── index.ts              # Re-exports all fixtures
│   ├── auth.ts               # TEST_USERS, authenticateAs, clearAuth
│   └── seed.ts               # seedTestBaby, seedBabyAccess, etc.
│
├── pages/
│   ├── index.ts              # Re-exports all page objects
│   ├── BasePage.ts           # Abstract base with common utilities
│   ├── BootstrapPage.ts      # Bootstrap/routing page
│   └── SettingsPage.ts       # Settings, NewBabyPage, EditBabyPage
│
└── e2e/
    ├── account/
    │   └── bootstrap-routing.e2e.ts
    │
    └── baby/
        ├── create-baby.e2e.ts
        └── baby-selection.e2e.ts
```

## Organizational Patterns

### Feature-Based Directories
Tests are grouped by feature area, not by type:

```
tests/e2e/
├── account/          # Account management flows
├── baby/             # Baby creation, selection, editing
├── feed/             # Feed logging (future)
├── insights/         # Analytics/insights (future)
└── settings/         # Settings pages (future)
```

### File Naming
- `*.e2e.ts` - End-to-end tests (full user flows)
- `*.spec.ts` - Integration tests (smaller scope)
- `*.check.e2e.ts` - Checkly monitoring tests (production)

### Test Describe Blocks
Organize test suites hierarchically:

```typescript
test.describe('Bootstrap Routing', () => {
  test.describe('Unauthenticated users', () => {
    test('should redirect to sign-in page', async ({ page }) => {
      // ...
    });
  });

  test.describe('Authenticated users', () => {
    test('should route based on account state', async ({ page }) => {
      // ...
    });
  });
});
```

## Import Patterns

### Centralized Exports
All fixtures and page objects are re-exported from index files:

```typescript
// tests/fixtures/index.ts
export * from './auth';
export * from './seed';

// tests/pages/index.ts
export * from './BasePage';
export * from './BootstrapPage';
export * from './SettingsPage';
```

### Clean Imports in Tests
```typescript
// Clean, single import line
import { test, expect, TEST_USERS } from '@/tests/fixtures';
import { BootstrapPage, SettingsPage } from '@/tests/pages';

// NOT scattered imports
// import { test } from '@playwright/test';
// import { expect } from '@playwright/test';
// import { TEST_USERS } from '@/tests/fixtures/auth';
```

## Test Development Workflow

### 1. Start with Skipped Tests
New test files start with `test.skip()` blocks with TODO comments:

```typescript
test.describe('Create Baby', () => {
  test.skip('should display create baby form', async ({ page }) => {
    // TODO: Requires authenticated user fixture
    await page.goto('/account/onboarding/baby');
    // ...
  });
});
```

**Rationale:**
- Documents expected behavior
- Prevents test failures during development
- Clear indication of work in progress

### 2. Implement Supporting Infrastructure
Before enabling tests:
1. Create/update page objects
2. Add necessary fixtures
3. Implement test API endpoints (if needed)

### 3. Enable Tests Incrementally
Remove `.skip()` as functionality is ready:

```typescript
test('should display create baby form', async ({ page, authenticateAs }) => {
  await authenticateAs(page, TEST_USERS.newUser);
  await page.goto('/account/onboarding/baby');
  // ...
});
```

## Current State

### Implemented
- ✅ Authentication fixtures (`tests/fixtures/auth.ts`)
- ✅ Seeding fixtures structure (`tests/fixtures/seed.ts`)
- ✅ Page objects (Bootstrap, Settings, NewBaby, EditBaby)
- ✅ Base test infrastructure

### In Progress
- 🚧 Test API endpoints for seeding (`/api/test/seed/*`)
- 🚧 Actual test implementations (most are `test.skip()`)

### Not Started
- ⏳ Feed logging E2E tests
- ⏳ Insights dashboard E2E tests
- ⏳ Invite flow E2E tests
- ⏳ Multi-baby selection E2E tests

## Patterns for Adding New Tests

### 1. Create Page Object (if needed)
```typescript
// tests/pages/OverviewPage.ts
import { BasePage } from './BasePage';

export class OverviewPage extends BasePage {
  async goto() {
    await this.page.goto('/overview');
  }

  async logFeed() {
    await this.page.getByRole('button', { name: /log.*feed/i }).click();
  }
}
```

### 2. Add to Feature Directory
```typescript
// tests/e2e/feed/log-feed.e2e.ts
import { test, expect, TEST_USERS } from '@/tests/fixtures';
import { OverviewPage } from '@/tests/pages';

test.describe('Log Feed', () => {
  test('should open feed logging sheet', async ({ page, authenticateAs }) => {
    await authenticateAs(page, TEST_USERS.singleBabyUser);

    const overview = new OverviewPage(page);
    await overview.goto();
    await overview.logFeed();

    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
```

### 3. Use Descriptive Test Names
```typescript
// ✅ Good - describes expected behavior
test('should redirect new users to onboarding');
test('should validate baby name is required');
test('should archive baby and hide from active list');

// ❌ Bad - too vague
test('test bootstrap');
test('baby form');
test('settings page works');
```

## Gotchas

- **Avoid monolithic test files**: Keep test files under 200 lines by splitting into multiple files
- **Skip placeholder tests**: Use `test.skip()` with TODO comments, don't commit empty tests
- **Feature isolation**: Tests in `baby/` shouldn't depend on tests in `account/`
- **Shared setup helpers**: Extract common setup logic to helper functions in `tests/helpers/`
- **No ESLint disables**: If you need to disable linting, the test is probably wrong

## Benefits of New Structure

1. **Maintainability**: Smaller, focused test files
2. **Reusability**: Page objects and fixtures reduce duplication
3. **Discoverability**: Feature-based organization is intuitive
4. **Type Safety**: TypeScript throughout with proper types
5. **Progressive Enhancement**: Easy to add tests incrementally

## Related
- `.readme/chunks/testing.e2e-fixtures-auth.md` - Authentication fixtures
- `.readme/chunks/testing.e2e-fixtures-seed.md` - Database seeding
- `.readme/chunks/testing.e2e-page-objects.md` - Page object models
- `.readme/chunks/testing.playwright-e2e.md` - Playwright configuration
