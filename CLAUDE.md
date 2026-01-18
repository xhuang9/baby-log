# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Critical Rules

**Package Manager: This project uses `pnpm`, NOT `npm`.**
- Use `pnpm add <package>` to install dependencies (NEVER `npm install`)
- `npm run <script>` works for running scripts

## Project Overview

Next.js 16+ with App Router, TypeScript, Tailwind CSS 4, DrizzleORM, Clerk auth. Local-first architecture with Dexie IndexedDB and offline sync.

## Documentation Sections

All detailed documentation lives in `.readme/sections/`. Each section contains chunks with file paths, code patterns, and rules.

| Section | Purpose | Read when |
|---------|---------|-----------|
| `getting-started.index.md` | Commands, config files, integrations | Running commands, setting up environment, configuring integrations |
| `architecture.index.md` | Route structure, libs pattern, folders, TypeScript | Creating pages, understanding project structure, working with layouts |
| `database.index.md` | DrizzleORM, schema, migrations, Neon | Adding tables, running migrations, database setup |
| `internationalization.index.md` | next-intl, locale routing, translations | Adding translations, working with i18n |
| `authentication.index.md` | Clerk setup, protected routes, layouts | Working with auth, adding protected pages |
| `account-management.index.md` | Bootstrap post-auth flow, account state, store sync | Post-auth flows, offline fallback, baby selection |
| `baby-management.index.md` | Baby UI, editing, switching | Building baby management features |
| `feed-logging.index.md` | Feed logging, estimation, server actions | Implementing activity tracking |
| `local-first.index.md` | Dexie, offline patterns, sync, operations layer | IndexedDB, offline mutations, operations layer, sync operations |
| `configuration.index.md` | Environment variables, lib configs | Adding env vars, configuring libraries |
| `testing.index.md` | Vitest, Playwright, test modes | Writing tests, understanding test environments |
| `build-deploy.index.md` | Next.js config, build patterns | Build configuration, deployment |
| `performance.index.md` | PWA, offline indicators, loading states | Offline support, network status UI, performance optimization |
| `monitoring.index.md` | Sentry, logging, observability | Error monitoring, logging setup |
| `code-quality.index.md` | ESLint, TypeScript strictness | Code style, type errors |
| `styling.index.md` | Brand colors, theming, dark/light mode | **Any styling work**, colors, UI design |

## Styling & Dark/Light Mode (IMPORTANT)

This project has a **brand guideline** optimized for new parents - calming pastels, soft greens/pinks/blues. **Dark and light mode are both required.**

- Full brand research: `.readme/planning/brand-guideline.md`
- Styling rules & color tokens: `.readme/sections/styling.index.md`
- CSS entry point: `src/styles/global.css`

**Key rules:**
- Always use CSS variables (`--primary`, `--foreground`, etc.) - never hardcode colors
- Test all UI changes in **both** light and dark mode
- Activity types have dedicated color tokens in `activity-colors.css`

For complete navigation: `.readme/index.root.md`
