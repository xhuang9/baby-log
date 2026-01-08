---
last_verified_at: 2026-01-08T14:30:00Z
source_paths:
  - .readme/sections/
---

# Next.js Boilerplate Documentation Map

This boilerplate is a production-ready Next.js 16+ starter with App Router, TypeScript, Tailwind CSS 4, DrizzleORM, Clerk authentication, and comprehensive testing. It emphasizes developer experience with strict type safety, automated code quality, and integrated monitoring.

## Documentation Sections

### `.readme/sections/architecture.index.md`
**Core architectural patterns and project structure**
Read when: Understanding route organization, route groups, layout hierarchy, or how the app is structured differently from standard Next.js projects.

### `.readme/sections/database.index.md`
**DrizzleORM setup, migrations, and connection management**
Read when: Working with database schema, migrations, DrizzleORM queries, or database connection configuration.

### `.readme/sections/internationalization.index.md`
**next-intl setup with locale routing and Clerk integration**
Read when: Adding translations, working with locale-aware routes, or integrating i18n with authentication.

### `.readme/sections/authentication.index.md`
**Clerk authentication with locale-aware configuration and custom account resolution**
Read when: Working with Clerk authentication setup, protected routes, or understanding auth-to-account flow integration.

### `.readme/sections/account-management.index.md`
**Account resolution, baby multi-tenancy, and sharing system**
Read when: Working with post-auth flows, baby selection, multi-baby management, invite acceptance, or understanding sessionStorage state sync patterns.

### `.readme/sections/baby-management.index.md`
**Baby management UI, editing, and multi-baby switching**
Read when: Building or modifying the baby list interface, implementing baby edit forms, understanding the flattened UI pattern, or working with inline switch actions.

### `.readme/sections/feed-logging.index.md`
**Feed logging system with dual methods, automatic estimation, and caregiver attribution**
Read when: Implementing or modifying feed tracking, working with breast/bottle feeds, understanding amount estimation, or adding new activity types.

### `.readme/sections/configuration.index.md`
**Centralized library configs and environment variables**
Read when: Setting up third-party libraries, managing environment variables, or understanding the `/lib` structure.

### `.readme/sections/testing.index.md`
**Multi-mode testing with Vitest and Playwright**
Read when: Writing tests, configuring test environments, or understanding the dual-project Vitest setup.

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
**PWA configuration, service worker caching, loading states, and performance optimization**
Read when: Working with Progressive Web App features, configuring offline support, adding loading states, or optimizing navigation performance.

## Quick Reference

**Default Locale:** `en` (English)
**Supported Locales:** `en`
**Route Pattern:** All routes under `src/app/[locale]/`
**Path Alias:** `@/` → `src/`
**Database:** PostgreSQL via DrizzleORM (Neon in dev)
**Auth Provider:** Clerk
**Styling:** Tailwind CSS 4
