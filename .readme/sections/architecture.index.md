---
last_verified_at: 2026-01-08T22:30:00Z
source_paths:
  - src/app/[locale]/
  - src/lib/
  - src/stores/
  - src/components/navigation/
  - src/templates/
  - tsconfig.json
---

# Architecture Overview

## Purpose
Describes the route organization, route groups, layout hierarchy, and structural patterns specific to this boilerplate that differ from standard Next.js projects.

## Scope
This boilerplate uses Next.js App Router with a highly structured approach:
- All routes are locale-prefixed via `[locale]` dynamic segment
- Route groups organize pages by purpose (marketing vs auth) and layout (centered vs full-width)
- Centralized library configurations in `src/lib/`
- Strict path aliasing and TypeScript configuration

The architecture emphasizes separation of concerns and developer experience through conventions.

## Chunks

- `.readme/chunks/architecture.route-structure.md`
  - Content: Detailed route organization including route groups `(marketing)`, `(auth)`, and `(center)`
  - Read when: Creating new pages, understanding nested layouts, or working with route-based organization

- `.readme/chunks/architecture.libs-pattern.md`
  - Content: The `src/lib/` centralization pattern for all third-party library configurations
  - Read when: Configuring new libraries, understanding environment variables, or working with DB/I18n/Logger setup

- `.readme/chunks/architecture.path-aliases.md`
  - Content: Path alias configuration and import conventions
  - Read when: Adding new imports, configuring paths, or understanding the `@/` prefix pattern

- `.readme/chunks/architecture.typescript-config.md`
  - Content: Strict TypeScript configuration with advanced safety checks
  - Read when: Understanding type errors, configuring strictness, or adding new compiler options

- `.readme/chunks/architecture.breadcrumb-system.md`
  - Content: Zustand-based breadcrumb and page title system with hook-based state management
  - Read when: Adding breadcrumbs or page titles to pages, understanding the useSetBreadcrumb/useSetPageTitle hooks, or working with AppHeader integration

- `.readme/chunks/architecture.mobile-back-button.md`
  - Content: Intelligent mobile back button navigation using breadcrumb hierarchy
  - Read when: Working with mobile navigation, understanding the back button logic, or debugging mobile header behavior
