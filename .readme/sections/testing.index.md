---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - vitest.config.mts
  - playwright.config.ts
  - tests/
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

- `.readme/chunks/testing.playwright-e2e.md`
  - Content: Playwright setup with in-memory database and custom test patterns
  - Read when: Writing E2E tests, configuring test database, or working with `.spec.ts` and `.e2e.ts` files

- `.readme/chunks/testing.checkly-monitoring.md`
  - Content: Checkly monitoring-as-code with `.check.e2e.ts` files for uptime monitoring
  - Read when: Setting up production monitoring, writing monitoring tests, or configuring Checkly
