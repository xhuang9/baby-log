---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - tests/pages/BasePage.ts
  - tests/pages/BootstrapPage.ts
  - tests/pages/SettingsPage.ts
  - tests/pages/index.ts
---

# E2E Page Object Models

> Status: active
> Last updated: 2026-01-17
> Owner: QA

## Purpose

Provide Playwright page object abstractions for common flows like bootstrap routing and settings/baby management.

## Key Deviations from Standard

- **Nested page objects**: `NewBabyPage` and `EditBabyPage` live in `SettingsPage.ts` instead of separate files.

## Architecture / Implementation

### Components
- `tests/pages/BasePage.ts` - Base helpers (navigation, toasts, offline banner).
- `tests/pages/BootstrapPage.ts` - Bootstrap routing flow helpers.
- `tests/pages/SettingsPage.ts` - Settings + baby management pages and forms.
- `tests/pages/index.ts` - Central exports.

### Data Flow
1. Tests instantiate a page object with a Playwright `Page`.
2. Page objects expose locators and action helpers.
3. Common navigation and toast helpers are inherited from `BasePage`.

### Code Pattern
```ts
const bootstrap = new BootstrapPage(page);
await bootstrap.goto();
const path = await bootstrap.waitForRedirect();
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `BasePage.waitForLoad` | `networkidle` | Waits for network to be idle before proceeding.
| `BootstrapPage.timeout` | `10000ms` | Default redirect wait timeout.

## Gotchas / Constraints

- **Export location**: `NewBabyPage` and `EditBabyPage` are exported from `tests/pages/index.ts` but defined in `SettingsPage.ts`.
- **Partial navigation**: `EditBabyPage.goto()` only navigates when a `babyId` is provided.

## Testing Notes

- Use `waitForNavigation()` when clicking buttons that trigger redirects.
- Prefer `hasToast()`/`waitForToast()` for notification assertions.

## Related Systems

- `.readme/chunks/testing.e2e-test-organization.md` - Test folder structure.
- `.readme/chunks/testing.playwright-e2e.md` - Playwright configuration.
