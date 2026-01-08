# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ IMPORTANT: Package Manager

**This project uses `pnpm`, NOT `npm`.**

- NEVER run `npm install` commands
- Use `pnpm add <package>` to install dependencies
- Use `pnpm run <script>` for running scripts (though `npm run` still works)
- All documentation commands below use `npm run` which will work, but for installing packages always use `pnpm`

## Project Overview

Next.js 16+ boilerplate with App Router, TypeScript, Tailwind CSS 4, DrizzleORM, Clerk authentication, and comprehensive testing setup. Emphasizes developer experience with strict TypeScript configuration, code quality tools, and production-ready integrations.

## Essential Commands

### Development
```bash
npm run dev                 # Start development server with DB migration and Spotlight
npm run dev:next            # Start Next.js dev server only
npm run dev:spotlight       # Start Sentry Spotlight for local error monitoring
```

### Database
```bash
npm run db:generate         # Generate migration from schema changes in src/models/Schema.ts
npm run db:migrate          # Apply pending migrations
npm run db:studio           # Open Drizzle Studio at https://local.drizzle.studio
npm run db-server:file      # Start local file-based PGlite server
npm run db-server:memory    # Start in-memory PGlite server (temporary)
npm run neon:claim          # Claim temporary DB to make it persistent (expires in 72h)
```

### Build & Deploy
```bash
npm run build               # Production build with remote DB
npm run build-local         # Production build with in-memory DB (testing)
npm start                   # Start production server
npm run build-stats         # Build with bundle analyzer
```

### Testing
```bash
npm run test                # Run Vitest unit tests (node + browser mode)
npm run test:e2e            # Run Playwright integration/E2E tests
```

### Code Quality
```bash
npm run lint                # Run ESLint
npm run lint:fix            # Auto-fix linting issues
npm run check:types         # TypeScript type checking
npm run check:deps          # Find unused dependencies and files (Knip)
npm run check:i18n          # Validate translations completeness
npm run commit              # Interactive conventional commit prompt
```

## Architecture

### Route Structure
The app uses Next.js App Router with internationalization:
- `src/app/[locale]/` - All routes are locale-prefixed
- `src/app/[locale]/(marketing)/` - Public marketing pages (about, portfolio, counter)
- `src/app/[locale]/(auth)/` - Protected authenticated routes (dashboard)
- `src/app/[locale]/(auth)/(center)/` - Centered layout auth pages (sign-in, sign-up)
- `src/app/[locale]/api/` - API routes

### Core Libraries Configuration
All third-party library configurations are centralized in `src/libs/`:
- `Env.ts` - Type-safe environment variables via @t3-oss/env-nextjs (validates at build time)
- `DB.ts` - DrizzleORM database client configuration
- `I18n.ts` - next-intl internationalization setup
- `I18nNavigation.ts` & `I18nRouting.ts` - Routing helpers for i18n
- `Logger.ts` - LogTape logging configuration (console in dev, Better Stack in prod)
- `Arcjet.ts` - Security client (bot detection, WAF, rate limiting)

### Database Architecture
- **ORM**: DrizzleORM with PostgreSQL dialect
- **Schema**: Define tables in `src/models/Schema.ts`
- **Migrations**: Auto-generated in `migrations/` directory via `npm run db:generate`
- **Local Dev**: Temporary Neon PostgreSQL database (claim with `npm run neon:claim` before 72h)
- **Production**: Use claimed Neon database or any PostgreSQL provider

### Authentication Flow
- **Provider**: Clerk
- **Config**: `src/utils/AppConfig.ts` for locale-specific Clerk localizations
- **Protected Routes**: Wrapped in Clerk's auth middleware (automatic)
- **Locales**: Supports `en` (default) with Clerk UI translations

### Internationalization (i18n)
- **Library**: next-intl with locale prefixing ("as-needed" mode)
- **Default Locale**: English (`en`)
- **Supported Locales**: Configured in `src/utils/AppConfig.ts`
- **Translation Files**: Stored in `src/locales/[locale]/` as JSON
- **Validation**: Run `npm run check:i18n` to find missing translations
- **CI Integration**: Auto-syncs with Crowdin on push to main branch

### Environment Variables
- **Required for dev**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`
- **Optional**: `ARCJET_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, Sentry vars, Better Stack tokens
- **Type Safety**: Validated in `src/libs/Env.ts` - build fails if required vars missing
- **Sensitive Data**: Never commit to `.env` - use `.env.local` (gitignored)

### Testing Strategy
- **Unit Tests**: Vitest with two projects:
  - `unit` - Node environment for logic tests (`.test.{js,ts}`)
  - `ui` - Browser mode with Playwright for React components (`.test.tsx`, hooks)
- **Integration/E2E**: Playwright (`*.spec.ts` and `*.e2e.ts` in `tests/`)
- **Test Location**: Unit tests are colocated with source files

### Code Quality Standards
- **TypeScript**: Strict mode with additional safety checks (noUncheckedIndexedAccess, noUnusedLocals, etc.)
- **ESLint**: Antfu config with Next.js, React, and Tailwind rules
- **Commit Convention**: Conventional Commits enforced via Commitlint
- **Git Hooks**: Lefthook runs linters on staged files pre-commit
- **Unused Code**: Knip detects unused files, dependencies, exports

## Important Patterns

### Path Aliases
- Use `@/` prefix for all imports from `src/`
- Use `@/public/` for public assets
- Configured in `tsconfig.json` paths

### Database Schema Updates
1. Edit `src/models/Schema.ts`
2. Run `npm run db:generate` to create migration
3. Migration auto-applies on next `npm run dev` or run `npm run db:migrate` manually
4. No server restart needed after migration

### Adding New Pages
- Marketing pages: Create in `src/app/[locale]/(marketing)/[page-name]/page.tsx`
- Protected pages: Create in `src/app/[locale]/(auth)/[page-name]/page.tsx`
- All pages automatically get locale routing via `[locale]` dynamic segment

### Form Handling
- Use React Hook Form (`react-hook-form`) for form state
- Validation: Zod schemas in `src/validations/`
- Integration: `@hookform/resolvers` connects Zod to React Hook Form

### Monitoring & Observability
- **Error Monitoring**: Sentry (disabled in dev, uses Spotlight instead at `http://localhost:8969`)
- **Logging**: LogTape with Better Stack integration for production
- **Analytics**: PostHog for product analytics
- **Uptime Monitoring**: Checkly runs E2E tests (`.check.e2e.ts`) at intervals
- **Security**: Arcjet Shield WAF configured in `src/libs/Arcjet.ts` and applied in middleware

### Styling
- **Framework**: Tailwind CSS 4
- **Config**: `postcss.config.mjs` loads Tailwind via PostCSS
- **Global Styles**: `src/styles/` directory
- **Templates**: Base layouts in `src/templates/`

## Project-Specific Conventions

### Component Organization
- `src/components/` - Reusable React components
- `src/templates/` - Layout templates and base structures

### Type Definitions
- Global types: `src/types/`
- Drizzle generates types automatically from schema

### Utilities
- `src/utils/` - Helper functions and shared utilities
- `src/utils/AppConfig.ts` - Central app configuration (app name, locales, etc.)

## Configuration Files Reference
- `next.config.ts` - Next.js config with Sentry, bundle analyzer, i18n plugin
- `drizzle.config.ts` - DrizzleORM migration settings
- `vitest.config.mts` - Vitest with browser mode for React components
- `playwright.config.ts` - E2E testing with Chromium (+ Firefox in CI)
- `eslint.config.mjs` - Antfu ESLint configuration
- `commitlint.config.ts` - Conventional commit rules
- `knip.config.ts` - Unused code detection
- `checkly.config.ts` - Monitoring as code configuration

## Documentation Index

### Root Documentation Map
- `.readme/index.root.md`
  **Purpose:** Global documentation navigation map showing all sections and chunks
  **Read when:** First time working with this codebase, or when you need to find specific documentation

- `.readme/tree.txt`
  **Purpose:** Snapshot of the repository tree (excludes `node_modules`, `packages`, `.git`, `.next`, `out`, `coverage`)
  **Read when:** You need a fast map of file locations or a quick structure scan

### Architecture Documentation
- `.readme/sections/architecture.index.md`
  **Purpose:** Core architectural patterns and project structure
  **Read when:** Understanding route organization, layout hierarchy, or structural conventions

- `.readme/chunks/architecture.route-structure.md`
  **Purpose:** Route groups, nested layouts, and Next.js App Router patterns
  **Read when:** Creating pages, understanding the `(marketing)` and `(auth)` route groups

- `.readme/chunks/architecture.libs-pattern.md`
  **Purpose:** Centralized library configuration pattern in `src/lib/`
  **Read when:** Configuring third-party libraries, understanding where configs live

- `.readme/chunks/architecture.path-aliases.md`
  **Purpose:** `@/` path alias and import conventions
  **Read when:** Adding imports or understanding project import patterns

- `.readme/chunks/architecture.typescript-config.md`
  **Purpose:** Advanced TypeScript strictness options beyond `strict: true`
  **Read when:** Dealing with type errors, especially `| undefined` from array access

- `.readme/chunks/architecture.breadcrumb-system.md`
  **Purpose:** Zustand-based breadcrumb and page title system with hook-based state management
  **Read when:** Adding breadcrumbs or page titles to pages, understanding the useSetBreadcrumb/useSetPageTitle hooks, or working with AppHeader navigation

- `.readme/chunks/architecture.mobile-back-button.md`
  **Purpose:** Intelligent mobile back button navigation using breadcrumb hierarchy
  **Read when:** Working with mobile navigation, understanding the back button logic, or debugging mobile header behavior

### Database Documentation
- `.readme/sections/database.index.md`
  **Purpose:** DrizzleORM setup, schema management, and migrations
  **Read when:** Working with database, adding tables, or running migrations

- `.readme/chunks/database.schema-workflow.md`
  **Purpose:** Schema-first workflow and migration generation
  **Read when:** Adding/modifying database tables or understanding the migration process

- `.readme/chunks/database.connection-pattern.md`
  **Purpose:** Global singleton connection pattern for hot-reload compatibility
  **Read when:** Understanding DB connection, debugging connection issues

- `.readme/chunks/database.neon-integration.md`
  **Purpose:** Temporary Neon database provisioning and claiming
  **Read when:** Setting up database for first time or claiming temporary DB

- `.readme/chunks/database.pglite-local.md`
  **Purpose:** Local PGlite server for offline/testing
  **Read when:** Working offline or need local database for testing

### Internationalization Documentation
- `.readme/sections/internationalization.index.md`
  **Purpose:** next-intl setup with locale routing
  **Read when:** Working with translations, locale-specific features, or i18n routing

- `.readme/chunks/i18n.routing-integration.md`
  **Purpose:** Locale-prefixed routing with "as-needed" mode
  **Read when:** Creating locale-aware links, understanding URL structure

- `.readme/chunks/i18n.translation-workflow.md`
  **Purpose:** Translation management and Crowdin integration
  **Read when:** Adding translations, working with locale files

- `.readme/chunks/i18n.clerk-localization.md`
  **Purpose:** Clerk authentication UI localization
  **Read when:** Working with auth UI in multiple languages

### Authentication Documentation
- `.readme/sections/authentication.index.md`
  **Purpose:** Clerk authentication with locale-aware configuration and custom account resolution
  **Read when:** Working with Clerk setup, protected routes, or understanding auth-to-account flow

- `.readme/chunks/auth.clerk-layout-pattern.md`
  **Purpose:** ClerkProvider scoping to `(auth)` route group
  **Read when:** Understanding auth layout composition or adding protected pages

- `.readme/chunks/auth.post-auth-flow.md`
  **Purpose:** Legacy post-authentication workflow (SUPERSEDED by account resolution)
  **Read when:** Understanding historical implementation or migration context

- `.readme/chunks/auth.route-group-structure.md`
  **Purpose:** Nested `(auth)` and `(center)` route groups
  **Read when:** Understanding layout composition for auth pages

- `.readme/chunks/auth.tailwind-compatibility.md`
  **Purpose:** Clerk + Tailwind CSS v4 CSS layer compatibility
  **Read when:** Styling Clerk components or resolving CSS conflicts

### Account Management Documentation
- `.readme/sections/account-management.index.md`
  **Purpose:** Account resolution flow, baby multi-tenancy, and sharing system
  **Read when:** Working with post-auth flows, baby selection, multi-baby management, or invite acceptance

- `.readme/chunks/account.resolution-flow.md`
  **Purpose:** Custom account resolution decision tree that determines post-auth routing
  **Read when:** Understanding post-auth flow, adding account states, or debugging redirect loops

- `.readme/chunks/account.baby-multi-tenancy.md`
  **Purpose:** Multi-baby tracking with access control, default baby selection, and shared access patterns
  **Read when:** Working with baby queries, implementing baby-scoped features, or understanding access levels

- `.readme/chunks/account.state-sync-pattern.md`
  **Purpose:** Zustand + sessionStorage synchronization for PWA-safe state management
  **Read when:** Adding client state, debugging hydration issues, or understanding sessionStorage usage

- `.readme/chunks/account.baby-sharing.md`
  **Purpose:** Token-based baby invite system and access request workflows
  **Read when:** Implementing sharing features, working with baby_invites table, or debugging invite flows

### Baby Management Documentation
- `.readme/sections/baby-management.index.md`
  **Purpose:** Baby management UI, editing, and multi-baby switching patterns
  **Read when:** Building or modifying the baby list interface, implementing baby edit forms, or understanding the flattened UI pattern

- `.readme/chunks/baby-management.flattened-ui-pattern.md`
  **Purpose:** Single-page baby management interface with inline switch actions
  **Read when:** Working on `/settings/babies` page, understanding the switch baby workflow, or adding UI features to baby management

- `.readme/chunks/baby-management.edit-functionality.md`
  **Purpose:** Baby profile editing with dual-table updates and access control
  **Read when:** Implementing or modifying the edit baby form, working with `/settings/babies/[babyId]` route, or understanding caregiver label scoping

### Feed Logging Documentation
- `.readme/sections/feed-logging.index.md`
  **Purpose:** Feed logging system with dual methods, automatic estimation, and caregiver attribution
  **Read when:** Implementing or modifying feed tracking, working with breast/bottle feeds, understanding amount estimation, or adding new activity types

- `.readme/chunks/feed-logging.server-actions.md`
  **Purpose:** Type-safe server actions with access control and automatic estimation logic
  **Read when:** Implementing feed logging, understanding permission checks, or working with automatic estimation

- `.readme/chunks/feed-logging.schema-design.md`
  **Purpose:** Feed log database schema with user attribution and estimation metadata
  **Read when:** Modifying feed log schema, adding fields, or understanding the data model

- `.readme/chunks/feed-logging.ui-components.md`
  **Purpose:** Activity tile pattern, bottom sheet form, and time formatting
  **Read when:** Building activity tiles, working with sheet UI, or understanding the feed form interaction

- `.readme/chunks/feed-logging.estimation-algorithm.md`
  **Purpose:** Breast feed amount estimation logic and future improvement paths
  **Read when:** Modifying estimation logic, adding age/gender-based models, or debugging estimated amounts

### Configuration Documentation
- `.readme/sections/configuration.index.md`
  **Purpose:** Centralized configs and environment variable management
  **Read when:** Setting up environment variables, configuring libraries

- `.readme/chunks/config.env-validation.md`
  **Purpose:** Type-safe environment variable validation with @t3-oss/env-nextjs
  **Read when:** Adding environment variables, understanding validation errors

### Testing Documentation
- `.readme/sections/testing.index.md`
  **Purpose:** Multi-mode testing with Vitest and Playwright
  **Read when:** Writing tests or understanding test environment selection

- `.readme/chunks/testing.vitest-dual-mode.md`
  **Purpose:** Vitest dual-project setup (Node + browser modes)
  **Read when:** Writing unit or component tests, understanding which environment to use

- `.readme/chunks/testing.playwright-e2e.md`
  **Purpose:** Playwright E2E testing with in-memory database
  **Read when:** Writing E2E tests or understanding test database setup

### Build & Deployment Documentation
- `.readme/sections/build-deploy.index.md`
  **Purpose:** Build configuration and deployment patterns
  **Read when:** Configuring builds, adding Next.js plugins, or deploying

- `.readme/chunks/build.next-config-pattern.md`
  **Purpose:** Conditional plugin composition in next.config.ts
  **Read when:** Adding Next.js plugins or understanding build configuration

### Performance & PWA Documentation
- `.readme/sections/performance.index.md`
  **Purpose:** PWA configuration, service worker caching, and loading states
  **Read when:** Working with Progressive Web App features, offline support, or performance optimization

- `.readme/chunks/performance.pwa-config.md`
  **Purpose:** next-pwa service worker with multi-tier caching strategies
  **Read when:** Configuring PWA behavior, adjusting cache duration, or understanding offline support

- `.readme/chunks/performance.loading-states.md`
  **Purpose:** Suspense-based loading.tsx pattern across route groups
  **Read when:** Adding loading states to routes, understanding Suspense boundaries, or working with route-level loading UI

- `.readme/chunks/performance.skeleton-components.md`
  **Purpose:** Reusable skeleton components for loading states
  **Read when:** Creating loading UI, building new skeleton patterns, or maintaining consistent loading experiences

- `.readme/chunks/performance.pwa-manifest.md`
  **Purpose:** PWA manifest configuration and installation behavior
  **Read when:** Configuring app installation, setting start URL, or customizing PWA metadata

### Code Quality Documentation
- `.readme/chunks/code-quality.typescript-strict.md`
  **Purpose:** Deep dive into advanced TypeScript strictness options
  **Read when:** Understanding `noUncheckedIndexedAccess` and other strict type errors

## Key Integration Points

### Sentry Setup
- Local: Spotlight runs automatically on `npm run dev` at port 8969
- Production: Requires `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` env vars
- Config: Wrapped in `next.config.ts` with tunnel route `/monitoring`

### Clerk Authentication
- Must set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Get keys from Clerk Dashboard after creating application
- Localization configured via `src/utils/AppConfig.ts` ClerkLocalizations

### Database Connection
- Default: Temporary Neon PostgreSQL (72h expiration)
- Persist: Run `npm run neon:claim` to make permanent
- Fresh DB: Delete `DATABASE_URL` and `DATABASE_URL_DIRECT` from `.env.local`, restart dev server
- Schema source of truth: `src/models/Schema.ts`

## CI/CD Notes
- GitHub Actions: Semantic Release on main branch for automatic versioning
- Playwright runs in CI with both Chromium and Firefox
- Crowdin syncs translations automatically on main branch commits
- CodeRabbit provides AI-powered code reviews on pull requests
