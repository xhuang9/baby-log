---
last_verified_at: 2026-01-13T00:00:00Z
source_paths:
  - vitest.config.mts
  - playwright.config.ts
  - tests/
  - src/app/[locale]/api/sync/pull/route.test.ts
  - src/app/[locale]/api/sync/push/route.test.ts
  - src/services/sync-service.test.ts
---

# Testing Overview

## Purpose
Documents the multi-mode testing strategy with Vitest and Playwright.

## Scope
This boilerplate uses a comprehensive testing approach:
- **Vitest**: Dual-project setup (Node for logic, browser for React components)
- **Playwright**: E2E and integration tests with in-memory database
- Tests are colocated with source files for maintainability

The testing setup is designed for both local development and CI environments.

## Chunks

- `.readme/chunks/testing.vitest-dual-mode.md`
  - Content: Vitest configuration with separate `unit` (Node) and `ui` (browser) projects
  - Read when: Writing tests, understanding test environment selection, or debugging test failures

- `.readme/chunks/testing.sync-mocking-patterns.md`
  - Content: Mocking patterns for Clerk auth, Drizzle ORM, IndexedDB, and fetch in sync API tests
  - Read when: Writing unit tests for API routes with auth, testing database operations, or mocking external dependencies

- `.readme/chunks/testing.playwright-e2e.md`
  - Content: Playwright setup with in-memory database and custom test patterns
  - Read when: Writing E2E tests, configuring test database, or working with `.spec.ts` and `.e2e.ts` files

- `.readme/chunks/testing.checkly-monitoring.md`
  - Content: Checkly monitoring-as-code with `.check.e2e.ts` files for uptime monitoring
  - Read when: Setting up production monitoring, writing monitoring tests, or configuring Checkly
