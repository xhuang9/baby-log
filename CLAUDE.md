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

**Documentation Conventions:**
- Code examples may be simplified for clarity and pedagogical purposes
- Snippets focus on **conceptual accuracy** rather than character-exact matching
- Use the `docs-architect` agent (via `/doc-init`, `/doc-update`, `/doc-task`) for major documentation updates
- Prioritize updating high-traffic sections when making significant code changes (authentication, local-first, database)

| Section | Purpose | Read when |
|---------|---------|-----------|
| `getting-started.index.md` | Commands, config files, integrations | Running commands, setting up environment, configuring integrations |
| `architecture.index.md` | Route structure, libs pattern, folders, TypeScript | Creating pages, understanding project structure, working with layouts |
| `database.index.md` | DrizzleORM, schema, migrations, Neon | Adding tables, running migrations, database setup |
| `internationalization.index.md` | next-intl, locale routing, translations | Adding translations, working with i18n |
| `authentication.index.md` | Clerk setup, protected routes, user isolation, logout safety | Working with auth, adding protected pages, user switch detection, logout flows |
| `account-management.index.md` | Bootstrap post-auth flow, account state, store sync | Post-auth flows, offline fallback, baby selection |
| `baby-management.index.md` | Baby UI, editing, switching | Building baby management features |
| `baby-sharing.index.md` | Invites, access requests, revocation detection | Implementing sharing features, managing caregivers |
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
- Locked app theming system for AI UI work: `.readme/marketing/2026-02-08-ui-branding-theme-system.agent.md`
- CSS entry point: `src/styles/global.css`

**Key rules:**
- Always use CSS variables (`--primary`, `--foreground`, etc.) - never hardcode colors
- Test all UI changes in **both** light and dark mode
- Activity types have dedicated color tokens in `activity-colors.css`

For complete navigation: `.readme/index.root.md`

## Project Skills

| Skill | Use when |
|-------|----------|
| `/add-log-type` | Adding a new activity log type (database, sync, operations, UI) |
