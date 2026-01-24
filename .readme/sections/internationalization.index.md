---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/lib/i18n/index.ts
  - src/lib/i18n/navigation.ts
  - src/lib/i18n/routing.ts
  - src/locales/
  - src/config/app.ts
---

# Internationalization Overview

## Purpose
Documents the next-intl setup with locale-based routing, English-first translations, and optional Crowdin integration patterns.

## Scope
This boilerplate uses next-intl with several specific configurations:
- Locale prefix mode "as-needed" (default locale has no prefix)
- All routes automatically locale-aware via `[locale]` segment
- Translation workflow centered on English-only by default
- Optional Crowdin sync via GitHub Actions when more locales are added
- Locale-specific Clerk authentication UI (English only unless more locales are added)

The i18n implementation is tightly integrated with routing and authentication.

## Chunks

- `.readme/chunks/i18n.routing-integration.md`
  - Content: How locale routing works with the `[locale]` dynamic segment and "as-needed" mode
  - Read when: Creating locale-aware links, understanding URL structure, or debugging locale routing

- `.readme/chunks/i18n.translation-workflow.md`
  - Content: Translation file structure, optional Crowdin sync, and validation workflow
  - Read when: Adding translations, working with locale files, or integrating with Crowdin

- `.readme/chunks/i18n.clerk-localization.md`
  - Content: Clerk UI localization integrated with next-intl locale detection
  - Read when: Working with authentication UI translations, or adding locale-specific Clerk configuration
