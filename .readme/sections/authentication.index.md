---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
  - src/utils/AppConfig.ts
---

# Authentication Overview

## Purpose
Covers Clerk authentication setup with locale-aware configuration and protected route patterns.

## Scope
Authentication is handled by Clerk with custom configuration:
- Locale-specific sign-in/sign-up URLs calculated at layout level
- ClerkProvider wraps only authenticated routes via `(auth)` route group
- Centered layout for auth pages via nested `(center)` route group
- Tailwind CSS v4 compatibility via custom CSS layer configuration

The auth setup is deeply integrated with the i18n system for URL generation.

## Chunks

- `.readme/chunks/auth.clerk-layout-pattern.md`
  - Content: How ClerkProvider is scoped to `(auth)` route group with locale-aware URLs
  - Read when: Working with protected routes, configuring Clerk, or debugging auth redirects

- `.readme/chunks/auth.route-group-structure.md`
  - Content: The `(auth)` and `(center)` route group pattern for authentication pages
  - Read when: Creating new auth pages, understanding layout composition, or modifying auth flows

- `.readme/chunks/auth.tailwind-compatibility.md`
  - Content: Custom CSS layer configuration for Clerk + Tailwind CSS v4 compatibility
  - Read when: Styling Clerk components, resolving CSS conflicts, or upgrading Clerk
