---
last_verified_at: 2026-01-06T00:30:00Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
  - src/app/[locale]/(auth)/account/resolve/
  - src/config/app.ts
---

# Authentication Overview

## Purpose
Covers Clerk authentication setup with locale-aware configuration, protected route patterns, and custom account resolution workflow.

## Scope
Authentication is handled by Clerk with extensive custom configuration:
- Locale-specific sign-in/sign-up URLs calculated at layout level
- ClerkProvider wraps only authenticated routes via `(auth)` route group
- Centered layout for auth pages via nested `(center)` route group
- Tailwind CSS v4 compatibility via custom CSS layer configuration
- Custom account resolution flow (replaces standard post-auth redirect)

The auth setup is deeply integrated with the i18n system for URL generation and includes a sophisticated decision-tree flow for account initialization and baby selection.

**IMPORTANT:** The post-auth flow has been replaced with `/account/resolve` - see Account Management section for details.

## Chunks

- `.readme/chunks/auth.clerk-layout-pattern.md`
  - Content: How ClerkProvider is scoped to `(auth)` route group with locale-aware URLs
  - Read when: Working with protected routes, configuring Clerk, or debugging auth redirects

- `.readme/chunks/auth.post-auth-flow.md`
  - Content: Legacy post-authentication workflow (SUPERSEDED by account resolution flow)
  - Read when: Understanding historical implementation or migrating from old pattern

- `.readme/chunks/auth.route-group-structure.md`
  - Content: The `(auth)` and `(center)` route group pattern for authentication pages
  - Read when: Creating new auth pages, understanding layout composition, or modifying auth flows

- `.readme/chunks/auth.tailwind-compatibility.md`
  - Content: Custom CSS layer configuration for Clerk + Tailwind CSS v4 compatibility
  - Read when: Styling Clerk components, resolving CSS conflicts, or upgrading Clerk

## Related Sections

See `.readme/sections/account-management.index.md` for the current post-auth flow implementation, including account resolution, baby selection, and invite acceptance workflows.
