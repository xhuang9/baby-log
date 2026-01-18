---
last_verified_at: 2026-01-18T00:00:00Z
source_paths:
  - .readme/sections/
---

# Next.js Boilerplate Documentation Map

This boilerplate is a production-ready Next.js 16+ starter with App Router, TypeScript, Tailwind CSS 4, DrizzleORM, Clerk authentication, and comprehensive testing. It emphasizes developer experience with strict type safety, automated code quality, and integrated monitoring.

This project implements a local-first architecture with Dexie (IndexedDB) as the immediate read model and TanStack Query as an ephemeral network scheduler. **All authenticated routes require Clerk middleware** - IndexedDB provides fast cached data access, but authentication is mandatory for all app pages.

## Documentation Sections

### `.readme/sections/architecture.index.md`
**Core architectural patterns, project structure, and client-first page pattern**
Read when: Understanding route organization, route groups, layout hierarchy, instant navigation with IndexedDB-driven pages, folder structure reorganization, or how the app is structured differently from standard Next.js projects.

### `.readme/sections/database.index.md`
**DrizzleORM setup, migrations, and connection management**
Read when: Working with database schema, migrations, DrizzleORM queries, or database connection configuration.

### `.readme/sections/internationalization.index.md`
**next-intl setup with locale routing and Clerk integration**
Read when: Adding translations, working with locale-aware routes, or integrating i18n with authentication.

### `.readme/sections/authentication.index.md`
**Clerk authentication with locale-aware configuration and required auth for all app routes**
Read when: Working with Clerk authentication setup, protected routes (all routes under `(auth)` are protected via `src/proxy.ts`), or understanding auth-to-account flow integration.

### `.readme/sections/account-management.index.md`
**Unified bootstrap post-auth flow, baby multi-tenancy, and sharing system**
Read when: Working with post-auth flows, understanding the unified bootstrap API, implementing offline fallback, baby selection, multi-baby management, invite acceptance, or debugging account state logic.

### `.readme/sections/baby-management.index.md`
**Baby management UI, editing, and multi-baby switching**
Read when: Building or modifying the baby list interface, implementing baby edit forms, understanding the flattened UI pattern, or working with inline switch actions.

### `.readme/sections/feed-logging.index.md`
**Feed logging system with dual methods, automatic estimation, and caregiver attribution**
Read when: Implementing or modifying feed tracking, working with breast/bottle feeds, understanding amount estimation, or adding new activity types.

### `.readme/sections/local-first.index.md`
**Local-first architecture with Dexie, TanStack Query, delta sync, and required authentication**
Read when: Working with IndexedDB data caching, understanding cursor-based delta sync, working with sync endpoints (pull/push), using sync hooks (useSyncScheduler), adding new log types, debugging sync status, setting up outbox pattern, or preparing for PWA/iOS development. **Note:** All app routes require Clerk authentication - IndexedDB is for caching, not auth bypass.

### `.readme/sections/configuration.index.md`
**Centralized library configs and environment variables**
Read when: Setting up third-party libraries, managing environment variables, or understanding the `/lib` structure.

### `.readme/sections/testing.index.md`
**Multi-mode testing with Vitest and Playwright, E2E test infrastructure with fixtures and page objects**
Read when: Writing tests, configuring test environments, understanding the dual-project Vitest setup, creating E2E tests with authentication fixtures, using page object models, seeding test data, organizing test files, or mocking Clerk auth, Drizzle ORM, and IndexedDB in unit tests.

### `.readme/sections/monitoring.index.md`
**Sentry, logging, analytics, and security integrations**
Read when: Working with error monitoring, logging, analytics (PostHog), security (Arcjet), or uptime monitoring (Checkly).

### `.readme/sections/code-quality.index.md`
**TypeScript strictness, ESLint, git hooks, and validation**
Read when: Understanding linting rules, commit conventions, type safety patterns, or pre-commit workflows.

### `.readme/sections/build-deploy.index.md`
**Build configuration, Sentry integration, and deployment patterns**
Read when: Configuring builds, setting up CI/CD, or understanding the custom Next.js configuration.

### `.readme/sections/performance.index.md`
**Instant navigation architecture, PWA configuration, service worker caching, offline indicators, and loading states**
Read when: Understanding performance-first architecture with middleware bypass and IndexedDB-driven rendering, working with Progressive Web App features, implementing offline indicators, configuring offline support, adding loading states, or optimizing navigation performance.

### `.readme/sections/styling.index.md`
**Brand guidelines, color system, dark/light mode theming, and activity-specific styling**
Read when: Applying colors or styles, creating UI components, working with dark/light mode, understanding the brand palette, or adding new color tokens. **IMPORTANT:** This project requires both dark and light mode support - always test in both themes.

## Quick Reference

**Default Locale:** `en` (English)
**Supported Locales:** `en`
**Route Pattern:** All routes under `src/app/[locale]/`
**Path Alias:** `@/` → `src/`
**Database:** PostgreSQL via DrizzleORM (Neon in dev)
**Auth Provider:** Clerk
**Styling:** Tailwind CSS 4 with custom brand palette
**Theme:** Dark + Light mode required (`.dark` class toggle)
**Brand Colors:** Mint green (primary), soft pink (secondary), soft blue (accent)
