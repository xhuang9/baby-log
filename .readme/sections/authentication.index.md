---
last_verified_at: 2026-01-24T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
  - src/app/[locale]/(auth)/account/bootstrap/
  - src/app/[locale]/(auth)/auth-layout-content.tsx
  - src/config/app.ts
  - src/proxy.ts
  - src/contexts/LogoutContext.tsx
  - src/components/auth/SignOutButton.tsx
  - src/components/auth/LogoutConfirmationDialog.tsx
  - src/services/operations/auth.ts
---

# Authentication Overview

## Purpose
Covers Clerk authentication setup with locale-aware configuration, protected route patterns, user data isolation, and logout safety mechanisms.

## Scope
Authentication is handled by Clerk with extensive custom configuration:
- **All app routes protected**: Middleware in `src/proxy.ts` requires Clerk authentication for all routes under `(auth)`
- **User data isolation**: Automatic detection and cleanup when different users log in on same device
- **Logout safety**: Pending change detection and sync confirmation before logout
- Locale-specific sign-in/sign-up URLs calculated at layout level
- ClerkProvider wraps only authenticated routes via `(auth)` route group
- Centered layout for auth pages via nested `(center)` route group
- Tailwind CSS v4 compatibility via custom CSS layer configuration
- Custom bootstrap flow (replaces standard post-auth redirect)
- **Local-first with required auth**: IndexedDB caches data, but authentication is mandatory for all app pages

The auth setup is deeply integrated with the i18n system for URL generation and includes a sophisticated decision-tree flow for account initialization and baby selection.

**IMPORTANT:** The post-auth flow routes through `/account/bootstrap` - see Account Management for details.

## Chunks

### Core Authentication

- `.readme/chunks/auth.clerk-layout-pattern.md`
  - Content: How ClerkProvider is scoped to `(auth)` route group with locale-aware URLs
  - Read when: Working with protected routes, configuring Clerk, or debugging auth redirects

- `.readme/chunks/auth.route-group-structure.md`
  - Content: The `(auth)` and `(center)` route group pattern for authentication pages
  - Read when: Creating new auth pages, understanding layout composition, or modifying auth flows

- `.readme/chunks/auth.tailwind-compatibility.md`
  - Content: Custom CSS layer configuration for Clerk + Tailwind CSS v4 compatibility
  - Read when: Styling Clerk components, resolving CSS conflicts, or upgrading Clerk

### Security & Data Isolation

- `.readme/chunks/auth.user-switch-detection.md`
  - Content: Automatic user switch detection in bootstrap flow with cached session validation and IndexedDB + sessionStorage cleanup
  - Read when: Working with bootstrap flow, debugging user data conflicts, understanding multi-user device scenarios, or implementing session validation logic

- `.readme/chunks/auth.logout-confirmation-system.md`
  - Content: Context-based logout orchestration with pending change detection, sync confirmation dialog, and emergency logout handling
  - Read when: Implementing logout flows, working with outbox sync, understanding logout UX (online/offline states), or intercepting Clerk's UserButton signOut

## Related Sections

See `.readme/sections/account-management.index.md` for the current post-auth flow implementation, including account resolution, baby selection, and invite acceptance workflows.
