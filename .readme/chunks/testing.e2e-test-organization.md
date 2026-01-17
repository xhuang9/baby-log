---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - tests/e2e/
  - tests/fixtures/
  - tests/pages/
---

# E2E Test Organization

> Status: active
> Last updated: 2026-01-17
> Owner: QA

## Purpose

Document the directory layout for Playwright E2E tests, fixtures, and page objects.

## Key Deviations from Standard

- **Fixtures-first imports**: Tests import `test`/`expect` from `tests/fixtures` instead of Playwright directly.

## Architecture / Implementation

### Components
- `tests/e2e/` - Feature-based E2E suites (`account/`, `baby/`).
- `tests/fixtures/` - Auth + seed helpers (`auth.ts`, `seed.ts`).
- `tests/pages/` - Page object models (Bootstrap, Settings, NewBaby, EditBaby).

### Data Flow
1. Test files import fixtures (`test`, `expect`, `TEST_USERS`).
2. Page objects encapsulate locators and page actions.
3. Seed helpers hit test-only API routes when available.

### Code Pattern
```ts
import { test, expect, TEST_USERS } from '@/tests/fixtures';
import { BootstrapPage } from '@/tests/pages';
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `tests/e2e/account` | `bootstrap-routing.e2e.ts` | Bootstrap routing tests.
| `tests/e2e/baby` | `create-baby.e2e.ts`, `baby-selection.e2e.ts` | Baby flow tests (mostly skipped).

## Gotchas / Constraints

- **Seed endpoints required**: `tests/fixtures/seed.ts` expects `/api/test/seed/*` endpoints.
- **Skipped tests**: Many baby tests are `test.skip` until fixtures and routes are ready.

## Testing Notes

- Keep new E2E files under `tests/e2e/<feature>/` with `*.e2e.ts` naming.
- Export any new fixtures from `tests/fixtures/index.ts` for single-line imports.

## Related Systems

- `.readme/chunks/testing.e2e-page-objects.md` - Page object models.
- `.readme/chunks/testing.playwright-e2e.md` - Playwright config and scripts.
