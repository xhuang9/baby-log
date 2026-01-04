---
last_verified_at: 2026-01-05T10:30:00Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
  - src/app/[locale]/(auth)/(center)/post-auth/page.tsx
  - src/utils/AppConfig.ts
---

# Authentication Overview

## Purpose
Covers Clerk authentication setup with locale-aware configuration, protected route patterns, and custom post-auth user sync workflow.

## Scope
Authentication is handled by Clerk with custom configuration:
- Locale-specific sign-in/sign-up URLs calculated at layout level
- ClerkProvider wraps only authenticated routes via `(auth)` route group
- Centered layout for auth pages via nested `(center)` route group
- Tailwind CSS v4 compatibility via custom CSS layer configuration
- Post-auth redirect flow that syncs user data to local database and client state

The auth setup is deeply integrated with the i18n system for URL generation and includes a two-phase redirect pattern for database synchronization.

## Chunks

- `.readme/chunks/auth.clerk-layout-pattern.md`
  - Content: How ClerkProvider is scoped to `(auth)` route group with locale-aware URLs
  - Read when: Working with protected routes, configuring Clerk, or debugging auth redirects

- `.readme/chunks/auth.post-auth-flow.md`
  - Content: Custom post-authentication workflow that syncs Clerk user to local database and initializes client-side state
  - Read when: Understanding the login flow, accessing user data in components, or debugging post-auth redirects

- `.readme/chunks/auth.route-group-structure.md`
  - Content: The `(auth)` and `(center)` route group pattern for authentication pages
  - Read when: Creating new auth pages, understanding layout composition, or modifying auth flows

- `.readme/chunks/auth.tailwind-compatibility.md`
  - Content: Custom CSS layer configuration for Clerk + Tailwind CSS v4 compatibility
  - Read when: Styling Clerk components, resolving CSS conflicts, or upgrading Clerk
